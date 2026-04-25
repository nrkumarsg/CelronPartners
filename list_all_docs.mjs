import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function listAll() {
    const { data, error } = await supabase
        .from('workflow_documents')
        .select('id, document_no, document_type');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} documents.`);
    data.forEach(d => console.log(`${d.document_no} | ${d.document_type}`));
}

listAll();
