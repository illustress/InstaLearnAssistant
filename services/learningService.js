import { DEFAULT_WORDS } from "../words.js";

const STORAGE_KEY_PROGRESS = "il_progress";
const STORAGE_KEY_SETTINGS = "il_settings";

// Firefox MV2 uses callback-based chrome.storage; wrap in promise
// Also handles browser.storage (Firefox native) and chrome.storage (polyfill)
const storageGet = (area, keys) => {
  if (!area || typeof area.get !== "function") {
    return Promise.resolve({});
  }
  return new Promise((resolve) => {
    try {
      const result = area.get(keys, (data) => {
        // Callback path (Firefox MV2 chrome.* polyfill)
        resolve(data || {});
      });
      // If it returns a promise (Chrome MV3 / browser.* API), use that
      if (result && typeof result.then === "function") {
        result.then((data) => resolve(data || {})).catch(() => resolve({}));
      }
    } catch (e) {
      console.warn("storageGet error:", e);
      resolve({});
    }
  });
};

// Prefer browser.storage (Firefox native) over chrome.storage (polyfill)
const getStorage = () => {
  if (typeof browser !== "undefined" && browser.storage) return browser.storage;
  if (typeof chrome !== "undefined" && chrome.storage) return chrome.storage;
  return null;
};

export const loadLearningData = async () => {
  const storage = getStorage();
  // Extension context
  if (storage && storage.local) {
    const local = await storageGet(storage.local, [
      "wordProgress",
      "customWords",
    ]);
    const sync = storage.sync
      ? await storageGet(storage.sync, [
          "credits",
          "streak",
          "direction",
          "correctAction",
        ])
      : {};

    return {
      wordProgress: local.wordProgress || {},
      words:
        local.customWords && local.customWords.length > 0
          ? local.customWords
          : DEFAULT_WORDS,
      credits: sync.credits || 0,
      streak: sync.streak || 0,
      direction: sync.direction || "german-to-dutch",
      correctAction: sync.correctAction || "next",
      speechRate: sync.speechRate || 0.7,
    };
  }

  // Web context
  try {
    const savedProgress = localStorage.getItem(STORAGE_KEY_PROGRESS);
    const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
    const savedWords = localStorage.getItem("il_words");

    const progressData = savedProgress ? JSON.parse(savedProgress) : {};
    const settingsData = savedSettings ? JSON.parse(savedSettings) : {};
    const wordsData = savedWords ? JSON.parse(savedWords) : DEFAULT_WORDS;
    
    // Ensure words have IDs
    const wordsWithIds = wordsData.map((w, i) => ({
        ...w,
        id: w.id || `w${i + 1}`
    }));

    let wordProgress = progressData.wordProgress || {};

    // Migrate progress keys if needed
    if (Object.keys(wordProgress).some(k => !isNaN(k))) {
        const newProgress = {};
        Object.keys(wordProgress).forEach(k => {
            if (!isNaN(k)) {
                const idx = parseInt(k);
                if (wordsWithIds[idx]) {
                    newProgress[wordsWithIds[idx].id] = wordProgress[k];
                }
            } else {
                newProgress[k] = wordProgress[k];
            }
        });
        wordProgress = newProgress;
    }

    return {
      wordProgress,
      words: wordsWithIds,
      credits: progressData.credits || 0,
      streak: progressData.streak || 0,
      direction: settingsData.direction || "german-to-dutch",
      correctAction: settingsData.correctAction || "next",
      speechRate: settingsData.speechRate || 0.7,
    };
  } catch (e) {
    console.warn("Failed to load local data", e);
    return {
      wordProgress: {},
      words: DEFAULT_WORDS,
      credits: 0,
      streak: 0,
      direction: "german-to-dutch",
      correctAction: "next",
      speechRate: 0.7,
    };
  }
};

export const saveProgress = async (wordProgress, credits, streak) => {
  const storage = getStorage();
  if (storage && storage.local) {
    storage.local.set({ wordProgress });
    if (storage.sync) storage.sync.set({ credits, streak });
  } else {
    localStorage.setItem(
      STORAGE_KEY_PROGRESS,
      JSON.stringify({ wordProgress, credits, streak }),
    );
  }
};

export const saveSettings = async (direction, correctAction, speechRate) => {
  const storage = getStorage();
  if (storage && storage.sync) {
    storage.sync.set({ direction, correctAction, speechRate });
  } else {
    localStorage.setItem(
      STORAGE_KEY_SETTINGS,
      JSON.stringify({ direction, correctAction, speechRate }),
    );
  }
};

export const saveWords = async (words) => {
  const storage = getStorage();
  if (storage && storage.local) {
    storage.local.set({ customWords: words });
  } else {
    localStorage.setItem("il_words", JSON.stringify(words));
  }
};
