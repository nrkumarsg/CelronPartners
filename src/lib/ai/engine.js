const API_KEYS = [
  (typeof process !== 'undefined' && process.env.VITE_GOOGLE_API_KEY) || 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_API_KEY),
  'AIzaSyA_HbU2knq-UMpUf7PY7jATfmFPdMwZU18' // Hardcoded backup for critical reliability
].filter(Boolean);

const MODELS = {
  FAST: "gemini-2.5-flash", 
  SMART: "gemini-2.5-pro",
  LATEST: "gemini-2.5-flash"
};

const DEFAULT_CONFIG = {
  temperature: 0.1,
  topP: 0.95,
  maxOutputTokens: 2048,
};

// -----------------------------
// CORE RUNNER (WITH PROGRESSIVE ESCALATION)
// -----------------------------
export async function runWithFallback(prompt, useSmart = false, history = [], tools = null, image = null, useJson = true) {
  const modelQueue = useSmart ? [MODELS.SMART, MODELS.LATEST, MODELS.FAST] : [MODELS.FAST, MODELS.LATEST, MODELS.SMART];
  
  for (const model of modelQueue) {
    try {
      return await chatWithModel(model, prompt, history, tools, image, useJson, 0);
    } catch (err) {
      console.warn(`[AI Engine] ${model} failed. Trying next... Error: ${err.message}`);
      continue;
    }
  }
  throw new Error("All AI models and fallbacks failed. Check API Key quota.");
}

async function chatWithModel(model, prompt, history = [], tools = null, image = null, useJson = true, keyIndex = 0) {
    if (keyIndex >= API_KEYS.length) {
        throw new Error("All keys exhausted for " + model);
    }

    const currentKey = API_KEYS[keyIndex];
    // Try v1 first, then v1beta
    const versions = ['v1beta', 'v1'];
    
    for (const version of versions) {
        const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${currentKey}`;
        try {
            const contents = [...history];
            const parts = [{ text: prompt }];
            if (image) parts.push({ inline_data: { mime_type: 'image/jpeg', data: image } });
            contents.push({ role: 'user', parts });

            const generationConfig = { ...DEFAULT_CONFIG };
            if (useJson) generationConfig.responseMimeType = "application/json";

            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents, tools, generationConfig })
            });

            const data = await response.json();
            
            if (data.error) {
              const status = data.error.status;
              const message = data.error.message || "";
              
              if (status === 'NOT_FOUND') continue; // Try next version
              
              // If it's a quota, auth, or key issue, try the next key
              if (status === 'RESOURCE_EXHAUSTED' || 
                  status === 'UNAUTHENTICATED' || 
                  (status === 'INVALID_ARGUMENT' && (message.includes('API key') || message.includes('expired')))) {
                break; // Try next key
              }
              
              throw new Error(`${status}: ${data.error.message}`);
            }

            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("Empty Response");
            return useJson ? safeJSONParse(text) : text;
        } catch (err) {
            if (err.message.includes('NOT_FOUND')) continue;
            throw err;
        }
    }
    
    // If we reach here, this key/model combo failed both v1 and v1beta
    return chatWithModel(model, prompt, history, tools, image, useJson, keyIndex + 1);
}

function safeJSONParse(text) {
  try {
    let cleanText = text.trim();
    if (cleanText.includes('```')) {
      const matches = cleanText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      if (matches && matches[1]) cleanText = matches[1].trim();
    }
    return JSON.parse(cleanText);
  } catch (err) {
    console.error("[AI Engine] JSON Parse Error:", err, "Raw Text:", text);
    return { error: "Parse failure", confidence: 0 };
  }
}

// -----------------------------
// TASK DISPATCHER
// -----------------------------
export async function runAI(task, input, history = [], tools = null) {
  switch (task) {
    case 'autofill':
      return runAutofill(input, history, tools);
    case 'research':
      return runResearch(input, history, tools);
    case 'ocr':
      return runOCR(input, history);
    default:
      throw new Error(`Unknown AI task: ${task}`);
  }
}

async function runAutofill(input, history, tools) {
  if (input.prompt) {
    return runWithFallback(input.prompt, input.useSmart || false, history, tools);
  }
  
  const isVerification = input.isVerification;
  const prompt = `
    TASK: ${isVerification ? 'VERIFY' : 'EXTRACT'} company data.
    ENTITY: ${input.companyName}
    CONTEXT: ${input.searchContext}
    Return ONLY JSON: { uen, address, city, postal_code, email, phone, website, categories, brands, activity_summary, confidence: number (0-100) }.
  `;
  return runWithFallback(prompt, isVerification, history, tools);
}

async function runResearch(input, history, tools) {
  const query = typeof input === 'string' ? input : (input.query || JSON.stringify(input));
  const prompt = `Research query: ${query}. Provide a detailed raw text summary. Use tools if available.`;
  return runWithFallback(prompt, false, history, tools, null, false);
}

async function runOCR(input, history) {
  const prompt = `Extract JSON from business card image.`;
  return runWithFallback(prompt, false, history, null, input.image);
}
