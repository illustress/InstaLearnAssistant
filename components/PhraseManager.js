import { React } from '../deps.js';
const { useState } = React;
import { html } from '../utils.js';
import { saveWords } from '../services/learningService.js';
import { generateImage } from '../services/geminiService.js';
import { Image as ImageIcon, Loader2, RefreshCw, Square } from 'https://esm.sh/lucide-react@0.263.1?deps=react@18.2.0';
import { Spinner } from './WordManager.js';

export const PhraseManager = ({ words, onWordsChange }) => {
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
    
    const processBlock = (block) => {
        if (block.length === 0) return;
        
        // Join the block into a single string to process
        const fullText = block.join(' ');
        
        // Remove leading number
        let content = fullText.replace(/^\d+\s+/, '').trim();
        
        // Handle "..." prefix if it was a continuation
        // (The logic for attaching to parent is complex, let's treat them as separate phrases for now
        // or just let the user edit them in the preview)
        
        // Split Dutch / German
        let dutch = "";
        let german = "";
        
        // Heuristic: Look for the transition.
        // The user text often has Dutch then German.
        // "Hallo! Ik ben nieuw hier. Weet jij waar ..... Hallo! Ich bin neu hier. Weißt du, wo …"
        // We can try to find the repetition of the concept or a specific delimiter?
        // Actually, in the example: "1 Hallo! ... ..... Hallo! ..."
        // It seems the German part starts with a capital letter often?
        
        // Let's try to split by "  " (double space) if present, or just use the mid-point heuristic 
        // but refined with language detection if possible? No, too complex.
        
        // Let's look for the "German Start" pattern again, it was a good idea.
        // Common German words that might start a sentence:
        // Ich, Du, Er, Sie, Es, Wir, Ihr, Sie, Der, Die, Das, Ein, Eine, Hallo, Ja, Nein, Wie, Wo, Was, Mit, Und...
        
        const germanStartRegex = /(\s+)(Ich|Du|Er|Sie|Es|Wir|Ihr|Sie|Der|Die|Das|Ein|Eine|Hallo|Ja|Nein|Wie|Wo|Was|Mit|Und|Aber|Oder|Denn|Guten|Tschüss|Auf|Danke|Bitte|Entschuldigung|Vielleicht|Natürlich|Sicher|Genau|Richtig|Falsch|Links|Rechts|Geradeaus|Oben|Unten|Vor|Hinter|Neben|Zwischen|In|An|Auf|Unter|Über|Bei|Von|Zu|Aus|Nach|Seit|Bis|Durch|Für|Ohne|Gegen|Um|Entlang)\b/g;
        
        // We want the *last* valid split point that makes sense, or the *first*?
        // "Hallo! ... Hallo! ..." -> Split at second Hallo.
        
        // Let's try to find a match that is roughly in the middle?
        let bestSplitIndex = -1;
        let minDiff = Infinity;
        
        let match;
        while ((match = germanStartRegex.exec(content)) !== null) {
            const index = match.index;
            // Check balance
            const len1 = index;
            const len2 = content.length - index;
            const diff = Math.abs(len1 - len2);
            
            // We prefer a split that is somewhat balanced, but also respects sentence structure.
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
                     // Just split in half
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

  const handleImport = () => {
    if (previewPhrases.length === 0) return;
    
    const combined = [...words, ...previewPhrases];
    saveWords(combined);
    onWordsChange(combined);
    setImportText('');
    setPreviewPhrases([]);
    setShowImport(false);
    alert(`Added ${previewPhrases.length} phrases!`);
  };

  const handleGenerateImages = async () => {
      // Similar to WordManager but for phrases
      // We can use a different prompt style for scenes.
      if (!confirm(`Generate images for ${previewPhrases.length} phrases?`)) return;
      
      setGenerating(true);
      setError(null);
      const updatedPhrases = [...previewPhrases];
      
      for (let i = 0; i < updatedPhrases.length; i++) {
          const p = updatedPhrases[i];
          setGenProgress(`Generating for "${p.dutch}"...`);
          try {
              const seed = Math.random().toString(36).substr(2, 5);
              const prompt = `Scene illustrating: "${p.german}". Context: ${p.dutch}. Simple, colorful, vector art style. Variation: ${seed}`;
              const imgData = await generateImage(prompt);
              updatedPhrases[i] = { ...p, image: imgData };
              setPreviewPhrases([...updatedPhrases]); // Update preview
          } catch (e) {
              console.error(e);
          }
      }
      setGenerating(false);
      setGenProgress('');
  };

  return html`
    <div className="il-word-manager">
      <div className="il-import-section">
        <button className="il-file-btn" onClick=${() => setShowImport(!showImport)}>
            ${showImport ? 'Hide Import' : 'Import Phrases'}
        </button>
      </div>

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
    </div>
  `;
};
