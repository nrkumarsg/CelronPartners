import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function diagnoseSaveIssue() {
    console.log('--- Database Diagnostic ---');

    // 1. Check columns in workflow_documents
    const { data: cols, error: colErr } = await supabase.rpc('get_table_columns', { table_name: 'workflow_documents' });
    if (colErr) {
        console.log('Error fetching columns via RPC (trying alternative):', colErr.message);
        const { data, error } = await supabase.from('workflow_documents').select('*').limit(0);
        if (error) console.log('Error selecting from table:', error.message);
        else console.log('Table exists and is accessible.');
    } else {
        console.log('Columns in workflow_documents:', cols);
    }

    // 2. Check latest documents
    const { data: latest, error: lastErr } = await supabase
        .from('workflow_documents')
        .select('document_no, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (lastErr) console.log('Error fetching latest docs:', lastErr.message);
    else console.log('Latest documents:', latest);

    // 3. Attempt a dry-run insert of a test doc (with a random number to avoid conflict)
    const testNo = `TEST-${Date.now()}`;
    console.log(`Attempting dry-run insert with doc_no: ${testNo}`);
    const { error: insErr } = await supabase.from('workflow_documents').insert([{
        document_no: testNo,
        document_type: 'Enquiry',
        status: 'Draft'
    }]);

    if (insErr) {
        console.log('DRY RUN INSERT FAILED:', insErr.message);
        console.log('Error details:', insErr);
    } else {
        console.log('Dry run insert successful! Deleting test doc...');
        await supabase.from('workflow_documents').delete().eq('document_no', testNo);
    }
}

diagnoseSaveIssue();
