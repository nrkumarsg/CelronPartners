import fetch from 'node-fetch';

const API_KEY = 'AIzaSyDasTT2wm8TGbeBvwScbdVRIotE8IXWisA';
const modelName = 'gemini-2.5-flash';
const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${API_KEY}`;

async function testGemini() {
    console.log(`Testing Gemini: ${url}`);
    const body = {
        contents: [{ role: 'user', parts: [{ text: 'Who is Rota-Mach Electrical Services in Singapore?' }] }]
    };
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const json = await res.json();
        if (json.error) {
            console.error('Gemini Error:', json.error);
        } else {
            console.log('Gemini Response:', json.candidates?.[0]?.content?.parts?.[0]?.text);
        }
    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

testGemini();
