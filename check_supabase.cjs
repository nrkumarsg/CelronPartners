require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase.from('workflow_documents').select('id, document_no, status, is_job, document_type').ilike('document_no', '%6051%');
    console.log(JSON.stringify({ data, error }, null, 2));
}

run();
