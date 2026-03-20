import fetch from 'node-fetch';

const API_KEY = 'AIzaSyA5YW4mWUo__7hwGjvLor-DDsh-spg2r5M';
const MODELS = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-pro'];
const VERSIONS = ['v1', 'v1beta'];

async function test() {
    for (const v of VERSIONS) {
        for (const m of MODELS) {
            const url = `https://generativelanguage.googleapis.com/${v}/models/${m}:generateContent?key=${API_KEY}`;
            try {
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: 'hi' }] }]
                    })
                });
                const data = await resp.json();
                if (data.error) {
                    console.log(`FAIL: ${v} - ${m}: ${data.error.message}`);
                } else if (data.candidates) {
                    console.log(`SUCCESS: ${v} - ${m}`);
                } else {
                    console.log(`UNKNOWN: ${v} - ${m}: ${JSON.stringify(data)}`);
                }
            } catch (e) {
                console.log(`ERROR: ${v} - ${m}: ${e.message}`);
            }
        }
    }
}

test();
