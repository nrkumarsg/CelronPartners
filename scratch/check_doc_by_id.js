import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkDoc() {
    const id = '81fe0cbd-2d98-473d-bc28-8f99a17856f6';
    console.log(`Checking document with ID: ${id}`);
    
    const { data: doc, error } = await supabase
        .from('workflow_documents')
        .select('*, items:workflow_line_items(*)')
        .eq('id', id)
        .single();
        
    if (error) {
        console.error('Error:', error.message);
        return;
    }
    
    console.log(`Document No: ${doc.document_no}`);
    console.log(`Total items: ${doc.items.length}`);
    
    const counts = {};
    doc.items.forEach(item => {
        counts[item.description] = (counts[item.description] || 0) + 1;
    });
    
    console.log('Item Counts by Description:');
    console.log(JSON.stringify(counts, null, 2));
}

checkDoc();
