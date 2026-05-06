import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dfoihdzpgkrtyerzzchm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmb2loZHpwZ2tydHllcnp6Y2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzMxMTgsImV4cCI6MjA4NzE0OTExOH0.9FGN21KeUpS0UyyFJJ1YjXLElL4AF6ym_hKAJsr_ek4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkJobs() {
    const { data: allDocs, error } = await supabase
        .from('workflow_documents')
        .select('document_no, document_type, created_at, assigned_job_no')
        .order('created_at', { ascending: false })
        .limit(100);
    
    const types = [...new Set(allDocs.map(d => d.document_type))];
    console.log('Document Types found:', types);
    console.log('Latest Documents:', JSON.stringify(allDocs.slice(0, 5), null, 2));
}

checkJobs();
