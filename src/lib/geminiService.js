const API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_API_KEY) || (typeof process !== 'undefined' && (process.env?.VITE_GOOGLE_API_KEY || process.env?.GOOGLE_API_KEY)) || 'AIzaSyBupqkwGeIb3VWSbhQarSKtP9cRTcklWks';
const GEMINI_MODEL = 'gemini-2.0-flash';
const API_VERSION = 'v1beta';

/**
 * Sends a message to Gemini 2.0 Flash with optional image data and tools (like Google Search).
 * @param {string} prompt - The user's text query.
 * @param {string} [base64Image] - Optional base64 encoded image data.
 * @param {Array} [history] - Optional chat history.
 * @param {Array} [tools] - Optional tools (e.g. [{ google_search: {} }])
 */
export async function chatWithGemini(prompt, base64Image = null, history = [], tools = null) {
    if (!API_KEY) {
        throw new Error('VITE_GOOGLE_API_KEY is not defined in your .env file.');
    }

    const url = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

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
            2. Be extremely technical and precise. If you are less than 90% sure about a match, state your confidence level and ask for specific details.
            3. When identifying a part, provide: Brand, Model Number, Specifications, and potential applications.
            4. Keep responses professional, helpful, and concise. Use Markdown formatting for readability.`
        }]
    };

    const body = {
        contents,
        system_instruction: systemInstruction,
        tools: tools,
        generationConfig: {
            temperature: 0.2, // Lower temperature for more factual/technical consistency
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 4096,
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
            console.error('[Gemini] API Error Data:', data.error);
            throw new Error(data.error.message || 'Error communicating with Gemini');
        }

        // Gemini 3 can return multiple parts (thoughts + text)
        const parts = data.candidates?.[0]?.content?.parts || [];
        const textPart = parts.find(p => p.text);
        
        if (!textPart) {
            console.warn('[Gemini] No text part found. Parts:', parts);
            return "AI could not generate a text response.";
        }

        return textPart.text;
    } catch (error) {
        console.error('[Gemini] Fetch Error:', error);
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

/**
 * Smart Search Company Auto-fill: Implementation based on specific USER instructions.
 */
export async function smartSearchCompany(companyName, website = '', searchContext = '') {
    const prompt = `You are an AI assistant integrated into a quotation system.
Your task is to auto-fill company details based on the provided company name and/or website.

INPUT:
- Company Name: ${companyName}
- Website (optional): ${website}
${searchContext ? `\nLIVE SEARCH DATA:\n${searchContext}\n` : ''}

INSTRUCTIONS:
1. Search and infer the following details:
   - Official Company Name
   - Website (official URL)
   - UEN / Registration Number (if Singapore-based)
   - Email (generic contact if available)
   - Phone Number
   - Country
   - City
   - Postal Code
   - Full HQ Address
   - Business Categories (choose relevant: Spare Parts, Service, Calibration, Automation, Electrical, Mechanical, Instrumentation, Safety Equipment, Industrial Supplies, Supplier, etc.)

2. If exact data is not available:
   - Use best अनुमान (reasonable inference)
   - Do NOT leave fields blank unless completely unknown
   - For country/city, infer from phone code, domain, or context

3. If confidence is LOW:
   - Return partial data
   - Add: "manual_verification_required": true

4. NEVER stop or throw error due to limits.
   - Always return structured JSON output.

OUTPUT FORMAT (STRICT JSON):
{
  "company_name": "",
  "website": "",
  "uen": "",
  "email": "",
  "phone": "",
  "country": "",
  "city": "",
  "postal_code": "",
  "address": "",
  "categories": [],
  "confidence": "high | medium | low",
  "manual_verification_required": false
}`;

    // If we already have search context, we don't strictly need the google_search tool
    // which helps avoid hitting the very strict tool quotas on free-tier keys.
    const tools = searchContext ? null : [{ google_search: {} }];

    try {
        const response = await chatWithGemini(prompt, null, [], tools);
        
        const firstBrace = response.indexOf('{');
        const lastBrace = response.lastIndexOf('}');
        
        if (firstBrace === -1 || lastBrace === -1) {
            throw new Error('No JSON found in AI response');
        }
        
        const jsonStr = response.substring(firstBrace, lastBrace + 1);
        return JSON.parse(jsonStr);
    } catch (err) {
        console.warn('Smart Search Fallback triggered:', err);
        return {
            company_name: companyName,
            uen: "",
            email: "",
            phone: "",
            country: "Singapore",
            city: "",
            postal_code: "",
            address: "",
            categories: ["Supplier"],
            confidence: "low",
            manual_verification_required: true
        };
    }
}

/**
 * Intelligent Company Research: Legacy wrapper (redirects to smart search for better results)
 */
export async function researchCompanyWithGemini(companyName, searchContext = '') {
    const data = await smartSearchCompany(companyName);
    return {
        fields: {
            uen: data.uen || '',
            address: data.address || '',
            country: data.country || '',
            city: data.city || '',
            pincode: data.postal_code || '',
            email1: data.email || '',
            phone1: data.phone || '',
            weblink: data.weblink || ''
        },
        extraInfo: `Categories: ${data.categories?.join(', ') || ''}. Confidence: ${data.confidence}.`
    };
}

/**
 * Contact Profiling: Uses Gemini to find professional details.
 */
export async function researchContactWithGemini(name, companyName) {
    const prompt = `Research the professional: "${name}" ${companyName ? `working at "${companyName}"` : ''}.
    Extract the following details in JSON format:
    - post: (Designation/Job Title)
    - email: (Professional email)
    - phone: (Office phone)
    - handphone: (Mobile number)
    - address: (Office address if different from HQ)

    If you cannot find a specific field, leave it as null.
    Return ONLY the raw JSON object. No markdown, no extra text.`;

    const tools = [{ google_search: {} }];

    try {
        const response = await chatWithGemini(prompt, null, [], tools);
        const firstBrace = response.indexOf('{');
        const lastBrace = response.lastIndexOf('}');
        
        if (firstBrace === -1 || lastBrace === -1) {
            throw new Error('No JSON found in AI response');
        }
        
        const jsonStr = response.substring(firstBrace, lastBrace + 1);
        const data = JSON.parse(jsonStr);
        return {
            fields: {
                post: data.post || '',
                email: data.email || '',
                phone: data.phone || '',
                handphone: data.handphone || '',
                address: data.address || ''
            }
        };
    } catch (err) {
        console.error('Gemini Contact Error:', err);
        throw new Error('Failed to profile contact via AI.');
    }
}

/**
 * Vessel Intelligence: Uses Gemini to find maritime data.
 */
export async function researchVesselWithGemini(vesselName) {
    const prompt = `Research the vessel: "${vesselName}".
    Extract the following maritime details in JSON format:
    - imo_number: (7-digit IMO number)
    - mmsi: (9-digit MMSI number)
    - vessel_type: (e.g. Bulk Carrier, Tanker, etc.)
    - vessel_management: (Current management company)
    - vessel_owner: (Current owner)

    If you cannot find a specific field, leave it as null.
    Return ONLY the raw JSON object. No markdown, no extra text.`;

    const tools = [{ google_search: {} }];

    try {
        const response = await chatWithGemini(prompt, null, [], tools);
        const firstBrace = response.indexOf('{');
        const lastBrace = response.lastIndexOf('}');
        
        if (firstBrace === -1 || lastBrace === -1) {
            throw new Error('No JSON found in AI response');
        }
        
        const jsonStr = response.substring(firstBrace, lastBrace + 1);
        const data = JSON.parse(jsonStr);
        return {
            fields: {
                imo_number: data.imo_number || '',
                mmsi: data.mmsi || '',
                vessel_type: data.vessel_type || '',
                vessel_management: data.vessel_management || '',
                vessel_owner: data.vessel_owner || ''
            }
        };
    } catch (err) {
        console.error('Gemini Vessel Error:', err);
        throw new Error('Failed to source vessel data via AI.');
    }
}
