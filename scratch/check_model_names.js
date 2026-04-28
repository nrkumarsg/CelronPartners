const API_KEY = 'AIzaSyDasTT2wm8TGbeBvwScbdVRIotE8IXWisA';
const API_VERSION = 'v1beta';

async function checkModel() {
    const url = `https://generativelanguage.googleapis.com/${API_VERSION}/models?key=${API_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        const flash = data.models.find(m => m.name.includes('gemini-1.5-flash'));
        console.log(JSON.stringify(flash, null, 2));
        
        // Also list a few others to be sure
        console.log("Top 10 models:");
        console.log(JSON.stringify(data.models.slice(0, 10).map(m => m.name), null, 2));
    } catch (e) {
        console.error(e);
    }
}

checkModel();
