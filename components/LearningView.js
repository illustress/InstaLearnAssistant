import { React } from '../deps.js';
const { useState, useEffect } = React;
import { html } from '../utils.js';
import { Check, X, RefreshCw } from 'https://esm.sh/lucide-react@0.263.1?deps=react@18.2.0';

export const LearningView = ({ words, wordProgress, credits, streak, direction, correctAction, onUpdateState }) => {
  const [currentWord, setCurrentWord] = useState(null);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null); // 'correct' | 'wrong'

  useEffect(() => {
    nextQuestion();
  }, [words, direction]);

  const nextQuestion = () => {
    if (!words || words.length === 0) return;
    
    // Simple random pick for now
    const idx = Math.floor(Math.random() * words.length);
    const word = words[idx];
    
    // Generate wrong answers
    const wrong = words
        .filter(w => w !== word)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
        
    const allOptions = [word, ...wrong].sort(() => 0.5 - Math.random());
    
    setCurrentWord(word);
    setOptions(allOptions);
    setSelected(null);
    setResult(null);
  };

  const handleAnswer = (option) => {
    if (result) return;
    setSelected(option);
    
    const isCorrect = option === currentWord;
    setResult(isCorrect ? 'correct' : 'wrong');

    // Update stats
    const newStreak = isCorrect ? streak + 1 : 0;
    const newCredits = isCorrect ? credits + 1 : credits;
    
    // Update word progress
    // Find index of current word in master list
    const wordIndex = words.indexOf(currentWord);
    const currentWP = wordProgress[wordIndex] || { level: 1, correct: 0 };
    let newWP = { ...currentWP };
    
    if (isCorrect) {
        newWP.correct = (newWP.correct || 0) + 1;
        if (newWP.correct >= 3 && newWP.level < 4) {
            newWP.level++;
            newWP.correct = 0;
        }
    } else {
        newWP.correct = 0;
    }

    const updatedProgress = { ...wordProgress, [wordIndex]: newWP };
    
    onUpdateState({
        streak: newStreak,
        credits: newCredits,
        wordProgress: updatedProgress
    });

    if (isCorrect && correctAction === 'next') {
        setTimeout(nextQuestion, 1000);
    }
  };

  if (!currentWord) return html`<div className="il-loading">No words available</div>`;

  const questionText = direction === 'german-to-dutch' ? currentWord.german : currentWord.dutch;
  const answerKey = direction === 'german-to-dutch' ? 'dutch' : 'german';
  const flag = direction === 'german-to-dutch' ? '🇩🇪' : '🇳🇱';

  return html`
    <div className="il-learning-view">
       <div className="il-question-card">
          <div className="il-q-flag">${flag}</div>
          <h2 className="il-q-text">${questionText}</h2>
          ${currentWord.emoji && html`<div className="il-q-emoji">${currentWord.emoji}</div>`}
       </div>

       <div className="il-options-grid">
         ${options.map(opt => {
            const isSelected = selected === opt;
            const isCorrect = opt === currentWord;
            let btnClass = "il-option-btn";
            if (result) {
                if (isCorrect) btnClass += " correct";
                else if (isSelected) btnClass += " wrong";
                else btnClass += " dimmed";
            }

            return html`
              <button 
                key=${opt.german} 
                className=${btnClass}
                disabled=${!!result}
                onClick=${() => handleAnswer(opt)}
              >
                ${opt[answerKey]}
              </button>
            `;
         })}
       </div>

       ${result && html`
         <div className=${`il-feedback-banner ${result}`}>
            ${result === 'correct' ? 'Correct! +1 Credit' : 'Incorrect'}
         </div>
         <button className="il-next-btn" onClick=${nextQuestion}>
            Next Question
         </button>
       `}
    </div>
  `;
};
