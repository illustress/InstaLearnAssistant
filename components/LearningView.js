// InstaLearning — Full Learning View (Game Picker, Quizzes, Mini-Games, Feedback)

import { React } from '../deps.js';
const { useState, useEffect, useRef, useCallback } = React;
import { html } from '../utils.js';
import {
  pickWord, getDirection, generateWrongAnswers, shuffle,
  getStreakBonus, updateWordProgress, showConfetti, speak, isLetter, saveSession
} from '../services/learningService.js';

const LEVEL_MULTIPLIERS = { 1: 1, 2: 2, 3: 3, 4: 5 };
const GAME_MULTIPLIERS = { quiz: 1, scramble: 2, hangman: 3, match: 2 };

// ═══════════════════════════════════════════
//  Sub-components
// ═══════════════════════════════════════════

const Header = ({ credits, streak, label }) => html`
  <div className="il-header">
    <span className="il-credits-badge">💰 ${credits}</span>
    <span className="il-streak-badge">🔥 ${streak}</span>
    <span className="il-level-label">${label}</span>
  </div>
`;

const ProgressBar = ({ wordProgress, wordIndex }) => {
  if (wordIndex === undefined || wordIndex < 0) return null;
  const progress = wordProgress[wordIndex];
  const level = progress?.level || 1;
  const correct = progress?.correct || 0;
  const percentage = ((level - 1) * 33.33) + (correct / 3 * 33.33);
  return html`
    <div className="il-progress-bar">
      <div className=${`il-progress-fill level-${level}`}
        style=${{ width: Math.min(percentage, 100) + '%' }} />
    </div>
  `;
};

const WordInfo = ({ word, direction }) => {
  if (!word) return null;
  return html`
    <div className="il-word-info-row">
      ${word.emoji ? html`<span className="il-emoji-lg">${word.emoji}</span>` : null}
      <button type="button" className="il-audio-btn" onClick=${() => speak(word.german, 'german')}>🔊 DE</button>
      <button type="button" className="il-audio-btn" onClick=${() => speak(word.dutch, 'dutch')}>🔊 NL</button>
      ${word.example ? html`<div className="il-example-text">"${word.example}"</div>` : null}
    </div>
  `;
};

const Question = ({ direction, text }) => {
  const dirLabel = direction === 'german-to-dutch' ? '🇩🇪 → 🇳🇱' : '🇳🇱 → 🇩🇪';
  return html`
    <div className="il-question">
      <span className="il-direction">${dirLabel}</span>
      <span className="il-word-text">${text}</span>
    </div>
  `;
};

// ═══════════════════════════════════════════
//  Game Picker
// ═══════════════════════════════════════════

const GamePicker = ({ onSelect, doubleOrNothing }) => html`
  <div className="il-game-picker">
    <h3 className="il-picker-title">${doubleOrNothing ? '🎰 Double or Nothing!' : '🎯 Choose Your Challenge'}</h3>

    <div className="il-picker-section">
      <div className="il-picker-label">Quiz Levels</div>
      <div className="il-picker-grid">
        <button className="il-picker-btn" onClick=${() => onSelect('quiz', 1)}>
          <span className="il-picker-icon">📝</span>
          <span className="il-picker-name">Multiple Choice</span>
          <span className="il-picker-mult">×1</span>
        </button>
        <button className="il-picker-btn" onClick=${() => onSelect('quiz', 2)}>
          <span className="il-picker-icon">💡</span>
          <span className="il-picker-name">Type + Hints</span>
          <span className="il-picker-mult">×2</span>
        </button>
        <button className="il-picker-btn" onClick=${() => onSelect('quiz', 3)}>
          <span className="il-picker-icon">🔄</span>
          <span className="il-picker-name">Reverse</span>
          <span className="il-picker-mult">×3</span>
        </button>
        <button className="il-picker-btn" onClick=${() => onSelect('quiz', 4)}>
          <span className="il-picker-icon">⚡</span>
          <span className="il-picker-name">Speed Round</span>
          <span className="il-picker-mult">×5</span>
        </button>
      </div>
    </div>

    <div className="il-picker-section">
      <div className="il-picker-label">Mini Games</div>
      <div className="il-picker-grid">
        <button className="il-picker-btn" onClick=${() => onSelect('scramble')}>
          <span className="il-picker-icon">🔀</span>
          <span className="il-picker-name">Word Scramble</span>
          <span className="il-picker-mult">×2</span>
        </button>
        <button className="il-picker-btn" onClick=${() => onSelect('hangman')}>
          <span className="il-picker-icon">☠️</span>
          <span className="il-picker-name">Hangman</span>
          <span className="il-picker-mult">×3</span>
        </button>
        <button className="il-picker-btn" onClick=${() => onSelect('match')}>
          <span className="il-picker-icon">🎯</span>
          <span className="il-picker-name">Match Pairs</span>
          <span className="il-picker-mult">×2</span>
        </button>
      </div>
    </div>
  </div>
`;

