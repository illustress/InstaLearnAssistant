// InstaLearning - Content Script for Instagram
// Injects quiz overlays, detects swipes/scrolls, and gates browsing with credits

(function () {
  "use strict";

  // ============ STATE ============

  let settings = { direction: "german-to-dutch" };
  let wordProgress = {};
  let words = [];
  let credits = 0;
  let streak = 0;
  let sessionStats = {
    startTime: null,
    correct: 0,
    wrong: 0,
    creditsEarned: 0,
    bestStreak: 0,
  };
  let quizOverlay = null;
  let isShowingQuiz = false;
  let currentQuiz = null;
  let hintTimer = null;
  let speedRoundTimer = null;
  let hasAnsweredCurrentQuiz = false;
  let doubleOrNothingActive = false;
  let currentGameMode = "quiz";
  let currentLevel = 1;
  let currentMultiplier = 1;
  let extensionContextAlive = true;

  // Level multipliers
  const LEVEL_MULTIPLIERS = { 1: 1, 2: 2, 3: 3, 4: 5 };
  const GAME_MULTIPLIERS = { quiz: 1, scramble: 2, hangman: 3, match: 2 };
  const STREAK_BONUSES = { 3: 2, 5: 3, 7: 5, 10: 10 };

  // Default words (fallback when none are loaded)
  const DEFAULT_WORDS = [
    {
      german: "Hund",
      dutch: "Hond",
      emoji: "🐕",
      example: "Der Hund spielt im Garten",
    },
    {
      german: "Katze",
      dutch: "Kat",
      emoji: "🐱",
      example: "Die Katze schläft auf dem Sofa",
    },
    {
      german: "Haus",
      dutch: "Huis",
      emoji: "🏠",
      example: "Das Haus ist sehr groß",
    },
    {
      german: "Wasser",
      dutch: "Water",
      emoji: "💧",
      example: "Ich trinke viel Wasser",
    },
    {
      german: "Brot",
      dutch: "Brood",
      emoji: "🍞",
      example: "Das Brot ist frisch",
    },
    {
      german: "Milch",
      dutch: "Melk",
      emoji: "🥛",
      example: "Die Milch ist kalt",
    },
    {
      german: "Apfel",
      dutch: "Appel",
      emoji: "🍎",
      example: "Der Apfel ist rot",
    },
    {
      german: "Buch",
      dutch: "Boek",
      emoji: "📖",
      example: "Ich lese ein Buch",
    },
    {
      german: "Tisch",
      dutch: "Tafel",
      emoji: "🪑",
      example: "Der Tisch ist aus Holz",
    },
    {
      german: "Stuhl",
      dutch: "Stoel",
      emoji: "🪑",
      example: "Der Stuhl ist bequem",
    },
    {
      german: "Fenster",
      dutch: "Raam",
      emoji: "🪟",
      example: "Das Fenster ist offen",
    },
    {
      german: "Tür",
      dutch: "Deur",
      emoji: "🚪",
      example: "Die Tür ist geschlossen",
    },
    {
      german: "Auto",
      dutch: "Auto",
      emoji: "🚗",
      example: "Das Auto ist schnell",
    },
    {
      german: "Fahrrad",
      dutch: "Fiets",
      emoji: "🚲",
      example: "Ich fahre mit dem Fahrrad",
    },
    {
      german: "Straße",
      dutch: "Straat",
      emoji: "🛣️",
      example: "Die Straße ist lang",
    },
    {
      german: "Stadt",
      dutch: "Stad",
      emoji: "🏙️",
      example: "Die Stadt ist groß",
    },
    {
      german: "Land",
      dutch: "Land",
      emoji: "🌍",
      example: "Das Land ist schön",
    },
    {
      german: "Baum",
      dutch: "Boom",
      emoji: "🌳",
      example: "Der Baum ist hoch",
    },
    {
      german: "Blume",
      dutch: "Bloem",
      emoji: "🌸",
      example: "Die Blume ist schön",
    },
    {
      german: "Sonne",
      dutch: "Zon",
      emoji: "☀️",
      example: "Die Sonne scheint",
    },
    {
      german: "Mond",
      dutch: "Maan",
      emoji: "🌙",
      example: "Der Mond ist voll",
    },
    {
      german: "Stern",
      dutch: "Ster",
      emoji: "⭐",
      example: "Der Stern leuchtet",
    },
    {
      german: "Himmel",
      dutch: "Hemel",
      emoji: "🌤️",
      example: "Der Himmel ist blau",
    },
    {
      german: "Wolke",
      dutch: "Wolk",
      emoji: "☁️",
      example: "Die Wolke ist weiß",
    },
    {
      german: "Regen",
      dutch: "Regen",
      emoji: "🌧️",
      example: "Der Regen fällt",
    },
    {
      german: "Schnee",
      dutch: "Sneeuw",
      emoji: "❄️",
      example: "Der Schnee ist weiß",
    },
    {
      german: "Wind",
      dutch: "Wind",
      emoji: "💨",
      example: "Der Wind ist stark",
    },
    {
      german: "Feuer",
      dutch: "Vuur",
      emoji: "🔥",
      example: "Das Feuer ist heiß",
    },
    {
      german: "Erde",
      dutch: "Aarde",
      emoji: "🌍",
      example: "Die Erde ist rund",
    },
    { german: "Meer", dutch: "Zee", emoji: "🌊", example: "Das Meer ist tief" },
    {
      german: "Fluss",
      dutch: "Rivier",
      emoji: "🏞️",
      example: "Der Fluss fließt schnell",
    },
    {
      german: "Berg",
      dutch: "Berg",
      emoji: "⛰️",
      example: "Der Berg ist hoch",
    },
    {
      german: "Wald",
      dutch: "Bos",
      emoji: "🌲",
      example: "Der Wald ist dunkel",
    },
    {
      german: "Garten",
      dutch: "Tuin",
      emoji: "🏡",
      example: "Der Garten ist grün",
    },
    {
      german: "Küche",
      dutch: "Keuken",
      emoji: "🍳",
      example: "Die Küche ist sauber",
    },
    {
      german: "Schlafzimmer",
      dutch: "Slaapkamer",
      emoji: "🛏️",
      example: "Das Schlafzimmer ist ruhig",
    },
    {
      german: "Badezimmer",
      dutch: "Badkamer",
      emoji: "🛁",
      example: "Das Badezimmer ist klein",
    },
    {
      german: "Arbeit",
      dutch: "Werk",
      emoji: "💼",
      example: "Die Arbeit ist wichtig",
    },
    {
      german: "Schule",
      dutch: "School",
      emoji: "🏫",
      example: "Die Schule beginnt um acht",
    },
    {
      german: "Freund",
      dutch: "Vriend",
      emoji: "👫",
      example: "Mein Freund ist nett",
    },
    {
      german: "Familie",
      dutch: "Familie",
      emoji: "👨‍👩‍👧‍👦",
      example: "Die Familie isst zusammen",
    },
    {
      german: "Mutter",
      dutch: "Moeder",
      emoji: "👩",
      example: "Meine Mutter kocht gut",
    },
    {
      german: "Vater",
      dutch: "Vader",
      emoji: "👨",
      example: "Mein Vater arbeitet viel",
    },
    {
      german: "Kind",
      dutch: "Kind",
      emoji: "👶",
      example: "Das Kind spielt draußen",
    },
    {
      german: "Bruder",
      dutch: "Broer",
      emoji: "👦",
      example: "Mein Bruder ist älter",
    },
    {
      german: "Schwester",
      dutch: "Zus",
      emoji: "👧",
      example: "Meine Schwester singt gern",
    },
    {
      german: "Liebe",
      dutch: "Liefde",
      emoji: "❤️",
      example: "Die Liebe ist stark",
    },
    {
      german: "Zeit",
      dutch: "Tijd",
      emoji: "⏰",
      example: "Die Zeit vergeht schnell",
    },
    { german: "Tag", dutch: "Dag", emoji: "🌞", example: "Der Tag ist lang" },
    {
      german: "Nacht",
      dutch: "Nacht",
      emoji: "🌙",
      example: "Die Nacht ist dunkel",
    },
    {
      german: "Morgen",
      dutch: "Ochtend",
      emoji: "🌅",
      example: "Der Morgen ist frisch",
    },
    {
      german: "Abend",
      dutch: "Avond",
      emoji: "🌆",
      example: "Der Abend ist schön",
    },
    {
      german: "Jahr",
      dutch: "Jaar",
      emoji: "📅",
      example: "Das Jahr hat zwölf Monate",
    },
    {
      german: "Monat",
      dutch: "Maand",
      emoji: "🗓️",
      example: "Der Monat ist fast vorbei",
    },
    {
      german: "Woche",
      dutch: "Week",
      emoji: "📆",
      example: "Die Woche hat sieben Tage",
    },
    {
      german: "Heute",
      dutch: "Vandaag",
      emoji: "📍",
      example: "Heute ist ein guter Tag",
    },
    {
      german: "Gestern",
      dutch: "Gisteren",
      emoji: "⏪",
      example: "Gestern war es kalt",
    },
    {
      german: "Essen",
      dutch: "Eten",
      emoji: "🍽️",
      example: "Das Essen schmeckt gut",
    },
    {
      german: "Trinken",
      dutch: "Drinken",
      emoji: "🥤",
      example: "Ich möchte etwas trinken",
    },
    {
      german: "Schlafen",
      dutch: "Slapen",
      emoji: "😴",
      example: "Ich muss schlafen gehen",
    },
    {
      german: "Gehen",
      dutch: "Gaan",
      emoji: "🚶",
      example: "Wir gehen nach Hause",
    },
    {
      german: "Kommen",
      dutch: "Komen",
      emoji: "🏃",
      example: "Sie kommen morgen",
    },
    {
      german: "Sehen",
      dutch: "Zien",
      emoji: "👀",
      example: "Ich kann dich sehen",
    },
    { german: "Hören", dutch: "Horen", emoji: "👂", example: "Ich höre Musik" },
    {
      german: "Sprechen",
      dutch: "Spreken",
      emoji: "🗣️",
      example: "Er spricht Deutsch",
    },
    {
      german: "Lesen",
      dutch: "Lezen",
      emoji: "📚",
      example: "Sie liest ein Buch",
    },
    {
      german: "Schreiben",
      dutch: "Schrijven",
      emoji: "✍️",
      example: "Ich schreibe einen Brief",
    },
    {
      german: "Lernen",
      dutch: "Leren",
      emoji: "🎓",
      example: "Wir lernen Niederländisch",
    },
    {
      german: "Spielen",
      dutch: "Spelen",
      emoji: "🎮",
      example: "Die Kinder spielen",
    },
    {
      german: "Lachen",
      dutch: "Lachen",
      emoji: "😄",
      example: "Sie lacht viel",
    },
    {
      german: "Weinen",
      dutch: "Huilen",
      emoji: "😢",
      example: "Das Baby weint",
    },
    {
      german: "Groß",
      dutch: "Groot",
      emoji: "📏",
      example: "Der Elefant ist groß",
    },
    {
      german: "Klein",
      dutch: "Klein",
      emoji: "🐜",
      example: "Die Ameise ist klein",
    },
    { german: "Gut", dutch: "Goed", emoji: "👍", example: "Das ist sehr gut" },
    {
      german: "Schlecht",
      dutch: "Slecht",
      emoji: "👎",
      example: "Das Wetter ist schlecht",
    },
    {
      german: "Schön",
      dutch: "Mooi",
      emoji: "✨",
      example: "Die Blume ist schön",
    },
    {
      german: "Hässlich",
      dutch: "Lelijk",
      emoji: "👹",
      example: "Das Monster ist hässlich",
    },
    {
      german: "Schnell",
      dutch: "Snel",
      emoji: "⚡",
      example: "Der Zug ist schnell",
    },
    {
      german: "Langsam",
      dutch: "Langzaam",
      emoji: "🐢",
      example: "Die Schildkröte ist langsam",
    },
    { german: "Neu", dutch: "Nieuw", emoji: "🆕", example: "Das Auto ist neu" },
    {
      german: "Alt",
      dutch: "Oud",
      emoji: "🏛️",
      example: "Das Gebäude ist alt",
    },
    {
      german: "Jung",
      dutch: "Jong",
      emoji: "👶",
      example: "Das Kind ist jung",
    },
    {
      german: "Warm",
      dutch: "Warm",
      emoji: "🌡️",
      example: "Der Sommer ist warm",
    },
    {
      german: "Kalt",
      dutch: "Koud",
      emoji: "🥶",
      example: "Der Winter ist kalt",
    },
    { german: "Eins", dutch: "Een", emoji: "1️⃣", example: "Ich habe eins" },
    {
      german: "Zwei",
      dutch: "Twee",
      emoji: "2️⃣",
      example: "Zwei plus zwei ist vier",
    },
    {
      german: "Drei",
      dutch: "Drie",
      emoji: "3️⃣",
      example: "Ich habe drei Äpfel",
    },
    {
      german: "Vier",
      dutch: "Vier",
      emoji: "4️⃣",
      example: "Das Zimmer hat vier Ecken",
    },
    {
      german: "Fünf",
      dutch: "Vijf",
      emoji: "5️⃣",
      example: "Ich habe fünf Finger",
    },
    {
      german: "Rot",
      dutch: "Rood",
      emoji: "🔴",
      example: "Die Tomate ist rot",
    },
    {
      german: "Blau",
      dutch: "Blauw",
      emoji: "🔵",
      example: "Der Himmel ist blau",
    },
    {
      german: "Grün",
      dutch: "Groen",
      emoji: "🟢",
      example: "Das Gras ist grün",
    },
    {
      german: "Gelb",
      dutch: "Geel",
      emoji: "🟡",
      example: "Die Sonne ist gelb",
    },
    {
      german: "Schwarz",
      dutch: "Zwart",
      emoji: "⚫",
      example: "Die Nacht ist schwarz",
    },
    {
      german: "Weiß",
      dutch: "Wit",
      emoji: "⚪",
      example: "Der Schnee ist weiß",
    },
    {
      german: "Vogel",
      dutch: "Vogel",
      emoji: "🐦",
      example: "Der Vogel singt",
    },
    {
      german: "Fisch",
      dutch: "Vis",
      emoji: "🐟",
      example: "Der Fisch schwimmt",
    },
    {
      german: "Pferd",
      dutch: "Paard",
      emoji: "🐴",
      example: "Das Pferd läuft schnell",
    },
    { german: "Kuh", dutch: "Koe", emoji: "🐄", example: "Die Kuh gibt Milch" },
    {
      german: "Schwein",
      dutch: "Varken",
      emoji: "🐷",
      example: "Das Schwein ist rosa",
    },
  ];

  // ============ UTILITY ============

  function getStreakBonus(s) {
    return STREAK_BONUSES[s] || 0;
  }
  function isLetter(char) {
    return /\p{L}/u.test(char);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function speak(text, lang) {
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === "german" ? "de-DE" : "nl-NL";
      u.rate = 0.8;
      speechSynthesis.speak(u);
    }
  }

  function showConfetti() {
    const container = document.createElement("div");
    container.className = "il-confetti-container";
    document.body.appendChild(container);
    const colors = [
      "#ff6b6b",
      "#4ecdc4",
      "#ffe66d",
      "#95e1d3",
      "#f38181",
      "#aa96da",
    ];
    for (let i = 0; i < 50; i++) {
      const c = document.createElement("div");
      c.className = "il-confetti";
      c.style.left = Math.random() * 100 + "%";
      c.style.backgroundColor =
        colors[Math.floor(Math.random() * colors.length)];
      c.style.animationDelay = Math.random() * 0.5 + "s";
      c.style.animationDuration = Math.random() * 1 + 1.5 + "s";
      container.appendChild(c);
    }
    setTimeout(() => container.remove(), 3000);
  }

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ============ DATA ============

  async function loadData() {
    return new Promise((resolve) => {
      try {
        // Load from both sync and local storage
        chrome.storage.sync.get(
          ["direction", "credits", "streak"],
          (syncData) => {
            if (chrome.runtime?.lastError) {
              markExtensionContextInvalid(chrome.runtime.lastError);
              resolve();
              return;
            }
            if (syncData.direction) settings.direction = syncData.direction;
            if (typeof syncData.credits === "number")
              credits = syncData.credits;
            if (typeof syncData.streak === "number") streak = syncData.streak;

            chrome.storage.local.get(
              ["wordProgress", "customWords"],
              (localData) => {
                if (chrome.runtime?.lastError) {
                  markExtensionContextInvalid(chrome.runtime.lastError);
                  resolve();
                  return;
                }
                if (localData.wordProgress)
                  wordProgress = localData.wordProgress;
                words =
                  localData.customWords?.length > 0
                    ? localData.customWords
                    : DEFAULT_WORDS;
                startSession();
                resolve();
              },
            );
          },
        );
      } catch (e) {
        markExtensionContextInvalid(e);
        words = DEFAULT_WORDS;
        startSession();
        resolve();
      }
    });
  }

  function saveProgress() {
    if (!isExtensionContextAlive()) return;
    try {
      chrome.storage.local.set({ wordProgress });
      chrome.storage.sync.set({ credits, streak });
    } catch (e) {
      markExtensionContextInvalid(e);
    }
  }

  function startSession() {
    sessionStats = {
      startTime: Date.now(),
      correct: 0,
      wrong: 0,
      creditsEarned: 0,
      bestStreak: 0,
    };
  }

  function saveSession() {
    const duration = Math.floor((Date.now() - sessionStats.startTime) / 1000);
    if (sessionStats.correct === 0 && sessionStats.wrong === 0) return;
    if (!isExtensionContextAlive()) return;

    const session = {
      date: new Date().toISOString(),
      duration,
      correct: sessionStats.correct,
      wrong: sessionStats.wrong,
      creditsEarned: sessionStats.creditsEarned,
      bestStreak: sessionStats.bestStreak,
      accuracy:
        sessionStats.correct + sessionStats.wrong > 0
          ? Math.round(
              (sessionStats.correct /
                (sessionStats.correct + sessionStats.wrong)) *
                100,
            )
          : 0,
    };

    try {
      chrome.storage.local.get(["sessions"], (data) => {
        if (chrome.runtime?.lastError) return;
        const sessions = data.sessions || [];
        sessions.push(session);
        if (sessions.length > 50) sessions.shift();
        chrome.storage.local.set({ sessions });
      });
    } catch (e) {
      markExtensionContextInvalid(e);
    }
  }

  window.addEventListener("pagehide", saveSession);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveSession();
  });

  // ============ EXTENSION CONTEXT ============

  function handleInvalidatedContextError(errorLike) {
    const message =
      (errorLike && (errorLike.message || String(errorLike))) || "";
    if (message.includes("Extension context invalidated")) {
      markExtensionContextInvalid(errorLike);
      return true;
    }
    return false;
  }

  window.addEventListener("error", (event) => {
    if (handleInvalidatedContextError(event.error || event.message))
      event.preventDefault();
  });
  window.addEventListener("unhandledrejection", (event) => {
    if (handleInvalidatedContextError(event.reason)) event.preventDefault();
  });

  function isExtensionContextAlive() {
    if (!extensionContextAlive) return false;
    try {
      return (
        typeof chrome !== "undefined" &&
        !!chrome.runtime?.id &&
        !!chrome.storage?.sync
      );
    } catch (error) {
      markExtensionContextInvalid(error);
      return false;
    }
  }

  function markExtensionContextInvalid(error) {
    extensionContextAlive = false;
    console.warn(
      "[InstaLearning] Extension context invalid. Reload the tab after extension reload.",
      error,
    );
  }

  // Listen for storage changes and popup messages
  if (extensionContextAlive) {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "sync") {
          if (changes.direction)
            settings.direction = changes.direction.newValue;
          if (changes.credits) credits = changes.credits.newValue || 0;
          if (changes.streak) streak = changes.streak.newValue || 0;
        }
        if (area === "local") {
          if (changes.wordProgress)
            wordProgress = changes.wordProgress.newValue || {};
          if (changes.customWords)
            words =
              changes.customWords.newValue?.length > 0
                ? changes.customWords.newValue
                : DEFAULT_WORDS;
        }
      });

      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "OPEN_QUIZ") {
          showGamePicker();
          sendResponse({ success: true });
        }
        return true;
      });
    } catch (e) {
      markExtensionContextInvalid(e);
    }
  }

  // ============ WORD LOGIC ============

  function updateWordProgress(wordId, correct) {
    if (!wordProgress[wordId]) wordProgress[wordId] = { level: 1, correct: 0 };

    const oldLevel = wordProgress[wordId].level;

    if (correct) {
      wordProgress[wordId].correct++;
      if (wordProgress[wordId].correct >= 3 && wordProgress[wordId].level < 4) {
        wordProgress[wordId].level++;
        wordProgress[wordId].correct = 0;
        if (wordProgress[wordId].level > oldLevel) {
          showConfetti();
          showLevelUpPopup(wordProgress[wordId].level);
        }
      }
    } else {
      if (wordProgress[wordId].level > 1) wordProgress[wordId].level--;
      wordProgress[wordId].correct = 0;
    }
    saveProgress();
  }

  function showLevelUpPopup(newLevel) {
    const popup = quizOverlay?.querySelector(".il-bonus-popup");
    if (popup) {
      popup.textContent = `🎉 Level Up! Now Level ${newLevel}!`;
      popup.classList.add("visible");
      setTimeout(() => popup.classList.remove("visible"), 2500);
    }
  }

  function pickWord() {
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

  function getDirection() {
    if (settings.direction === "mixed")
      return Math.random() > 0.5 ? "german-to-dutch" : "dutch-to-german";
    return settings.direction;
  }

  function generateWrongAnswers(correctAnswer, isGerman) {
    const field = isGerman ? "german" : "dutch";
    return words
      .map((w) => w[field])
      .filter((w) => w.toLowerCase() !== correctAnswer.toLowerCase())
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
  }

  function clearTimers() {
    if (hintTimer) {
      clearInterval(hintTimer);
      hintTimer = null;
    }
    if (speedRoundTimer) {
      clearInterval(speedRoundTimer);
      speedRoundTimer = null;
    }
  }

  // ============ OVERLAY UI ============

  function createOverlay() {
    if (quizOverlay) return quizOverlay;

    quizOverlay = document.createElement("div");
    quizOverlay.className = "il-quiz-overlay";
    quizOverlay.innerHTML = `
    <div class="il-quiz-container">
      <div class="il-quiz-header">
        <span class="il-credits">💰 <span id="il-credit-count">0</span></span>
        <span class="il-streak">🔥 <span id="il-streak-count">0</span></span>
        <span class="il-level-badge">Level 1</span>
        <button class="il-close-btn hidden" type="button" title="Return to Instagram">✕</button>
      </div>
      <div class="il-progress-bar"><div class="il-progress-fill"></div></div>
      <div class="il-quiz-question"></div>
      <div class="il-word-info"></div>
      <div class="il-quiz-content"></div>
      <div class="il-quiz-feedback"></div>
      <div class="il-bonus-popup"></div>
      <div class="il-quiz-actions"></div>
    </div>
  `;
    document.body.appendChild(quizOverlay);

    const closeBtn = quizOverlay.querySelector(".il-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", hideQuiz);

    return quizOverlay;
  }

  function updateCreditDisplay() {
    const creditEl = document.getElementById("il-credit-count");
    const streakEl = document.getElementById("il-streak-count");
    const closeBtn = quizOverlay?.querySelector(".il-close-btn");
    if (creditEl) creditEl.textContent = credits;
    if (streakEl) streakEl.textContent = streak;
    if (closeBtn) closeBtn.classList.toggle("hidden", credits <= 0);
  }

  function updateProgressBar(wordIndex) {
    const progress = wordProgress[wordIndex];
    const level = progress?.level || 1;
    const correct = progress?.correct || 0;
    const percentage = (level - 1) * 33.33 + (correct / 3) * 33.33;

    const fill = quizOverlay?.querySelector(".il-progress-fill");
    if (fill) {
      fill.style.width = Math.min(percentage, 100) + "%";
      fill.className = `il-progress-fill il-progress-level-${level}`;
    }
  }

  function setQuestion(direction, text) {
    const questionEl = quizOverlay?.querySelector(".il-quiz-question");
    if (!questionEl) return;
    questionEl.textContent = "";

    const dirEl = document.createElement("span");
    dirEl.className = "il-direction";
    dirEl.textContent = direction === "german-to-dutch" ? "🇩🇪 → 🇳🇱" : "🇳🇱 → 🇩🇪";

    const wordEl = document.createElement("span");
    wordEl.className = "il-word";
    wordEl.textContent = text;

    questionEl.appendChild(dirEl);
    questionEl.appendChild(wordEl);
  }

  function showWordInfo(word, direction) {
    const infoEl = quizOverlay?.querySelector(".il-word-info");
    if (!infoEl || !word) return;

    infoEl.textContent = "";

    if (word.emoji) {
      const emojiEl = document.createElement("span");
      emojiEl.className = "il-emoji";
      emojiEl.textContent = word.emoji;
      infoEl.appendChild(emojiEl);
    }

    const deBtn = document.createElement("button");
    deBtn.className = "il-audio-btn";
    deBtn.type = "button";
    deBtn.textContent = "🔊 DE";
    deBtn.addEventListener("click", () => speak(word.german, "german"));
    infoEl.appendChild(deBtn);

    const nlBtn = document.createElement("button");
    nlBtn.className = "il-audio-btn";
    nlBtn.type = "button";
    nlBtn.textContent = "🔊 NL";
    nlBtn.addEventListener("click", () => speak(word.dutch, "dutch"));
    infoEl.appendChild(nlBtn);

    if (word.example) {
      const exampleEl = document.createElement("div");
      exampleEl.className = "il-example";
      exampleEl.textContent = `"${word.example}"`;
      infoEl.appendChild(exampleEl);
    }
  }

  function showBonusPopup(bonus, streakCount) {
    const popup = quizOverlay?.querySelector(".il-bonus-popup");
    if (popup) {
      popup.textContent = `🎉 ${streakCount} streak! +${bonus} bonus!`;
      popup.classList.add("visible");
      setTimeout(() => popup.classList.remove("visible"), 2000);
    }
  }

  // ============ ACTION BUTTONS ============

  function showDoubleOrNothing() {
    const actions = quizOverlay?.querySelector(".il-quiz-actions");
    if (!actions || credits < 1) return;

    const donBtn = document.createElement("button");
    donBtn.className = "il-action-btn il-don-btn";
    donBtn.textContent = `🎰 Double or Nothing (${credits} credits at stake)`;
    donBtn.addEventListener("click", () => {
      doubleOrNothingActive = true;
      hideQuiz();
      setTimeout(showQuiz, 300);
    });
    actions.appendChild(donBtn);
  }

  function showActionButtons(wasCorrect) {
    const actions = quizOverlay?.querySelector(".il-quiz-actions");
    if (!actions) return;
    actions.innerHTML = "";

    if (wasCorrect && credits > 0) {
      const nextBtn = document.createElement("button");
      nextBtn.className = "il-action-btn il-learn-btn";
      nextBtn.textContent = "🎯 Next Challenge";
      nextBtn.addEventListener("click", () => {
        hideQuiz();
        setTimeout(showGamePicker, 300);
      });

      const watchBtn = document.createElement("button");
      watchBtn.className = "il-action-btn il-watch-btn";
      watchBtn.textContent = `📱 Watch Instagram (${credits} swipes)`;
      watchBtn.addEventListener("click", hideQuiz);

      actions.appendChild(nextBtn);
      actions.appendChild(watchBtn);

      if (credits >= 2) showDoubleOrNothing();
    } else if (wasCorrect) {
      const nextBtn = document.createElement("button");
      nextBtn.className = "il-action-btn il-learn-btn";
      nextBtn.textContent = "🎯 Next Challenge";
      nextBtn.addEventListener("click", () => {
        hideQuiz();
        setTimeout(showGamePicker, 300);
      });
      actions.appendChild(nextBtn);
    } else {
      const tryBtn = document.createElement("button");
      tryBtn.className = "il-action-btn il-learn-btn";
      tryBtn.textContent = "🔄 Try Again";
      tryBtn.addEventListener("click", () => {
        hideQuiz();
        setTimeout(showGamePicker, 300);
      });
      actions.appendChild(tryBtn);
    }
  }

  // ============ MINI GAMES ============

  // Word Scramble
  function showScrambleGame() {
    const { word, index } = pickWord();
    const direction = getDirection();
    const answer = direction === "german-to-dutch" ? word.dutch : word.german;
    const question = direction === "german-to-dutch" ? word.german : word.dutch;

    currentQuiz = { word, index, direction, answer };

    let scrambled = answer
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
    // Ensure scrambled is different from answer
    let attempts = 0;
    while (scrambled === answer && attempts < 10) {
      scrambled = answer
        .split("")
        .sort(() => Math.random() - 0.5)
        .join("");
      attempts++;
    }

    const content = quizOverlay?.querySelector(".il-quiz-content");
    setQuestion(direction, question);
    showWordInfo(word, direction);

    content.textContent = "";
    const gameEl = document.createElement("div");
    gameEl.className = "il-scramble-game";

    const scrambledEl = document.createElement("div");
    scrambledEl.className = "il-scrambled";
    for (const letter of scrambled) {
      const letterEl = document.createElement("span");
      letterEl.className = "il-letter";
      letterEl.textContent = letter;
      scrambledEl.appendChild(letterEl);
    }

    const input = document.createElement("input");
    input.type = "text";
    input.className = "il-answer-input";
    input.placeholder = "Unscramble the word...";
    input.autocomplete = "off";

    const submitBtn = document.createElement("button");
    submitBtn.className = "il-submit-btn";
    submitBtn.type = "button";
    submitBtn.textContent = "Check";

    gameEl.appendChild(scrambledEl);
    gameEl.appendChild(input);
    gameEl.appendChild(submitBtn);
    content.appendChild(gameEl);

    input.focus();

    const check = () => {
      handleAnswer(
        input.value.trim().toLowerCase() === answer.toLowerCase(),
        answer,
      );
    };
    submitBtn.addEventListener("click", check);
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") check();
    });
  }

  // Hangman
  function showHangmanGame() {
    const { word, index } = pickWord();
    const direction = getDirection();
    const answer = direction === "german-to-dutch" ? word.dutch : word.german;
    const question = direction === "german-to-dutch" ? word.german : word.dutch;

    currentQuiz = { word, index, direction, answer };

    let guessed = new Set();
    let wrongGuesses = 0;
    const maxWrong = 6;
    const answerChars = Array.from(answer.toLowerCase());
    const keyboardLetters = Array.from(
      new Set([
        ..."abcdefghijklmnopqrstuvwxyz".split(""),
        ...answerChars.filter((ch) => isLetter(ch)),
      ]),
    );

    const content = quizOverlay?.querySelector(".il-quiz-content");
    setQuestion(direction, question);
    showWordInfo(word, direction);

    function renderHangman() {
      const display = Array.from(answer)
        .map((ch) => {
          const lower = ch.toLowerCase();
          if (!isLetter(lower)) return ch;
          return guessed.has(lower) ? ch : "_";
        })
        .join(" ");
      const hangmanStages = ["😀", "😐", "😟", "😰", "😱", "💀", "☠️"];

      content.innerHTML = `
      <div class="il-hangman-game">
        <div class="il-hangman-face">${hangmanStages[wrongGuesses]}</div>
        <div class="il-hangman-word">${escapeHtml(display)}</div>
        <div class="il-hangman-lives">Lives: ${"❤️".repeat(maxWrong - wrongGuesses)}${"🖤".repeat(wrongGuesses)}</div>
        <div class="il-keyboard">
          ${keyboardLetters
            .map(
              (letter) =>
                `<button class="il-key ${guessed.has(letter) ? "used" : ""}" data-letter="${escapeHtml(letter)}" ${guessed.has(letter) ? "disabled" : ""}>${escapeHtml(letter)}</button>`,
            )
            .join("")}
        </div>
      </div>
    `;

      content.querySelectorAll(".il-key:not(.used)").forEach((btn) => {
        btn.addEventListener("click", () => {
          const letter = (btn.dataset.letter || "").toLowerCase();
          guessed.add(letter);
          if (!answer.toLowerCase().includes(letter)) wrongGuesses++;
          const won = answerChars.every(
            (ch) => !isLetter(ch) || guessed.has(ch),
          );
          const lost = wrongGuesses >= maxWrong;
          if (won || lost) handleAnswer(won, answer);
          else renderHangman();
        });
      });
    }
    renderHangman();
  }

  // Match Pairs
  function showMatchGame() {
    const targetPairs = Math.min(4, words.length);
    const pairs = [];
    const usedIndices = new Set();

    while (pairs.length < targetPairs && usedIndices.size < words.length) {
      const idx = Math.floor(Math.random() * words.length);
      if (!usedIndices.has(idx)) {
        usedIndices.add(idx);
        pairs.push(words[idx]);
      }
    }

    currentQuiz = { pairs, matched: 0, attempts: 0, targetPairs };

    const cards = [];
    pairs.forEach((p) => {
      cards.push({ text: p.german, pairId: p.german, type: "german" });
      cards.push({ text: p.dutch, pairId: p.german, type: "dutch" });
    });

    const shuffledCards = shuffle(cards);
    let selected = null;
    let matchedPairs = 0;

    const content = quizOverlay?.querySelector(".il-quiz-content");
    const questionEl = quizOverlay.querySelector(".il-quiz-question");
    questionEl.textContent = "";
    const wordEl = document.createElement("span");
    wordEl.className = "il-word";
    wordEl.textContent = "🎯 Match the Pairs!";
    questionEl.appendChild(wordEl);
    quizOverlay.querySelector(".il-word-info").innerHTML = "";

    function renderCards() {
      content.innerHTML = `
      <div class="il-match-game">
        ${shuffledCards
          .map(
            (card, i) => `
          <button class="il-match-card ${card.matched ? "matched" : ""} ${card.selected ? "selected" : ""}"
                  data-index="${i}" ${card.matched ? "disabled" : ""}>
            ${escapeHtml(card.text)}
          </button>
        `,
          )
          .join("")}
      </div>
    `;

      content
        .querySelectorAll(".il-match-card:not(.matched)")
        .forEach((btn) => {
          btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.index);
            const card = shuffledCards[idx];

            if (selected === null) {
              selected = idx;
              card.selected = true;
              renderCards();
            } else if (selected !== idx) {
              const prevCard = shuffledCards[selected];
              currentQuiz.attempts++;

              if (
                prevCard.pairId === card.pairId &&
                prevCard.type !== card.type
              ) {
                prevCard.matched = true;
                card.matched = true;
                matchedPairs++;
                if (matchedPairs === targetPairs) {
                  setTimeout(() => handleAnswer(true, "All matched!"), 500);
                }
              } else {
                // Wrong match — flash red
                card.selected = true;
                renderCards();
                const wrongEls = content.querySelectorAll(
                  ".il-match-card.selected",
                );
                wrongEls.forEach((el) => el.classList.add("wrong-flash"));
                setTimeout(() => {
                  prevCard.selected = false;
                  card.selected = false;
                  selected = null;
                  renderCards();
                }, 600);
                return;
              }

              prevCard.selected = false;
              selected = null;
              renderCards();
            }
          });
        });
    }
    renderCards();
  }

  function showMiniGame(game) {
    if (!quizOverlay) createOverlay();

    currentGameMode = game;
    currentMultiplier = GAME_MULTIPLIERS[game] || 1;

    quizOverlay.querySelector(".il-quiz-feedback").innerHTML = "";
    quizOverlay.querySelector(".il-quiz-feedback").className =
      "il-quiz-feedback";
    quizOverlay.querySelector(".il-quiz-actions").innerHTML = "";
    quizOverlay.querySelector(".il-level-badge").textContent =
      `${game.toUpperCase()} (×${currentMultiplier})`;

    updateCreditDisplay();
    quizOverlay.classList.add("visible");
    hasAnsweredCurrentQuiz = false;
    isShowingQuiz = true;

    switch (game) {
      case "scramble":
        showScrambleGame();
        break;
      case "hangman":
        showHangmanGame();
        break;
      case "match":
        showMatchGame();
        break;
    }
  }

  // ============ QUIZ LEVELS ============

  function showLevel1(answer, wrongAnswers) {
    const options = shuffle([answer, ...wrongAnswers]);
    const content = quizOverlay?.querySelector(".il-quiz-content");
    content.innerHTML = "";

    const optionsDiv = document.createElement("div");
    optionsDiv.className = "il-options";

    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "il-option";
      btn.textContent = opt;
      btn.addEventListener("click", () =>
        handleAnswer(opt.toLowerCase() === answer.toLowerCase(), answer),
      );
      optionsDiv.appendChild(btn);
    });
    content.appendChild(optionsDiv);
  }

  function showLevel2(answer) {
    const content = quizOverlay?.querySelector(".il-quiz-content");
    content.innerHTML = `
    <div class="il-type-quiz">
      <div class="il-hint-display">${"_".repeat(answer.length)}</div>
      <input type="text" class="il-answer-input" placeholder="Type the translation..." autocomplete="off">
      <button class="il-submit-btn">Check</button>
    </div>
  `;

    const input = content.querySelector(".il-answer-input");
    const hintDisplay = content.querySelector(".il-hint-display");
    input.focus();

    const revealedPositions = new Set();
    hintTimer = setInterval(() => {
      if (revealedPositions.size >= Math.floor(answer.length * 0.6)) {
        clearInterval(hintTimer);
        return;
      }
      let pos;
      do {
        pos = Math.floor(Math.random() * answer.length);
      } while (revealedPositions.has(pos));
      revealedPositions.add(pos);
      hintDisplay.textContent = answer
        .split("")
        .map((l, i) => (revealedPositions.has(i) ? l : "_"))
        .join("");
    }, 2000);

    const check = () => {
      clearInterval(hintTimer);
      handleAnswer(
        input.value.trim().toLowerCase() === answer.toLowerCase(),
        answer,
      );
    };
    content.querySelector(".il-submit-btn").addEventListener("click", check);
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") check();
    });
  }

  function showLevel3(originalDirection) {
    const content = quizOverlay?.querySelector(".il-quiz-content");
    const reverseDir =
      originalDirection === "german-to-dutch"
        ? "dutch-to-german"
        : "german-to-dutch";
    const { word } = currentQuiz;
    const newQuestion =
      reverseDir === "german-to-dutch" ? word.german : word.dutch;
    const newAnswer =
      reverseDir === "german-to-dutch" ? word.dutch : word.german;

    setQuestion(reverseDir, newQuestion);

    content.innerHTML = `
    <div class="il-type-quiz">
      <input type="text" class="il-answer-input" placeholder="Type (no hints!)..." autocomplete="off">
      <button class="il-submit-btn">Check</button>
    </div>
  `;

    const input = content.querySelector(".il-answer-input");
    input.focus();

    const check = () =>
      handleAnswer(
        input.value.trim().toLowerCase() === newAnswer.toLowerCase(),
        newAnswer,
      );
    content.querySelector(".il-submit-btn").addEventListener("click", check);
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") check();
    });
  }

  function showLevel4(answer) {
    const content = quizOverlay?.querySelector(".il-quiz-content");
    let timeLeft = 5;

    content.innerHTML = `
    <div class="il-speed-quiz">
      <div class="il-timer">${timeLeft}s</div>
      <input type="text" class="il-answer-input" placeholder="Quick!" autocomplete="off">
      <button class="il-submit-btn">Check</button>
    </div>
  `;

    const input = content.querySelector(".il-answer-input");
    const timerEl = content.querySelector(".il-timer");
    input.focus();

    speedRoundTimer = setInterval(() => {
      timeLeft--;
      timerEl.textContent = `${timeLeft}s`;
      if (timeLeft <= 2) timerEl.classList.add("il-timer-warning");
      if (timeLeft <= 0) {
        clearInterval(speedRoundTimer);
        handleAnswer(false, answer);
      }
    }, 1000);

    const check = () => {
      clearInterval(speedRoundTimer);
      handleAnswer(
        input.value.trim().toLowerCase() === answer.toLowerCase(),
        answer,
      );
    };
    content.querySelector(".il-submit-btn").addEventListener("click", check);
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") check();
    });
  }

  // ============ HANDLE ANSWER ============

  function handleAnswer(correct, correctAnswer) {
    if (!isShowingQuiz || hasAnsweredCurrentQuiz) return;
    hasAnsweredCurrentQuiz = true;
    clearTimers();

    const feedback = quizOverlay?.querySelector(".il-quiz-feedback");
    const content = quizOverlay?.querySelector(".il-quiz-content");

    content
      ?.querySelectorAll("input, button")
      .forEach((el) => (el.disabled = true));
    if (feedback) feedback.textContent = "";

    let earnedCredits = 0;

    if (correct) {
      streak++;
      const baseCredits = currentMultiplier;
      earnedCredits = doubleOrNothingActive ? credits : baseCredits;

      if (doubleOrNothingActive) {
        credits *= 2;
        const msg = document.createElement("span");
        msg.className = "il-correct";
        msg.textContent = `🎰 DOUBLE! You now have ${credits} credits!`;
        feedback?.appendChild(msg);
        showConfetti();
      } else {
        credits += earnedCredits;
        const bonus = getStreakBonus(streak);
        if (bonus > 0) {
          credits += bonus;
          earnedCredits += bonus;
          setTimeout(() => showBonusPopup(bonus, streak), 500);
        }
        const msg = document.createElement("span");
        msg.className = "il-correct";
        msg.textContent = `✓ Correct! +${earnedCredits} 💰 (×${currentMultiplier})`;
        feedback?.appendChild(msg);
        if (currentMultiplier >= 3) showConfetti();
      }

      sessionStats.correct++;
      sessionStats.creditsEarned += earnedCredits;
      if (streak > sessionStats.bestStreak) sessionStats.bestStreak = streak;
      feedback.className = "il-quiz-feedback il-feedback-correct";
    } else {
      if (doubleOrNothingActive) {
        credits = 0;
        const msg = document.createElement("span");
        msg.className = "il-wrong";
        msg.textContent = "💥 BUST! Lost all credits!";
        feedback?.appendChild(msg);
      } else {
        const msg = document.createElement("span");
        msg.className = "il-wrong";
        msg.appendChild(document.createTextNode("✗ Answer: "));
        const answerEl = document.createElement("strong");
        answerEl.textContent = correctAnswer;
        msg.appendChild(answerEl);
        feedback?.appendChild(msg);
      }
      streak = 0;
      sessionStats.wrong++;
      feedback.className = "il-quiz-feedback il-feedback-wrong";
    }

    doubleOrNothingActive = false;
    updateCreditDisplay();

    if (currentQuiz?.index !== undefined) {
      updateWordProgress(currentQuiz.index, correct);
      updateProgressBar(currentQuiz.index);
    }

    if (!correct) {
      setTimeout(() => showActionButtons(false), 800);
      return;
    }
    setTimeout(() => showActionButtons(true), 800);
  }

  // ============ GAME PICKER ============

  function showGamePicker() {
    if (isShowingQuiz || words.length === 0) return;

    clearTimers();
    const overlay = createOverlay();
    updateCreditDisplay();

    overlay.querySelector(".il-quiz-question").innerHTML = "";
    overlay.querySelector(".il-word-info").innerHTML = "";
    overlay.querySelector(".il-quiz-feedback").innerHTML = "";
    overlay.querySelector(".il-quiz-actions").innerHTML = "";
    overlay.querySelector(".il-level-badge").textContent = "CHOOSE";
    overlay.querySelector(".il-level-badge").className = "il-level-badge";

    const content = overlay.querySelector(".il-quiz-content");
    content.innerHTML = `
    <div class="il-game-picker">
      <h3 class="il-picker-title">🎯 Choose Your Challenge</h3>
      <div class="il-picker-section">
        <div class="il-picker-label">Quiz Levels</div>
        <div class="il-picker-grid">
          <button class="il-picker-btn" data-type="quiz" data-level="1">
            <span class="il-picker-icon">📝</span>
            <span class="il-picker-name">Multiple Choice</span>
            <span class="il-picker-mult">×1</span>
          </button>
          <button class="il-picker-btn" data-type="quiz" data-level="2">
            <span class="il-picker-icon">💡</span>
            <span class="il-picker-name">Type + Hints</span>
            <span class="il-picker-mult">×2</span>
          </button>
          <button class="il-picker-btn" data-type="quiz" data-level="3">
            <span class="il-picker-icon">🔄</span>
            <span class="il-picker-name">Reverse</span>
            <span class="il-picker-mult">×3</span>
          </button>
          <button class="il-picker-btn" data-type="quiz" data-level="4">
            <span class="il-picker-icon">⚡</span>
            <span class="il-picker-name">Speed Round</span>
            <span class="il-picker-mult">×5</span>
          </button>
        </div>
      </div>
      <div class="il-picker-section">
        <div class="il-picker-label">Mini Games</div>
        <div class="il-picker-grid">
          <button class="il-picker-btn" data-type="scramble">
            <span class="il-picker-icon">🔀</span>
            <span class="il-picker-name">Word Scramble</span>
            <span class="il-picker-mult">×2</span>
          </button>
          <button class="il-picker-btn" data-type="hangman">
            <span class="il-picker-icon">☠️</span>
            <span class="il-picker-name">Hangman</span>
            <span class="il-picker-mult">×3</span>
          </button>
          <button class="il-picker-btn" data-type="match">
            <span class="il-picker-icon">🎯</span>
            <span class="il-picker-name">Match Pairs</span>
            <span class="il-picker-mult">×2</span>
          </button>
        </div>
      </div>
    </div>
  `;

    content.querySelectorAll(".il-picker-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.type;
        const level = parseInt(btn.dataset.level) || 1;

        if (type === "quiz") {
          currentLevel = level;
          currentMultiplier = LEVEL_MULTIPLIERS[level];
          startQuizWithLevel(level);
        } else {
          currentGameMode = type;
          currentMultiplier = GAME_MULTIPLIERS[type];
          showMiniGame(type);
        }
      });
    });

    overlay.classList.add("visible");
    hasAnsweredCurrentQuiz = false;
    isShowingQuiz = true;
  }

  function startQuizWithLevel(level) {
    const overlay = quizOverlay;
    const { word, index } = pickWord();
    const direction = getDirection();

    const question = direction === "german-to-dutch" ? word.german : word.dutch;
    const answer = direction === "german-to-dutch" ? word.dutch : word.german;

    currentQuiz = { word, index, direction, answer };
    currentGameMode = "quiz";

    updateProgressBar(index);

    overlay.querySelector(".il-level-badge").textContent =
      `Level ${level} (×${LEVEL_MULTIPLIERS[level]})`;
    overlay.querySelector(".il-level-badge").className =
      `il-level-badge il-level-${level}`;

    setQuestion(direction, question);
    showWordInfo(word, direction);

    overlay.querySelector(".il-quiz-feedback").innerHTML = "";
    overlay.querySelector(".il-quiz-feedback").className = "il-quiz-feedback";
    overlay.querySelector(".il-quiz-actions").innerHTML = "";

    switch (level) {
      case 1:
        showLevel1(
          answer,
          generateWrongAnswers(answer, direction === "dutch-to-german"),
        );
        break;
      case 2:
        showLevel2(answer);
        break;
      case 3:
        showLevel3(direction);
        break;
      case 4:
        showLevel4(answer);
        break;
    }
  }

  function showQuiz() {
    showGamePicker();
  }

  function hideQuiz() {
    if (!quizOverlay) return;
    clearTimers();
    quizOverlay.classList.remove("visible");
    isShowingQuiz = false;
    hasAnsweredCurrentQuiz = false;
    currentQuiz = null;
    currentMultiplier = 1;
  }

  function spendCredit() {
    if (credits > 0) {
      credits--;
      saveProgress();
      return true;
    }
    return false;
  }

  // ============ NAVIGATION DETECTION ============

  const LEARNING_PATH_RE = /^\/(stories|reels|reel)(\/|$)/;

  function isLearningPath(pathname) {
    const path = pathname || "/";
    return path === "/" || LEARNING_PATH_RE.test(path);
  }

  function isStoriesPath(pathname) {
    return /^\/stories(\/|$)/.test(pathname || "");
  }

  function isReelsPath(pathname) {
    return /^\/(reels|reel)(\/|$)/.test(pathname || "");
  }

  function isMainFeed(pathname) {
    return pathname === "/" || pathname === "";
  }

  function isLearningContext() {
    const path = location.pathname;
    return isMainFeed(path) || isStoriesPath(path) || isReelsPath(path);
  }

  function detectStoryNavigation() {
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        const prevPath = new URL(lastUrl).pathname;
        const nextPath = new URL(location.href).pathname;
        lastUrl = location.href;
        if (isStoriesPath(prevPath) && isStoriesPath(nextPath)) handleSwipe();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function detectReelNavigation() {
    let lastScrollTop = 0;
    let scrollTimeout = null;

    window.addEventListener(
      "scroll",
      () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          const currentScroll =
            window.scrollY || document.documentElement.scrollTop || 0;
          const scrollDiff = Math.abs(currentScroll - lastScrollTop);
          if (
            scrollDiff > 300 &&
            (isMainFeed(location.pathname) || isReelsPath(location.pathname))
          ) {
            handleSwipe();
            lastScrollTop = currentScroll;
          }
        }, 150);
      },
      { passive: true },
    );
  }

  function detectWheelNavigation() {
    let wheelAccumulator = 0;
    let wheelDebounce = null;

    window.addEventListener(
      "wheel",
      (e) => {
        if (!isMainFeed(location.pathname) && !isReelsPath(location.pathname))
          return;
        wheelAccumulator += Math.abs(e.deltaY);

        if (wheelDebounce) clearTimeout(wheelDebounce);
        wheelDebounce = setTimeout(() => {
          if (wheelAccumulator > 260) handleSwipe();
          wheelAccumulator = 0;
        }, 120);
      },
      { passive: true },
    );
  }

  function detectKeyboardNavigation() {
    document.addEventListener("keydown", (e) => {
      if (
        isLearningContext() &&
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
      ) {
        handleSwipe();
      }
    });
  }

  function detectClickNavigation() {
    document.addEventListener(
      "click",
      (e) => {
        const isStoryNav =
          e.target.closest('[role="button"]') || e.target.closest("button");
        if (isStoryNav && isStoriesPath(location.pathname)) {
          setTimeout(handleSwipe, 100);
        }
      },
      true,
    );
  }

  function detectTouchNavigation() {
    let touchStartX = null;
    let touchStartY = null;
    let touchStartTime = 0;
    let lastSwipeAt = 0;

    document.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.touches[0]?.clientX ?? null;
        touchStartY = e.touches[0]?.clientY ?? null;
        touchStartTime = Date.now();
      },
      { passive: true },
    );

    document.addEventListener(
      "touchend",
      (e) => {
        if (touchStartY === null || touchStartX === null) return;

        const endX = e.changedTouches[0]?.clientX ?? touchStartX;
        const endY = e.changedTouches[0]?.clientY ?? touchStartY;
        const deltaX = Math.abs(endX - touchStartX);
        const deltaY = Math.abs(endY - touchStartY);
        const touchDuration = Date.now() - touchStartTime;
        const now = Date.now();

        if (now - lastSwipeAt < 350) {
          touchStartX = null;
          touchStartY = null;
          return;
        }

        // Vertical swipe for feed/reels
        if (
          deltaY > 60 &&
          deltaY > deltaX &&
          (isMainFeed(location.pathname) || isReelsPath(location.pathname))
        ) {
          lastSwipeAt = now;
          handleSwipe();
        }

        // Horizontal swipe for stories
        if (
          deltaX > 50 &&
          deltaX > deltaY &&
          isStoriesPath(location.pathname)
        ) {
          lastSwipeAt = now;
          handleSwipe();
        }

        // Tap on sides for stories
        const isTap = deltaX < 15 && deltaY < 15 && touchDuration < 300;
        if (isTap && isStoriesPath(location.pathname)) {
          const screenWidth = window.innerWidth;
          if (
            touchStartX < screenWidth * 0.3 ||
            touchStartX > screenWidth * 0.7
          ) {
            lastSwipeAt = now;
            setTimeout(handleSwipe, 150);
          }
        }

        touchStartX = null;
        touchStartY = null;
      },
      { passive: true },
    );
  }

  function detectContextEntryFallback() {
    let lastHref = location.href;

    const checkForContextEntry = () => {
      if (location.href === lastHref) return;
      const prevPath = new URL(lastHref).pathname;
      const nextPath = location.pathname;
      lastHref = location.href;

      if (
        !isLearningPath(prevPath) &&
        isLearningPath(nextPath) &&
        credits <= 0 &&
        !isShowingQuiz
      ) {
        setTimeout(() => {
          if (!isShowingQuiz && isLearningContext() && credits <= 0) showQuiz();
        }, 300);
      }
    };

    window.addEventListener("popstate", checkForContextEntry);
    window.addEventListener("hashchange", checkForContextEntry);
    const observer = new MutationObserver(checkForContextEntry);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    setInterval(checkForContextEntry, 1000);
  }

  function handleSwipe() {
    console.log(
      `[InstaLearning] Swipe on ${location.pathname}, credits: ${credits}`,
    );

    if (isShowingQuiz) return;
    if (!isLearningContext()) return;

    if (credits <= 0) {
      showQuiz();
      return;
    }

    const spent = spendCredit();
    if (!spent) {
      showQuiz();
      return;
    }

    if (credits <= 0) showQuiz();
  }

  // ============ INIT ============

  async function init() {
    console.log("[InstaLearning] Initializing content script...");
    await loadData();
    console.log(
      `[InstaLearning] Loaded — credits: ${credits}, words: ${words.length}, path: ${location.pathname}`,
    );

    // Show game picker on page load
    setTimeout(showGamePicker, 500);

    // Start all navigation detectors
    detectStoryNavigation();
    detectReelNavigation();
    detectWheelNavigation();
    detectKeyboardNavigation();
    detectClickNavigation();
    detectTouchNavigation();
    detectContextEntryFallback();

    console.log("[InstaLearning] All detectors initialized");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
