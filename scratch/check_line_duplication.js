import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkDuplicates() {
    console.log('Checking items for QTN-2604-0007...');
    
    // 1. Find the document ID
    const { data: doc, error: docErr } = await supabase
        .from('workflow_documents')
        .select('id, document_no')
        .eq('document_no', 'QTN-2604-0007')
        .single();
        
    if (docErr || !doc) {
        console.error('Error finding document:', docErr?.message || 'Not found');
        return;
    }
    
    console.log(`Document ID: ${doc.id}`);
    
    // 2. Fetch all line items for this document
    const { data: items, error: itemsErr } = await supabase
        .from('workflow_line_items')
        .select('*')
        .eq('document_id', doc.id)
        .order('created_at', { ascending: true });
        
    if (itemsErr) {
        console.error('Error fetching items:', itemsErr.message);
        return;
    }
    
    console.log(`Total items found: ${items.length}`);
    
    // 3. Analyze item structure
    const descriptions = items.map(i => i.description);
    const uniqueDescriptions = [...new Set(descriptions)];
    
    console.log(`Unique descriptions: ${uniqueDescriptions.length}`);
    
    items.forEach((item, index) => {
        console.log(`[${index}] ID: ${item.id} | Desc: ${item.description.substring(0, 20)}... | Created At: ${item.created_at}`);
    });
}

checkDuplicates();