// ═══════════════════════════════════════════
//  Quiz Level 1 — Multiple Choice
// ═══════════════════════════════════════════

const QuizLevel1 = ({ word, direction, answer, wrongAnswers, onAnswer }) => {
  const options = useRef(shuffle([answer, ...wrongAnswers])).current;
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState(null);

  const question = direction === 'german-to-dutch' ? word.german : word.dutch;

  const handleClick = (opt) => {
    if (answered) return;
    setAnswered(true);
    setSelected(opt);
    const correct = opt.toLowerCase() === answer.toLowerCase();
    setTimeout(() => onAnswer(correct, answer), 500);
  };

  return html`
    <div className="il-quiz-content">
      <${Question} direction=${direction} text=${question} />
      <${WordInfo} word=${word} direction=${direction} />
      <div className="il-options-grid">
        ${options.map((opt, i) => html`
          <button key=${i}
            className=${`il-option-btn ${answered ? (opt.toLowerCase() === answer.toLowerCase() ? 'correct' : (opt === selected ? 'wrong' : '')) : ''}`}
            onClick=${() => handleClick(opt)} disabled=${answered}
          >${opt}</button>
        `)}
      </div>
    </div>
  `;
};

// ═══════════════════════════════════════════
//  Quiz Level 2 — Type with Hints
// ═══════════════════════════════════════════

const QuizLevel2 = ({ word, direction, answer, onAnswer }) => {
  const [input, setInput] = useState('');
  const [hints, setHints] = useState(answer.split('').map(() => '_'));
  const [answered, setAnswered] = useState(false);
  const revealedRef = useRef(new Set());
  const timerRef = useRef(null);
  const onAnswerRef = useRef(onAnswer);
  onAnswerRef.current = onAnswer;

  const question = direction === 'german-to-dutch' ? word.german : word.dutch;

  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (revealedRef.current.size >= Math.floor(answer.length * 0.6)) {
        clearInterval(timerRef.current);
        return;
      }
      let pos;
      do { pos = Math.floor(Math.random() * answer.length); } while (revealedRef.current.has(pos));
      revealedRef.current.add(pos);
      setHints(answer.split('').map((l, i) => revealedRef.current.has(i) ? l : '_'));
    }, 2000);
    return () => clearInterval(timerRef.current);
  }, []);

  const handleSubmit = () => {
    if (answered) return;
    setAnswered(true);
    clearInterval(timerRef.current);
    onAnswerRef.current(input.trim().toLowerCase() === answer.toLowerCase(), answer);
  };

  return html`
    <div className="il-quiz-content">
      <${Question} direction=${direction} text=${question} />
      <${WordInfo} word=${word} direction=${direction} />
      <div className="il-hint-display">${hints.join(' ')}</div>
      <div className="il-type-input-row">
        <input type="text" className="il-text-input" value=${input}
          onChange=${e => setInput(e.target.value)}
          onKeyDown=${e => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="Type the translation..." autoFocus disabled=${answered} />
        <button className="il-submit-btn" onClick=${handleSubmit} disabled=${answered}>Check</button>
      </div>
    </div>
  `;
};

