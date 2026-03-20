import { supabase } from './src/lib/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkColumns() {
    const { data, error } = await supabase
        .from('calibration_records')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching record:", error);
    } else if (data && data.length > 0) {
        console.log("Columns in calibration_records:", Object.keys(data[0]));
    } else {
        console.log("No records found to inspect columns.");
    }
}

checkColumns();
