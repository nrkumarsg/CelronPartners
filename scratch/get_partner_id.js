import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function getPartnerId() {
    const { data: partners, error } = await supabase.from('partners').select('id, name').ilike('name', '%Marine Spares Global%').single();
    if (error) {
        console.error('Error:', error.message);
        return;
    }
    console.log(`Partner ID for ${partners.name}: ${partners.id}`);
}

getPartnerId();