// ═══════════════════════════════════════════
//  Quiz Level 3 — Reverse direction, no hints
// ═══════════════════════════════════════════

const QuizLevel3 = ({ word, direction: origDir, onAnswer }) => {
  const [input, setInput] = useState('');
  const [answered, setAnswered] = useState(false);

  const reverseDir = origDir === 'german-to-dutch' ? 'dutch-to-german' : 'german-to-dutch';
  const question = reverseDir === 'german-to-dutch' ? word.german : word.dutch;
  const answer = reverseDir === 'german-to-dutch' ? word.dutch : word.german;

  const handleSubmit = () => {
    if (answered) return;
    setAnswered(true);
    onAnswer(input.trim().toLowerCase() === answer.toLowerCase(), answer);
  };

  return html`
    <div className="il-quiz-content">
      <${Question} direction=${reverseDir} text=${question} />
      <${WordInfo} word=${word} direction=${reverseDir} />
      <div className="il-type-input-row">
        <input type="text" className="il-text-input" value=${input}
          onChange=${e => setInput(e.target.value)}
          onKeyDown=${e => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="Type (no hints!)..." autoFocus disabled=${answered} />
        <button className="il-submit-btn" onClick=${handleSubmit} disabled=${answered}>Check</button>
      </div>
    </div>
  `;
};

// ═══════════════════════════════════════════
//  Quiz Level 4 — Speed Round (5 seconds)
// ═══════════════════════════════════════════

const QuizLevel4 = ({ word, direction, answer, onAnswer }) => {
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(5);
  const [answered, setAnswered] = useState(false);
  const answeredRef = useRef(false);
  const timerRef = useRef(null);
  const onAnswerRef = useRef(onAnswer);
  onAnswerRef.current = onAnswer;

  const question = direction === 'german-to-dutch' ? word.german : word.dutch;

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!answeredRef.current) {
            answeredRef.current = true;
            setAnswered(true);
            setTimeout(() => onAnswerRef.current(false, answer), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const handleSubmit = () => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setAnswered(true);
    clearInterval(timerRef.current);
    onAnswer(input.trim().toLowerCase() === answer.toLowerCase(), answer);
  };

  return html`
    <div className="il-quiz-content">
      <${Question} direction=${direction} text=${question} />
      <${WordInfo} word=${word} direction=${direction} />
      <div className=${`il-timer-display ${timeLeft <= 2 ? 'warning' : ''}`}>${timeLeft}s</div>
      <div className="il-type-input-row">
        <input type="text" className="il-text-input" value=${input}
          onChange=${e => setInput(e.target.value)}
          onKeyDown=${e => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="Quick!" autoFocus disabled=${answered} />
        <button className="il-submit-btn" onClick=${handleSubmit} disabled=${answered}>Check</button>
      </div>
    </div>
  `;
};

// ═══════════════════════════════════════════
//  Word Scramble
// ═══════════════════════════════════════════

const ScrambleGame = ({ word, direction, answer, onAnswer }) => {
  const question = direction === 'german-to-dutch' ? word.german : word.dutch;
  const [scrambled] = useState(() => {
    const letters = answer.split('');
    let result;
    let attempts = 0;
    do {
      result = shuffle([...letters]);
      attempts++;
    } while (result.join('') === answer && attempts < 10 && letters.length > 1);
    return result;
  });
  const [input, setInput] = useState('');
  const [answered, setAnswered] = useState(false);

  const handleSubmit = () => {
    if (answered) return;
    setAnswered(true);
    onAnswer(input.trim().toLowerCase() === answer.toLowerCase(), answer);
  };

  return html`
    <div className="il-quiz-content">
      <${Question} direction=${direction} text=${question} />
      <${WordInfo} word=${word} direction=${direction} />
      <div className="il-scrambled-letters">
        ${scrambled.map((l, i) => html`<span key=${i} className="il-letter-tile">${l}</span>`)}
      </div>
      <div className="il-type-input-row">
        <input type="text" className="il-text-input" value=${input}
          onChange=${e => setInput(e.target.value)}
          onKeyDown=${e => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="Unscramble the word..." autoFocus disabled=${answered} />
        <button className="il-submit-btn" onClick=${handleSubmit} disabled=${answered}>Check</button>
      </div>
    </div>
  `;
};

