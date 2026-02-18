import { GoogleGenAI } from "https://esm.sh/@google/genai";

const API_KEY = window.process?.env?.API_KEY;

let client = null;

const getClient = () => {
  if (client) return client;
  if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
     return null;
  }
  client = new GoogleGenAI({ apiKey: API_KEY });
  return client;
};

export const sendMessageStream = async (message, history = []) => {
  const ai = getClient();
  if (!ai) throw new Error("API Key is missing or invalid.");

  const chat = ai.chats.create({ 
      model: 'gemini-3-flash-preview',
      history: history.map(h => ({
          role: h.role,
          parts: [{ text: h.text }]
      }))
  });
  
  return await chat.sendMessageStream({ message });
};
