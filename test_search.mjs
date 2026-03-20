
import dotenv from 'dotenv';
dotenv.config();
import { runUniversalSearch } from './src/lib/universalFinder.js';

import { supabase } from './src/lib/supabase.js';

async function test() {
    const query = 'marine engine spare parts';
    console.log(`Testing search for: ${query}`);
    try {
        const searchId = await runUniversalSearch({
            query,
            userId: '00000000-0000-0000-0000-000000000000' // Dummy ID
        });
        console.log(`Search ID created: ${searchId}`);

        const { data: results, error } = await supabase
            .from('search_results')
            .eq('search_id', searchId);

        if (error) {
            console.error('Error fetching results:', error);
        } else {
            console.log(`Found ${results.length} results.`);
            results.forEach((r, i) => {
                console.log(`${i + 1}. ${r.supplier_name} - ${r.url}`);
            });
        }
    } catch (e) {
        console.error('Search failed:', e);
    }
}

test();
