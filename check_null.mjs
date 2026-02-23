import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkNullable() {
    const { data, error } = await supabase.rpc('get_column_info', { t_name: 'vessels' });
    // If RPC doesn't exist, we can try to insert a row with NULL company_id
    console.log('Testing insert with NULL company_id into vessels...');
    const { error: errorNull } = await supabase.from('vessels').insert([{ vessel_name: 'NullTest', company_id: null }]).select();
    if (errorNull) {
        console.log(`  Failed: ${errorNull.message}`);
    } else {
        console.log(`  Success! company_id can be null.`);
    }
}

checkNullable();
