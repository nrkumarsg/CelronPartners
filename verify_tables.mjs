import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function check() {
    const tables = ['partners', 'contacts', 'vessels', 'work_locations', 'profiles', 'companies', 'categories', 'brands', 'todos'];
    for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`Table ${table}: ERROR - ${error.message} (Code: ${error.code})`);
        } else {
            console.log(`Table ${table}: OK`);
        }
    }
}

check();
