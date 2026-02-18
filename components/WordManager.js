import { React } from '../deps.js';
const { useState } = React;
import { html } from '../utils.js';
import { saveWords } from '../services/learningService.js';
import { DEFAULT_WORDS } from '../words.js';

export const WordManager = ({ words, wordProgress, onWordsChange }) => {
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const handleReset = () => {
    if (confirm('Reset all words to default and clear progress?')) {
        onWordsChange(DEFAULT_WORDS, { resetProgress: true });
    }
  };

  const handleImport = () => {
    try {
        const lines = importText.split('\n');
        const newWords = [];
        for (const line of lines) {
            const parts = line.split(',');
            if (parts.length >= 2) {
                newWords.push({
                    german: parts[0].trim(),
                    dutch: parts[1].trim(),
                    emoji: parts[2]?.trim() || '📝',
                    example: parts[3]?.trim() || ''
                });
            }
        }
        if (newWords.length > 0) {
            const combined = [...words, ...newWords];
            saveWords(combined);
            onWordsChange(combined);
            setImportText('');
            setShowImport(false);
            alert(`Added ${newWords.length} words!`);
        }
    } catch (e) {
        alert('Error parsing CSV');
    }
  };

  return html`
    <div className="il-word-manager">
      <div className="il-import-section">
        <button className="il-file-btn" onClick=${() => setShowImport(!showImport)}>
            ${showImport ? 'Cancel Import' : 'Import CSV'}
        </button>
        <button className="il-reset-btn" onClick=${handleReset}>Reset All</button>
      </div>

      ${showImport && html`
        <div className="il-import-box">
            <textarea 
                className="il-text-input" 
                rows=${4} 
                placeholder="German,Dutch,Emoji,Example" 
                value=${importText}
                onChange=${e => setImportText(e.target.value)}
            />
            <button className="il-submit-btn" onClick=${handleImport}>Add Words</button>
            <div className="il-csv-help">Format: German, Dutch, Emoji, Example</div>
        </div>
      `}

      <div className="il-word-count">${words.length} words loaded</div>
      
      <div className="il-word-list">
        ${words.map((w, i) => {
            const progress = wordProgress[i];
            return html`
                <div key=${i} className="il-word-row">
                    <div className="il-word-pair">
                        <span>${w.emoji} ${w.german}</span>
                        <span style=${{color: '#64748b', margin: '0 4px'}}>→</span>
                        <span>${w.dutch}</span>
                    </div>
                    ${progress && html`
                        <span className="il-word-level-badge">Lvl ${progress.level}</span>
                    `}
                </div>
            `;
        })}
      </div>
    </div>
  `;
};
