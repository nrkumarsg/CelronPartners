import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function fixSettingsLogo() {
    console.log('--- Updating Document Settings Logo ---');
    // Fetch the first settings record
    const { data: settings, error: fetchErr } = await supabase.from('document_settings').select('id').limit(1);
    
    if (fetchErr) {
        console.error('Error fetching settings:', fetchErr.message);
        return;
    }
    
    if (settings && settings.length > 0) {
        const id = settings[0].id;
        const { error: updateErr } = await supabase
            .from('document_settings')
            .update({ logo_url: '/logo.png' })
            .eq('id', id);
            
        if (updateErr) {
            console.error('Error updating logo:', updateErr.message);
        } else {
            console.log('Successfully updated logo_url to /logo.png in document_settings.');
        }
    } else {
        console.log('No document_settings record found.');
    }
}

fixSettingsLogo();
