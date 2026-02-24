import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function inspectTable() {
    const { data, error } = await supabase.from('contacts').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
        return;
    }
    if (data && data.length > 0) {
        console.log('Columns in contacts:', Object.keys(data[0]));
    } else {
        console.log('No data in contacts to inspect columns.');
        // Try to insert a dummy one? No, let's try another way
        const { error: error2 } = await supabase.from('contacts').select('partner_id').limit(1);
        console.log('partner_id exists:', !error2);
        const { error: error3 } = await supabase.from('contacts').select('partnerId').limit(1);
        console.log('partnerId exists:', !error3);
    }
}

inspectTable();
