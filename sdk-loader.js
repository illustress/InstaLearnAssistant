console.log("SDK Loader initializing...");
(async () => {
  try {
    // Attempt to load the SDK and expose it globally
    // We use esm.sh generic endpoint for better cache hit rate
    const mod = await import("https://esm.sh/@google/genai");
    if (mod && mod.GoogleGenAI) {
      window.GoogleGenAI = mod.GoogleGenAI;
      console.log("Gemini SDK loaded via sdk-loader");
    }
  } catch (e) {
    console.warn("SDK Loader failed (will retry in app):", e);
  }
})();