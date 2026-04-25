import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fixOra() {
    console.log('Fixing ORA document type...');
    const { data, error } = await supabase
        .from('workflow_documents')
        .update({ document_type: 'Order Acknowledgment' })
        .eq('document_no', 'ORA-2604-5007')
        .select();
        
    if (error) {
        console.error('Error:', error.message);
        return;
    }
    console.log(`Updated ${data.length} documents.`);
}

fixOra();
