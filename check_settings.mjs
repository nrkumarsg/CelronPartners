
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSettings() {
    const { data, error } = await supabase
        .from('document_settings')
        .select('google_drive_folder_id, company_id');

    if (error) {
        console.error('Error fetching settings:', error);
        return;
    }

    data.forEach(s => {
        console.log('--- Setting ---');
        console.log('COMPANY_ID:', s.company_id);
        console.log('DRIVE_FOLDER_ID:', s.google_drive_folder_id);
    });
}

checkSettings();
