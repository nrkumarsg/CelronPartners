
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dfoihdzpgkrtyerzzchm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmb2loZHpwZ2tydHllcnp6Y2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzMxMTgsImV4cCI6MjA4NzE0OTExOH0.9FGN21KeUpS0UyyFJJ1YjXLElL4AF6ym_hKAJsr_ek4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function globalSearch() {
    console.log("Global search for INV-2604-6051...");
    
    const { data: d1 } = await supabase
        .from('workflow_documents')
        .select('id, document_no, document_type, assigned_job_no')
        .eq('document_no', 'INV-2604-6051');

    const { data: d2 } = await supabase
        .from('jobs')
        .select('id, job_no')
        .eq('job_no', 'INV-2604-6051');

    console.log("Workflow Docs:", d1);
    console.log("Legacy Jobs:", d2);
}

globalSearch();
