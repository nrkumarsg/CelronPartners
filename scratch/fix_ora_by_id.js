import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fixOraById() {
    const id = '0c38a192-46e0-4f10-a0f4-052373876c14';
    console.log(`Fixing ORA document type for ID: ${id}...`);
    
    const { data, error } = await supabase
        .from('workflow_documents')
        .update({ document_type: 'Order Acknowledgment' })
        .eq('id', id)
        .select();
        
    if (error) {
        console.error('Error:', error.message);
        return;
    }
    
    if (data.length === 0) {
        console.log('No document found with that ID.');
    } else {
        console.log(`Successfully updated document: ${data[0].document_no}`);
    }
}

fixOraById();
