const API_KEY = (typeof process !== 'undefined' && process.env?.VITE_GOOGLE_API_KEY) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_API_KEY) || 'AIzaSyDasTT2wm8TGbeBvwScbdVRIotE8IXWisA';

// -----------------------------
// CONFIG (2026 Stable Models)
// -----------------------------
const MODELS = {
  FAST: "gemini-2.5-flash", 
  SMART: "gemini-2.5-flash",  
};

const API_VERSION = 'v1beta';

const DEFAULT_CONFIG = {
  temperature: 0.4,
  topP: 0.9,
  maxOutputTokens: 4096,
};

// -----------------------------
// CORE RUNNER (WITH FALLBACK)
// -----------------------------
async function runWithFallback(prompt, useSmart = false, history = [], tools = null, image = null) {
  const modelName = useSmart ? MODELS.SMART : MODELS.FAST;
  const url = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${modelName}:generateContent?key=${API_KEY}`;

  const contents = [...history];
  const userPart = { text: prompt };
  const parts = [userPart];

  if (image) {
    // Check if it's a base64 string with prefix
    const base64Data = image.includes('base64,') ? image.split('base64,')[1] : image;
    const mimeType = image.match(/data:([^;]+);/) ? image.match(/data:([^;]+);/)[1] : 'image/jpeg';
    
    parts.unshift({
      inlineData: {
        mimeType: mimeType,
        data: base64Data
      }
    });
  }

  contents.push({ role: 'user', parts });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        tools: tools,
        generationConfig: DEFAULT_CONFIG,
      })
    });


    const data = await response.json();
    
    if (data.error) {
      // Quota or model issues
      if (data.error.status === 'RESOURCE_EXHAUSTED') {
         if (tools) {
            console.warn(`[AI Engine] Search tool quota exceeded. Retrying without tools...`);
            return runWithFallback(prompt + " (Search tool unavailable, use internal knowledge)", useSmart, history, null);
         }
         console.warn(`[AI Engine] ${modelName} quota exceeded. Retrying with fallback key...`);
         const hardcodedKey = 'AIzaSyDasTT2wm8TGbeBvwScbdVRIotE8IXWisA';
         if (!url.includes(hardcodedKey)) {
             const newUrl = url.split('?')[0] + `?key=${hardcodedKey}`;
             const retryRes = await fetch(newUrl, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ contents, tools, generationConfig: DEFAULT_CONFIG })
             });
             const retryData = await retryRes.json();
             if (!retryData.error) {
                 const text = retryData.candidates?.[0]?.content?.parts?.[0]?.text;
                 return safeJSONParse(text);
             }
         }
         if (!useSmart) return runWithFallback(prompt, true, history, tools);
      }
      if (data.error.status === 'NOT_FOUND') {
         console.warn(`[AI Engine] ${modelName} not found, switching...`);
         if (!useSmart) return runWithFallback(prompt, true, history, tools);
      }
      if (data.error.status === 'INVALID_ARGUMENT' && data.error.message.includes('API key not valid')) {
          const hardcodedKey = 'AIzaSyDasTT2wm8TGbeBvwScbdVRIotE8IXWisA';
          if (url.includes(hardcodedKey)) throw new Error("CRITICAL: Hardcoded API Key is also invalid.");
          console.warn(`[AI Engine] Environment API Key invalid. Retrying with hardcoded fallback...`);
          const newUrl = url.split('?')[0] + `?key=${hardcodedKey}`;
          const retryRes = await fetch(newUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents, tools, generationConfig: DEFAULT_CONFIG })
          });
          const retryData = await retryRes.json();
          if (retryData.error) throw new Error(`AI_ERROR (${retryData.error.code}): ${retryData.error.message}`);
          const retryText = retryData.candidates?.[0]?.content?.parts?.[0]?.text;
          return safeJSONParse(retryText);
      }
      throw new Error(`AI_ERROR (${data.error.code} ${data.error.status}): ${data.error.message || 'Error communicating with Gemini'}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No content returned from AI");

    return safeJSONParse(text);
  } catch (err) {
    console.warn(`[AI Engine] Primary model ${modelName} failed:`, err.message);

    // fallback to SMART model if FAST fails
    if (!useSmart) {
      console.log("[AI Engine] Retrying with SMART model...");
      return runWithFallback(prompt, true);
    }

    throw err;
  }
}

// -----------------------------
// SAFE JSON PARSER
// -----------------------------
function safeJSONParse(text) {
  try {
    // Look for JSON block in markdown
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const cleanJson = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(cleanJson);
    }
    return { raw: text };
  } catch (e) {
    console.warn("[AI Engine] JSON Parse failed, returning raw text", e);
    return { raw: text };
  }
}

// -----------------------------
// TASK HANDLERS
// -----------------------------

/**
 * Task: Autofill (Fast)
 * Used for Vessel details, Company details, etc.
 */
