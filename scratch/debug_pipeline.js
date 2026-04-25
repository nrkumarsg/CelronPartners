// scratch/debug_pipeline.js
import { runUniversalSearch } from '../src/lib/universalFinder.js';
import { smartSearchCompany } from '../src/lib/geminiService.js';
import { supabase } from '../src/lib/supabase.js';

async function debug() {
    const companyName = 'CEL-RON ENTERPRISES PTE LTD';
    console.log(`--- Debugging Pipeline for: ${companyName} ---`);

    try {
        console.log('1. Running Universal Search...');
        const searchId = await runUniversalSearch({ 
            query: companyName, 
            userId: '00000000-0000-0000-0000-000000000000' 
        });
        console.log('Search ID:', searchId);

        console.log('2. Fetching Search Results from DB...');
        const { data: results, error } = await supabase
            .from('search_results')
            .select('title, snippet, url')
            .eq('search_id', searchId);
        
        if (error) throw error;
        console.log(`Found ${results?.length || 0} results.`);
        
        const searchContext = results.map(r => `[Web Data] ${r.title}: ${r.snippet}`).join('\n');
        console.log('Context Length:', searchContext.length);

        console.log('3. Running Smart Search (Gemini 3)...');
        const aiResult = await smartSearchCompany(companyName, '', searchContext);
        console.log('AI Result:', JSON.stringify(aiResult, null, 2));

    } catch (e) {
        console.error('Pipeline Error:', e);
    }
}

debug();
