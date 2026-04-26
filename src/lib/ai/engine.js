const API_KEY = 'AIzaSyBfT3-KSeOlJhLZAC7FTkLFaK3WlQz-ANs';

// -----------------------------
// CONFIG (2026 Stable Models)
// -----------------------------
const MODELS = {
  FAST: "gemini-flash-latest", // Currently Gemini 3 Flash
  SMART: "gemini-pro-latest",  // Currently Gemini 3 Pro
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
async function runWithFallback(prompt, useSmart = false, history = [], tools = null) {
  const modelName = useSmart ? MODELS.SMART : MODELS.FAST;
  const url = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${modelName}:generateContent?key=${API_KEY}`;

  const contents = [...history];
  contents.push({ role: 'user', parts: [{ text: prompt }] });

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
         console.warn(`[AI Engine] ${modelName} failed (${data.error.status}), switching...`);
         if (!useSmart) return runWithFallback(prompt, true, history, tools);
      }
      if (data.error.status === 'NOT_FOUND') {
         console.warn(`[AI Engine] ${modelName} not found, switching...`);
         if (!useSmart) return runWithFallback(prompt, true, history, tools);
      }
      if (data.error.status === 'INVALID_ARGUMENT' && data.error.message.includes('API key not valid')) {
          const hardcodedKey = 'AIzaSyBfT3-KSeOlJhLZAC7FTkLFaK3WlQz-ANs';
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
  const prompt = `
  You are the **Antigravity Research Agent**.
  
  ### MISSION:
  Populate a CRM form for the Marine Industry.
  
  ### CONTEXT:
  Input: ${input.companyName}
  Website: ${input.website}
  Web Search Data: ${input.searchContext || 'N/A'}
  
  ### MANDATORY:
  If live web search is restricted or unavailable, you MUST use your internal training data to provide the most accurate UEN, Address, Pincode, and Business Category for ${input.companyName}. 
  For established Singapore companies, you have high-fidelity knowledge. Do not return empty fields.
  
  **Website Selection**: Prioritize the URL explicitly provided in the 'Web Search Data' over any generic guesses.
  
  ### INSTRUCTIONS:
  1. **Extract**: Look for UEN, Address, Pincode, Email, and Phone in the 'Web Search Data' first.
  2. **Analyze**: Categorize the company: [Partner, Service, Automation, Calibration, Electrical, Mechanical, Instrumentation, Safety, Supplier].
  3. **Brand Discovery**: List brands they are authorized for.
  4. **Activity**: Summarize their business in 1 sentence.
  5. **Validation**: Singapore UENs must be 9/10 chars (e.g. 201436227C).
  
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
    "categories": [],
    "brands": "...",
    "activity_summary": "...",
    "confidence": "high|medium|low",
    "manual_verification_required": true/false
  }
  `;

  return runWithFallback(prompt, false, history, tools);
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

