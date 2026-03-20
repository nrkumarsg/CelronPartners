import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = 'https://dfoihdzpgkrtyerzzchm.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmb2loZHpwZ2tydHllcnp6Y2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzMxMTgsImV4cCI6MjA4NzE0OTExOH0.9FGN21KeUpS0UyyFJJ1YjXLElL4AF6ym_hKAJsr_ek4';
const supabase = createClient(url, key);

async function run() {
    try {
        const { count: p } = await supabase.from('partners').select('*', { count: 'exact', head: true });
        const { count: c } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
        const { count: v } = await supabase.from('vessels').select('*', { count: 'exact', head: true });
        const { count: l } = await supabase.from('work_locations').select('*', { count: 'exact', head: true });

        console.log("DB Stats:");
        console.log("- Partners:", p);
        console.log("- Contacts:", c);
        console.log("- Vessels:", v);
        console.log("- Locations:", l);
    } catch (e) {
        console.error("Stats Error:", e);
    }
}

run();
