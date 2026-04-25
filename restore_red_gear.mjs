import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function fixSettingsLogo() {
    console.log('--- Restoring Red Gear Logo ---');
    const { data } = supabase.storage.from('company_assets').getPublicUrl('settings/0.7268322228706001.png');
    const redGearLogoUrl = data.publicUrl;
    console.log('Red Gear Logo URL:', redGearLogoUrl);
    
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
            .update({ logo_url: redGearLogoUrl })
            .eq('id', id);
            
        if (updateErr) {
            console.error('Error updating logo:', updateErr.message);
        } else {
            console.log('Successfully updated logo_url in document_settings.');
        }
    }
}

fixSettingsLogo();
