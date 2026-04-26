import fetch from 'node-fetch';

const API_KEY = 'AIzaSyBfT3-KSeOlJhLZAC7FTkLFaK3WlQz-ANs';
const GEMINI_MODEL = 'gemini-flash-latest';

async function testSearch() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;
    
    const body = {
        contents: [{
            parts: [{ text: "Research the company: CEL-RON ENTERPRISES PTE LTD. Return JSON with uen, address, website." }]
        }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.1 }
    };

    console.log("Sending request to Gemini...");
    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await resp.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    }
}

testSearch();
