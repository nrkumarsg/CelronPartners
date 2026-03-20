import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkSchema() {
    console.log('--- Celron Flow Schema Check ---');
    const tables = [
        'customer_enquiries',
        'jobs',
        'job_expenses',
        'delivery_orders',
        'supplier_quotes'
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

checkSchema();
