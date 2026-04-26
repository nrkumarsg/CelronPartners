import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const tableName = process.argv[2] || 'partners';

async function checkSchema() {
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    if (error) {
        console.error(`Error fetching ${tableName}:`, error);
    } else if (data && data.length > 0) {
        console.log(`Columns in ${tableName} table:`, Object.keys(data[0]));
    } else {
        console.log(`No data in ${tableName} table.`);
    }
}

checkSchema();
