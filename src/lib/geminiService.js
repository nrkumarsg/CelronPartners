// src/lib/geminiService.js
const API_KEY = (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_API_KEY) ||
    (typeof process !== 'undefined' && (process.env?.VITE_GOOGLE_API_KEY || process.env?.GOOGLE_API_KEY)) ||
    'AIzaSyA5YW4mWUo__7hwGjvLor-DDsh-spg2r5M' // Fallback to verified key
);
const GEMINI_MODEL = 'gemini-1.5-flash';

/**
 * Sends a message to Gemini 1.5 Flash with optional image data.
 * @param {string} prompt - The user's text query.
 * @param {string} [base64Image] - Optional base64 encoded image data.
 * @param {Array} [history] - Optional chat history.
 */
export async function chatWithGemini(prompt, base64Image = null, history = []) {
    if (!API_KEY) {
        throw new Error('VITE_GOOGLE_API_KEY is not defined in your .env file.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

    const contents = [...history];

    const messagePart = {
        role: 'user',
        parts: [{ text: prompt }]
    };

    if (base64Image) {
        // Remove data:image/...;base64, prefix if present
        const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
        messagePart.parts.push({
            inline_data: {
                mime_type: 'image/jpeg', // Default to jpeg, can be refined
                data: cleanBase64
            }
        });
    }

    contents.push(messagePart);

    const systemInstruction = {
        parts: [{
            text: `You are the "Spare Parts Assistant" for Celron Hub. Your goal is to help users identify marine and industrial spare parts with 90% accuracy.
            1. If an image is provided, analyze it deeply. Look for part numbers, brand logos, dimensions, and nameplates.
            2. Be extremely technical and precise. If you are less than 90% sure about a match, state your confidence level and ask for specific details (e.g., "Please provide a clear photo of the nameplate" or "What is the voltage rating?").
            3. When identifying a part, provide: Brand, Model Number, Specifications, and potential applications.
            4. Keep responses professional, helpful, and concise. Use Markdown formatting for readability.`
        }]
    };

    const body = {
        contents,
        system_instruction: systemInstruction,
        generationConfig: {
            temperature: 0.2, // Lower temperature for more factual/technical consistency
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 2048,
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message || 'Error communicating with Gemini');
        }

        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw error;
    }
}

/**
 * Image-to-Terms Extraction: Uses Gemini to turn a photo into a search query.
 */
export async function extractTermsFromImage(base64Image) {
    const prompt = `Analyze this image of a spare part. Extract the Brand, Model number, and Part name. 
    Construct a concise search query (max 10 words) to find worldwide suppliers for this exact part.
    Return ONLY the query string. No extra text, no quotes.`;

    const response = await chatWithGemini(prompt, base64Image);
    return response.replace(/["']/g, "").trim();
}
