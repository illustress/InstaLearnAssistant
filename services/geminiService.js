const API_KEY = window.process?.env?.API_KEY;

let ai = null;
let chatSession = null;
let sdkLoadingPromise = null;

const SDK_URLS = [
  "https://esm.sh/@google/genai",
  "https://esm.run/@google/genai", 
  "https://cdn.jsdelivr.net/npm/@google/genai/+esm",
  "https://unpkg.com/@google/genai/dist/browser/index.js"
];

const loadSDK = async () => {
  // 1. Check if already loaded globally (from sdk-loader.js)
  if (window.GoogleGenAI) {
    return window.GoogleGenAI;
  }
  
  if (sdkLoadingPromise) return sdkLoadingPromise;

  console.log("Starting dynamic import of Gemini SDK (service fallback)...");

  sdkLoadingPromise = (async () => {
    let lastError = null;

    for (const url of SDK_URLS) {
      try {
        console.log(`Attempting to load SDK from: ${url}`);
        const module = await import(url);
        
        let GenAIClass = null;
        if (module.GoogleGenAI) {
          GenAIClass = module.GoogleGenAI;
        } else if (module.default && module.default.GoogleGenAI) {
          GenAIClass = module.default.GoogleGenAI;
        }

        if (GenAIClass) {
          window.GoogleGenAI = GenAIClass;
          console.log(`Gemini SDK loaded successfully from ${url}`);
          return GenAIClass;
        }
      } catch (err) {
        console.warn(`Failed to load from ${url}:`, err);
        lastError = err;
      }
    }

    sdkLoadingPromise = null;
    throw new Error(`Failed to load Gemini SDK. Last error: ${lastError?.message}`);
  })();
    
  return sdkLoadingPromise;
};

const getClient = async () => {
  if (ai) return ai;
  
  try {
    const GenAIClass = await loadSDK();
    
    if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
      throw new Error("API Key not found in polyfill.js");
    }
    
    ai = new GenAIClass({ apiKey: API_KEY });
    console.log("Gemini Client Initialized");
  } catch (e) {
    console.error("Gemini initialization failed:", e);
    throw e;
  }
  return ai;
};

export const resetChatSession = () => {
  chatSession = null;
};

export const sendMessageStream = async (message, onChunk) => {
  try {
    const client = await getClient();
    
    if (!chatSession) {
      chatSession = client.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: "You are a helpful, concise browser assistant. Keep answers short and relevant to a small popup window context. Format with Markdown.",
        },
      });
    }

    const result = await chatSession.sendMessageStream({ message });

    for await (const chunk of result) {
      const text = chunk.text;
      if (text) {
        onChunk(text);
      }
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    const errorMessage = error.message || "Unknown error";
    
    if (errorMessage.includes("API Key")) {
        onChunk(`\n\n*Configuration Error: ${errorMessage}*`);
    } else if (errorMessage.includes("Failed to load")) {
        onChunk(`\n\n*Network Error: Unable to load Gemini SDK. Please check your internet connection.*`);
    } else {
        onChunk(`\n\n*Error: ${errorMessage}*`);
    }
  }
};