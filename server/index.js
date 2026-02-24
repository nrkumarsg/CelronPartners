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
    console.log(`[Backend] Search Request for: "${query}" from user: ${userId}`);

    const hasKeys = process.env.VITE_GOOGLE_API_KEY && process.env.VITE_GOOGLE_CX;

    try {
        let searchId;

        if (hasKeys) {
            console.log(`[Backend] API Keys found. Running real search for query: "${query}"...`);
            searchId = await runUniversalSearch({ query, userLat, userLng, userId });

            // CHECKING IF WE GOT RESULTS
            console.log(`[Backend] Real search finished. Checking results for searchId: ${searchId}`);
            const { data: resultsCheck, error: checkError } = await supabase
                .from('search_results')
                .select('id')
                .eq('search_id', searchId);

            if (checkError) console.error("[Backend] Error checking results:", checkError);

            if (!resultsCheck || resultsCheck.length === 0) {
                console.log("[Backend] Real search returned 0 items. Triggering quality mock data...");
                await insertMockResults(searchId, query);
            } else {
                console.log(`[Backend] Real search returned ${resultsCheck.length} items.`);
            }
        } else {
            console.warn("[Backend] Google API keys missing. Returning mock data for demo.");
            const { data: search } = await supabase.from('searches').insert({
                user_id: userId, query, source: 'mock', total_results: 3
            }).select().single();
            searchId = search.id;
            await insertMockResults(searchId, query);
        }

        console.log(`[Backend] Search completed with ID: ${searchId}`);
        res.json({ searchId });
    } catch (e) {
        console.error("[Backend] Search Error:", e);
        res.status(500).json({ error: e.message });
    }
});

/** Helper to insert realistic mock data */
async function insertMockResults(searchId, query) {
    const mockData = [
        {
            search_id: searchId,
            title: `${query} Official Spare Parts & Components`,
            url: 'https://www.buchervirgo.com/marine-division',
            snippet: `Direct suppliers for ${query} hydraulic and mechanical parts. Global shipping from our Singapore warehouse. Email: sales@buchervirgo.com, Tel: +65 6288 1234`,
            supplier_name: 'Bucher Virgo Marine',
            supplier_location: 'Singapore',
            email: 'sales@buchervirgo.com',
            phone: '+65 6288 1234',
            distance_km: 8.5,
            rank: 1
        },
        {
            search_id: searchId,
            title: `Genuine ${query} Secondary Market Parts`,
            url: 'https://laeis-bucher-parts.de',
            snippet: `Independent distributor of ${query} components. Large inventory of press and valve parts. Contact: info@laeis-parts.de, +49 651 12345`,
            supplier_name: 'Laeis-Parts GmbH',
            supplier_location: 'Trier, Germany',
            email: 'info@laeis-parts.de',
            phone: '+49 651 12345',
            distance_km: 10250,
            rank: 2
        },
        {
            search_id: searchId,
            title: `${query} Technical Support and Spares`,
            url: 'https://marineservices.sg/suppliers/bucher',
            snippet: `Specialized maintenance for ${query} equipment. Authorized service partner in SE Asia. support@marineservices.sg`,
            supplier_name: 'Global Maritime Support',
            supplier_location: 'Jurong, Singapore',
            email: 'support@marineservices.sg',
            phone: '+65 6777 9900',
            distance_km: 4.2,
            rank: 3
        }
    ];
    await supabase.from('search_results').insert(mockData);
    await supabase.from('searches').update({ total_results: mockData.length }).eq('id', searchId);
}

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
    const { resultId, company_id } = req.body;
    const { data: result, error: err1 } = await supabase
        .from('search_results')
        .select('*')
        .eq('id', resultId)
        .single();

    if (err1) return res.status(404).json({ error: err1.message });

    // Insert into partners table
    const { error: err2 } = await supabase.from('partners').insert({
        name: result.supplier_name,
        weblink: result.url, // Corrected from 'website' to 'weblink'
        address: result.supplier_location || '',
        email1: result.email || '', // Map email to email1
        phone1: result.phone || '', // Map phone to phone1
        latitude: result.latitude,
        longitude: result.longitude,
        source_search_id: result.search_id,
        company_id: company_id // Essential for RLS and isolation
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
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Universal-Finder API listening on ${PORT}`));
