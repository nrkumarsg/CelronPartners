import fetch from 'node-fetch';

const API_KEY = 'AIzaSyA5YW4mWUo__7hwGjvLor-DDsh-spg2r5M';
const GEMINI_MODEL = 'gemini-1.5-flash';

async function testGemini() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;
    
    const body = {
        contents: [{
            role: 'user',
            parts: [{ text: 'Research the company: POWERHOUSE CONTROLS PTE LTD. Return JSON with uen, address, email.' }]
        }],
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        console.log('Gemini Response Status:', response.status);
        if (data.error) {
            console.error('Gemini Error:', data.error);
        } else {
            console.log('Success:', data.candidates[0].content.parts[0].text);
        }
    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

testGemini();
