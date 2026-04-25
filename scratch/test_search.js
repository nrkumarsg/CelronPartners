import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const GOOGLE_API = 'AIzaSyA5YW4mWUo__7hwGjvLor-DDsh-spg2r5M';
const GOOGLE_CX = '259ae1101668d4071';

async function testSearch(query) {
    let webUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}`;
    console.log('Searching:', webUrl);
    
    try {
        const res = await fetch(webUrl);
        const json = await res.json();
        if (json.error) {
            console.error('Google API Error:', json.error);
        } else {
            console.log('Results found:', json.items?.length || 0);
            if (json.items) {
                json.items.slice(0, 3).forEach((item, i) => {
                    console.log(`[${i}] ${item.title}`);
                    console.log(`    ${item.snippet}`);
                });
            }
        }
    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

testSearch('Powerhouse controls pte ltd');