// ═══════════════════════════════════════════
//  Hangman
// ═══════════════════════════════════════════

const HangmanGame = ({ word, direction, answer, onAnswer }) => {
  const question = direction === 'german-to-dutch' ? word.german : word.dutch;
  const [guessed, setGuessed] = useState(new Set());
  const [wrongCount, setWrongCount] = useState(0);
  const maxWrong = 6;
  const answeredRef = useRef(false);

  const answerLower = answer.toLowerCase();
  const answerChars = Array.from(answerLower);
  const allLetters = useRef(
    Array.from(new Set([
      ...'abcdefghijklmnopqrstuvwxyz'.split(''),
      ...answerChars.filter(c => isLetter(c))
    ]))
  ).current;

  const display = Array.from(answer).map(c => {
    if (!isLetter(c)) return c;
    return guessed.has(c.toLowerCase()) ? c : '_';
  }).join(' ');

  const stages = ['😀', '😐', '😟', '😰', '😱', '💀', '☠️'];

  const handleGuess = (letter) => {
    if (answeredRef.current || guessed.has(letter)) return;
    const newGuessed = new Set(guessed);
    newGuessed.add(letter);
    setGuessed(newGuessed);

    let newWrong = wrongCount;
    if (!answerLower.includes(letter)) {
      newWrong = wrongCount + 1;
      setWrongCount(newWrong);
    }

    const won = answerChars.every(c => !isLetter(c) || newGuessed.has(c));
    const lost = newWrong >= maxWrong;

    if (won || lost) {
      answeredRef.current = true;
      setTimeout(() => onAnswer(won, answer), 400);
    }
  };

  return html`
    <div className="il-quiz-content">
      <${Question} direction=${direction} text=${question} />
      <${WordInfo} word=${word} direction=${direction} />
      <div className="il-hangman-display">
        <div className="il-hangman-face">${stages[Math.min(wrongCount, stages.length - 1)]}</div>
        <div className="il-hangman-word">${display}</div>
        <div className="il-hangman-lives">${'❤️'.repeat(maxWrong - wrongCount)}${'🖤'.repeat(wrongCount)}</div>
      </div>
      <div className="il-keyboard">
        ${allLetters.map(l => html`
          <button key=${l} className=${`il-key-btn ${guessed.has(l) ? 'used' : ''}`}
            onClick=${() => handleGuess(l)} disabled=${guessed.has(l)}>${l}</button>
        `)}
      </div>
    </div>
  `;
};

// ═══════════════════════════════════════════
//  Match Pairs
// ═══════════════════════════════════════════

