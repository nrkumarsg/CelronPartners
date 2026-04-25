import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkDocs() {
    console.log('Checking documents with number QTN-2604-0007...');
    
    const { data: docs, error } = await supabase
        .from('workflow_documents')
        .select('*')
        .eq('document_no', 'QTN-2604-0007');
        
    if (error) {
        console.error('Error:', error.message);
        return;
    }
    
    console.log(`Found ${docs.length} documents with this number.`);
    docs.forEach((doc, i) => {
        console.log(`[${i}] ID: ${doc.id} | Type: ${doc.document_type} | Status: ${doc.status} | Created: ${doc.created_at}`);
    });
}

checkDocs();