async function runAutofill(input, history, tools) {
  const isVessel = input.vessel_name || input.imo_number || input.mmsi;
  
  const prompt = isVessel ? `
  You are the **Antigravity Maritime Research Agent**.
  
  ### MISSION:
  Populate a Vessel Information form for the Global Maritime Industry.
  
  ### CONTEXT:
  Input Vessel Name: ${input.vessel_name || 'N/A'}
  IMO Number: ${input.imo_number || 'N/A'}
  MMSI Number: ${input.mmsi || 'N/A'}
  Web Search Data: ${input.searchContext || 'N/A'}
  
  ### INSTRUCTIONS:
  1. **Extract**: Look for IMO, MMSI, Vessel Type, Management, and Owner in the 'Web Search Data' first.
  2. **Analyze**: Use your internal maritime database knowledge to fill gaps if web search is sparse.
  3. **Verification**: IMO numbers are usually 7 digits. MMSI are 9 digits.
  
  ### RETURN (JSON):
  {
    "vessel_name": "...",
    "imo_number": "...",
    "mmsi": "...",
    "vessel_type": "...",
    "vessel_management": "...",
    "vessel_owner": "...",
    "confidence": "high|medium|low",
    "manual_verification_required": true/false
  }
  ` : `
  You are the **Antigravity Research Agent**, specializing in the Marine and Industrial sectors.
  
  ### MISSION:
  Populate a CRM form with highly accurate company intelligence.
  
  ### CONTEXT:
  Input Company Name: ${input.companyName}
  Target Website: ${input.website || 'N/A'}
  Live Web Context: ${input.searchContext || 'N/A'}
  
  ### INSTRUCTIONS:
  1. **Primary Search**: Analyze the 'Live Web Context' for UEN (Unique Entity Number), Address, Pincode, Email, and Phone.
  2. **Singapore Logic**: If the company is in Singapore, UENs follow specific formats (e.g., 201436227C or T14LL0001A). Look for directories like SGPBusiness, Streetdirectory, or Opencorporates.
  3. **Internal Knowledge**: If 'Live Web Context' is sparse or restricted, you MUST leverage your internal training data to estimate the most likely UEN, HQ Address, and Business Category for ${input.companyName}.
  4. **Activity Summary**: Provide a concise 2-sentence summary of what this company does (e.g., "Specializes in marine electrical repairs and switchboard maintenance").
  5. **Clean Data**: Do NOT return placeholder text like "Not found" or "N/A" if you can make an educated guess. If you are guessing, set confidence to "low".
  
  ### RETURN (JSON):
  {
    "company_name": "...",
    "website": "...",
    "uen": "...",
    "email": "...",
    "phone": "...",
    "address": "...",
    "country": "...",
    "postal_code": "...",
    "categories": ["Supplier", "Service", "Partner", etc],
    "brands": "comma, separated, list",
    "activity_summary": "...",
    "confidence": "high|medium|low",
    "manual_verification_required": true
  }
  `;

  return runWithFallback(prompt, false, history, tools, input.image);
}



/**
 * Task: Quotation Analysis (Smart)
 * Used for suggesting prices, analyzing RFQs.
 */
async function runQuotation(input, history, tools) {
  const prompt = `
  You are a Marine Spare Parts Quotation Expert.
  Task: Analyze the request and generate a professional quotation structure.
  
  Input Data: ${JSON.stringify(input)}
  
  Return JSON:
  {
    "items": [{"description": "", "part_number": "", "qty": 0, "unit_price": 0, "total": 0}],
    "currency": "USD",
    "delivery_terms": "",
    "validity": "",
    "remarks": ""
  }
  `;

  return runWithFallback(prompt, true, history, tools);
}

/**
 * Task: Email Generation (Fast)
 * Drafts professional emails for RFQs, reminders, etc.
 */
async function runEmail(input, history, tools) {
  const prompt = `
  You are a Professional Business Assistant.
  Task: Write an email based on the following context.
  
  Context: ${JSON.stringify(input)}
  
  Return JSON:
  {
    "subject": "",
    "body": ""
  }
  `;

  return runWithFallback(prompt, false, history, tools);
}

/**
 * Task: Technical Research (Smart)
 * Deep research on parts, suppliers, or lead times.
 */
async function runResearch(input, history, tools) {
  const prompt = `
  You are an Industrial Procurement Researcher.
  Task: Provide detailed findings for the given query.
  
  Query: ${JSON.stringify(input)}
  
  Return JSON:
  {
    "findings": [],
    "best_supplier": "",
    "estimated_cost": "",
    "lead_time": "",
    "technical_notes": "",
    "confidence": "high|medium|low"
  }
  `;

  return runWithFallback(prompt, true, history, tools);
}

// -----------------------------
// MAIN ENGINE ENTRY
// -----------------------------
export async function runAI(task, input, history = [], tools = null) {
  console.log(`[AI Engine] Executing task: ${task}`);
  switch (task) {
    case "autofill": return runAutofill(input, history, tools);
    case "quotation": return runQuotation(input, history, tools);
    case "email": return runEmail(input, history, tools);
    case "research": return runResearch(input, history, tools);
    default: throw new Error(`Unknown AI task: ${task}`);
  }
}

