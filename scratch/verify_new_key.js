const API_KEY = 'AIzaSyDasTT2wm8TGbeBvwScbdVRIotE8IXWisA';
const API_VERSION = 'v1beta';

async function listModels() {
    const url = `https://generativelanguage.googleapis.com/${API_VERSION}/models?key=${API_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.models) {
            console.log("SUCCESS: Key is valid. Found " + data.models.length + " models.");
        } else {
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error(e);
    }
}

listModels();
