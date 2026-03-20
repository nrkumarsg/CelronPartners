import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function inspectTable(tableName) {
    console.log(`\n--- Inspecting Table: ${tableName} ---`);
    const { data, error } = await supabase.from(tableName).select('*').limit(1);

    if (error) {
        console.error(`Error fetching from ${tableName}:`, error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log(`Columns:`, Object.keys(data[0]).join(', '));
    } else {
        console.log(`No data found in ${tableName} to inspect columns.`);
        // Try to fetch something else or just report no data
        const { data: colData, error: colError } = await supabase.rpc('get_table_columns', { table_name: tableName });
        if (!colError) {
            console.log(`Columns (via RPC):`, colData);
        }
    }
}

async function run() {
    const tables = [
        'customer_enquiries',
        'jobs',
        'purchase_orders',
        'workflow_documents',
        'workflow_line_items'
    ];
    for (const t of tables) {
        await inspectTable(t);
    }
}

run();
