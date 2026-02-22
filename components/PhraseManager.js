import { React } from '../deps.js';
const { useState } = React;
import { html } from '../utils.js';
import { saveWords } from '../services/learningService.js';
import { generateImage } from '../services/geminiService.js';
import { Image as ImageIcon, Loader2, RefreshCw, Square, Trash2, Volume2 } from 'https://esm.sh/lucide-react@0.263.1?deps=react@18.2.0';
import { Spinner } from './WordManager.js';

export const PhraseManager = ({ words, onWordsChange, speechRate }) => {
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState('');
  const [error, setError] = useState(null);
  const [previewPhrases, setPreviewPhrases] = useState([]);

  const parsePhrases = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const phrases = [];
    
    // Improved Parser for Multi-line entries
    // Strategy: Accumulate lines into a "block" until a new number is found.
    
    let currentBlock = [];
    let lastParentDutch = "";
    let lastParentGerman = "";
    
    const processBlock = (block) => {
        if (block.length === 0) return;
        
        // Join the block into a single string to process
        const fullText = block.join(' ');
        
        // Remove leading number
        let content = fullText.replace(/^\d+\s+/, '').trim();
        
        // Check if this is a continuation (starts with ...)
        let isContinuation = content.startsWith('...') || content.startsWith('…');
        
        // Split Dutch / German
        let dutch = "";
        let german = "";
        
        // Heuristic: Look for the transition.
        const germanStartRegex = /(\s+)(Ich|Du|Er|Sie|Es|Wir|Ihr|Sie|Der|Die|Das|Ein|Eine|Einen|Einer|Eines|Hallo|Ja|Nein|Wie|Wo|Was|Mit|Und|Aber|Oder|Denn|Guten|Tschüss|Auf|Danke|Bitte|Entschuldigung|Vielleicht|Natürlich|Sicher|Genau|Richtig|Falsch|Links|Rechts|Geradeaus|Oben|Unten|Vor|Hinter|Neben|Zwischen|In|An|Auf|Unter|Über|Bei|Von|Zu|Aus|Nach|Seit|Bis|Durch|Für|Ohne|Gegen|Um|Entlang|Zwei|Drei|Vier|Fünf|Sechs|Sieben|Acht|Neun|Zehn|Keine|Kein|keine|kein)\b/g;
        
        let bestSplitIndex = -1;
        let minDiff = Infinity;
        
        let match;
        while ((match = germanStartRegex.exec(content)) !== null) {
            const index = match.index;
            const len1 = index;
            const len2 = content.length - index;
            const diff = Math.abs(len1 - len2);
            
            if (diff < minDiff) {
                minDiff = diff;
                bestSplitIndex = index;
            }
        }
        
        if (bestSplitIndex !== -1) {
             dutch = content.substring(0, bestSplitIndex).trim();
             german = content.substring(bestSplitIndex).trim();
        } else {
             // Fallback: Split by '?' or '.' if present
             if (content.includes('?')) {
                const parts = content.split('?');
                 if (parts.length >= 2) {
                    dutch = parts[0].trim() + '?';
                    german = parts.slice(1).join('?').trim();
                 } else {
                     const words = content.split(' ');
                     const mid = Math.floor(words.length / 2);
                     dutch = words.slice(0, mid).join(' ');
                     german = words.slice(mid).join(' ');
                 }
             } else {
                 const words = content.split(' ');
                 const mid = Math.floor(words.length / 2);
                 dutch = words.slice(0, mid).join(' ');
                 german = words.slice(mid).join(' ');
             }
        }

        // Handle continuation logic
        if (isContinuation) {
            // Remove the "..." from the current parts
            let cleanDutch = dutch.replace(/^[\.…]+/, '').trim();
            let cleanGerman = german.replace(/^[\.…]+/, '').trim();
            
            // If we have a parent, merge
            if (lastParentDutch && lastParentGerman) {
                // Try to replace placeholder in parent
                const placeholderRegex = /(\.{2,}|…)/;
                
                if (placeholderRegex.test(lastParentDutch)) {
                    dutch = lastParentDutch.replace(placeholderRegex, ` ${cleanDutch} `).replace(/\s+/g, ' ').trim();
                } else {
                    // Append if no placeholder
                    dutch = `${lastParentDutch} ${cleanDutch}`;
                }

                if (placeholderRegex.test(lastParentGerman)) {
                    german = lastParentGerman.replace(placeholderRegex, ` ${cleanGerman} `).replace(/\s+/g, ' ').trim();
                } else {
                    german = `${lastParentGerman} ${cleanGerman}`;
                }
            } else {
                // No parent found, just clean up
                dutch = cleanDutch;
                german = cleanGerman;
            }
        } else {
            // This is a new parent candidate
            lastParentDutch = dutch;
            lastParentGerman = german;
        }

        phrases.push({
            id: `phrase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            dutch: dutch,
            german: german,
            emoji: '💬', 
            type: 'phrase'
        });
    };

    for (const line of lines) {
        const isNew = line.match(/^\d+\s+/);
        
        if (isNew) {
            // Process previous block
            processBlock(currentBlock);
            // Start new block
            currentBlock = [line];
        } else {
            // Add to current block (if we have one)
            if (currentBlock.length > 0) {
                currentBlock.push(line);
            }
        }
    }
    // Process final block
    processBlock(currentBlock);
    
    setPreviewPhrases(phrases);
  };

  const handleGenerateImages = async () => {
      if (previewPhrases.length === 0) return;
      
      setGenerating(true);
      setError(null);
      
      const updatedPhrases = [...previewPhrases];
      
      for (let i = 0; i < updatedPhrases.length; i++) {
          if (!updatedPhrases[i].image) {
              try {
                  const seed = Math.random().toString(36).substr(2, 5);
                  const prompt = `Scene illustrating: "${updatedPhrases[i].german}". Context: ${updatedPhrases[i].dutch}. Simple, colorful, vector art style. Variation: ${seed}`;
                  const imgData = await generateImage(prompt);
                  updatedPhrases[i] = { ...updatedPhrases[i], image: imgData };
                  setPreviewPhrases([...updatedPhrases]);
              } catch (e) {
                  console.error("Failed to generate image for preview phrase", e);
                  // Continue with other phrases even if one fails
              }
          }
      }
      
      setGenerating(false);
  };

  const handleImport = () => {
      if (previewPhrases.length > 0) {
          const combined = [...words, ...previewPhrases];
          saveWords(combined);
          onWordsChange(combined);
          setImportText('');
          setPreviewPhrases([]);
          setShowImport(false);
          alert(`Added ${previewPhrases.length} phrases!`);
      }
  };

  const handleRegenerate = async (index) => {
    const w = phrases[index];
    if (!confirm(`Regenerate image for "${w.dutch}"?`)) return;

    // We need to update the main words list, but we only have the filtered phrases here.
    // We need to find the index in the main 'words' array.
    const mainIndex = words.findIndex(word => word.id === w.id);
    if (mainIndex === -1) return;

    setGenerating(true);
    try {
        const seed = Math.random().toString(36).substr(2, 5);
        const prompt = `Scene illustrating: "${w.german}". Context: ${w.dutch}. Simple, colorful, vector art style. Variation: ${seed}`;
        const imgData = await generateImage(prompt);
        
        const newWords = [...words];
        newWords[mainIndex] = { ...w, image: imgData };
        saveWords(newWords);
        onWordsChange(newWords);
    } catch (e) {
        console.error(e);
        alert(e.message);
    } finally {
        setGenerating(false);
    }
  };

  const handleDelete = async (index) => {
    const w = phrases[index];
    if (!confirm(`Delete phrase "${w.dutch}"?`)) return;

    // Find index in main words array
    const mainIndex = words.findIndex(word => word.id === w.id);
    if (mainIndex === -1) return;

    const newWords = words.filter((_, i) => i !== mainIndex);
    await saveWords(newWords);
    onWordsChange(newWords);
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

  const speakText = (text, lang) => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'german' ? 'de-DE' : 'nl-NL';
      utterance.rate = speechRate || 0.7; 
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.startsWith(utterance.lang));
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
  };

  const phrases = words.filter(w => w.type === 'phrase');

  return html`
    <div className="il-word-manager">
      <div className="il-import-section">
        <button className="il-file-btn" onClick=${() => setShowImport(!showImport)}>
            ${showImport ? 'Hide Import' : 'Import Phrases'}
        </button>
      </div>

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

      ${showImport && html`
        <div className="il-import-box">
            <div className="il-setting-label">Paste your list here (e.g. "1 Hallo! ..."):</div>
            <textarea 
                className="il-text-input" 
                rows=${6} 
                value=${importText}
                onChange=${e => {
                    setImportText(e.target.value);
                    parsePhrases(e.target.value);
                }}
                placeholder="Paste the raw text here..."
            />
            
            ${previewPhrases.length > 0 && html`
                <div className="il-preview-list">
                    <div className="il-section-title" style=${{marginTop: '16px'}}>
                        Preview (${previewPhrases.length} detected)
                        <button className="il-icon-btn-sm" onClick=${handleGenerateImages} disabled=${generating} style=${{float: 'right'}}>
                            ${generating ? html`<${Spinner} size=${14} />` : html`<${ImageIcon} size=${14} />`}
                            Generate Images
                        </button>
                    </div>
                    ${previewPhrases.map((p, i) => html`
                        <div key=${i} className="il-word-row">
                            ${p.image && html`<img src=${p.image} className="il-word-img-preview" />`}
                            <div style=${{flex: 1}}>
                                <input 
                                    value=${p.dutch} 
                                    onChange=${e => {
                                        const newPhrases = [...previewPhrases];
                                        newPhrases[i].dutch = e.target.value;
                                        setPreviewPhrases(newPhrases);
                                    }}
                                    className="il-text-input"
                                    style=${{marginBottom: '4px', fontSize: '12px'}}
                                />
                                <input 
                                    value=${p.german} 
                                    onChange=${e => {
                                        const newPhrases = [...previewPhrases];
                                        newPhrases[i].german = e.target.value;
                                        setPreviewPhrases(newPhrases);
                                    }}
                                    className="il-text-input"
                                    style=${{fontSize: '12px', color: '#94a3b8'}}
                                />
                            </div>
                        </div>
                    `)}
                    <button className="il-submit-btn" onClick=${handleImport} style=${{marginTop: '16px'}}>
                        Import All
                    </button>
                </div>
            `}
        </div>
      `}

      <div className="il-section-title" style=${{marginTop: '24px'}}>
          Your Phrases (${phrases.length})
      </div>
      
      <div className="il-word-list">
        ${phrases.map((w, i) => {
            return html`
                <div key=${w.id} className="il-word-row">
                    ${w.image ? html`
                        <img 
                            src=${w.image} 
                            className="il-word-img-preview" 
                            title="Phrase Image"
                        />
                    ` : html`
                        <div className="il-word-img-preview" style=${{display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569'}}>
                            <${ImageIcon} size=${16} />
                        </div>
                    `}
                    
                    <div className="il-word-pair">
                        <div style=${{display: 'flex', alignItems: 'center', gap: '4px'}}>
                            <span>${w.emoji} ${w.german}</span>
                            <button className="il-icon-btn-sm" style=${{border: 'none', background: 'transparent', padding: 2}} onClick=${() => speakText(w.german, 'german')}>
                                <${Volume2} size=${14} />
                            </button>
                        </div>
                        <span style=${{color: '#64748b', margin: '0 4px'}}>→</span>
                        <div style=${{display: 'flex', alignItems: 'center', gap: '4px'}}>
                            <span>${w.dutch}</span>
                            <button className="il-icon-btn-sm" style=${{border: 'none', background: 'transparent', padding: 2}} onClick=${() => speakText(w.dutch, 'dutch')}>
                                <${Volume2} size=${14} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="il-word-actions">
                        <button 
                            className="il-icon-btn-sm" 
                            onClick=${() => handleRegenerate(i)}
                            title="Regenerate Image"
                            disabled=${generating}
                        >
                            ${generating ? html`<${Spinner} size=${14} />` : html`<${RefreshCw} size=${14} />`}
                        </button>
                        <button 
                            className="il-icon-btn-sm" 
                            onClick=${() => handleDelete(i)}
                            title="Delete Phrase"
                            disabled=${generating}
                            style=${{color: '#ef4444'}}
                        >
                            <${Trash2} size=${14} />
                        </button>
                    </div>
                </div>
            `;
        })}
      </div>
    </div>
  `;
};
