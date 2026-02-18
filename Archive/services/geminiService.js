import { Type } from "https://esm.sh/@google/genai";

const API_KEY = window.process?.env?.API_KEY;

let ai = null;
let sdkLoadingPromise = null;

const loadSDK = async () => {
  if (window.GoogleGenAI) return window.GoogleGenAI;
  if (sdkLoadingPromise) return sdkLoadingPromise;

  sdkLoadingPromise = (async () => {
    const url = "https://esm.sh/@google/genai";
    const module = await import(url);
    const GenAIClass = module.GoogleGenAI || module.default?.GoogleGenAI;
    if (GenAIClass) {
      window.GoogleGenAI = GenAIClass;
      return GenAIClass;
    }
    throw new Error("Failed to load Gemini SDK");
  })();
  return sdkLoadingPromise;
};

const getClient = async () => {
  if (ai) return ai;
  const GenAIClass = await loadSDK();
  ai = new GenAIClass({ apiKey: API_KEY });
  return ai;
};

export const generateQuiz = async () => {
  try {
    const client = await getClient();
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Je bent een taalcoach Duits voor Nederlanders. 
      Genereer één uitdagende multiple-choice vraag. 
      De vraag moet gaan over het vertalen van een Duits woord/zin naar het Nederlands, of een Nederlands woord naar het Duits.
      Zorg voor variatie (alledaagse woorden, zakelijk, of vakantie).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING, description: "De vraag in het Nederlands, bijv: 'Wat betekent het Duitse woord 'Vielleicht'?'" },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Precies 4 opties in de doeltaal."
            },
            correctAnswerIndex: { type: Type.INTEGER, description: "0-3 index van het juiste antwoord" },
            explanation: { type: Type.STRING, description: "Een korte uitleg of voorbeeldzin in het Duits." }
          },
          required: ["question", "options", "correctAnswerIndex", "explanation"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Quiz Generatie Fout:", error);
    throw error;
  }
};
