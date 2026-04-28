import fetch from 'node-fetch';

const GOOGLE_API = 'AIzaSyDasTT2wm8TGbeBvwScbdVRIotE8IXWisA';
const GOOGLE_CX = 'd6a6c15e9403b4a9d';
const query = 'ROTA-MACH ELECTRICAL SERVICES';

async function testSearch() {
    let webUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}`;
    console.log(`Searching: ${webUrl}`);
    
    try {
        const res = await fetch(webUrl);
        const json = await res.json();
        if (json.error) {
            console.error('Google Search Error:', json.error);
        } else {
            console.log('Results Found:', json.items?.length || 0);
            if (json.items) {
                json.items.forEach((item, i) => {
                    console.log(`[${i}] ${item.title}`);
                });
            }
        }
    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

testSearch();
