
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
    try {
        console.log("Checking work_locations columns...");
        const { data, error } = await supabase.from('work_locations').select('*').limit(1);
        if (error) {
            console.error("Error fetching work_locations:", error);
        } else {
            console.log("work_locations sample:", data[0]);
        }

        console.log("\nChecking vessels columns...");
        const { data: vData, error: vError } = await supabase.from('vessels').select('*').limit(1);
        if (vError) {
            console.error("Error fetching vessels:", vError);
        } else {
            console.log("vessels sample:", vData[0]);
        }
    } catch (e) {
        console.error("Fatal error:", e);
    }
}

checkSchema();
