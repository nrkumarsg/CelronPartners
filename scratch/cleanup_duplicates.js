import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function cleanupDuplicates() {
    console.log('Cleaning up duplicates for QTN-2604-0007...');
    
    // 1. Find the document
    const { data: doc, error: docErr } = await supabase
        .from('workflow_documents')
        .select('id')
        .eq('document_no', 'QTN-2604-0007')
        .single();
        
    if (docErr || !doc) {
        console.error('Error finding document:', docErr?.message || 'Not found');
        return;
    }
    
    console.log(`Document ID: ${doc.id}`);
    
    // 2. Fetch all items
    const { data: items, error: itemsErr } = await supabase
        .from('workflow_line_items')
        .select('*')
        .eq('document_id', doc.id)
        .order('created_at', { ascending: true });
        
    if (itemsErr) {
        console.error('Error fetching items:', itemsErr.message);
        return;
    }
    
    console.log(`Found ${items.length} total items.`);
    
    // 3. Keep only the first set of unique items (based on description and sort_order)
    const seen = new Set();
    const toDelete = [];
    const toKeep = [];
    
    items.forEach(item => {
        const key = `${item.description}-${item.sort_order}`;
        if (seen.has(key)) {
            toDelete.push(item.id);
        } else {
            seen.add(key);
            toKeep.push(item.id);
        }
    });
    
    console.log(`Keeping ${toKeep.length} items, deleting ${toDelete.length} duplicates.`);
    
    if (toDelete.length > 0) {
        const { error: delErr } = await supabase
            .from('workflow_line_items')
            .delete()
            .in('id', toDelete);
            
        if (delErr) {
            console.error('Error deleting duplicates:', delErr.message);
        } else {
            console.log('Successfully cleaned up duplicates!');
        }
    } else {
        console.log('No duplicates found based on description/sort_order match.');
    }
}

cleanupDuplicates();
