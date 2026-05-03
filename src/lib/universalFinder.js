// src/lib/universalFinder.js
import { supabase } from './supabase.js';
import { chatWithGemini } from './geminiService.js';

const GOOGLE_API_KEYS = [
  (typeof process !== 'undefined' && process.env?.VITE_GOOGLE_API_KEY) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_API_KEY),
  'AIzaSyDasTT2wm8TGbeBvwScbdVRIotE8IXWisA',
  'AIzaSyAA9BV8_mIBmZ58RU4HLAc-3GuFPqqXLKM',
  'AIzaSyBfT3-KSeOlJhLZAC7FTkLFaK3WlQz-ANs',
  'AIzaSyA5YW4mWUo__7hwGjvLor-DDsh-spg2r5M'
].filter(Boolean);

const GOOGLE_CX = (typeof process !== 'undefined' && (process.env.VITE_GOOGLE_CX || process.env.GOOGLE_CX)) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CX) || 'd6a6c15e9403b4a9d';

const COUNTRY_CODES = {
    'Singapore': 'SG', 'Malaysia': 'MY', 'Indonesia': 'ID', 'Thailand': 'TH', 'Vietnam': 'VN',
    'Philippines': 'PH', 'United Arab Emirates': 'AE', 'Saudi Arabia': 'SA', 'Qatar': 'QA',
    'United Kingdom': 'GB', 'United States': 'US', 'Germany': 'DE', 'China': 'CN', 'India': 'IN'
};

/**
 * Perform a deep maritime/industrial search for a partner or entity.
 */
export async function performMaritimeIntelligenceSearch({
    query,
    userId,
    brand = '',
    country = '',
    category = '',
    restrictToCountry = false,
    skipAi = false
}) {
    // 1. Check for existing recent search (Cache)
    const { data: existingSearch } = await supabase
        .from('searches')
        .select('id, created_at')
        .eq('query', query)
        .order('created_at', { ascending: false })
        .limit(1);

    if (existingSearch && existingSearch.length > 0) {
        const ageHours = (new Date() - new Date(existingSearch[0].created_at)) / (1000 * 60 * 60);
        if (ageHours < 24) {
            console.log(`[Finder] Reusing recent search:`, existingSearch[0].id);
            return existingSearch[0].id;
        }
    }

    // 2. Perform Live Search using Key Rotation
    return runUniversalSearch({ query, userId, skipAi });
}

export async function runUniversalSearch(params, keyIndex = 0) {
    if (keyIndex >= GOOGLE_API_KEYS.length) {
        console.error('All Google Search API keys exhausted');
        return null;
    }
    const currentKey = GOOGLE_API_KEYS[keyIndex];
    
    try {
        const { query, userId } = params;
        if (!query) return null;

        // 1. Create Search Entry
        const { data: search, error: searchErr } = await supabase
            .from('searches')
            .insert({ 
                query, 
                user_id: userId,
                source: 'maritime_finder' // Added required field
            })
            .select()
            .single();
        
        if (searchErr) throw searchErr;

        // 2. Call Google Search API
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${currentKey}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}`;
        const response = await fetch(searchUrl);
        const data = await response.json();

        if (data.error) {
            const isRetryable = [429, 403, 400].includes(data.error.code);
            if (isRetryable) {
                console.warn(`[Finder] Key ${keyIndex} failed (${data.error.code}). Trying next...`);
                return runUniversalSearch(params, keyIndex + 1);
            }
            throw new Error(data.error.message);
        }

        // 3. Store Results
        const results = (data.items || []).map(item => ({
            search_id: search.id,
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            pagemap: item.pagemap
        }));

        if (results.length > 0) {
            const { error: resErr } = await supabase.from('search_results').insert(results);
            if (resErr) console.error('Error saving search results:', resErr);
        }

        return search.id;
    } catch (err) {
        console.error('[Finder] Search failed on Key:', keyIndex, err);
        return runUniversalSearch(params, keyIndex + 1);
    }
}
