import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function testExecSql() {
    console.log('--- Testing exec_sql RPC ---');
    const { data, error } = await supabase.rpc('exec_sql', { query: 'SELECT 1' });
    if (error) {
        console.log('[FAILED] exec_sql not available or permission denied:', error.message);
    } else {
        console.log('[SUCCESS] exec_sql is available:', data);
    }
}

testExecSql();
