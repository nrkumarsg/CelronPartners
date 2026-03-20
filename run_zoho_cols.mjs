import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

const sql = `
  ALTER TABLE document_settings 
  ADD COLUMN IF NOT EXISTS smtp_host text DEFAULT 'smtp.zoho.com',
  ADD COLUMN IF NOT EXISTS smtp_port text DEFAULT '465',
  ADD COLUMN IF NOT EXISTS sales_email text DEFAULT 'sales@celron.net',
  ADD COLUMN IF NOT EXISTS sales_password text,
  ADD COLUMN IF NOT EXISTS accounts_email text DEFAULT 'accounts@celron.net',
  ADD COLUMN IF NOT EXISTS accounts_password text;
`;

async function run() {
    try {
        const { error } = await supabase.rpc('exec_sql', { query: sql });
        if (error) {
            console.log('RPC exec_sql generic error fallback. Creating columns directly might fail.');
        } else {
            console.log('SUCCESS adding columns');
        }
    } catch (err) {
        console.log('RPC ERROR:', err.message);
    }
}
run();
