// InstaLearning — Learning logic & state management

import { syncStore, localStore } from './storageService.js';
import { DEFAULT_WORDS } from '../words.js';

const STREAK_BONUSES = { 3: 2, 5: 3, 7: 5, 10: 10 };

export function getStreakBonus(s) {
  return STREAK_BONUSES[s] || 0;
}

export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function isLetter(char) {
  return /\p{L}/u.test(char);
}

export function speak(text, lang) {
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'german' ? 'de-DE' : 'nl-NL';
    u.rate = 0.8;
    speechSynthesis.speak(u);
  }
}

export function showConfetti() {
  const container = document.createElement('div');
  container.className = 'il-confetti-container';
  document.body.appendChild(container);
  const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da'];
  for (let i = 0; i < 50; i++) {
    const c = document.createElement('div');
    c.className = 'il-confetti';
    c.style.left = Math.random() * 100 + '%';
    c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDelay = Math.random() * 0.5 + 's';
    c.style.animationDuration = (Math.random() * 1 + 1.5) + 's';
    container.appendChild(c);
  }
  setTimeout(() => container.remove(), 3000);
}

// ---- Data loading / saving ----

export async function loadLearningData() {
  const settings = await syncStore.get(['direction', 'correctAction', 'credits', 'streak']);
  const local = await localStore.get(['wordProgress', 'customWords']);
  return {
    direction: settings.direction || 'german-to-dutch',
    correctAction: settings.correctAction || 'next',
    wordProgress: local.wordProgress || {},
    words: local.customWords && local.customWords.length > 0 ? local.customWords : DEFAULT_WORDS,
    credits: typeof settings.credits === 'number' ? settings.credits : 0,
    streak: typeof settings.streak === 'number' ? settings.streak : 0
  };
}

export async function saveProgress(wordProgress, credits, streak) {
  await Promise.all([
    localStore.set({ wordProgress }),
    syncStore.set({ credits, streak })
  ]);
}

export async function saveSettings(direction, correctAction) {
  await syncStore.set({ direction, correctAction });
}

export async function saveCustomWords(words) {
  await localStore.set({ customWords: words });
}

export async function loadSessions() {
  const data = await localStore.get(['sessions']);
  return data.sessions || [];
}

export async function saveSession(session) {
  const data = await localStore.get(['sessions']);
  const sessions = data.sessions || [];
  sessions.push(session);
  if (sessions.length > 50) sessions.shift();
  await localStore.set({ sessions });
}

// ---- Word selection & progress ----

export function pickWord(words, wordProgress) {
  if (words.length === 0) return { word: null, index: -1 };
  const weights = words.map((_, idx) => {
    const progress = wordProgress[idx];
    const level = progress?.level || 1;
    const correctCount = progress?.correct || 0;
    let weight = 5 - level;
    if (correctCount > 0 && correctCount < 3) weight += 10;
    return Math.max(weight, 1);
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < words.length; i++) {
    random -= weights[i];
    if (random <= 0) return { word: words[i], index: i };
  }
  return { word: words[0], index: 0 };
}

export function updateWordProgress(wordProgress, wordId, correct) {
  const wp = { ...wordProgress };
  if (!wp[wordId]) wp[wordId] = { level: 1, correct: 0 };
  else wp[wordId] = { ...wp[wordId] };

  const oldLevel = wp[wordId].level;

  if (correct) {
    wp[wordId].correct++;
    if (wp[wordId].correct >= 3 && wp[wordId].level < 4) {
      wp[wordId].level++;
      wp[wordId].correct = 0;
    }
  } else {
    if (wp[wordId].level > 1) wp[wordId].level--;
    wp[wordId].correct = 0;
  }

  return {
    wordProgress: wp,
    leveledUp: wp[wordId].level > oldLevel,
    newLevel: wp[wordId].level
  };
}

export function getDirection(dir) {
  if (dir === 'mixed') return Math.random() > 0.5 ? 'german-to-dutch' : 'dutch-to-german';
  return dir;
}

export function generateWrongAnswers(words, correctAnswer, isGerman) {
  const field = isGerman ? 'german' : 'dutch';
  return words
    .map(w => w[field])
    .filter(w => w.toLowerCase() !== correctAnswer.toLowerCase())
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
}
