import { React } from '../deps.js';
const { useState, useEffect, useRef } = React;
import { html } from '../utils.js';
import { Volume2 } from 'https://esm.sh/lucide-react@0.263.1?deps=react@18.2.0';

export const LearningView = ({ words, wordProgress, credits, streak, direction, correctAction, speechRate, autoPlayAudio, timeSpent, onUpdateState }) => {
  const [currentWord, setCurrentWord] = useState(null);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null); // 'correct' | 'wrong'
  const [popupImg, setPopupImg] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const wordsLengthRef = useRef(words?.length || 0);
  const questionStartTimeRef = useRef(Date.now());

  useEffect(() => {
    // Only auto-reset if words list length changed or direction changed
    // This prevents resetting when images are generated in background
    if (!currentWord || words?.length !== wordsLengthRef.current) {
        nextQuestion();
    }
    wordsLengthRef.current = words?.length || 0;
  }, [words?.length, direction]);

  useEffect(() => {
    if (currentWord && autoPlayAudio) {
        const text = direction === 'german-to-dutch' ? currentWord.german : currentWord.dutch;
        const lang = direction === 'german-to-dutch' ? 'german' : 'dutch';
        // Small delay ensures it doesn't clip if rendering takes a frame
        const timer = setTimeout(() => speakText(text, lang), 50);
        return () => clearTimeout(timer);
    }
  }, [currentWord?.id, autoPlayAudio, direction]);

  const speakText = (text, lang) => {
      if (!window.speechSynthesis) return;
      
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      setIsSpeaking(false);

      const utterance = new SpeechSynthesisUtterance(text);
      // Map 'german-to-dutch' context to actual BCP 47 language tags
      // If direction is German->Dutch, question is German (de-DE)
      // If direction is Dutch->German, question is Dutch (nl-NL)
      utterance.lang = lang === 'german' ? 'de-DE' : 'nl-NL';
      utterance.rate = speechRate || 0.7; 
      
      // Try to find a good voice
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.startsWith(utterance.lang));
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
  };

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
    questionStartTimeRef.current = Date.now();
  };

  const handleAnswer = (option) => {
    if (result) return;
    setSelected(option);
    
    const isCorrect = option.id === currentWord.id;
    setResult(isCorrect ? 'correct' : 'wrong');

    // Calculate time spent on this question
    const timeTaken = Math.floor((Date.now() - questionStartTimeRef.current) / 1000); // in seconds
    const newTimeSpent = (timeSpent || 0) + timeTaken;

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
        wordProgress: updatedProgress,
        timeSpent: newTimeSpent
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
          <div style=${{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
              <h2 className="il-q-text" style=${{fontSize}}>${questionText}</h2>
              <button 
                onClick=${(e) => {
                    e.stopPropagation();
                    speakText(questionText, direction === 'german-to-dutch' ? 'german' : 'dutch');
                }}
                className="il-icon-btn-sm"
                style=${{
                    border: 'none', 
                    background: isSpeaking ? '#22c55e' : 'rgba(255,255,255,0.1)', 
                    color: isSpeaking ? 'white' : 'inherit',
                    borderRadius: '50%', 
                    width: '32px', 
                    height: '32px',
                    transition: 'background 0.2s ease'
                }}
                title="Listen"
              >
                <${Volume2} size=${18} />
              </button>
          </div>
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
                onClick=${() => handleAnswer(opt)}
                style=${{
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '0 12px',
                    position: 'relative'
                }}
              >
                <span style=${{flex: 1, textAlign: 'center'}}>${opt[answerKey]}</span>
                <div 
                    onClick=${(e) => {
                        e.stopPropagation();
                        speakText(opt[answerKey], answerKey);
                    }}
                    style=${{
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        padding: '8px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        opacity: 0.6,
                        zIndex: 10,
                        marginLeft: '8px'
                    }}
                    onMouseEnter=${e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave=${e => e.currentTarget.style.opacity = '0.6'}
                    title="Listen"
                >
                    <${Volume2} size=${16} />
                </div>
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
