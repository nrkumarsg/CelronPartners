import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkDoc() {
    const id = '81fe0cbd-2d98-473d-bc28-8f99a17856f6';
    console.log(`Checking document with ID: ${id}`);
    
    const { data: docs, error } = await supabase
        .from('workflow_documents')
        .select('*')
        .eq('id', id);
        
    if (error) {
        console.error('Error:', error.message);
        return;
    }
    
    console.log(`Found ${docs.length} rows.`);
    docs.forEach((doc, i) => {
        console.log(`[${i}] ID: ${doc.id} | No: ${doc.document_no} | Type: ${doc.document_type}`);
    });
}

checkDoc();
