import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkColumns() {
    const tables = ['partners', 'contacts', 'vessels', 'work_locations', 'todos'];
    for (const table of tables) {
        // We can check if company_id or user_id exists by trying to select them
        const { error: errorCompany } = await supabase.from(table).select('company_id').limit(1);
        const { error: errorUser } = await supabase.from(table).select('user_id').limit(1);

        console.log(`Table ${table}:`);
        console.log(`  company_id exists: ${!errorCompany}`);
        if (errorCompany) console.log(`    Error: ${errorCompany.message}`);
        console.log(`  user_id exists: ${!errorUser}`);
        if (errorUser) console.log(`    Error: ${errorUser.message}`);
    }
}

checkColumns();
