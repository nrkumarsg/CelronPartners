import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dfoihdzpgkrtyerzzchm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmb2loZHpwZ2tydHllcnp6Y2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzMxMTgsImV4cCI6MjA4NzE0OTExOH0.9FGN21KeUpS0UyyFJJ1YjXLElL4AF6ym_hKAJsr_ek4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findSpecificDoc() {
    const { data, error } = await supabase
        .from('workflow_documents')
        .select('id, document_no, document_type')
        .eq('document_no', 'CEL-2604-5009')
        .maybeSingle();

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data) {
        console.log('Found Doc:', data);
    } else {
        console.log('Document CEL-2604-5009 not found (Maybe RLS or missing)');
    }
}

findSpecificDoc();
