import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function diagnose() {
    console.log('--- Diagnostic Report ---');

    // Check if we can see rows in partners (anonymous)
    const { data, count, error } = await supabase.from('partners').select('*', { count: 'exact' });
    console.log(`Partners (Anon): Count ${count}, Error: ${error?.message || 'None'}`);

    const { count: vCount, error: vErr } = await supabase.from('vessels').select('*', { count: 'exact', head: true });
    console.log(`Vessels (Anon): Count ${vCount}, Error: ${vErr?.message || 'None'}`);

    const { count: wCount, error: wErr } = await supabase.from('work_locations').select('*', { count: 'exact', head: true });
    console.log(`Work Locations (Anon): Count ${wCount}, Error: ${wErr?.message || 'None'}`);
}

diagnose();
