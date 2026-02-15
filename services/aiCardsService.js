// AI Cards Service — Gemini-powered vocabulary cards
// Generates mnemonics, smart sentences, and image prompts using the existing Gemini SDK

import { localStore, syncStore } from './storageService.js';

const AI_CARD_CACHE_KEY = 'aiCardCache';
const AI_SETTINGS_KEY = 'aiSettings';

const DEFAULT_AI_SETTINGS = {
  enabled: false,
  generateMnemonics: true,
  generateSentences: true,
  generateImagePrompts: true,
  cacheCards: true
};

let aiSettings = { ...DEFAULT_AI_SETTINGS };
let aiCardCache = {};
let aiClient = null;

// ---- Settings & Cache Management ----

export async function loadAISettings() {
  const [syncData, localData] = await Promise.all([
    syncStore.get([AI_SETTINGS_KEY]),
    localStore.get([AI_CARD_CACHE_KEY])
  ]);
  if (syncData[AI_SETTINGS_KEY]) {
    aiSettings = { ...DEFAULT_AI_SETTINGS, ...syncData[AI_SETTINGS_KEY] };
  }
  if (localData[AI_CARD_CACHE_KEY]) {
    aiCardCache = localData[AI_CARD_CACHE_KEY];
  }
}

export async function saveAISettings(newSettings) {
  aiSettings = { ...DEFAULT_AI_SETTINGS, ...newSettings };
  await syncStore.set({ [AI_SETTINGS_KEY]: aiSettings });
}

export function getAISettings() {
  return { ...aiSettings };
}

function saveAICardCache() {
  // Limit cache to 100 cards
  const keys = Object.keys(aiCardCache);
  if (keys.length > 100) {
    keys.slice(0, keys.length - 100).forEach(k => delete aiCardCache[k]);
  }
  localStore.set({ [AI_CARD_CACHE_KEY]: aiCardCache });
}

function getCardCacheKey(word) {
  return `${word.german}_${word.dutch}`.toLowerCase().replace(/\s+/g, '_');
}

export function getCachedCard(word) {
  if (!aiSettings.cacheCards) return null;
  return aiCardCache[getCardCacheKey(word)] || null;
}

function cacheCard(word, card) {
  if (!aiSettings.cacheCards) return;
  aiCardCache[getCardCacheKey(word)] = { ...card, cachedAt: Date.now() };
  saveAICardCache();
}

export function clearCardCache() {
  aiCardCache = {};
  localStore.set({ [AI_CARD_CACHE_KEY]: {} });
}

// ---- Gemini Client ----

const SDK_URLS = [
  "https://esm.sh/@google/genai",
  "https://esm.run/@google/genai",
  "https://cdn.jsdelivr.net/npm/@google/genai/+esm",
  "https://unpkg.com/@google/genai/dist/browser/index.js"
];

async function getGeminiClient() {
  if (aiClient) return aiClient;

  const apiKey = window.process?.env?.API_KEY;
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    throw new Error('Gemini API key not configured');
  }

  // Try to use the globally loaded SDK first
  let GenAIClass = window.GoogleGenAI;

  if (!GenAIClass) {
    for (const url of SDK_URLS) {
      try {
        const mod = await import(url);
        GenAIClass = mod.GoogleGenAI || mod.default?.GoogleGenAI;
        if (GenAIClass) break;
      } catch { /* try next */ }
    }
  }

  if (!GenAIClass) throw new Error('Failed to load Gemini SDK');

  aiClient = new GenAIClass({ apiKey });
  return aiClient;
}

async function callGemini(prompt, options = {}) {
  const client = await getGeminiClient();
  const result = await client.models.generateContent({
    model: options.model || 'gemini-2.0-flash',
    contents: prompt,
    config: {
      maxOutputTokens: options.maxTokens || 500,
      temperature: options.temperature || 0.7,
    }
  });
  return result.text || '';
}

// ---- Card generation prompts ----

async function generateMnemonic(word) {
  const prompt = `Create a memorable, fun mnemonic to help remember that the German word "${word.german}" translates to the Dutch word "${word.dutch}".

Rules:
- Use sound associations, visual imagery, or wordplay
- Keep it short (1-2 sentences max)
- Make it memorable and slightly silly/funny
- Connect the sounds or spellings of both words

Return ONLY the mnemonic, nothing else.`;

  return callGemini(prompt, { maxTokens: 100, temperature: 0.9 });
}

