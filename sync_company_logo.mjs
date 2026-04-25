import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function syncCompanyLogo() {
    console.log('--- Syncing Company Logo ---');
    
    // Fetch document_settings
    const { data: settings } = await supabase.from('document_settings').select('logo_url, company_id').limit(1);
    
    if (settings && settings.length > 0) {
        const logoUrl = settings[0].logo_url;
        const companyId = settings[0].company_id || '8431cd0b-7449-44a5-8213-2a8680d09ebe';
        console.log('Document Settings Logo:', logoUrl);
        
        // Update the companies table
        const { error: updateErr } = await supabase
            .from('companies')
            .update({ logo_url: logoUrl })
            .eq('id', companyId);
            
        if (updateErr) {
            console.error('Error updating company:', updateErr.message);
        } else {
            console.log('Successfully updated logo_url in companies table.');
        }
    } else {
        console.log('No document_settings found.');
    }
}

syncCompanyLogo();
