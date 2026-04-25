import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkCompanies() {
    console.log('--- Checking Companies ---');
    const { data: companies, error: cErr } = await supabase.from('companies').select('*');
    if (cErr) {
        console.error('Error fetching companies:', cErr.message);
    } else {
        console.log('Companies:', JSON.stringify(companies, null, 2));
    }

    console.log('\n--- Checking Company Users ---');
    const { data: users, error: uErr } = await supabase.from('company_users').select('*, companies(name)');
    if (uErr) {
        console.error('Error fetching company users:', uErr.message);
    } else {
        console.log('Company Users:', JSON.stringify(users, null, 2));
    }
}

checkCompanies();
