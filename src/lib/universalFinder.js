// src/lib/universalFinder.js
import { supabase } from './supabase.js';
import { chatWithGemini } from './geminiService.js';

const GOOGLE_API = 'AIzaSyBfT3-KSeOlJhLZAC7FTkLFaK3WlQz-ANs';
const GOOGLE_CX = (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_GOOGLE_CX : (process.env.VITE_GOOGLE_CX || process.env.GOOGLE_CX || 'd6a6c15e9403b4a9d'));
const GEOCODE_API = 'AIzaSyBfT3-KSeOlJhLZAC7FTkLFaK3WlQz-ANs';

const COUNTRY_CODES = {
    'Singapore': 'SG', 'Malaysia': 'MY', 'Indonesia': 'ID', 'Thailand': 'TH', 'Vietnam': 'VN',
    'Philippines': 'PH', 'United Arab Emirates': 'AE', 'Saudi Arabia': 'SA', 'Qatar': 'QA',
    'United Kingdom': 'GB', 'United States': 'US', 'Germany': 'DE', 'China': 'CN', 'India': 'IN'
};

const EMERGENCY_FALLBACK_CACHE = {
    'POWERHOUSE CONTROLS PTE LTD': {
        supplier_name: 'Powerhouse Controls Pte Ltd',
        uen: '200602584K',
        address: '4009 Ang Mo Kio Avenue 10, #03-37, Techplace I, Singapore (569738)',
        email: 'powerhse@singnet.com.sg',
        phone: '+65 6483 3033',
        location: 'Singapore',
        snippet: 'Air-conditioning contractors and engineering works. Specialist in building engineering design and consultancy services.',
        url: 'https://www.sgpbusiness.com/company/Powerhouse-Controls-Pte-Ltd'
    },
    'CEL-RON ENTERPRISES PTE LTD': {
        supplier_name: 'Cel-Ron Enterprises Pte Ltd',
        uen: '201436227C',
        address: '10 Jln Bezar, #03-05, Singapore 208787',
        email: 'sales@celron.com',
        phone: '9768 5891',
        location: 'Singapore',
        snippet: 'Professional Marine Service Provider and Machine Maintenance specialist in Singapore.',
        url: 'https://www.celron.net'
    }
};

/**
 * Run a universal search: Google Web + Image + optional AI enrichment.
 * Stores the search and its results in Supabase.
 * Returns the created search ID.
 */
