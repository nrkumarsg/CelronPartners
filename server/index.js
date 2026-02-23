import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import { runUniversalSearch } from '../src/lib/universalFinder.js';
import { supabase } from '../src/lib/supabase.js';

const app = express();
app.use(cors());
app.use(express.json());

// ---- 1️⃣ Search endpoint -------------------------------------------------
app.post('/api/universal-finder/search', async (req, res) => {
    const { query, userLat, userLng, userId } = req.body;

    // Check for API keys
    const hasKeys = process.env.VITE_GOOGLE_API_KEY && process.env.VITE_GOOGLE_CX;

    try {
        if (!hasKeys) {
            console.warn("Google API keys missing. Returning mock data for demo.");
            // Create a mock search record
            const { data: search } = await supabase.from('searches').insert({
                user_id: userId, query, source: 'mock', total_results: 3
            }).select().single();

            // Insert mock results based on query
            const mockData = [
                {
                    search_id: search.id,
                    title: `${query} Global Supplier - Parts division`,
                    url: 'https://example.com/supplier1',
                    snippet: `Authorized dealer for ${query}. Contact us for urgent delivery. +65 6777 1234, sales@parts.sg`,
                    supplier_name: `${query} Asia Pacific`,
                    supplier_location: 'Singapore',
                    email: 'sales@parts.sg',
                    phone: '+65 6777 1234',
                    distance_km: 5.2,
                    rank: 1
                },
                {
                    search_id: search.id,
                    title: `Official ${query} Secondary Parts`,
                    url: 'https://example.com/supplier2',
                    snippet: `Large stock of ${query} components. Global shipping available. support@globalparts.com`,
                    supplier_name: `${query} Global Solutions`,
                    supplier_location: 'Houston, USA',
                    email: 'support@globalparts.com',
                    phone: '+1 713 555 0199',
                    distance_km: 15200,
                    rank: 2
                }
            ];
            await supabase.from('search_results').insert(mockData);
            return res.json({ searchId: search.id });
        }

        const searchId = await runUniversalSearch({
            query,
            userLat,
            userLng,
            userId,
        });
        res.json({ searchId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// ---- 2️⃣ Paginated results ------------------------------------------------
app.get('/api/universal-finder/results', async (req, res) => {
    const { searchId, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const { data: results, error: err1, count } = await supabase
        .from('search_results')
        .select('*', { count: 'exact' })
        .eq('search_id', searchId)
        .order('distance_km', { ascending: true, nullsFirst: false })
        .order('rank', { ascending: true })
        .range(offset, offset + parseInt(pageSize) - 1);

    if (err1) return res.status(500).json({ error: err1.message });
    res.json({ results, total: count });
});

// ---- 3️⃣ Save result as a partner -----------------------------------------
app.post('/api/partners/from-search', async (req, res) => {
    const { resultId } = req.body;
    const { data: result, error: err1 } = await supabase
        .from('search_results')
        .select('*')
        .eq('id', resultId)
        .single();

    if (err1) return res.status(404).json({ error: err1.message });

    // Insert into partners table
    const { error: err2 } = await supabase.from('partners').insert({
        name: result.supplier_name,
        website: result.url,
        address: result.supplier_location || '',
        latitude: result.latitude,
        longitude: result.longitude,
        source_search_id: result.search_id,
    });

    if (err2) return res.status(500).json({ error: err2.message });

    // Mark result as saved
    await supabase
        .from('search_results')
        .update({ saved_to_partner: true })
        .eq('id', resultId);

    res.json({ success: true });
});

// -------------------------------------------------------------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Universal-Finder API listening on ${PORT}`));
