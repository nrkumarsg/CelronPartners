
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dfoihdzpgkrtyerzzchm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmb2loZHpwZ2tydHllcnp6Y2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzMxMTgsImV4cCI6MjA4NzE0OTExOH0.9FGN21KeUpS0UyyFJJ1YjXLElL4AF6ym_hKAJsr_ek4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectInvoice() {
    const id = 'f2bee975-a6f2-4cbe-873b-1a526bdbf07a';
    console.log(`Inspecting Invoice ID ${id}...`);
    
    const { data, error } = await supabase
        .from('workflow_documents')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Invoice Data:", JSON.stringify(data, null, 2));
}

inspectInvoice();
