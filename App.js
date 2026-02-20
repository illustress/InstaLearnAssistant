import { React } from './deps.js';
const { useState, useEffect, useCallback, useRef } = React;
import { html } from './utils.js';
import { DEFAULT_WORDS } from './words.js';
import { loadLearningData, saveProgress } from './services/learningService.js';
import { LearningView } from './components/LearningView.js';
import { ChatView } from './components/ChatView.js';
import { WordManager } from './components/WordManager.js';
import { StatsView } from './components/StatsView.js';
import { SettingsView } from './components/SettingsView.js';
import { BookOpen } from 'https://esm.sh/lucide-react@0.263.1?deps=react@18.2.0';

const TABS = [
  { id: 'learn', icon: '📚', label: 'Learn' },
  { id: 'words', icon: '📖', label: 'Words' },
  { id: 'stats', icon: '📊', label: 'Stats' },
  { id: 'chat',  icon: '💬', label: 'Chat' },
  { id: 'settings', icon: '⚙️', label: '' },
];

const App = () => {
  const [tab, setTab] = useState('learn');
  const [words, setWords] = useState(DEFAULT_WORDS);
  const [wordProgress, setWordProgress] = useState({});
  const [credits, setCredits] = useState(0);
  const [streak, setStreak] = useState(0);
  const [direction, setDirection] = useState('german-to-dutch');
  const [correctAction, setCorrectAction] = useState('next');
  const [loaded, setLoaded] = useState(false);

  // Refs for stable callback
  const stateRef = useRef({ wordProgress, credits, streak });
  useEffect(() => { stateRef.current = { wordProgress, credits, streak }; });

  // Load persisted data on mount
  useEffect(() => {
    loadLearningData().then(data => {
      const wordsWithIds = data.words.map((w, i) => ({
        ...w,
        id: w.id || `w${i + 1}`
      }));
      setWords(wordsWithIds);
      setWordProgress(data.wordProgress);
      setCredits(data.credits);
      setStreak(data.streak);
      setDirection(data.direction);
      setCorrectAction(data.correctAction);
      setLoaded(true);
    });
  }, []);

  // Stable update handler (uses refs so it never changes)
  const handleUpdateState = useCallback((updates) => {
    const cur = stateRef.current;
    const newWP = updates.wordProgress !== undefined ? updates.wordProgress : cur.wordProgress;
    const newCredits = updates.credits !== undefined ? updates.credits : cur.credits;
    const newStreak = updates.streak !== undefined ? updates.streak : cur.streak;

    if (updates.wordProgress !== undefined) setWordProgress(updates.wordProgress);
    if (updates.credits !== undefined) setCredits(updates.credits);
    if (updates.streak !== undefined) setStreak(updates.streak);

    saveProgress(newWP, newCredits, newStreak);
  }, []);

  const handleWordsChange = useCallback((newWords, opts) => {
    const wordsWithIds = (newWords || DEFAULT_WORDS).map((w, i) => ({
      ...w,
      id: w.id || `custom-${i}-${Date.now()}`
    }));
    setWords(wordsWithIds);
    if (opts?.resetProgress) {
      setWordProgress({});
      setCredits(0);
      setStreak(0);
      saveProgress({}, 0, 0);
    }
  }, []);

  const handleSettingsUpdate = useCallback((dir, action, opts) => {
    setDirection(dir);
    setCorrectAction(action);
    if (opts?.resetProgress) {
      setWordProgress({});
      setCredits(0);
      setStreak(0);
    }
  }, []);

  if (!loaded) {
    return html`<div className="app-container"><div className="il-loading">Loading InstaLearning...</div></div>`;
  }

  return html`
    <div className="app-container">
      <header>
        <div className="header-title">
          <div className="logo-box">
            <${BookOpen} size=${18} color="white" />
          </div>
          <span>InstaLearning</span>
        </div>
        <div className="header-stats">
          <span className="header-credit">💰 ${credits}</span>
          <span className="header-streak">🔥 ${streak}</span>
        </div>
      </header>

      <nav className="tab-bar">
        ${TABS.map(t => html`
          <button key=${t.id}
            className=${`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick=${() => setTab(t.id)}>
            <span className="tab-icon">${t.icon}</span>
            ${t.label ? html`<span className="tab-label">${t.label}</span>` : null}
          </button>
        `)}
      </nav>

      <main>
        ${tab === 'learn' ? html`
          <div className="tab-content">
            <${LearningView}
              words=${words} wordProgress=${wordProgress}
              credits=${credits} streak=${streak} direction=${direction}
              correctAction=${correctAction}
              onUpdateState=${handleUpdateState} />
          </div>
        ` : null}

        ${tab === 'words' ? html`
          <div className="tab-content">
            <${WordManager}
              words=${words} wordProgress=${wordProgress}
              onWordsChange=${handleWordsChange} />
          </div>
        ` : null}

        ${tab === 'stats' ? html`
          <div className="tab-content">
            <${StatsView}
              credits=${credits} streak=${streak}
              wordProgress=${wordProgress} words=${words} />
          </div>
        ` : null}

        <div className="tab-content" style=${{ display: tab === 'chat' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <${ChatView} />
        </div>

        ${tab === 'settings' ? html`
          <div className="tab-content">
            <${SettingsView}
              direction=${direction} correctAction=${correctAction}
              credits=${credits} streak=${streak} wordProgress=${wordProgress}
              onUpdate=${handleSettingsUpdate} />
          </div>
        ` : null}
      </main>
    </div>
  `;
};

export default App;