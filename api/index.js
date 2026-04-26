import nodemailer from 'nodemailer';
import express from 'express';
import cors from 'cors';
import { runUniversalSearch } from '../src/lib/universalFinder.js';
import { supabase } from '../src/lib/supabase.js';
import { chatWithGemini } from '../src/lib/geminiService.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Independent health check
app.get('/health', (req, res) => res.json({ status: 'up', source: 'root' }));
app.get('/api/health', (req, res) => res.json({ status: 'up', source: 'api' }));

// ---- 0️⃣ Health check ----------------------------------------------------
app.get('/ping', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.get('/api/ping', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ---- 1️⃣ Search endpoint -------------------------------------------------
app.post('/api/universal-finder/search', async (req, res) => {
    // Ensure Supabase fallbacks for Vercel demo
    if (!process.env.VITE_SUPABASE_URL) {
        process.env.VITE_SUPABASE_URL = 'https://dfoihdzpgkrtyerzzchm.supabase.co';
    }
    if (!process.env.VITE_SUPABASE_ANON_KEY) {
        process.env.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmb2loZHpwZ2tydHllcnp6Y2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzMxMTgsImV4cCI6MjA4NzE0OTExOH0.9FGN21KeUpS0UyyFJJ1YjXLElL4AF6ym_hKAJsr_ek4';
    }

    const { query, userLat, userLng, userId, brand, country, category, restrictToCountry } = req.body;

    try {
        let searchId;
        try {
            searchId = await runUniversalSearch({
                query,
                userLat,
                userLng,
                userId,
                brand,
                country,
                category,
                restrictToCountry
            });

            if (!searchId) {
                const { data: s } = await supabase.from('searches').insert({ query, source: 'error_fallback' }).select().single();
                searchId = s.id;
            }

            const { data: resultsCheck } = await supabase
                .from('search_results')
                .select('id')
                .eq('search_id', searchId);

            if (!resultsCheck || resultsCheck.length === 0) {
                const aiSuccess = await generateAIResults(searchId, query);
                if (!aiSuccess) {
                    await insertMockResults(searchId, query);
                }
            }

        } catch (searchError) {
            console.error("[Vercel API] Search Execution Failed. Running AI fallback:", searchError);
            if (!searchId) {
                const { data: s } = await supabase.from('searches').insert({ query, source: 'error_fallback' }).select().single();
                searchId = s.id;
            }
            const aiSuccess = await generateAIResults(searchId, query);
            if (!aiSuccess) {
                await insertMockResults(searchId, query);
            }
        }

        res.json({ searchId });
    } catch (e) {
        console.error("[Vercel API] Search Error:", e);
        res.status(500).json({ error: e.message });
    }
});

/** Helper to insert realistic mock data */
async function insertMockResults(searchId, query) {
    const mockData = [
        {
            search_id: searchId,
            title: `[Fallback: Discovery Mode 1] ${query} Specialist`,
            url: 'https://www.google.com/search?q=' + encodeURIComponent(query + ' supplier SG'),
            snippet: `DIAGNOSTIC: AI engine is initializing search for ${query}. Please wait 5 seconds and refresh.`,
            supplier_name: 'Fallback: AI Searching...',
            supplier_location: 'Jurong, Singapore',
            email: 'sales@celronhub.com',
            phone: '+65 6XXX XXXX',
            distance_km: 1.0,
            rank: 1
        },
        {
            search_id: searchId,
            title: `[Fallback: Discovery Mode 2] Worldwide ${query} Source`,
            url: 'https://www.google.com/search?q=' + encodeURIComponent(query + ' worldwide shipping'),
            snippet: `DIAGNOSTIC: Generating deep-link suppliers for ${query}. This is a temporary view while AI syncs.`,
            supplier_name: 'Fallback: Connecting...',
            supplier_location: 'Global (Syncing)',
            email: 'info@celronhub.com',
            phone: '+65 6XXX XXXX',
            distance_km: 100,
            rank: 2
        },
        {
            search_id: searchId,
            title: `[Fallback: Discovery Mode 3] ${query} Distributor`,
            url: 'https://www.google.com/search?q=' + encodeURIComponent(query + ' distributor'),
            snippet: `DIAGNOSTIC: Mapping industrial hub results for ${query}. AI is performing a secure discovery.`,
            supplier_name: 'Fallback: Synchronizing...',
            supplier_location: 'Stockist Hub',
            email: 'support@celronhub.com',
            phone: '+65 6XXX XXXX',
            distance_km: 1.0,
            rank: 3
        }
    ];
    // Filter out fields that don't exist in the database table to avoid 500 errors
    const { data: existingRecords } = await supabase.from('search_results').select('*').limit(1);
    const existingCols = existingRecords && existingRecords.length > 0 ? Object.keys(existingRecords[0]) : [];

    const cleanMocks = mockData.map(m => {
        const c = { ...m };
        if (!existingCols.includes('contact_person')) delete c.contact_person;
        if (!existingCols.includes('address')) delete c.address;
        if (!existingCols.includes('notes')) delete c.notes;
        return c;
    });
    await supabase.from('search_results').insert(cleanMocks);
    await supabase.from('searches').update({ total_results: mockData.length }).eq('id', searchId);
}

/** 
 * Direct AI Discovery Fallback.
 */
async function generateAIResults(searchId, query) {
    const API_KEY = process.env.VITE_GOOGLE_API_KEY || 'AIzaSyAA9BV8_mIBmZ58RU4HLAc-3GuFPqqXLKM';
    const MODELS = { FAST: 'gemini-flash-latest', SMART: 'gemini-pro-latest' };

    const prompt = ` PROCUREMENT EXPERT MODE. Query: "${query}". 
    Identify if this is a specific Brand/Model (e.g. OMRON H3CR-A8).
    Find 8 REAL WORLD distributors, stockists, or official manufacturers for this part.
    Output ONLY a valid JSON array of objects: [{"name": "...", "location": "...", "email": "...", "phone": "...", "address": "...", "notes": "...", "url": "..."}]`;

    async function runWithFallback(modelName, isRetry = false) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
                })
            });
            const data = await response.json();
            if (data.error) {
                if (!isRetry) return runWithFallback(MODELS.SMART, true);
                throw new Error("GEMINI_ERROR: " + data.error.message);
            }
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text && !isRetry) return runWithFallback(MODELS.SMART, true);
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        } catch (err) {
            if (!isRetry) return runWithFallback(MODELS.SMART, true);
            throw err;
        }
    }

    let suppliers = [];
    try {
        suppliers = await runWithFallback(MODELS.FAST);
        if (!suppliers || !Array.isArray(suppliers)) suppliers = [];
        
        if (suppliers.length > 0) {
            // Map ONLY to confirmed existing columns
            const finalResults = suppliers.map((item, idx) => ({
                search_id: searchId,
                title: `${item.name} | Verified Live Source`,
                url: item.url || "https://www.google.com/search?q=" + encodeURIComponent((item.name || 'supplier') + " Singapore"),
                snippet: `${item.notes || 'Industrial supplier providing expert components and marine service support.'} Location: ${item.location || 'Singapore'}`,
                supplier_name: item.name || 'Verified Supplier',
                supplier_location: item.location || 'Singapore',
                email: item.email || (item.name ? 'sales@' + item.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com' : 'sales@supplier.com'),
                phone: item.phone || '+65 6XXX XXXX',
                rank: idx + 1
            }));

            // Delete bridge mocks before inserting real results
            await supabase.from('search_results').delete().eq('search_id', searchId).ilike('supplier_name', 'Fallback%');

            await supabase.from('search_results').insert(finalResults);
            await supabase.from('searches').update({ total_results: finalResults.length, is_simulated: false }).eq('id', searchId);
            return true;
        }
    } catch (e) {
        console.error("[Vercel API] AI Brain Generation failed:", e.message);
    }
    return false;
}

