require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase
        .from('workflow_documents')
        .update({ document_no: 'PAY-INV-2604-6051' })
        .eq('id', 'f2bee975-a6f2-4cbe-873b-1a526bdbf07a')
        .select();
    
    console.log(JSON.stringify({ data, error }, null, 2));
}

run();
