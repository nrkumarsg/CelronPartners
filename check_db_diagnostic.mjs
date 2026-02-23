import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
    console.log('Checking database status...');

    const { count: partnersCount, error: pError } = await supabase.from('partners').select('*', { count: 'exact', head: true });
    console.log(`Partners Count (Anonymous): ${partnersCount}`, pError || '');

    const { count: vesselsCount, error: vError } = await supabase.from('vessels').select('*', { count: 'exact', head: true });
    console.log(`Vessels Count (Anonymous): ${vesselsCount}`, vError || '');

    const { count: usersCount, error: uError } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    console.log(`Profiles Count (Anonymous): ${usersCount}`, uError || '');
}

checkData();
