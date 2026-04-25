
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dfoihdzpgkrtyerzzchm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmb2loZHpwZ2tydHllcnp6Y2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzMxMTgsImV4cCI6MjA4NzE0OTExOH0.9FGN21KeUpS0UyyFJJ1YjXLElL4AF6ym_hKAJsr_ek4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateJob() {
    console.log("Searching for docs with CEL-2604-5009...");
    
    // Find docs
    const { data: docs, error: err1 } = await supabase
        .from('workflow_documents')
        .select('id, document_no, document_type, assigned_job_no')
        .or('document_no.ilike.%-2604-5009%,assigned_job_no.ilike.%-2604-5009%');

    if (err1) {
        console.error("Error searching:", err1);
        return;
    }

    console.log("Found:", docs);

    for (const doc of docs) {
        const updates = {};
        if (doc.document_no?.includes('-2604-5009')) {
            updates.document_no = doc.document_no.replace('-2604-5009', '-2604-6051');
        }
        if (doc.assigned_job_no?.includes('-2604-5009')) {
            updates.assigned_job_no = doc.assigned_job_no.replace('-2604-5009', '-2604-6051');
        }

        if (Object.keys(updates).length > 0) {
            console.log(`Updating Doc ID ${doc.id} with:`, updates);
            const { error: err2 } = await supabase
                .from('workflow_documents')
                .update(updates)
                .eq('id', doc.id);
            
            if (err2) console.error(`Error updating ${doc.id}:`, err2);
            else console.log(`Successfully updated ${doc.id}`);
        }
    }
}

updateJob();
