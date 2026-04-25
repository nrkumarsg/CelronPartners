import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dfoihdzpgkrtyerzzchm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmb2loZHpwZ2tydHllcnp6Y2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzMxMTgsImV4cCI6MjA4NzE0OTExOH0.9FGN21KeUpS0UyyFJJ1YjXLElL4AF6ym_hKAJsr_ek4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function renameJobSuite() {
    const oldSuffix = '5009';
    const newSuffix = '6051';
    const prefix = '2604'; // Year/Month

    console.log(`Renaming suite ${prefix}-${oldSuffix} to ${prefix}-${newSuffix}...`);

    // 1. Find all documents ending with 5009 for the specific company
    // Using %-2604-5009 to be safe
    const { data: docs, error: fetchError } = await supabase
        .from('workflow_documents')
        .select('id, document_no, document_type')
        .ilike('document_no', `%-${prefix}-${oldSuffix}`);

    if (fetchError) {
        console.error('Fetch Error:', fetchError);
        return;
    }

    if (!docs || docs.length === 0) {
        console.log('No documents found with suffix', oldSuffix);
        return;
    }

    console.log(`Found ${docs.length} documents to rename.`);

    for (const doc of docs) {
        const newNo = doc.document_no.replace(`-${prefix}-${oldSuffix}`, `-${prefix}-${newSuffix}`);
        console.log(`Renaming ${doc.document_no} -> ${newNo}`);
        
        const { error: updateError } = await supabase
            .from('workflow_documents')
            .update({ document_no: newNo })
            .eq('id', doc.id);

        if (updateError) {
            console.error(`Failed to rename ${doc.document_no}:`, updateError);
        }
    }

    console.log('Rename complete.');
}

renameJobSuite();
