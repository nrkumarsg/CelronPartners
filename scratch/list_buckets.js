import '../server/loadEnv.js';
import { supabase } from '../src/lib/supabase.js';

async function listBuckets() {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error("Error listing buckets:", error);
    } else {
        console.log("Existing buckets:", buckets.map(b => b.name).join(', '));
    }
}

listBuckets();
