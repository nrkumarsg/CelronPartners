import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
    const { data, error } = await supabase.from('partners').select('*').limit(1);
    if (error) {
        console.error('Error fetching partner:', error);
    } else if (data && data.length > 0) {
        console.log('Columns in partners table:', Object.keys(data[0]));
    } else {
        console.log('No data in partners table, checking via RPC or information_schema if possible...');
        // Fallback: try to insert a dummy record with an empty object to see what happens or use informaton_schema
        const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'partners' });
        if (colError) {
             console.error('Error fetching columns via RPC:', colError);
        } else {
            console.log('Columns:', cols);
        }
    }
}

checkSchema();
