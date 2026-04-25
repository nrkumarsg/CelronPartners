import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function countDocs() {
    console.log('Counting workflow documents...');
    const { count, error } = await supabase
        .from('workflow_documents')
        .select('*', { count: 'exact', head: true });
        
    if (error) {
        console.error('Error:', error.message);
        return;
    }
    console.log(`Total documents in workflow_documents: ${count}`);
}

countDocs();
