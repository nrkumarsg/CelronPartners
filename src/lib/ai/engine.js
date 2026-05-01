const API_KEY = (typeof process !== 'undefined' && process.env?.VITE_GOOGLE_API_KEY) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_API_KEY) || 'AIzaSyDasTT2wm8TGbeBvwScbdVRIotE8IXWisA';

// -----------------------------
// CONFIG (2026 Stable Models)
// -----------------------------
const MODELS = {
  FAST: "gemini-2.0-flash", 
  SMART: "gemini-1.5-pro",  
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
        generationConfig: {
          ...DEFAULT_CONFIG,
          responseMimeType: "application/json"
        },
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
  // 1. Check for specialized raw prompt tasks (like OCR)
  if (input.prompt && !input.companyName && !input.vessel_name) {
    return runWithFallback(input.prompt, false, history, tools, input.image);
  }

  const isVessel = input.vessel_name || input.imo_number || input.mmsi;
  const isContact = input.contact_name;
  
  let prompt = "";

  if (isVessel) {
    prompt = `
      You are the **Antigravity Maritime Research Agent**.
      
      ### MISSION:
      Populate a Vessel Information form for the Global Maritime Industry.
      
      ### CONTEXT:
      - Vessel Name: ${input.vessel_name || 'N/A'}
      - IMO: ${input.imo_number || 'N/A'}
      - MMSI: ${input.mmsi || 'N/A'}
      - Live Web Data: ${input.searchContext || 'N/A'}
      
      ### RETURN (JSON Schema):
      {
        "vessel_name": "string",
        "imo_number": "string",
        "mmsi": "string",
        "vessel_type": "string",
        "vessel_management": "string",
        "vessel_owner": "string",
        "confidence": "high|medium|low",
        "manual_verification_required": boolean
      }
    `;
  } else if (isContact) {
    prompt = `
      You are the **Antigravity Intelligence Agent**.
      
      ### MISSION:
      Profile a professional contact within their organization.
      
      ### CONTEXT:
      - Contact Name: ${input.contact_name}
      - Organization: ${input.company_name || 'N/A'}
      
      ### INSTRUCTIONS:
      1. **Professional Identity**: Identify their current designation/role and department.
      2. **Contact Coordinates**: Find official business email, phone, and mobile if available.
      3. **Organization Context**: Verify affiliation with ${input.company_name}.
      
      ### RETURN (JSON Schema):
      {
        "person_name": "string",
        "designation": "string",
        "department": "string",
        "email": "string",
        "phone": "string",
        "mobile": "string",
        "address": "string",
        "confidence": "high|medium|low"
      }
    `;
  } else {
    // Default: Company Research
    prompt = `
      You are the **Antigravity Research Agent**, a elite analyst for the Marine and Global Industrial sectors.
      
      ### MISSION:
      Populate a CRM form with verified, high-accuracy company intelligence.
      
      ### CONTEXT:
      - Input Company Name: ${input.companyName}
      - Target Website: ${input.website || 'N/A'}
      - Live Web Context: ${input.searchContext || 'N/A'}
      
      ### INSTRUCTIONS:
      1. **Exhaustive Extraction**: Extract UEN (Unique Entity Number), HQ Address, Pincode, Email, and Phone.
      2. **Live Tool Usage**: If 'Live Web Context' is insufficient, you MUST use the **google_search** tool to find the official UEN, HQ address, and contact details for ${input.companyName}.
      3. **Singapore Entity Logic**: For Singapore entities, UEN is mandatory. (Format: YYYYNNNNNX).
      4. **Business Profile**: Identify key activities and brands.
      
      ### RETURN (JSON Schema):
      {
        "company_name": "string",
        "website": "string",
        "uen": "string",
        "email": "string",
        "phone": "string",
        "address": "string",
        "country": "string",
        "city": "string",
        "postal_code": "string",
        "categories": ["string"],
        "brands": "string (comma separated)",
        "activity_summary": "string (2-3 sentences)",
        "confidence": "high|medium|low",
        "manual_verification_required": boolean
      }
    `;
  }

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

/**
 * Task: Filter Translation (Fast)
 * Translates natural language into structural filter JSON.
 */
async function runFilterTask(input, history, tools) {
  const prompt = typeof input === 'string' ? input : JSON.stringify(input);
  return runWithFallback(prompt, false, history, tools);
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
    case "research": 
        // If input is a complex prompt string, just run it directly
        if (typeof input === 'string' && input.length > 100) {
            return runWithFallback(input, true, history, tools);
        }
        return runResearch(input, history, tools);
    case "filter": return runFilterTask(input, history, tools);
    default: throw new Error(`Unknown AI task: ${task}`);
  }
}

