import { React } from '../deps.js';
const { useState, useRef } = React;
import { html } from '../utils.js';
import { saveWords } from '../services/learningService.js';
import { DEFAULT_WORDS } from '../words.js';
import { generateImage } from '../services/geminiService.js';
import { Image as ImageIcon, RefreshCw, Maximize2, Square } from 'https://esm.sh/lucide-react@0.263.1?deps=react@18.2.0';

const Spinner = ({ size = 24, className = '' }) => html`
  <svg 
    className=${`animate-spin ${className}`}
    width=${size} 
    height=${size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
`;

export const WordManager = ({ words, wordProgress, onWordsChange }) => {
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState('');
  const [popupImg, setPopupImg] = useState(null);
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [error, setError] = useState(null);
  const stopRef = useRef(false);

  // Debug: Check if API key is available (masked)
  const hasApiKey = !!(process.env.API_KEY && process.env.API_KEY !== "YOUR_API_KEY_HERE");

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
                    id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

  const handleGenerateAll = async () => {
    console.log("handleGenerateAll called");
    const missing = words.filter(w => !w.image);
    if (missing.length === 0) {
        alert("All words already have images!");
        return;
    }
    // if (!confirm(`Generate images for ${missing.length} words? This may take a while.`)) return;

    setGenerating(true);
    setError(null);
    stopRef.current = false;
    let updatedWords = [...words];
    let count = 0;

    for (let i = 0; i < updatedWords.length; i++) {
        if (stopRef.current) break;
        
        if (!updatedWords[i].image) {
            const w = updatedWords[i];
            setGenProgress(`Generating for "${w.german}" (${count + 1}/${missing.length})...`);
            try {
                console.log(`Generating image for ${w.german}...`);
                // Add a bit of randomness to the prompt to avoid potential caching/determinism
                const seed = Math.random().toString(36).substr(2, 5);
                const prompt = `Illustration of ${w.german} (${w.dutch}). ${w.example || ''}. Simple, colorful, vector art style. Variation: ${seed}`;
                const imgData = await generateImage(prompt);
                
                // Update the specific word in the array
                updatedWords[i] = { ...w, image: imgData };
                
                // Save incrementally
                await saveWords(updatedWords);
                onWordsChange([...updatedWords]); // Update UI
                count++;
                console.log(`Generated image for ${w.german}`);
            } catch (e) {
                console.error(`Failed to generate for ${w.german}`, e);
                setError(`Failed to generate for ${w.german}: ${e.message}`);
            }
        }
    }
    setGenerating(false);
    setGenProgress('');
  };

  const handleStop = () => {
    stopRef.current = true;
    setGenProgress('Stopping...');
  };

  const handleRegenerate = async (index) => {
    console.log(`handleRegenerate called for index ${index}`);
    const w = words[index];
    // if (!confirm(`Regenerate image for "${w.german}"?`)) return;

    setRegeneratingId(w.id);
    setGenerating(true);
    setError(null);
    stopRef.current = false;

    try {
        console.log(`Regenerating image for ${w.german}...`);
        const seed = Math.random().toString(36).substr(2, 5);
        const prompt = `Illustration of ${w.german} (${w.dutch}). ${w.example || ''}. Simple, colorful, vector art style. Variation: ${seed}`;
        const imgData = await generateImage(prompt);
        
        const newWords = [...words];
        newWords[index] = { ...w, image: imgData };
        await saveWords(newWords);
        onWordsChange(newWords);
        console.log(`Regenerated image for ${w.german}`);
    } catch (e) {
        console.error("Regeneration failed", e);
        setError(e.message);
        // alert(`Failed: ${e.message}`);
    } finally {
        setGenerating(false);
        setRegeneratingId(null);
    }
  };

  const handleConnect = async () => {
      if (window.aistudio && window.aistudio.openSelectKey) {
          try {
              await window.aistudio.openSelectKey();
              // Clear error after successful connection attempt
              setError(null);
              alert("Key selected! Try generating again.");
          } catch (e) {
              console.error("Failed to select key", e);
              alert("Failed to select key: " + e.message);
          }
      } else {
          alert("API Key selection is not available in this environment.");
      }
  };

  return html`
    <div className="il-word-manager">
      ${popupImg && html`
        <div className="il-img-popup-overlay" onClick=${() => setPopupImg(null)}>
            <div className="il-img-popup-content" onClick=${e => e.stopPropagation()}>
                <img src=${popupImg} className="il-popup-img" />
                <button className="il-popup-close" onClick=${() => setPopupImg(null)}>Close</button>
            </div>
        </div>
      `}

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
      
      ${error && html`
        <div style=${{padding: '12px', marginBottom: '12px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
            <div><strong>Error:</strong> ${error}</div>
            ${(error.includes('API Key') || error.includes('403')) && html`
                <button 
                    onClick=${handleConnect}
                    style=${{
                        padding: '6px 12px', 
                        background: '#ef4444', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        alignSelf: 'flex-start',
                        fontWeight: '600'
                    }}
                >
                    Connect Google Account
                </button>
            `}
        </div>
      `}

      <div className="il-gen-controls" style=${{display: 'flex', gap: '8px'}}>
        <button 
            className="il-gen-all-btn" 
            onClick=${handleGenerateAll} 
            disabled=${generating}
            style=${{flex: 1}}
        >
            ${generating && !regeneratingId ? html`<${Spinner} size=${16} />` : html`<${ImageIcon} size=${16} />`}
            ${generating && !regeneratingId ? genProgress : 'Generate Missing Images (AI)'}
        </button>
        ${generating && !regeneratingId && html`
            <button className="il-reset-btn" onClick=${handleStop} style=${{flex: '0 0 40px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <${Square} size=${16} />
            </button>
        `}
      </div>

      <div className="il-word-count">${words.length} words loaded</div>
      
      <div className="il-word-list">
        ${words.map((w, i) => {
            const progress = wordProgress[w.id];
            const isRegenerating = regeneratingId === w.id;
            return html`
                <div key=${w.id} className="il-word-row">
                    ${isRegenerating ? html`
                        <div className="il-word-img-preview" style=${{display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b', color: '#e2e8f0'}}>
                            <${Spinner} size=${16} />
                        </div>
                    ` : (w.image ? html`
                        <img 
                            src=${w.image} 
                            className="il-word-img-preview" 
                            onClick=${() => setPopupImg(w.image)}
                            title="Click to enlarge"
                        />
                    ` : html`
                        <div className="il-word-img-preview" style=${{display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569'}}>
                            <${ImageIcon} size=${16} />
                        </div>
                    `)}
                    
                    <div className="il-word-pair">
                        <span>${w.emoji} ${w.german}</span>
                        <span style=${{color: '#64748b', margin: '0 4px'}}>→</span>
                        <span>${w.dutch}</span>
                    </div>
                    
                    <div className="il-word-actions">
                        ${progress && html`
                            <span className="il-word-level-badge">Lvl ${progress.level}</span>
                        `}
                        <button 
                            className="il-icon-btn-sm" 
                            onClick=${() => handleRegenerate(i)}
                            title="Regenerate Image"
                            disabled=${generating}
                        >
                            ${isRegenerating ? html`<${Spinner} size=${14} />` : html`<${RefreshCw} size=${14} />`}
                        </button>
                    </div>
                </div>
            `;
        })}
      </div>
    </div>
  `;
};