const MatchPairsGame = ({ words, onAnswer }) => {
  const targetPairs = Math.min(4, words.length);

  const [cards, setCards] = useState(() => {
    const pairs = [];
    const usedIndices = new Set();
    while (pairs.length < targetPairs && usedIndices.size < words.length) {
      const idx = Math.floor(Math.random() * words.length);
      if (!usedIndices.has(idx)) { usedIndices.add(idx); pairs.push(words[idx]); }
    }
    const list = [];
    pairs.forEach(p => {
      list.push({ text: p.german, pairId: p.german, type: 'german', matched: false });
      list.push({ text: p.dutch, pairId: p.german, type: 'dutch', matched: false });
    });
    return shuffle(list);
  });

  const [selected, setSelected] = useState(null);
  const [wrongPair, setWrongPair] = useState(null);
  const [matchedCount, setMatchedCount] = useState(0);
  const answeredRef = useRef(false);
  const lockRef = useRef(false);

  const handleCardClick = (idx) => {
    if (answeredRef.current || cards[idx].matched || lockRef.current) return;
    if (selected === null) {
      setSelected(idx);
      return;
    }
    if (selected === idx) return;

    const prevCard = cards[selected];
    const curCard = cards[idx];

    if (prevCard.pairId === curCard.pairId && prevCard.type !== curCard.type) {
      const newCards = cards.map((c, i) =>
        (i === selected || i === idx) ? { ...c, matched: true } : c
      );
      setCards(newCards);
      setSelected(null);
      const newMatched = matchedCount + 1;
      setMatchedCount(newMatched);
      if (newMatched === targetPairs) {
        answeredRef.current = true;
        setTimeout(() => onAnswer(true, 'All matched!'), 400);
      }
    } else {
      // Wrong match — flash both cards red briefly
      lockRef.current = true;
      setWrongPair([selected, idx]);
      setTimeout(() => {
        setWrongPair(null);
        setSelected(null);
        lockRef.current = false;
      }, 600);
    }
  };

  return html`
    <div className="il-quiz-content">
      <div className="il-question">
        <span className="il-word-text">🎯 Match the Pairs!</span>
      </div>
      <div className="il-match-grid">
        ${cards.map((card, i) => html`
          <button key=${i}
            className=${`il-match-card ${card.matched ? 'matched' : ''} ${selected === i ? 'selected' : ''} ${wrongPair && wrongPair.includes(i) ? 'wrong-flash' : ''}`}
            onClick=${() => handleCardClick(i)} disabled=${card.matched}
          >${card.text}</button>
        `)}
      </div>
    </div>
  `;
};

// ═══════════════════════════════════════════
//  Feedback Screen
// ═══════════════════════════════════════════

const FeedbackScreen = ({ result, multiplier, correctAction, onNext, onDoubleOrNothing }) => {
  const autoTimer = useRef(null);
  const [countdown, setCountdown] = useState(correctAction === 'next' && result.correct && !result.wasDON ? 2 : null);

  useEffect(() => {
    // Auto-advance when correctAction='next', answer is correct, and not double-or-nothing
    if (correctAction === 'next' && result.correct && !result.wasDON) {
      let remaining = 2;
      autoTimer.current = setInterval(() => {
        remaining--;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(autoTimer.current);
          onNext();
        }
      }, 750);
    }
    return () => { if (autoTimer.current) clearInterval(autoTimer.current); };
  }, []);

  const handleManualNext = () => {
    if (autoTimer.current) clearInterval(autoTimer.current);
    onNext();
  };

  return html`
    <div className="il-feedback">
      <div className=${`il-feedback-banner ${result.correct ? 'correct' : 'wrong'}`}>
        ${result.correct
          ? (result.wasDON
              ? html`<span>🎰 DOUBLE! You now have ${result.credits} credits!</span>`
              : html`<span>✓ Correct! +${result.earnedCredits} 💰 ${multiplier > 1 ? `(×${multiplier})` : ''}</span>`)
          : (result.wasDON
              ? html`<span>💥 BUST! Lost all credits!</span>`
              : html`<span>✗ Answer: <strong>${result.answer}</strong></span>`)
        }
      </div>
      ${result.leveledUp ? html`<div className="il-levelup-banner">🎉 Level Up! Now Level ${result.newLevel}!</div>` : null}
      <div className="il-feedback-actions">
        <button className="il-action-btn primary" onClick=${handleManualNext}>
          ${result.correct
            ? (countdown !== null ? `🎯 Next (${countdown}...)` : '📋 Review Result')
            : '🔄 Try Again'}
        </button>
        ${result.correct && result.credits >= 2 && onDoubleOrNothing ? html`
          <button className="il-action-btn danger" onClick=${() => {
            if (autoTimer.current) clearInterval(autoTimer.current);
            onDoubleOrNothing();
          }}>
            🎰 Double or Nothing (${result.credits} at stake)
          </button>
        ` : null}
      </div>
    </div>
  `;
};

// ═══════════════════════════════════════════
//  Main Learning View (orchestrator)
// ═══════════════════════════════════════════

