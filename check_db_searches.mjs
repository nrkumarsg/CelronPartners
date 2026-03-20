
import dotenv from 'dotenv';
dotenv.config();
import { supabase } from './src/lib/supabase.js';

async function check() {
    try {
        const { data: searches, error } = await supabase
            .from('searches')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error fetching searches:', error);
            return;
        }

        console.log(`Found ${searches.length} recent searches.`);
        for (const s of searches) {
            console.log(`- ID: ${s.id}, Query: "${s.query}", Total: ${s.total_results}, Date: ${s.created_at}`);
            if (s.total_results > 0) {
                const { data: results } = await supabase
                    .from('search_results')
                    .select('supplier_name')
                    .eq('search_id', s.id)
                    .limit(3);
                console.log(`  Sample: ${results.map(r => r.supplier_name).join(', ')}`);
            }
        }
    } catch (e) {
        console.error('Check failed:', e);
    }
}

check();
