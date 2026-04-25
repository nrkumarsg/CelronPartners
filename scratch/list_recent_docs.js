
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dfoihdzpgkrtyerzzchm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmb2loZHpwZ2tydHllcnp6Y2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzMxMTgsImV4cCI6MjA4NzE0OTExOH0.9FGN21KeUpS0UyyFJJ1YjXLElL4AF6ym_hKAJsr_ek4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listDocs() {
    console.log("Listing last 20 workflow documents...");
    const { data, error } = await supabase
        .from('workflow_documents')
        .select('id, document_no, document_type, assigned_job_no, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) console.error(error);
    else console.log(data);
}

listDocs();
