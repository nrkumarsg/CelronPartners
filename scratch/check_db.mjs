import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dfoihdzpgkrtyerzzchm.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmb2loZHpwZ2tydHllcnp6Y2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzMxMTgsImV4cCI6MjA4NzE0OTExOH0.9FGN21KeUpS0UyyFJJ1YjXLElL4AF6ym_hKAJsr_ek4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log('Checking companies table...');
    const { data, error } = await supabase.from('companies').select('*').limit(1);
    if (error) {
        console.error('Error fetching companies:', error);
    } else {
        console.log('Companies data:', data);
    }

    console.log('Checking profiles table...');
    const { data: pData, error: pError } = await supabase.from('profiles').select('*').limit(1);
    if (pError) {
        console.error('Error fetching profiles:', pError);
    } else {
        console.log('Profiles data:', pData);
    }
}

check();
