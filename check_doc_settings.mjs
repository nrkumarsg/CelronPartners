import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkSettings() {
    console.log('--- Checking Document Settings ---');
    const { data } = await supabase.from('document_settings').select('id, company_id, logo_url, signature_url');
    console.log('Document Settings:', JSON.stringify(data, null, 2));
}

checkSettings();
