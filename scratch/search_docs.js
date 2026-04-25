import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkDocs() {
    console.log('Searching for any documents containing "0007"...');
    
    const { data: docs, error } = await supabase
        .from('workflow_documents')
        .select('*')
        .ilike('document_no', '%0007%');
        
    if (error) {
        console.error('Error:', error.message);
        return;
    }
    
    console.log(`Found ${docs.length} documents.`);
    docs.forEach((doc, i) => {
        console.log(`[${i}] ID: ${doc.id} | No: ${doc.document_no} | Type: ${doc.document_type} | Status: ${doc.status}`);
    });
}

checkDocs();
