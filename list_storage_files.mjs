import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function listFiles() {
    const { data, error } = await supabase.storage.from('company_assets').list('settings', { limit: 10 });
    if (error) {
        console.error('Error listing files:', error);
    } else {
        console.log('Storage Files:', JSON.stringify(data, null, 2));
    }
}

listFiles();
