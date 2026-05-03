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
 * Smart Search Company Auto-fill: Multi-Stage Orchestrator
 */
/**
 * Smart Search Company Auto-fill: 3-Stage Pipeline
 */
export async function smartSearchCompany(companyName, website = '', searchContext = '') {
    const tools = [{ google_search: {} }];
    try {
        // STAGE 1: Raw Research (No JSON constraint, allows Tool usage)
        console.log('[AI Stage 1] Researching using Google Search Tool...');
        const researchSummary = await runAI('research', { 
            query: `Find official UEN, address, email, phone, and brands for company: ${companyName}. Website: ${website}. Additional Context: ${searchContext}`,
            useTools: true 
        }, [], tools);

        // STAGE 2: Extraction (Strict JSON)
        console.log('[AI Stage 2] Extracting structured data...');
        const extractData = await runAI('autofill', { 
            companyName, 
            website, 
            searchContext: typeof researchSummary === 'string' ? researchSummary : JSON.stringify(researchSummary)
        }, [], null); // No tools needed here, just extraction
        
        // STAGE 3: Deep Verification (If needed)
        const confidence = extractData.confidence || 0;
        if (confidence < 80 || !extractData.uen) {
            console.log('[AI Stage 3] Deep Verifying...');
            const verifyData = await runAI('autofill', { 
                isVerification: true, 
                extractedData: extractData, 
                searchContext: typeof researchSummary === 'string' ? researchSummary : JSON.stringify(researchSummary)
            }, [], tools);
            
            return formatResult({ ...extractData, ...verifyData }, companyName, website);
        }

        return formatResult(extractData, companyName, website);
    } catch (err) {
        console.warn('Smart Search Pipeline failed:', err);
        return {
            company_name: companyName,
            confidence: 0,
            manual_verification_required: true
        };
    }
}

function formatResult(data, companyName, website) {
    const cleanValue = (val) => (val === '-' || val === 'null' || !val) ? '' : val;
    return {
        company_name: data.company_name || companyName,
        website: data.website || website || data.website,
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
        confidence: data.confidence || 50,
        manual_verification_required: data.manual_verification_required ?? true
    };
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

/**
 * Natural Language to Filters: Converts a user query into structured filters for lists.
 */
export async function translateQueryToFilters(query, context = {}) {
    const { partners = [], departments = [], categories = [] } = context;
    
    const prompt = `
        Convert this user query into search filters for a Contact Directory.
        Query: "${query}"
        
        Available Partners: ${JSON.stringify(partners.slice(0, 200).map(p => ({ id: p.id, name: p.name })))}
        Available Departments: ${JSON.stringify(departments)}
        Available Categories: ${JSON.stringify(categories)}
        
        Return ONLY a valid JSON object with these fields:
        {
          "searchTerm": "string or empty",
          "partnerId": "string ID from available partners or empty",
          "department": "string from available departments or empty",
          "type": "string from available categories or empty"
        }
        
        Rules:
        1. If they mention a company, try to match it to a partnerId.
        2. If they mention a role or category (e.g. Sales, Technical), match to department or type.
        3. Use searchTerm for any remaining descriptive words.
    `;

    try {
        const response = await runAI('filter', prompt);
        // engine.js runFilterTask returns runWithFallback which auto-parses JSON
        if (response && (response.searchTerm !== undefined || response.partnerId)) {
            return response;
        }
        
        let text = typeof response === 'string' ? response : response.raw || JSON.stringify(response);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return {};
    } catch (err) {
        console.error('Gemini Filter Translation Error:', err);
        return {};
    }
}
/**
 * Business Card OCR Parsing: Converts raw OCR text into structured contact details.
 */
export async function parseOCRBusinessCard(text) {
    const prompt = `
        Analyze this raw OCR text from a business card (front and/or back).
        Extract structured contact information.
        Text: "${text}"
        
        Return ONLY a JSON object with these fields (use empty string if not found):
        {
          "company_name": "string",
          "person_name": "string",
          "designation": "string",
          "email": "string",
          "phone": "string",
          "mobile": "string",
          "address": "string",
          "website": "string",
          "services": "string (comma separated list of services/activities mentioned)",
          "brands": "string (comma separated list of brands mentioned)"
        }
    `;

    try {
        const response = await runAI('autofill', { prompt });
        return response;
    } catch (err) {
        console.error('OCR Parsing Error:', err);
        return null;
    }
}
/**
 * Image to Items Extraction: Converts raw OCR text into structured line items for documents.
 */
export async function extractLineItemsFromImage(text) {
    const prompt = `
        Analyze this raw OCR text which contains a list of items (likely from an invoice, quotation, or packing list).
        Extract a structured array of line items.
        Text: "${text}"
        
        Return ONLY a JSON array of objects with these fields:
        [
          {
            "name": "string (main item name)",
            "specification": "string (technical details/specs)",
            "quantity": number,
            "uom": "string (unit of measure e.g. PCS, SET, KG)",
            "unit_price": number (if found, else 0),
            "total_amount": number (if found, else 0)
          }
        ]
        
        Rules:
        1. Try to separate Name from Specification.
        2. Clean up any OCR artifacts.
        3. If quantity is missing, default to 1.
    `;

    try {
        const response = await runAI('autofill', { prompt });
        return Array.isArray(response) ? response : [];
    } catch (err) {
        console.error('Line Item Extraction Error:', err);
        return [];
    }
}
