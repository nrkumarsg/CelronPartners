import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function run() {
    const { data, error } = await supabase.from('partners').select('*');
    if (error) {
        console.error(error);
        return;
    }
    console.log(data.map(p => p.types));

    // Test the logic that might be crashing
    try {
        const types = data.flatMap(p => p.types || []);
        console.log("Types after flatMap:", types);
        const categories = [...new Set(types)].sort();
        console.log("Categories:", categories);
    } catch (e) {
        console.error("Crash!", e);
    }
}

run();
