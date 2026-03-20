import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function listTables() {
    console.log('--- Database Table List ---');
    // Common tables to check
    const tables = [
        'workflow_documents',
        'workflow_line_items',
        'enquiries',
        'quotations',
        'partners',
        'contacts',
        'catalog',
        'workflow_settings'
    ];

    for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(0);
        if (error) {
            console.log(`[MISSING] ${table}: ${error.message}`);
        } else {
            console.log(`[EXIST ] ${table}`);
        }
    }
}

listTables();