async function generateSmartSentences(word, userContext = {}) {
  const level = userContext.level || 1;
  const recentWords = userContext.recentWords || [];

  let prompt = `Create 2 example sentences for the German word "${word.german}" (meaning: ${word.dutch} in Dutch).

Requirements:
- Difficulty: ${level <= 2 ? 'A1-A2 (beginner)' : 'B1 (intermediate)'}
- Keep sentences short and practical
- Use everyday situations`;

  if (recentWords.length > 0) {
    prompt += `\n- Try to naturally include one of these recently learned words if possible: ${recentWords.slice(0, 3).join(', ')}`;
  }

  prompt += `\n\nReturn ONLY valid JSON: {"sentence1": "...", "sentence1_translation": "...", "sentence2": "...", "sentence2_translation": "..."}`;

  const response = await callGemini(prompt, { maxTokens: 200, temperature: 0.7 });

  try {
    return JSON.parse(response);
  } catch {
    const match = response.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return null;
  }
}

async function generateImagePrompt(word) {
  const prompt = `Create a simple, clear image description for the word "${word.german}" (${word.dutch}).

Requirements:
- Describe a single, clear visual that represents the word
- Use simple, concrete imagery
- Style: cute, colorful, cartoon-like illustration
- Keep it under 50 words

Return ONLY the image description, nothing else.`;

  return callGemini(prompt, { maxTokens: 80, temperature: 0.8 });
}

// ---- Main card generation ----

export async function generateAICard(word, userContext = {}) {
  if (!aiSettings.enabled) return null;

  const cached = getCachedCard(word);
  if (cached) return cached;

  const card = {
    german: word.german,
    dutch: word.dutch,
    emoji: word.emoji || '',
    originalExample: word.example || '',
    mnemonic: null,
    smartSentences: null,
    imagePrompt: null,
    generatedAt: Date.now()
  };

  const promises = [];

  if (aiSettings.generateMnemonics) {
    promises.push(
      generateMnemonic(word).then(m => { card.mnemonic = m; }).catch(() => {})
    );
  }

  if (aiSettings.generateSentences) {
    promises.push(
      generateSmartSentences(word, userContext).then(s => { card.smartSentences = s; }).catch(() => {})
    );
  }

  if (aiSettings.generateImagePrompts) {
    promises.push(
      generateImagePrompt(word).then(p => { card.imagePrompt = p; }).catch(() => {})
    );
  }

  await Promise.all(promises);
  cacheCard(word, card);
  return card;
}

// Batch pre-generation with progress callback
export async function pregenerateCards(words, userContext = {}, onProgress = null) {
  const results = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    if (getCachedCard(word)) {
      results.push({ word, status: 'cached' });
      if (onProgress) onProgress(i + 1, words.length, word, 'cached');
      continue;
    }

    try {
      const card = await generateAICard(word, userContext);
      results.push({ word, status: 'generated', card });
      if (onProgress) onProgress(i + 1, words.length, word, 'generated');

      // Rate limiting between requests
      if (i < words.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (error) {
      results.push({ word, status: 'error', error: error.message });
      if (onProgress) onProgress(i + 1, words.length, word, 'error');
    }
  }

  return results;
}

// Test connection — returns { success, message }
export async function testConnection() {
  try {
    const result = await callGemini('Respond with exactly: "OK"', { maxTokens: 10 });
    return { success: true, message: `Connected! Response: ${result.trim()}` };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// Get user context for AI personalization
export function getUserContext(words, wordProgress, currentLevel, streak) {
  const recentWords = [];
  if (wordProgress) {
    const sorted = Object.entries(wordProgress)
      .filter(([, p]) => p.correct > 0)
      .sort((a, b) => (b[1].lastPracticed || 0) - (a[1].lastPracticed || 0))
      .slice(0, 5);
    sorted.forEach(([idx]) => {
      const word = words[parseInt(idx)];
      if (word) recentWords.push(word.german);
    });
  }
  return { level: currentLevel || 1, recentWords, streak: streak || 0 };
}

// Initialize on import
loadAISettings();
