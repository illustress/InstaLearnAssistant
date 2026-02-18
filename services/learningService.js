import { DEFAULT_WORDS } from '../words.js';

const STORAGE_KEY_PROGRESS = 'il_progress';
const STORAGE_KEY_SETTINGS = 'il_settings';

export const loadLearningData = async () => {
  // Extension context
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const local = await chrome.storage.local.get(['wordProgress', 'customWords']);
    const sync = await chrome.storage.sync.get(['credits', 'streak', 'direction', 'correctAction']);
    
    return {
      wordProgress: local.wordProgress || {},
      words: (local.customWords && local.customWords.length > 0) ? local.customWords : DEFAULT_WORDS,
      credits: sync.credits || 0,
      streak: sync.streak || 0,
      direction: sync.direction || 'german-to-dutch',
      correctAction: sync.correctAction || 'next'
    };
  }

  // Web context
  try {
    const savedProgress = localStorage.getItem(STORAGE_KEY_PROGRESS);
    const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
    
    const progressData = savedProgress ? JSON.parse(savedProgress) : {};
    const settingsData = savedSettings ? JSON.parse(savedSettings) : {};

    return {
      wordProgress: progressData.wordProgress || {},
      words: DEFAULT_WORDS,
      credits: progressData.credits || 0,
      streak: progressData.streak || 0,
      direction: settingsData.direction || 'german-to-dutch',
      correctAction: settingsData.correctAction || 'next'
    };
  } catch (e) {
    console.warn("Failed to load local data", e);
    return {
        wordProgress: {},
        words: DEFAULT_WORDS,
        credits: 0,
        streak: 0,
        direction: 'german-to-dutch',
        correctAction: 'next'
    };
  }
};

export const saveProgress = async (wordProgress, credits, streak) => {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ wordProgress });
    chrome.storage.sync.set({ credits, streak });
  } else {
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify({ wordProgress, credits, streak }));
  }
};

export const saveSettings = async (direction, correctAction) => {
   if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.set({ direction, correctAction });
  } else {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify({ direction, correctAction }));
  }
};

export const saveWords = async (words) => {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ customWords: words });
  }
};
