import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('communication_accounts').select('*');
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Accounts Found:', data.length);
    data.forEach(acc => {
        console.log(`- ID: ${acc.id}`);
        console.log(`  Label: ${acc.account_label}`);
        console.log(`  Provider: ${acc.provider}`);
        console.log(`  Auth Data Present: ${acc.auth_data ? 'YES' : 'NO'}`);
        if (acc.auth_data) {
            console.log(`  Token Start: ${acc.auth_data.access_token?.substring(0, 10)}...`);
            console.log(`  Expires: ${acc.auth_data.expires_at}`);
        }
        console.log('---');
    });
}

check();
