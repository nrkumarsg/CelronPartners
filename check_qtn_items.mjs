import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkItems(docNo) {
    const { data: doc, error: docError } = await supabase
        .from('workflow_documents')
        .select('id, subject')
        .eq('document_no', docNo)
        .single();

    if (docError) {
        console.error('Doc Error:', docError);
        return;
    }

    console.log(`Document ID: ${doc.id}, Subject: ${doc.subject}`);

    const { data: items, error: itemError } = await supabase
        .from('workflow_line_items')
        .select('*')
        .eq('document_id', doc.id)
        .order('sort_order', { ascending: true });

    if (itemError) {
        console.error('Item Error:', itemError);
        return;
    }

    console.log(`Found ${items.length} items:`);
    items.forEach((it, i) => {
        console.log(`[${i}] Desc: "${it.description}", Qty: ${it.quantity}, Price: ${it.unit_price}, IsSection: ${it.is_section}, IsNote: ${it.is_note}`);
    });
}

checkItems('QTN-2604-0008');
