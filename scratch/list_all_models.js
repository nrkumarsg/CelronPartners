const API_KEY = 'AIzaSyDasTT2wm8TGbeBvwScbdVRIotE8IXWisA';
const API_VERSION = 'v1beta';

async function checkModel() {
    const url = `https://generativelanguage.googleapis.com/${API_VERSION}/models?key=${API_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log("All models:");
        console.log(JSON.stringify(data.models.map(m => m.name), null, 2));
    } catch (e) {
        console.error(e);
    }
}

checkModel();