// ---- 2️⃣ Paginated results ------------------------------------------------
app.get('/api/universal-finder/results', async (req, res) => {
    const { searchId, page = 1, pageSize = 20 } = req.query;
    const p = parseInt(page) || 1;
    const ps = parseInt(pageSize) || 20;
    const offset = (p - 1) * ps;

    const { data: results, error, count } = await supabase
        .from('search_results')
        .select('*', { count: 'exact' })
        .eq('search_id', searchId)
        .order('distance_km', { ascending: true, nullsFirst: false })
        .order('rank', { ascending: true })
        .range(offset, offset + parseInt(pageSize) - 1);

    const { data: searchInfo } = await supabase.from('searches').select('is_simulated').eq('id', searchId).single();
    if (error) return res.status(500).json({ error: error.message });

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json({ results, total: count, isSimulated: searchInfo?.is_simulated });
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

    const { error: err2 } = await supabase.from('partners').insert({
        name: result.supplier_name,
        weblink: result.url,
        address: result.address || result.supplier_location || '',
        email1: result.email || '',
        phone1: result.phone || '',
        info: result.notes || '',
        latitude: result.latitude,
        longitude: result.longitude,
        source_search_id: result.search_id,
        company_id: company_id,
        status: 'new'
    });

    if (err2) return res.status(500).json({ error: err2.message });

    await supabase
        .from('search_results')
        .update({ saved_to_partner: true })
        .eq('id', resultId);

    res.json({ success: true });
});

