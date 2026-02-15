// WordManager — Word list display, CSV import & AI card preview

import { React } from '../deps.js';
const { useState, useRef, useEffect } = React;
import { html } from '../utils.js';
import { saveCustomWords } from '../services/learningService.js';
import { getCachedCard, generateAICard, getAISettings, pregenerateCards, getUserContext } from '../services/aiCardsService.js';

// Parse a single CSV line, respecting quoted fields and multiple delimiters (, ; \t)
function parseCSVLine(line) {
  // Step 1: detect delimiter (prefer first non-quoted delimiter found)
  const delimiter = detectDelimiter(line);
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'; i++; // escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === delimiter) { fields.push(current.trim()); current = ''; }
      else { current += ch; }
    }
  }
  fields.push(current.trim());
  return fields;
}

function detectDelimiter(line) {
  // Count delimiters outside quotes
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (!inQ && ch in counts) counts[ch]++;
  }
  if (counts['\t'] > 0) return '\t';
  if (counts[';'] > counts[',']) return ';';
  return ',';
}

export const WordManager = ({ words, wordProgress, onWordsChange }) => {
  const [status, setStatus] = useState('');
  const [previewIdx, setPreviewIdx] = useState(null);
  const [aiCard, setAiCard] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [genProgress, setGenProgress] = useState(null); // { current, total }
  const fileRef = useRef(null);

  // Load AI card when preview changes
  useEffect(() => {
    if (previewIdx === null) { setAiCard(null); return; }
    const word = words[previewIdx];
    if (!word) return;
    const cached = getCachedCard(word);
    setAiCard(cached);
  }, [previewIdx, words]);

  const handleGenerateCard = async () => {
    if (previewIdx === null) return;
    const word = words[previewIdx];
    if (!word) return;
    setAiLoading(true);
    try {
      const ctx = getUserContext(words, wordProgress, wordProgress[previewIdx]?.level || 1, 0);
      const card = await generateAICard(word, ctx);
      setAiCard(card);
    } catch (e) {
      setStatus(`AI error: ${e.message}`);
    }
    setAiLoading(false);
  };

  const handleGenerateAll = async () => {
    if (!confirm(`Generate AI cards for all ${words.length} words? This may take a while.`)) return;
    setGenProgress({ current: 0, total: words.length });
    const ctx = getUserContext(words, wordProgress, 1, 0);
    await pregenerateCards(words, ctx, (current, total, word, st) => {
      setGenProgress({ current, total });
      setStatus(`${current}/${total}: ${word.german} (${st})`);
    });
    setGenProgress(null);
    setStatus(`Done! Generated cards for ${words.length} words`);
  };

  const handleCSVImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const lines = evt.target.result.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setStatus('CSV needs a header + at least 1 row'); return; }
      const newWords = lines.slice(1).map(line => {
        const parts = parseCSVLine(line);
        const [german, dutch] = parts;
        return german && dutch ? { german, dutch, emoji: parts[2] || '', example: parts[3] || '' } : null;
      }).filter(Boolean);

      if (newWords.length > 0) {
        if (!confirm(`Import ${newWords.length} words? This will replace the current list and reset all learning progress.`)) return;
        await saveCustomWords(newWords);
        onWordsChange(newWords, { resetProgress: true });
        setStatus(`Imported ${newWords.length} words! Progress reset.`);
      } else {
        setStatus('No valid rows found');
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-imported
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleReset = async () => {
    if (!confirm('Reset to default words? This will clear all learning progress.')) return;
    await saveCustomWords([]);
    onWordsChange(null, { resetProgress: true });
    setStatus('Reset to default words, progress cleared');
  };

  const previewWord = previewIdx !== null ? words[previewIdx] : null;
  const previewLevel = previewIdx !== null ? (wordProgress[previewIdx]?.level || 1) : 1;

  return html`
    <div className="il-word-manager">
      <div className="il-word-count">${words.length} words loaded</div>

      ${previewWord ? html`
        <div className="il-word-preview">
          <button className="il-preview-close" onClick=${() => setPreviewIdx(null)}>✕</button>
          <div className="il-preview-title">
            ${previewWord.emoji || ''} ${previewWord.german} ↔ ${previewWord.dutch}
          </div>
          <div className="il-preview-level">Level ${previewLevel}</div>
          ${previewWord.example ? html`<div className="il-preview-example">"${previewWord.example}"</div>` : null}

          ${aiCard ? html`
            <div className="il-ai-card">
              ${aiCard.mnemonic ? html`
                <div className="il-ai-mnemonic">
                  <span className="il-ai-label">💡 Memory Trick</span>
                  <p>${aiCard.mnemonic}</p>
                </div>
              ` : null}
              ${aiCard.smartSentences ? html`
                <div className="il-ai-sentences">
                  <span className="il-ai-label">📝 Examples</span>
                  ${aiCard.smartSentences.sentence1 ? html`
                    <p className="il-ai-sentence">${aiCard.smartSentences.sentence1}</p>
                    <p className="il-ai-translation">${aiCard.smartSentences.sentence1_translation || ''}</p>
                  ` : null}
                  ${aiCard.smartSentences.sentence2 ? html`
                    <p className="il-ai-sentence">${aiCard.smartSentences.sentence2}</p>
                    <p className="il-ai-translation">${aiCard.smartSentences.sentence2_translation || ''}</p>
                  ` : null}
                </div>
              ` : null}
              ${aiCard.imagePrompt ? html`
                <div className="il-ai-image-placeholder">
                  🎨 ${aiCard.emoji || '📝'} ${aiCard.imagePrompt}
                </div>
              ` : null}
            </div>
          ` : html`
            ${getAISettings().enabled ? html`
              <button className="il-ai-gen-btn" onClick=${handleGenerateCard} disabled=${aiLoading}>
                ${aiLoading ? '⏳ Generating...' : '🤖 Generate AI Card'}
              </button>
            ` : null}
          `}
        </div>
      ` : null}

      <div className="il-word-list">
        ${words.map((w, i) => html`
          <div key=${i} className="il-word-row" onClick=${() => setPreviewIdx(i)}>
            <span className="il-word-pair">${w.emoji || ''} ${w.german} ↔ ${w.dutch}</span>
            <span className="il-word-level-badge">L${wordProgress[i]?.level || 1}</span>
          </div>
        `)}
      </div>

      <div className="il-import-section">
        <label className="il-file-btn">
          📁 Import CSV
          <input ref=${fileRef} type="file" accept=".csv,.txt" onChange=${handleCSVImport} hidden />
        </label>
        <button className="il-reset-btn" onClick=${handleReset}>🔄 Reset Default</button>
      </div>

      ${getAISettings().enabled ? html`
        <div className="il-import-section">
          <button className="il-ai-genall-btn" onClick=${handleGenerateAll}
            disabled=${genProgress !== null}>
            ${genProgress ? `⏳ ${genProgress.current}/${genProgress.total}` : '🤖 Generate All AI Cards'}
          </button>
        </div>
      ` : null}

      ${status ? html`<div className="il-status-msg">${status}</div>` : null}

      <div className="il-csv-help">
        <strong>CSV format:</strong> German,Dutch[,Emoji,Example] — one pair per line, first line = header. Supports comma/semicolon/tab delimiters and quoted fields.
      </div>
    </div>
  `;
};
