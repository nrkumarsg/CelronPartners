import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Use .env.local if available
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fixStuck() {
    console.log('Searching for stuck quotations...');
    
    // Since we can't bypass RLS easily without Service Role key, 
    // we'll try to find it by document_no if we know it, 
    // or just list what we can if we authenticate.
    // Actually, I'll just write a script that the user can run IF they have the key, 
    // or I'll try to use the RPC if it exists (but it didn't earlier).
    
    // Let's try to just update ANY quotation that is_job: true but has no associated Job document.
    // But we can't easily check for associated docs without a join or multiple queries.
    
    console.log('TIP: Please provide the Document No of the quotation that is stuck.');
    const docNo = process.argv[2] || 'QTN-2024-0038'; // Default from screenshot guess
    
    console.log(`Attempting to reset is_job flag for ${docNo}...`);
    
    // We need to be authenticated to do this via Anon key.
    // Or we need the Service Role Key.
    
    const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
        console.error('ERROR: Service Role Key is required to bypass RLS and fix this data.');
        console.log('Alternatively, you can run this SQL in the Supabase Editor:');
        console.log(`UPDATE workflow_documents SET is_job = false, assigned_job_no = null WHERE document_no = '${docNo}';`);
        return;
    }
    
    const adminSupabase = createClient(process.env.VITE_SUPABASE_URL, key);
    
    const { data, error } = await adminSupabase
        .from('workflow_documents')
        .update({ is_job: false, assigned_job_no: null })
        .eq('document_no', docNo)
        .select();
        
    if (error) {
        console.error('Update failed:', error.message);
    } else if (data.length === 0) {
        console.log('No document found with that number.');
    } else {
        console.log('SUCCESS: Quotation reset. You can now try converting it to a job again.');
    }
}

fixStuck();