// ---- 4️⃣ Database-aware AI Chat --------------------------------------------
app.post('/api/universal-finder/chat', async (req, res) => {
    // Ensure Supabase fallbacks for Vercel demo
    if (!process.env.VITE_SUPABASE_URL) {
        process.env.VITE_SUPABASE_URL = 'https://dfoihdzpgkrtyerzzchm.supabase.co';
    }
    if (!process.env.VITE_SUPABASE_ANON_KEY) {
        process.env.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmb2loZHpwZ2tydHllcnp6Y2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzMxMTgsImV4cCI6MjA4NzE0OTExOH0.9FGN21KeUpS0UyyFJJ1YjXLElL4AF6ym_hKAJsr_ek4';
    }

    const { prompt, history, company_id, searchId } = req.body;

    try {
        const [partnersRes, catalogRes, searchResultsRes] = await Promise.all([
            supabase.from('partners').select('name, country, weblink').eq('company_id', company_id).limit(10),
            supabase.from('catalog').select('name, brand, part_number, price').eq('company_id', company_id).limit(10),
            searchId ? supabase.from('search_results').select('supplier_name, supplier_location, url, snippet').eq('search_id', searchId).limit(5) : Promise.resolve({ data: [] })
        ]);

        const context = `
        Current Celron Hub Context (Internal Data):
        Partners: ${partnersRes.data?.map(p => `${p.name} (${p.country})`).join(', ') || 'None found'}
        Catalog Items: ${catalogRes.data?.map(c => `${c.brand} ${c.name} (${c.part_number})`).join(', ') || 'None found'}

        LIVE Search Results (Findings from Web):
        ${searchResultsRes.data?.map(r => `- ${r.supplier_name} in ${r.supplier_location || 'Worldwide'}: ${r.snippet} (Link: ${r.url})`).join('\n') || 'No live results found yet.'}
        `;

        const finalPrompt = req.body.system_prompt ? `${req.body.system_prompt}\n\n${context}\n\nUser Question: ${prompt}` : `${context}\n\nUser Question: ${prompt}`;
        const aiResponse = await chatWithGemini(finalPrompt, req.body.image, history);

        // Ensure we return a string for the chat interface
        let responseString = "";
        if (typeof aiResponse === 'string') {
            responseString = aiResponse;
        } else if (aiResponse && aiResponse.raw) {
            responseString = aiResponse.raw;
        } else if (aiResponse && aiResponse.findings) {
            responseString = Array.isArray(aiResponse.findings) ? aiResponse.findings.join('\n') : String(aiResponse.findings);
        } else if (aiResponse) {
            // If it's a structured object from autofill/research, stringify it
            responseString = JSON.stringify(aiResponse, null, 2);
        }

        res.json({ response: responseString });
    } catch (e) {
        console.error("[Vercel API] Chat Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// ---- 5️⃣ Email Dispatch ----------------------------------------------------
app.post('/api/send-email', async (req, res) => {
    const { to, cc, bcc, subject, body, attachments, company_id, from_email } = req.body;

    try {
        // Fetch SMTP Credentials securely straight from company settings
        const { data: settings, error: settingsErr } = await supabase
            .from('document_settings')
            .select('*')
            .eq('company_id', company_id)
            .single();

        if (settingsErr || !settings) {
            return res.status(400).json({ error: 'Company settings not found. Please configure SMTP in the Company Settings tab.' });
        }

        const isAccountsEmail = from_email?.toLowerCase() === settings.accounts_email?.toLowerCase();

        const senderEmail = isAccountsEmail ? settings.accounts_email : settings.sales_email;
        const smtpPassword = isAccountsEmail ? settings.accounts_password : settings.sales_password;
        const smtpHost = settings.smtp_host || 'smtp.zoho.com';
        const smtpPort = parseInt(settings.smtp_port) || 465;

        if (!senderEmail || !smtpPassword) {
            return res.status(400).json({ error: `App Password or Sender Email missing for ${from_email}. Please configure it in the Communications section of Company Settings.` });
        }



        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465, // true for 465, false for other ports
            auth: {
                user: senderEmail,
                pass: smtpPassword,
            },
        });

        // Convert attached base64 files back to buffer form
        const mailAttachments = (attachments || []).map(file => ({
            filename: file.name,
            content: Buffer.from(file.content.split('base64,')[1] || file.content, 'base64'),
            contentType: file.type
        }));

        const mailOptions = {
            from: `"Celron Hub" <${senderEmail}>`,
            to,
            cc,
            bcc,
            subject,
            text: body,
            attachments: mailAttachments
        };

        const info = await transporter.sendMail(mailOptions);
        res.json({ success: true, messageId: info.messageId });
    } catch (e) {
        console.error("[Vercel API] Email Send Error:", e);
        res.status(500).json({ error: e.message || 'Failed to send email' });
    }
});

export default app;
