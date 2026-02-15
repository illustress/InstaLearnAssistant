// SettingsView — Direction, behavior & AI settings

import { React } from '../deps.js';
const { useState, useEffect } = React;
import { html } from '../utils.js';
import { saveSettings, saveProgress } from '../services/learningService.js';
import { getAISettings, saveAISettings, testConnection, clearCardCache } from '../services/aiCardsService.js';

export const SettingsView = ({ direction, correctAction, credits, streak, wordProgress, onUpdate }) => {
  const [dir, setDir] = useState(direction);
  const [action, setAction] = useState(correctAction);
  const [saved, setSaved] = useState(false);

  // AI settings state
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiMnemonics, setAiMnemonics] = useState(true);
  const [aiSentences, setAiSentences] = useState(true);
  const [aiImagePrompts, setAiImagePrompts] = useState(true);
  const [aiCache, setAiCache] = useState(true);
  const [aiTestStatus, setAiTestStatus] = useState('');
  const [aiTesting, setAiTesting] = useState(false);

  useEffect(() => {
    const s = getAISettings();
    setAiEnabled(s.enabled);
    setAiMnemonics(s.generateMnemonics);
    setAiSentences(s.generateSentences);
    setAiImagePrompts(s.generateImagePrompts);
    setAiCache(s.cacheCards);
  }, []);

  const handleSave = async () => {
    await saveSettings(dir, action);
    await saveAISettings({
      enabled: aiEnabled,
      generateMnemonics: aiMnemonics,
      generateSentences: aiSentences,
      generateImagePrompts: aiImagePrompts,
      cacheCards: aiCache
    });
    onUpdate(dir, action);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestAI = async () => {
    setAiTesting(true);
    setAiTestStatus('Testing...');
    const result = await testConnection();
    setAiTestStatus(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
    setAiTesting(false);
  };

  const handleClearCache = () => {
    if (!confirm('Clear all cached AI cards?')) return;
    clearCardCache();
    setAiTestStatus('Cache cleared');
  };

  const handleResetProgress = async () => {
    if (!confirm('Reset ALL learning progress? This clears credits, streak, and word levels.')) return;
    await saveProgress({}, 0, 0);
    onUpdate(dir, action, { resetProgress: true });
  };

  return html`
    <div className="il-settings-view">
      <div className="il-setting-group">
        <label className="il-setting-label">Translation Direction</label>
        <select className="il-select" value=${dir} onChange=${e => setDir(e.target.value)}>
          <option value="german-to-dutch">🇩🇪 German → 🇳🇱 Dutch</option>
          <option value="dutch-to-german">🇳🇱 Dutch → 🇩🇪 German</option>
          <option value="mixed">🔀 Mixed</option>
        </select>
      </div>

      <div className="il-setting-group">
        <label className="il-setting-label">After Correct Answer</label>
        <select className="il-select" value=${action} onChange=${e => setAction(e.target.value)}>
          <option value="next">Go to Next Challenge</option>
          <option value="stay">Stay on Result</option>
        </select>
      </div>

      <div className="il-settings-divider"></div>

      <div className="il-setting-group">
        <label className="il-setting-label">🤖 AI Cards (Gemini)</label>
        <div className="il-ai-toggle-row">
          <label className="il-toggle">
            <input type="checkbox" checked=${aiEnabled}
              onChange=${e => setAiEnabled(e.target.checked)} />
            <span className="il-toggle-label">Enable AI-enhanced cards</span>
          </label>
        </div>
      </div>

      ${aiEnabled ? html`
        <div className="il-ai-options">
          <label className="il-toggle">
            <input type="checkbox" checked=${aiMnemonics}
              onChange=${e => setAiMnemonics(e.target.checked)} />
            <span className="il-toggle-label">💡 Generate mnemonics</span>
          </label>
          <label className="il-toggle">
            <input type="checkbox" checked=${aiSentences}
              onChange=${e => setAiSentences(e.target.checked)} />
            <span className="il-toggle-label">📝 Generate example sentences</span>
          </label>
          <label className="il-toggle">
            <input type="checkbox" checked=${aiImagePrompts}
              onChange=${e => setAiImagePrompts(e.target.checked)} />
            <span className="il-toggle-label">🎨 Generate image prompts</span>
          </label>
          <label className="il-toggle">
            <input type="checkbox" checked=${aiCache}
              onChange=${e => setAiCache(e.target.checked)} />
            <span className="il-toggle-label">💾 Cache generated cards</span>
          </label>

          <div className="il-ai-actions">
            <button className="il-ai-test-btn" onClick=${handleTestAI} disabled=${aiTesting}>
              ${aiTesting ? '⏳ Testing...' : '🔌 Test Connection'}
            </button>
            <button className="il-ai-clear-btn" onClick=${handleClearCache}>
              🗑️ Clear Cache
            </button>
          </div>
          ${aiTestStatus ? html`<div className="il-ai-status">${aiTestStatus}</div>` : null}

          <div className="il-ai-info">
            Uses Gemini API with the key from your .env.local configuration.
          </div>
        </div>
      ` : null}

      <div className="il-settings-divider"></div>

      <button className="il-save-btn" onClick=${handleSave}>
        ${saved ? '✓ Saved!' : '💾 Save Settings'}
      </button>

      <div className="il-settings-divider"></div>

      <div className="il-setting-group">
        <label className="il-setting-label">Current Progress</label>
        <div className="il-setting-info">
          💰 ${credits} credits · 🔥 ${streak} streak · 📖 ${Object.keys(wordProgress).length} words touched
        </div>
      </div>

      <button className="il-reset-progress-btn" onClick=${handleResetProgress}>
        ⚠️ Reset All Progress
      </button>
    </div>
  `;
};
