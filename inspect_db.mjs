import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function inspect() {
    const { data: pData } = await supabase.from('partners').select('*').limit(1);
    if (pData && pData.length > 0) console.log('Partners Cols:', Object.keys(pData[0]));

    const { data: cData } = await supabase.from('contacts').select('*').limit(1);
    if (cData && cData.length > 0) console.log('Contacts Cols:', Object.keys(cData[0]));
}

inspect();
