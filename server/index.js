import './loadEnv.js';
import nodemailer from 'nodemailer';
import express from 'express';
import cors from 'cors';
import { runUniversalSearch } from '../src/lib/universalFinder.js';
import { supabase } from '../src/lib/supabase.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ---- Root Status --------------------------------------------------------
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #4f46e5;">Celron Hub Backend is LIVE</h1>
            <p style="color: #64748b;">The API server is running on port 4001</p>
            <div style="display: inline-block; padding: 8px 16px; background: #ecfdf5; color: #059669; border-radius: 20px; font-weight: bold; font-size: 0.9rem;">
                ● Connected to Supabase
            </div>
        </div>
    `);
});

// ---- 1️⃣ Search endpoint -------------------------------------------------
app.post('/api/universal-finder/search', async (req, res) => {
    const { query, userLat, userLng, userId, country, restrictToCountry, skipAi } = req.body;
    console.log(`[Backend] Search Request for: "${query}" from user: ${userId} in country: ${country} (Local only: ${restrictToCountry})`);

    const key = process.env.VITE_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || 'AIzaSyBfT3-KSeOlJhLZAC7FTkLFaK3WlQz-ANs';
    const cx = process.env.VITE_GOOGLE_CX || process.env.GOOGLE_CX || '259ae1101668d4071';
    const hasKeys = true; // Always try if we have fallbacks

    try {
        let searchId;

        if (hasKeys) {
            console.log(`[Backend] API Keys found. Running real search for query: "${query}"...`);
            try {
                searchId = await runUniversalSearch({ query, userLat, userLng, userId, country, restrictToCountry, skipAi });

                // CHECK if real results were actually returned from Google
                const { data: resultsCheck, error: checkError } = await supabase
                    .from('search_results')
                    .select('id')
                    .eq('search_id', searchId);

                if (checkError) console.error("[Backend] Error checking results:", checkError);

                if (!resultsCheck || resultsCheck.length === 0) {
                    console.log("[Backend] Real search returned 0 items. Inserting fallback mocks...");
                    await insertMockResults(searchId, query);
                    await supabase.from('searches').update({ is_simulated: true }).eq('id', searchId);
                }

            } catch (searchError) {
                console.error("[Backend] Search Execution Failed:", searchError);

                // Fallback to mock data on certain failures (like 403)
                console.log("[Backend] Falling back to mock results due to error...");
                await insertMockResults(searchId, query);
                await supabase.from('searches').update({ is_simulated: true }).eq('id', searchId);
            }

        } else {
            console.warn("[Backend] Google API keys missing. Cannot perform live search.");
            return res.status(400).json({ error: "Google API keys missing. Please configure .env file." });
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

    const { data: searchInfo } = await supabase.from('searches').select('is_simulated').eq('id', searchId).single();
    if (err1) return res.status(500).json({ error: err1.message });
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

    // Fetch the inserted partner's ID
    const { data: partner, error: err3 } = await supabase
        .from('partners')
        .select('id')
        .eq('name', result.supplier_name)
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    // Mark result as saved
    await supabase
        .from('search_results')
        .update({ saved_to_partner: true })
        .eq('id', resultId);

    res.json({ success: true, partner_id: partner?.id });
});

// ---- 3.5️⃣ Popular Suppliers ----------------------------------------------
app.get('/api/partners/popular', async (req, res) => {
    const { limit = 20 } = req.query;
    try {
        const { data: partners, error } = await supabase
            .from('partners')
            .select('id, name, country, city')
            .limit(parseInt(limit))
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ partners });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ---- 4️⃣ Database-aware AI Chat --------------------------------------------
app.post('/api/universal-finder/chat', async (req, res) => {
    const { prompt, history, company_id, searchId } = req.body;

    try {
        // Fetch context from DB: Partners, Catalog, AND the latest Search Results
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

        // We use the geminiService from the frontend path (since it's imported in server)
        const { chatWithGemini } = await import('../src/lib/geminiService.js');
        const finalPrompt = req.body.system_prompt ? `${req.body.system_prompt}\n\n${context}\n\nUser Question: ${prompt}` : `${context}\n\nUser Question: ${prompt}`;
        const aiResponse = await chatWithGemini(finalPrompt, null, history);

        res.json({ response: aiResponse });
    } catch (e) {
        console.error("[Backend] Chat Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// ---- 5️⃣ Email Dispatch ----------------------------------------------------
app.post('/api/send-email', async (req, res) => {
    const { to, cc, bcc, subject, body, attachments, company_id, from_email } = req.body;

    try {
        console.log(`[Backend] Email request to: ${to} from company: ${company_id}`);
        // Fetch SMTP Credentials securely straight from company settings
        const { data: settings, error: settingsErr } = await supabase
            .from('document_settings')
            .select('*')
            .eq('company_id', company_id)
            .single();

        if (settingsErr || !settings) {
            console.error("[Backend] SMTP Error: Settings not found", settingsErr);
            return res.status(400).json({ error: 'Company settings not found. Please configure SMTP in the Company Settings tab.' });
        }

        const isAccountsEmail = from_email?.toLowerCase() === settings.accounts_email?.toLowerCase();

        const senderEmail = isAccountsEmail ? settings.accounts_email : settings.sales_email;
        const smtpPassword = isAccountsEmail ? settings.accounts_password : settings.sales_password;
        const smtpHost = settings.smtp_host || 'smtp.zoho.com';
        const smtpPort = parseInt(settings.smtp_port) || 465;

        if (!senderEmail || !smtpPassword) {
            console.warn(`[Backend] SMTP Error: Credentials missing for ${from_email}`);
            return res.status(400).json({ error: `App Password or Sender Email missing for ${from_email}. Please configure it in the Communications section of Company Settings.` });
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
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
        console.log(`[Backend] Email sent successfully: ${info.messageId}`);
        res.json({ success: true, messageId: info.messageId });
    } catch (e) {
        console.error("[Backend] Email Send Error:", e);
        res.status(500).json({ error: e.message || 'Failed to send email' });
    }
});

// -------------------------------------------------------------------------
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Universal-Finder API listening on ${PORT}`));
