import { React } from '../deps.js';
const { useState, useCallback } = React;
import { html } from '../utils.js';
import { saveWords } from '../services/learningService.js';
import { DEFAULT_WORDS } from '../words.js';
import { generateWordImage } from '../services/geminiService.js';
import { Image, Wand2, RefreshCw, X } from 'https://esm.sh/lucide-react@0.263.1?deps=react@18.2.0';

export const WordManager = ({ words, wordProgress, onWordsChange }) => {
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState(null);
  const [enlargedImage, setEnlargedImage] = useState(null);

  const handleReset = () => {
    if (confirm('Reset all words to default and clear progress?')) {
        saveWords(DEFAULT_WORDS);
        onWordsChange(DEFAULT_WORDS, { resetProgress: true });
    }
  };

  const handleGenerateImage = async (index) => {
    try {
      setGeneratingIndex(index);
      const word = words[index];
      const imageUrl = await generateWordImage(word.german);
      const newWords = [...words];
      newWords[index] = { ...word, imageUrl };
      saveWords(newWords);
      onWordsChange(newWords);
    } catch (e) {
      console.error("Failed to generate image", e);
      alert("Failed to generate image: " + e.message);
    } finally {
      setGeneratingIndex(null);
    }
  };

  const handleGenerateAllMissing = async () => {
    if (generatingAll) return;
    const missingIndices = words
      .map((w, i) => (w.imageUrl ? -1 : i))
      .filter(i => i !== -1);

    if (missingIndices.length === 0) {
      alert("All words already have images!");
      return;
    }

    if (!confirm(`Generate images for ${missingIndices.length} words? This might take a while.`)) {
      return;
    }

    setGeneratingAll(true);
    let updatedWords = [...words];
    
    try {
      for (const index of missingIndices) {
        setGeneratingIndex(index);
        const word = updatedWords[index];
        const imageUrl = await generateWordImage(word.german);
        updatedWords[index] = { ...word, imageUrl };
        // Update incrementally for better UX
        onWordsChange([...updatedWords]);
      }
      saveWords(updatedWords);
      alert("Finished generating all images!");
    } catch (e) {
      console.error("Batch generation failed", e);
      alert("Batch generation stopped due to an error: " + e.message);
    } finally {
      setGeneratingAll(false);
      setGeneratingIndex(null);
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

      <div className="il-ai-actions">
        <button 
          className="il-ai-btn" 
          disabled=${generatingAll} 
          onClick=${handleGenerateAllMissing}
        >
          <${Wand2} size=${16} />
          ${generatingAll ? 'Generating...' : 'Generate Missing Images'}
        </button>
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
            const isGenerating = generatingIndex === i;
            return html`
                <div key=${i} className="il-word-row">
                    <div className="il-word-preview" onClick=${() => w.imageUrl && setEnlargedImage(w.imageUrl)}>
                        ${w.imageUrl ? html`
                            <img src=${w.imageUrl} className="il-word-thumb" />
                        ` : html`
                            <div className="il-word-thumb-placeholder">
                                <${Image} size=${16} />
                            </div>
                        `}
                    </div>
                    <div className="il-word-info">
                        <div className="il-word-pair">
                            <span>${w.emoji} ${w.german}</span>
                            <span style=${{color: '#64748b', margin: '0 4px'}}>→</span>
                            <span>${w.dutch}</span>
                        </div>
                        ${progress && html`
                            <span className="il-word-level-badge">Lvl ${progress.level}</span>
                        `}
                    </div>
                    <div className="il-word-actions">
                        <button 
                            className="il-regen-btn" 
                            disabled=${isGenerating || generatingAll}
                            onClick=${() => handleGenerateImage(i)}
                            title="Regenerate Image"
                        >
                            <${RefreshCw} size=${14} className=${isGenerating ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            `;
        })}
      </div>

      ${enlargedImage && html`
        <div className="il-modal-overlay" onClick=${() => setEnlargedImage(null)}>
            <div className="il-modal-content" onClick=${e => e.stopPropagation()}>
                <button className="il-modal-close" onClick=${() => setEnlargedImage(null)}>
                    <${X} size=${24} />
                </button>
                <img src=${enlargedImage} className="il-enlarged-img" />
            </div>
        </div>
      `}
    </div>
  `;
};
