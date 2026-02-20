import { GoogleGenAI } from "https://esm.sh/@google/genai";

const getApiKey = () => {
  // Try standard process.env (Vite replacement)
  let key = process.env.API_KEY;
  
  // Try window.process.env (Polyfill/Runtime injection)
  if (!key || key === "YOUR_API_KEY_HERE") {
      key = window.process?.env?.API_KEY;
  }
  
  // Validate
  if (!key || key === "YOUR_API_KEY_HERE") {
      return null;
  }
  return key;
};

export const generateImage = async (prompt) => {
  console.log("generateImage called with prompt:", prompt);
  
  const apiKey = getApiKey();
  if (!apiKey) {
      console.error("API Key is missing or invalid in generateImage");
      throw new Error("API Key is missing. Please connect your Google account.");
  }

  // Create client instance per request to ensure latest key is used
  const ai = new GoogleGenAI({ apiKey });

  try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] }
      });

      console.log("generateImage response received");

      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts) {
          console.error("No content generated in response", response);
          throw new Error("No content generated");
      }

      for (const part of parts) {
        if (part.inlineData) {
          console.log("Image data found in response");
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      
      console.error("No image data found in parts", parts);
      throw new Error("No image data found in response");
  } catch (e) {
      console.error("generateImage error:", e);
      throw e;
  }
};

export const sendMessageStream = async (message, history = []) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key is missing or invalid.");

  const ai = new GoogleGenAI({ apiKey });

  const chat = ai.chats.create({ 
      model: 'gemini-3-flash-preview',
      history: history.map(h => ({
          role: h.role,
          parts: [{ text: h.text }]
      }))
  });
  
  return await chat.sendMessageStream({ message });
};
