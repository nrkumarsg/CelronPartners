import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function listAll() {
    console.log('Listing all workflow documents...');
    
    const { data: docs, error } = await supabase
        .from('workflow_documents')
        .select('id, document_no, document_type, status');
        
    if (error) {
        console.error('Error:', error.message);
        return;
    }
    
    console.log(`Found ${docs.length} documents.`);
    docs.forEach((doc, i) => {
        console.log(`[${i}] ID: ${doc.id} | No: ${doc.document_no} | Type: ${doc.document_type} | Status: ${doc.status}`);
    });
}

listAll();
