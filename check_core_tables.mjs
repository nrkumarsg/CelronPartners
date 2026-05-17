import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkCoreTables() {
    const tables = ['companies', 'profiles', 'company_users', 'document_settings'];
    console.log('--- Core Table Check ---');
    for (const table of tables) {
        const { data, error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`[ERROR  ] ${table}: ${error.message}`);
        } else {
            console.log(`[EXIST  ] ${table} (Count: ${count})`);
        }
    }
}

checkCoreTables();
