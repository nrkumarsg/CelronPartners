import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dfoihdzpgkrtyerzzchm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmb2loZHpwZ2tydHllcnp6Y2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzMxMTgsImV4cCI6MjA4NzE0OTExOH0.9FGN21KeUpS0UyyFJJ1YjXLElL4AF6ym_hKAJsr_ek4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkJobsDiscrepancy() {
    // 1. Check old 'jobs' table
    const { count: oldJobCount, data: oldJobs } = await supabase
        .from('jobs')
        .select('id, job_number, status', { count: 'exact' });

    // 2. Check new 'workflow_documents' table
    const { count: newJobCount, data: newJobs } = await supabase
        .from('workflow_documents')
        .select('id, document_no, status')
        .eq('document_type', 'Job');

    console.log(`Old 'jobs' table count: ${oldJobCount}`);
    if (oldJobs) oldJobs.forEach(j => console.log(` - Old Job: ${j.job_number} (${j.status})`));

    console.log(`\nNew 'workflow_documents' (Type: Job) count: ${newJobCount}`);
    if (newJobs) newJobs.forEach(j => console.log(` - New Job: ${j.document_no} (${j.status})`));
}

checkJobsDiscrepancy();
