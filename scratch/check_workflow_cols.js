import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
    const { data, error } = await supabase.from('workflow_documents').select('*').limit(1);
    if (error) {
        console.error('Error fetching doc:', error);
    } else if (data && data.length > 0) {
        console.log('Columns in workflow_documents:', Object.keys(data[0]));
    } else {
        console.log('No data in workflow_documents, checking via RPC...');
        // We'll just assume based on the error that SOME UUID field is empty string
    }
}

checkSchema();
