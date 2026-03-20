import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkWorkflowColumns() {
    console.log('Checking workflow_documents for internal_notes...');
    const { error: err1 } = await supabase.from('workflow_documents').select('internal_notes').limit(1);
    console.log(`internal_notes exists: ${!err1}`);
    if (err1) console.log(`Error: ${err1.message}`);

    console.log('\nChecking workflow_line_items for tax_enabled, tax_rate...');
    const { error: err2 } = await supabase.from('workflow_line_items').select('tax_enabled').limit(1);
    const { error: err3 } = await supabase.from('workflow_line_items').select('tax_rate').limit(1);

    console.log(`tax_enabled exists: ${!err2}`);
    if (err2) console.log(`Error: ${err2.message}`);
    console.log(`tax_rate exists: ${!err3}`);
    if (err3) console.log(`Error: ${err3.message}`);
}

checkWorkflowColumns();
