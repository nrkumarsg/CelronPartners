import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

const sql = fs.readFileSync('fix_delete_cascade.sql', 'utf-8');

// Using Supabase RPC to run generic text SQL is discouraged unless set up.
// So let's run a fallback: inserting a temporary REST call if needed.
// Wait, the standard way in this project is `await supabase.rpc('exec_sql', { query: sql })` from earlier?
async function run() {
    try {
        const { error } = await supabase.rpc('exec_sql', { query: sql });
        if (error) throw error;
        console.log('SUCCESS');
    } catch (err) {
        console.log('RPC ERROR:', err.message);
    }
}
run();
