
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key missing from .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIsJob() {
    console.log('Fetching documents...');
    const { data, error } = await supabase
        .from('workflow_documents')
        .select('id, document_no, document_type, is_job, status')
        .limit(20);

    if (error) {
        console.error('Supabase Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No documents found in workflow_documents table.');
    } else {
        console.table(data);
    }
}

checkIsJob();
