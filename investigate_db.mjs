import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function run() {
    const { error: err1 } = await supabase.rpc('query', { query_text: "ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS smtp_host text, ADD COLUMN IF NOT EXISTS smtp_port text, ADD COLUMN IF NOT EXISTS sales_email text, ADD COLUMN IF NOT EXISTS sales_password text, ADD COLUMN IF NOT EXISTS accounts_email text, ADD COLUMN IF NOT EXISTS accounts_password text;" });
    console.log("RPC Error:", err1);

    // Just in case RPC doesn't exist, we can't alter directly from client without postgres URL,
    // so let's try reading the table columns using an insert query that we throw away.
    const { data } = await supabase.from('document_settings').select('*').limit(1);
    console.log("Current cols:", Object.keys(data[0] || {}).join(', '));
}

run();
