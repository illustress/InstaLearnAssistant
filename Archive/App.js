
import { React } from './deps.js';
const { useState, useEffect } = React;
import { html } from './utils.js';
import { generateQuiz } from './services/geminiService.js';
import { Check, AlertCircle, Coins, ArrowRight, GraduationCap, X } from 'https://esm.sh/lucide-react@0.263.1?deps=react@18.2.0';

const INITIAL_CREDITS = 3;

const App = () => {
  const [view, setView] = useState('idle'); // 'idle', 'generating', 'quiz', 'success'
  const [quiz, setQuiz] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isWrong, setIsWrong] = useState(false);
  const [credits, setCredits] = useState(() => {
    const saved = localStorage.getItem('ig_learn_credits');
    return saved !== null ? parseInt(saved, 10) : INITIAL_CREDITS;
  });

  useEffect(() => {
    localStorage.setItem('ig_learn_credits', credits.toString());
  }, [credits]);

  useEffect(() => {
    const handleMessage = async (event) => {
      if (event.data.type === 'IG_CONTEXT_RESPONSE') {
        // Elke swipe kost 1 credit
        setCredits(prev => Math.max(0, prev - 1));
        startQuizFlow();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const startQuizFlow = async () => {
    setView('generating');
    setQuiz(null);
    setSelectedOption(null);
    setIsWrong(false);

    try {
      const newQuiz = await generateQuiz();
      setQuiz(newQuiz);
      setView('quiz');
    } catch (err) {
      console.error("Quiz fail", err);
      window.parent.postMessage({ type: 'UNLOCK_INSTAGRAM' }, '*');
      setView('idle');
    }
  };

  const handleAnswer = (index) => {
    if (view !== 'quiz') return;
    setSelectedOption(index);
    
    if (index === quiz.correctAnswerIndex) {
      setCredits(prev => prev + 1);
      setView('success');
      setTimeout(() => {
        handleClose();
      }, 1800);
    } else {
      setIsWrong(true);
      setTimeout(() => setIsWrong(false), 600);
    }
  };

  const handleClose = () => {
    window.parent.postMessage({ type: 'UNLOCK_INSTAGRAM' }, '*');
    setView('idle');
  };

  const canSkip = credits > 0;

  if (view === 'generating') {
    return html`
      <div className="quiz-container">
        <div className="quiz-card">
          <div className="loader-ring"></div>
          <h1 style=${{fontSize: '20px', marginBottom: '8px'}}>Duits oefenen...</h1>
          <p style=${{color: '#94a3b8'}}>We genereren een nieuwe uitdaging.</p>
        </div>
      </div>
    `;
  }

  if (view === 'quiz' && quiz) {
    return html`
      <div className="quiz-container">
        <div className="top-stats">
            <div className="credit-badge">
                <${Coins} size=${16} />
                <span>${credits} Credits</span>
            </div>
            <div className="badge German">Duits Leren</div>
        </div>

        <div className="quiz-card">
          <div className="quiz-header-row">
            <h1>${quiz.question}</h1>
          </div>
          
          <div className="options-list">
            ${quiz.options.map((option, idx) => html`
              <button 
                key=${idx}
                className=${`option-btn ${selectedOption === idx ? (idx === quiz.correctAnswerIndex ? 'correct' : 'wrong') : ''}`}
                onClick=${() => handleAnswer(idx)}
              >
                <div className="option-prefix">${String.fromCharCode(65 + idx)}</div>
                <div className="option-text">${option}</div>
              </button>
            `)}
          </div>

          <div className="quiz-actions">
            ${isWrong ? html`
              <div className="feedback-error shake">
                <${AlertCircle} size=${16} /> Fout! Kijk nog eens goed.
              </div>
            ` : html`
              <div className="action-spacer" />
            `}

            <div className="main-buttons">
                ${canSkip ? html`
                    <button className="secondary-btn" onClick=${handleClose}>
                        Overslaan en doorgaan <${ArrowRight} size=${16} />
                    </button>
                ` : html`
                    <div className="lock-notice">
                        <${AlertCircle} size=${14} /> Beantwoord goed om Instagram te ontgrendelen (0 credits)
                    </div>
                `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (view === 'success') {
    return html`
      <div className="quiz-container success-state">
        <div className="success-icon">
          <${Check} size=${48} strokeWidth=${3} />
        </div>
        <h1 style=${{fontSize: '32px', marginBottom: '12px'}}>Super!</h1>
        <p style=${{color: '#10b981', fontWeight: '600', maxWidth: '300px'}}>${quiz?.explanation}</p>
        <div className="credit-gain">+1 Credit</div>
      </div>
    `;
  }

  return html`
    <div className="quiz-container">
      <${GraduationCap} size=${64} color="#6366f1" style=${{marginBottom: '20px'}} />
      <h2 style=${{color: '#f8fafc', marginBottom: '10px'}}>Klaar voor meer?</h2>
      <p style=${{color: '#64748b'}}>Huidig saldo: <b>${credits} credits</b>.</p>
      <button className="start-btn" onClick=${() => startQuizFlow()}>
          Nieuwe swipe oefenen (+1 credit)
      </button>
    </div>
  `;
};

export default App;
