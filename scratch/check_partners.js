import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkPartners() {
    console.log('Checking partners table...');
    const { data: partners, error } = await supabase.from('partners').select('id, name').limit(5);
    if (error) {
        console.error('Error:', error.message);
        return;
    }
    console.log(`Found ${partners.length} partners.`);
    partners.forEach(p => console.log(`- ${p.name}`));
}

checkPartners();