export const LearningView = ({ words, wordProgress, credits, streak, direction, correctAction = 'next', onUpdateState }) => {
  const [screen, setScreen] = useState('picker');   // picker | playing | feedback
  const [gameType, setGameType] = useState(null);
  const [quizLevel, setQuizLevel] = useState(1);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [multiplier, setMultiplier] = useState(1);
  const [lastResult, setLastResult] = useState(null);
  const [doubleOrNothing, setDoubleOrNothing] = useState(false);
  const [gameKey, setGameKey] = useState(0);

  // Session tracking
  const sessionRef = useRef({ startTime: Date.now(), correct: 0, wrong: 0, creditsEarned: 0, bestStreak: 0 });

  // Refs for stable callback — must include ALL mutable state used by handleAnswer
  const stateRef = useRef({ credits, streak, wordProgress, multiplier, doubleOrNothing, currentQuiz, gameType });
  useEffect(() => {
    stateRef.current = { credits, streak, wordProgress, multiplier, doubleOrNothing, currentQuiz, gameType };
  });

  // Save session on unmount
  useEffect(() => {
    return () => {
      const s = sessionRef.current;
      if (s.correct > 0 || s.wrong > 0) {
        saveSession({
          date: new Date().toISOString(),
          duration: Math.floor((Date.now() - s.startTime) / 1000),
          correct: s.correct, wrong: s.wrong,
          creditsEarned: s.creditsEarned, bestStreak: s.bestStreak,
          accuracy: Math.round((s.correct / (s.correct + s.wrong)) * 100)
        });
      }
    };
  }, []);

  // Select game / quiz
  const handleSelect = (type, level) => {
    if (type === 'quiz') {
      const { word, index } = pickWord(words, stateRef.current.wordProgress);
      if (!word) return;
      const dir = getDirection(direction);
      const answer = dir === 'german-to-dutch' ? word.dutch : word.german;
      const wrongAnswers = level === 1 ? generateWrongAnswers(words, answer, dir === 'dutch-to-german') : [];
      setGameType('quiz');
      setQuizLevel(level);
      setMultiplier(LEVEL_MULTIPLIERS[level]);
      setCurrentQuiz({ word, index, direction: dir, answer, wrongAnswers });
    } else {
      const { word, index } = pickWord(words, stateRef.current.wordProgress);
      if (!word && type !== 'match') return;
      const dir = getDirection(direction);
      const answer = word ? (dir === 'german-to-dutch' ? word.dutch : word.german) : '';
      setGameType(type);
      setMultiplier(GAME_MULTIPLIERS[type]);
      setCurrentQuiz({ word, index, direction: dir, answer });
    }
    setScreen('playing');
    setGameKey(k => k + 1);
  };

  // Handle answer — stable via ref
  const handleAnswer = useCallback((correct, correctAnswer) => {
    const { credits: cr, streak: st, wordProgress: wp, multiplier: mult, doubleOrNothing: don, currentQuiz: cq } = stateRef.current;
    let newCredits = cr;
    let newStreak = st;
    let earnedCredits = 0;
    let newWP = wp;
    let leveledUp = false;
    let newLevel = 0;

    if (correct) {
      newStreak = st + 1;
      if (don) {
        earnedCredits = newCredits;
        newCredits *= 2;
        showConfetti();
      } else {
        earnedCredits = mult;
        newCredits = cr + mult;
        const bonus = getStreakBonus(newStreak);
        if (bonus > 0) { newCredits += bonus; earnedCredits += bonus; }
        if (mult >= 3) showConfetti();
      }
      sessionRef.current.correct++;
      sessionRef.current.creditsEarned += earnedCredits;
      if (newStreak > sessionRef.current.bestStreak) sessionRef.current.bestStreak = newStreak;
    } else {
      if (don) { newCredits = 0; }
      newStreak = 0;
      sessionRef.current.wrong++;
    }

    if (cq?.index !== undefined && cq.index >= 0) {
      const result = updateWordProgress(wp, cq.index, correct);
      newWP = result.wordProgress;
      leveledUp = result.leveledUp;
      newLevel = result.newLevel;
      if (leveledUp) showConfetti();
    }

    onUpdateState({ wordProgress: newWP, credits: newCredits, streak: newStreak });

    setLastResult({
      correct, answer: correctAnswer, earnedCredits,
      wasDON: don, credits: newCredits, streak: newStreak,
      leveledUp, newLevel
    });
    setDoubleOrNothing(false);
    setScreen('feedback');
  }, [onUpdateState]);

  const handleNext = () => {
    setScreen('picker');
    setCurrentQuiz(null);
    setLastResult(null);
  };

  const handleDoubleOrNothing = () => {
    setDoubleOrNothing(true);
    setScreen('picker');
  };

  // Empty words guard
  if (words.length === 0) {
    return html`<div className="il-empty">No words loaded. Add words in the 📖 Words tab.</div>`;
  }

  const headerLabel = screen === 'picker' ? 'CHOOSE'
    : gameType === 'quiz' ? `Level ${quizLevel} (×${multiplier})`
    : `${(gameType || '').toUpperCase()} (×${multiplier})`;

  return html`
    <div className="il-learning-view">
      <${Header} credits=${credits} streak=${streak} label=${headerLabel} />

      ${screen === 'playing' && currentQuiz ? html`
        <${ProgressBar} wordProgress=${wordProgress} wordIndex=${currentQuiz.index} />
      ` : null}

      ${screen === 'picker' ? html`
        <${GamePicker} onSelect=${handleSelect} doubleOrNothing=${doubleOrNothing} />
      ` : null}

      ${screen === 'playing' && gameType === 'quiz' && quizLevel === 1 && currentQuiz ? html`
        <${QuizLevel1} key=${gameKey} word=${currentQuiz.word} direction=${currentQuiz.direction}
          answer=${currentQuiz.answer} wrongAnswers=${currentQuiz.wrongAnswers} onAnswer=${handleAnswer} />
      ` : null}

      ${screen === 'playing' && gameType === 'quiz' && quizLevel === 2 && currentQuiz ? html`
        <${QuizLevel2} key=${gameKey} word=${currentQuiz.word} direction=${currentQuiz.direction}
          answer=${currentQuiz.answer} onAnswer=${handleAnswer} />
      ` : null}

      ${screen === 'playing' && gameType === 'quiz' && quizLevel === 3 && currentQuiz ? html`
        <${QuizLevel3} key=${gameKey} word=${currentQuiz.word} direction=${currentQuiz.direction}
          onAnswer=${handleAnswer} />
      ` : null}

      ${screen === 'playing' && gameType === 'quiz' && quizLevel === 4 && currentQuiz ? html`
        <${QuizLevel4} key=${gameKey} word=${currentQuiz.word} direction=${currentQuiz.direction}
          answer=${currentQuiz.answer} onAnswer=${handleAnswer} />
      ` : null}

      ${screen === 'playing' && gameType === 'scramble' && currentQuiz ? html`
        <${ScrambleGame} key=${gameKey} word=${currentQuiz.word} direction=${currentQuiz.direction}
          answer=${currentQuiz.answer} onAnswer=${handleAnswer} />
      ` : null}

      ${screen === 'playing' && gameType === 'hangman' && currentQuiz ? html`
        <${HangmanGame} key=${gameKey} word=${currentQuiz.word} direction=${currentQuiz.direction}
          answer=${currentQuiz.answer} onAnswer=${handleAnswer} />
      ` : null}

      ${screen === 'playing' && gameType === 'match' ? html`
        <${MatchPairsGame} key=${gameKey} words=${words} onAnswer=${handleAnswer} />
      ` : null}

      ${screen === 'feedback' && lastResult ? html`
        <${FeedbackScreen} result=${lastResult} multiplier=${multiplier}
          correctAction=${correctAction}
          onNext=${handleNext}
          onDoubleOrNothing=${lastResult.correct && lastResult.credits >= 2 ? handleDoubleOrNothing : null} />
      ` : null}
    </div>
  `;
};
