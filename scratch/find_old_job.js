
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJob() {
    console.log("Checking for job CEL-2604-5009...");
    
    const { data: docs, error: err1 } = await supabase
        .from('workflow_documents')
        .select('id, document_no, document_type, assigned_job_no')
        .or('document_no.ilike.%-2604-5009%,assigned_job_no.ilike.%-2604-5009%');

    if (err1) {
        console.error("Error searching docs:", err1);
        return;
    }

    console.log("Found Documents:", docs);
}

checkJob();
