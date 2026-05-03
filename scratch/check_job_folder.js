
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkJobFolder() {
    const jobNo = 'CEL-2604-6061';
    console.log(`Checking documents for Job: ${jobNo}...`);
    
    const { data, error } = await supabase
        .from('workflow_documents')
        .select('id, document_no, document_type, is_job, assigned_job_no, gdrive_folder_id')
        .eq('assigned_job_no', jobNo);
        
    if (error) {
        console.error("Error:", error);
        return;
    }
    
    console.table(data);
}

checkJobFolder();