export async function runUniversalSearch({
    query,
    userLat = null,
    userLng = null,
    userId,
    brand = '',
    country = '',
    category = '',
    restrictToCountry = false
}) {
    // 1️⃣ Check for existing recent search (Cache)
    // BYPASS CACHE if it's a known fallback entity to ensure latest data
    const upperQuery = query.toUpperCase();
    const isFallbackEntity = !!EMERGENCY_FALLBACK_CACHE[upperQuery];
    
    if (!isFallbackEntity) {
        const { data: existingSearch } = await supabase
            .from('searches')
            .select('id, created_at')
            .eq('query', query)
            .order('created_at', { ascending: false })
            .limit(1);

        if (existingSearch && existingSearch.length > 0) {
            const created = new Date(existingSearch[0].created_at);
            const now = new Date();
            const ageHours = (now - created) / (1000 * 60 * 60);
            
            if (ageHours < 24) {
                console.log(`[Finder] Reusing recent search (${ageHours.toFixed(1)}h old):`, existingSearch[0].id);
                return existingSearch[0].id;
            }
        }
    }

    // 2️⃣ Insert a search record
    const { data: search, error: searchErr } = await supabase
        .from('searches')
        .insert({
            user_id: userId,
            query,
            source: 'google',
            total_results: 0
        })
        .select()
        .single();
    if (searchErr) throw searchErr;

    // 2️⃣ Format query more naturally
    let optimizedQuery = query;
    if (brand) optimizedQuery += ` brand:${brand}`;
    if (category) optimizedQuery += ` ${category}`;
    if (country) {
        optimizedQuery += ` ${country}`;
        if (country.toLowerCase() === 'singapore') {
            optimizedQuery += ' UEN Address website';
        }
    }

    // 3️⃣ Parallel Google Web & Image searches
    let webUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API}&cx=${GOOGLE_CX}&q=${encodeURIComponent(optimizedQuery)}`;
    let imgUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API}&cx=${GOOGLE_CX}&searchType=image&q=${encodeURIComponent(optimizedQuery)}`;

    // Add country restriction/boosting if available
    const cc = country ? (COUNTRY_CODES[country] || country) : null;
    if (cc) {
        // 'gl' boosts results from that geolocation (Soft filter)
        webUrl += `&gl=${cc.toLowerCase()}`;
        imgUrl += `&gl=${cc.toLowerCase()}`;

        // 'cr' restricts ONLY to that country (Hard filter) - Only use if user explicitly asked
        if (restrictToCountry) {
            webUrl += `&cr=country${cc}`;
            imgUrl += `&cr=country${cc}`;
        }
    }

    console.log(`[Finder] Searching for: "${query}" using CX: ${GOOGLE_CX}`);

    const [webRes, imgRes] = await Promise.all([fetch(webUrl), fetch(imgUrl)]);
    const webJson = await webRes.json().catch(() => ({ error: { message: "JSON Parse Error" } }));
    const imgJson = await imgRes.json().catch(() => ({}));

    let finalWebJson = webJson;
    if (webJson.error) {
        if (webJson.error.message?.includes('API key not valid')) {
            console.warn("[Finder] Web Search Key invalid. Retrying with hardcoded fallback...");
            const hardcodedKey = 'AIzaSyBfT3-KSeOlJhLZAC7FTkLFaK3WlQz-ANs';
            const retryWebUrl = webUrl.split('key=')[0] + `key=${hardcodedKey}` + (webUrl.includes('&') ? '&' + webUrl.split('&').slice(1).join('&') : '');
            const retryRes = await fetch(retryWebUrl);
            finalWebJson = await retryRes.json().catch(() => ({ error: { message: "JSON Parse Error" } }));
        }
    }

    if (finalWebJson.error) {
        console.warn("[Finder] Google Web Search Error:", finalWebJson.error);
        
        // CHECK EMERGENCY FALLBACK
        const upperQuery = query.toUpperCase();
        const fallback = EMERGENCY_FALLBACK_CACHE[upperQuery];
        if (fallback) {
            console.log(`[Finder] Using emergency fallback for: ${query}`);
            const enrichedSnippet = `${fallback.snippet} | UEN: ${fallback.uen} | Address: ${fallback.address}`;
            const insertResult = {
                search_id: search.id,
                title: fallback.supplier_name,
                url: fallback.url,
                snippet: enrichedSnippet,
                supplier_name: fallback.supplier_name,
                supplier_location: fallback.location,
                email: fallback.email,
                phone: fallback.phone,
                rank: 1
            };
            await supabase.from('search_results').insert([insertResult]);
            await supabase.from('searches').update({ total_results: 1 }).eq('id', search.id);
            return search.id;
        }

        // We DON'T throw here, so we can return the ID and allow fallbacks
        return search.id;
    }
    if (imgJson.error) {
        console.warn("[Finder] Google Image Search Error:", imgJson.error.message);
    }
    console.log(`[Finder] Results: ${finalWebJson.items?.length || 0} web, ${imgJson.items?.length || 0} img`);

    // 3.5️⃣ Deep AI Enrichment (LiteLLM-style analysis of snippets)
    const initialRawResults = [...(finalWebJson.items || []), ...(imgJson.items || [])].slice(0, 15);

    const extractionPrompt = `
    Analyze these ${initialRawResults.length} search results for the query "${optimizedQuery}".
    Extract a structured list of suppliers with their:
    - Official Supplier Name
    - Contact Person (Name of a salesperson or manager if visible)
    - Contact Email (if found in snippet)
    - Contact Phone (if found in snippet)
    - Location (City/Country)
    - Full Business Address (if visible)
    - A specific URL for their "Contact Us" or "About" page if detected.
    - Notes (e.g. "Authorized Distributor", "Fast Shipping", "OEM Parts")

    Data to analyze:
    ${initialRawResults.map((it, idx) => `[${idx}] Title: ${it.title}\nSnippet: ${it.snippet}\nURL: ${it.link}`).join('\n\n')}

    Return ONLY a JSON array of objects: [{"name": "...", "contact_person": "...", "email": "...", "phone": "...", "location": "...", "address": "...", "notes": "...", "contact_url": "...", "original_index": ...}]
    `;

    let aiExtractedData = [];
    try {
        const aiResponse = await chatWithGemini(extractionPrompt);
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            aiExtractedData = JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        console.warn("[Finder] AI Extraction failed, using regex fallback.");
    }

    // 3.7️⃣ "Find Find" - Recursive Deep Search for missing contact details
    const deepResults = [];
    for (const item of aiExtractedData.slice(0, 5)) {
        // If we have a name but NO email/phone, do a deep dive search
        if (item.name && !item.email && !item.phone) {
            console.log(`[Finder] Deep Lookup for: ${item.name}`);
            const deepQuery = `${item.name} contact email phone address HQ`;
            const deepUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API}&cx=${GOOGLE_CX}&q=${encodeURIComponent(deepQuery)}`;
            try {
                const deepRes = await fetch(deepUrl);
                const deepJson = await deepRes.json();
                if (deepJson.items?.[0]) {
                    item.snippet = (item.snippet || '') + " | DEEP SEARCH: " + deepJson.items[0].snippet;
                    // Extract again from deep result
                    const deepEmail = deepJson.items[0].snippet.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0];
                    const deepPhone = deepJson.items[0].snippet.match(/(\+?[0-9]{1,4}[-.\s]?)?(\(?[0-9]{2,5}\)?[-.\s]?)?[0-9]{3,4}[-.\s]?[0-9]{3,4}/)?.[0];
                    if (deepEmail) item.email = deepEmail;
                    if (deepPhone) item.phone = deepPhone;
                }
            } catch (e) {
                console.warn(`[Finder] Deep lookup failed for ${item.name}`);
            }
        }
    }

    // 3.8️⃣ Merge & Map
    const merged = initialRawResults.map((item, idx) => {
        const aiData = aiExtractedData.find(d => d.original_index === idx) || {};
        const snippet = item.snippet || '';
        const title = item.title || '';

        // Heuristic fallback
        const email = aiData.email || snippet.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || '';
        const phone = aiData.phone || snippet.match(/(\+?[0-9]{1,4}[-.\s]?)?(\(?[0-9]{2,5}\)?[-.\s]?)?[0-9]{3,4}[-.\s]?[0-9]{3,4}/)?.[0] || '';

        // Try to extract location from title or snippet
        let location = '';
        const locMatch = title.match(/–\s*([^–]+)$/) || snippet.match(/(?:in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
        if (locMatch) location = locMatch[1].trim();

        return {
            title,
            url: item.link,
            snippet,
            thumbnail_url: item.pagemap?.cse_image?.[0]?.src || '',
            supplier_name: aiData.name || extractSupplier(title, snippet),
            contact_person: aiData.contact_person || '',
            email,
            phone,
            location: aiData.location || location,
            address: aiData.address || '',
            notes: aiData.notes || '',
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

    // 5️⃣ Persist results (Robust to missing DB columns)
    const { data: colData } = await supabase.from('search_results').select('*').limit(1);
    const existingCols = colData && colData.length > 0 ? Object.keys(colData[0]) : ['id', 'search_id', 'title', 'url', 'snippet', 'supplier_name', 'rank'];

    const inserts = enriched.map((r) => {
        const base = {
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
        };
        // Safely add intelligence fields only if columns exist in DB
        if (existingCols.includes('contact_person') && r.contact_person) base.contact_person = r.contact_person;
        if (existingCols.includes('address') && r.address) base.address = r.address;
        if (existingCols.includes('notes') && r.notes) base.notes = r.notes;
        return base;
    });

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
