const API_KEY = 'AIzaSyBupqkwGeIb3VWSbhQarSKtP9cRTcklWks';
const API_VERSION = 'v1beta';

async function listModels() {
    const url = `https://generativelanguage.googleapis.com/${API_VERSION}/models?key=${API_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

listModels();
