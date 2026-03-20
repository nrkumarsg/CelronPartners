import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkCatalog() {
    console.log('--- Catalog Check ---');
    const { error } = await supabase.from('catalog_items').select('*').limit(0);
    if (error) {
        console.log(`[MISSING] catalog_items: ${error.message}`);
    } else {
        console.log(`[EXIST ] catalog_items`);
    }
}

checkCatalog();
