// scratch/test_smart_search.js
import { smartSearchCompany } from '../src/lib/geminiService.js';

async function test() {
    console.log('--- Testing Smart Search: Apple Inc ---');
    try {
        const result = await smartSearchCompany('Apple Inc', 'https://apple.com');
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }

    console.log('\n--- Testing Smart Search: Local SG Company (Cel-Ron) ---');
    try {
        const result = await smartSearchCompany('Cel-Ron Enterprises Pte Ltd');
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
