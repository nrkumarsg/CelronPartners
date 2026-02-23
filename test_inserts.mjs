import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkPolicies() {
    // This is hard via API, but we can try to insert and see the error
    const tables = ['partners', 'contacts', 'vessels', 'work_locations'];
    for (const table of tables) {
        console.log(`Testing insert into ${table}...`);
        const { error } = await supabase.from(table).insert([{ name: 'Test' }]).select();
        if (error) {
            console.log(`  Error: ${error.message} (${error.code})`);
        } else {
            console.log(`  Success!`);
        }
    }
}

checkPolicies();
