import { React } from '../deps.js';
const { useState, useEffect, useRef } = React;
import { html } from '../utils.js';

export const LearningView = ({ words, wordProgress, credits, streak, direction, correctAction, onUpdateState }) => {
  const [currentWord, setCurrentWord] = useState(null);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null); // 'correct' | 'wrong'
  const [popupImg, setPopupImg] = useState(null);
  const wordsLengthRef = useRef(words?.length || 0);

  useEffect(() => {
    // Only auto-reset if words list length changed or direction changed
    // This prevents resetting when images are generated in background
    if (!currentWord || words?.length !== wordsLengthRef.current) {
        nextQuestion();
    }
    wordsLengthRef.current = words?.length || 0;
  }, [words?.length, direction]);

  const nextQuestion = () => {
    if (!words || words.length === 0) return;
    
    // Simple random pick for now
    const idx = Math.floor(Math.random() * words.length);
    const word = words[idx];
    
    // Generate wrong answers
    // Filter by same type (word vs phrase) to make distractors relevant
    const sameTypeWords = words.filter(w => w.type === word.type);
    
    // If we don't have enough of the same type, fallback to all words
    const pool = sameTypeWords.length >= 4 ? sameTypeWords : words;

    const wrong = pool
        .filter(w => w.id !== word.id)
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
    
    const isCorrect = option.id === currentWord.id;
    setResult(isCorrect ? 'correct' : 'wrong');

    // Update stats
    const newStreak = isCorrect ? streak + 1 : 0;
    const newCredits = isCorrect ? credits + 1 : credits;
    
    // Update word progress
    const wordId = currentWord.id;
    const currentWP = wordProgress[wordId] || { level: 1, correct: 0 };
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

    const updatedProgress = { ...wordProgress, [wordId]: newWP };
    
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
  
  // Dynamic font size for long text
  const isLong = questionText.length > 30;
  const isVeryLong = questionText.length > 60;
  const fontSize = isVeryLong ? '18px' : (isLong ? '22px' : '28px');

  return html`
    <div className="il-learning-view">
       ${popupImg && html`
         <div className="il-img-popup-overlay" onClick=${() => setPopupImg(null)}>
             <div className="il-img-popup-content" onClick=${e => e.stopPropagation()}>
                 <img src=${popupImg} className="il-popup-img" />
                 <button className="il-popup-close" onClick=${() => setPopupImg(null)}>Close</button>
             </div>
         </div>
       `}

       <div className="il-question-card">
          ${currentWord.image && html`
            <img 
                src=${currentWord.image} 
                className="il-q-image" 
                onClick=${() => setPopupImg(currentWord.image)}
                style=${{cursor: 'pointer'}}
                title="Click to enlarge"
            />
          `}
          <div className="il-q-flag">${flag}</div>
          <h2 className="il-q-text" style=${{fontSize}}>${questionText}</h2>
          ${currentWord.emoji && html`<div className="il-q-emoji">${currentWord.emoji}</div>`}
       </div>

       <div className="il-options-grid">
         ${options.map(opt => {
            const isSelected = selected?.id === opt.id;
            const isCorrect = opt.id === currentWord.id;
            let btnClass = "il-option-btn";
            if (result) {
                if (isCorrect) btnClass += " correct";
                else if (isSelected) btnClass += " wrong";
                else btnClass += " dimmed";
            }

            return html`
              <button 
                key=${opt.id} 
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
