import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function run() {
    const insertData = {
        vessel_name: 'Jag Anitha',
        imo_number: '9857857',
        vessel_type: 'Bulker',
        vessel_management: 'MOL',
        vessel_owner: 'C/o. Royal Inc.',
        other_details: 'sdk;ljdf;jklasdf'
    };
    const { error, data } = await supabase.from('vessels').insert([insertData]).select();
    console.log('Error:', JSON.stringify(error, null, 2));
    console.log('Data:', JSON.stringify(data, null, 2));
}

run();
