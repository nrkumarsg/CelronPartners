// src/lib/universalFinder.js
import { supabase } from './supabase.js';

const GOOGLE_API = (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_GOOGLE_API_KEY : process.env.VITE_GOOGLE_API_KEY);
const GOOGLE_CX = (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_GOOGLE_CX : process.env.VITE_GOOGLE_CX);
const GEOCODE_API = (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_GOOGLE_GEOCODE_KEY : process.env.VITE_GOOGLE_GEOCODE_KEY);

/**
 * Run a universal search: Google Web + Image + optional AI enrichment.
 * Stores the search and its results in Supabase.
 * Returns the created search ID.
 */
export async function runUniversalSearch({ query, userLat = null, userLng = null, userId }) {
    // 1️⃣ Insert a search record
    const { data: search, error: searchErr } = await supabase
        .from('searches')
        .insert({ user_id: userId, query, source: 'google', total_results: 0 })
        .select()
        .single();
    if (searchErr) throw searchErr;

    // 2️⃣ Parallel Google Web & Image searches
    const webUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}`;
    const imgUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API}&cx=${GOOGLE_CX}&searchType=image&q=${encodeURIComponent(query)}`;

    console.log(`[Finder] Searching for: "${query}" using CX: ${GOOGLE_CX}`);

    const [webRes, imgRes] = await Promise.all([fetch(webUrl), fetch(imgUrl)]);
    const [webJson, imgJson] = await Promise.all([webRes.json(), imgRes.json()]);

    if (webJson.error) {
        console.error("[Finder] Google Web Search Error:", webJson.error);
    }
    console.log(`[Finder] Results: ${webJson.items?.length || 0} web, ${imgJson.items?.length || 0} img`);

    // 3️⃣ Merge results (limit to 100 for better "100% effort")
    const merged = [...(webJson.items || []), ...(imgJson.items || [])]
        .slice(0, 100)
        .map((item, idx) => {
            const snippet = item.snippet || '';
            const title = item.title || '';

            // Intelligent extraction
            const email = snippet.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || '';
            const phone = snippet.match(/(\+?[0-9]{1,4}[-.\s]?)?(\(?[0-9]{2,5}\)?[-.\s]?)?[0-9]{3,4}[-.\s]?[0-9]{3,4}/)?.[0] || '';

            // Try to extract location from title or snippet
            let location = '';
            const locMatch = title.match(/–\s*([^–]+)$/) || snippet.match(/(?:in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
            if (locMatch) location = locMatch[1].trim();

            return {
                title,
                url: item.link,
                snippet,
                thumbnail_url: item.pagemap?.cse_image?.[0]?.src || '',
                supplier_name: extractSupplier(title, snippet),
                email,
                phone,
                location,
                rank: idx + 1,
            };
        });

    // 4️⃣ Enrich with geocoding (cached)
    const enriched = await Promise.all(
        merged.map(async (r) => {
            if (!r.supplier_name) return r;
            // try cache first
            const { data: cache, error: cacheErr } = await supabase
                .from('geocode_cache')
                .select('lat,lng')
                .eq('supplier_name', r.supplier_name)
                .single();
            if (!cacheErr && cache) {
                r.latitude = cache.lat;
                r.longitude = cache.lng;
            } else {
                // Combine name and location for better geocoding
                const searchAddr = r.location ? `${r.supplier_name}, ${r.location}` : r.supplier_name;
                const geo = await geocodeSupplier(searchAddr);
                if (geo) {
                    r.latitude = geo.lat;
                    r.longitude = geo.lng;
                    // store cache
                    await supabase.from('geocode_cache').insert({
                        supplier_name: r.supplier_name,
                        lat: geo.lat,
                        lng: geo.lng,
                    });
                }
            }
            // distance from user (if provided)
            if (r.latitude && userLat !== null) {
                const rad = Math.PI / 180;
                const dLat = (r.latitude - userLat) * rad;
                const dLng = (r.longitude - userLng) * rad;
                const a =
                    Math.sin(dLat / 2) ** 2 +
                    Math.cos(userLat * rad) *
                    Math.cos(r.latitude * rad) *
                    Math.sin(dLng / 2) ** 2;
                r.distance_km = 2 * 6371 * Math.asin(Math.sqrt(a));
            }
            return r;
        })
    );

    // 5️⃣ Persist results
    const inserts = enriched.map((r) => ({
        search_id: search.id,
        title: r.title,
        url: r.url,
        snippet: r.snippet,
        thumbnail_url: r.thumbnail_url,
        supplier_name: r.supplier_name,
        supplier_location: r.location,
        email: r.email,
        phone: r.phone,
        latitude: r.latitude,
        longitude: r.longitude,
        distance_km: r.distance_km,
        rank: r.rank,
    }));

    const { error: insertErr } = await supabase.from('search_results').insert(inserts);
    if (insertErr) throw insertErr;

    // update total count
    await supabase
        .from('searches')
        .update({ total_results: inserts.length })
        .eq('id', search.id);

    return search.id;
}

/** Simple heuristic to pull a supplier name from a title or snippet */
function extractSupplier(title, snippet) {
    // Look for a dash‑separated pattern "Supplier – Part …"
    const parts = title.split(/[–|:-]/);
    let name = parts[0]?.trim();

    // If name is too short or generic, try snippet
    if (name.length < 3 || name.toLowerCase().includes('home') || name.toLowerCase().includes('welcome')) {
        const snippetMatch = snippet.match(/^([^.,]+)/);
        if (snippetMatch) name = snippetMatch[1].trim();
    }

    return name || 'Unknown Supplier';
}

/** Call Google Geocoding API */
async function geocodeSupplier(address) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
    )}&key=${GEOCODE_API}`;
    const resp = await fetch(url);
    const json = await resp.json();
    if (json.results?.[0]) {
        const { lat, lng } = json.results[0].geometry.location;
        return { lat, lng };
    }
    return null;
}

export default { runUniversalSearch };
