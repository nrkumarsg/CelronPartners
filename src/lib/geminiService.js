import { runAI } from './ai/engine.js';

/**
 * Sends a message to Gemini with optional image data and tools.
 * Redirects to the centralized AI engine.
 */
export async function chatWithGemini(prompt, base64Image = null, history = [], tools = null) {
    // If it's just a text chat, we can use a generic "research" or custom task.
    // For now, we'll implement a raw runner in engine.js or just use fetch here but with engine's config.
    // To keep it simple, we'll use runAI with a custom prompt if needed.
    
    // For image identification, we use a specific prompt
    if (base64Image) {
        return runAI('autofill', { prompt, image: base64Image }, history, tools);
    }
    
    return runAI('research', prompt, history, tools);
}

/**
 * Image-to-Terms Extraction: Uses Gemini to turn a photo into a search query.
 */
export async function extractTermsFromImage(base64Image) {
    const data = await runAI('autofill', { 
        task: 'Extract search terms from image',
        image: base64Image 
    });
    return data.raw || data.query || data.vessel_name || "";
}

/**
 * Smart Search Company Auto-fill: Redirects to runAI('autofill')
 */
export async function smartSearchCompany(companyName, website = '', searchContext = '') {
    const tools = [{ google_search: {} }];
    try {
        const data = await runAI('autofill', { companyName, website, searchContext }, [], tools);
        const cleanValue = (val) => (val === '-' || val === 'null' || !val) ? '' : val;

        return {
            company_name: data.company_name || companyName,
            website: data.website || website,
            uen: cleanValue(data.uen),
            email: cleanValue(data.email),
            phone: cleanValue(data.phone),
            country: data.country || "Singapore",
            city: cleanValue(data.city),
            postal_code: cleanValue(data.postal_code),
            address: cleanValue(data.address),
            categories: data.categories || ["Supplier"],
            brands: cleanValue(data.brands),
            activity_summary: cleanValue(data.activity_summary),
            confidence: data.confidence || "medium",
            manual_verification_required: data.manual_verification_required ?? true
        };
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
 * Intelligent Company Research: Redirects to smartSearchCompany
 */
export async function researchCompanyWithGemini(companyName, searchContext = '') {
    const data = await smartSearchCompany(companyName, '', searchContext);
    return {
        fields: {
            uen: data.uen || '',
            address: data.address || '',
            country: data.country || '',
            city: data.city || '',
            pincode: data.postal_code || '',
            email1: data.email || '',
            phone1: data.phone || '',
            weblink: data.website || ''
        },
        extraInfo: `Categories: ${data.categories?.join(', ') || ''}. Confidence: ${data.confidence}.`
    };
}

/**
 * Contact Profiling: Redirects to runAI('autofill')
 */
export async function researchContactWithGemini(name, companyName) {
    const tools = [{ google_search: {} }];
    try {
        const data = await runAI('autofill', { contact_name: name, company_name: companyName }, [], tools);
        return {
            fields: {
                post: data.post || data.designation || '',
                email: data.email || '',
                phone: data.phone || '',
                handphone: data.mobile || '',
                address: data.address || ''
            }
        };
    } catch (err) {
        console.error('Gemini Contact Error:', err);
        throw new Error('Failed to profile contact via AI.');
    }
}

/**
 * Vessel Intelligence: Redirects to runAI('autofill')
 */
export async function researchVesselWithGemini(vesselName, imoNumber = '', mmsi = '', searchContext = '') {
    const tools = [{ google_search: {} }];
    try {
        const data = await runAI('autofill', { 
            vessel_name: vesselName, 
            imo_number: imoNumber, 
            mmsi: mmsi,
            searchContext 
        }, [], tools);
        
        return {
            fields: {
                vessel_name: data.vessel_name || vesselName,
                imo_number: data.imo_number || imoNumber || '',
                mmsi: data.mmsi || mmsi || '',
                vessel_type: data.vessel_type || '',
                vessel_management: data.vessel_management || '',
                vessel_owner: data.vessel_owner || ''
            },
            confidence: data.confidence || 'medium',
            manual_verification_required: data.manual_verification_required ?? true
        };
    } catch (err) {
        console.error('Gemini Vessel Error:', err);
        // Fallback to manual entry if AI fails (e.g. quota or key leak)
        return {
            fields: {
                vessel_name: vesselName,
                imo_number: imoNumber || '',
                mmsi: mmsi || '',
                vessel_type: '',
                vessel_management: '',
                vessel_owner: ''
            },
            confidence: 'none',
            error: err.message || 'AI Research temporarily unavailable'
        };
    }
}


/**
 * Real-time Exchange Rate: Uses Gemini + Google Search to find current currency rates.
 */
export async function getExchangeRateWithGemini(fromCurrency, toCurrency = 'SGD') {
    const tools = [{ google_search: {} }];
    const prompt = `Find the current exchange rate for 1 ${fromCurrency} to ${toCurrency} for today ${new Date().toLocaleDateString()}. 
    Return ONLY a JSON object with the "rate" (number) and "source" (string). Example: {"rate": 1.36, "source": "Google Search"}`;
    
    try {
        const data = await runAI('research', prompt, [], tools);
        // Sometimes Gemini returns a string instead of parsed JSON if the engine doesn't auto-parse research tasks
        if (typeof data === 'string') {
            const match = data.match(/\{.*\}/s);
            if (match) return JSON.parse(match[0]);
        }
        return {
            rate: data.rate || 1,
            source: data.source || 'AI Estimate'
        };
    } catch (err) {
        console.error('Gemini FX Error:', err);
        return { rate: 1, error: 'Failed to fetch rate' };
    }
}
