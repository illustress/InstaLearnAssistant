import { React } from '../deps.js';
import { html } from '../utils.js';
import { saveSettings } from '../services/learningService.js';

export const SettingsView = ({ direction, correctAction, speechRate, autoPlayAudio, credits, streak, wordProgress, onUpdate }) => {
  
  const handleDirChange = (e) => {
      const val = e.target.value;
      onUpdate(val, correctAction, speechRate, autoPlayAudio);
      saveSettings(val, correctAction, speechRate, autoPlayAudio);
  };

  const handleActionChange = (e) => {
      const val = e.target.value;
      onUpdate(direction, val, speechRate, autoPlayAudio);
      saveSettings(direction, val, speechRate, autoPlayAudio);
  };

  const handleRateChange = (e) => {
      const val = parseFloat(e.target.value);
      onUpdate(direction, correctAction, val, autoPlayAudio);
      saveSettings(direction, correctAction, val, autoPlayAudio);
  };

  const handleAutoPlayChange = (e) => {
      const val = e.target.checked;
      onUpdate(direction, correctAction, speechRate, val);
      saveSettings(direction, correctAction, speechRate, val);
  };

  const handleResetProgress = () => {
    if (confirm("Are you sure? This will wipe credits, streak, and word levels.")) {
        onUpdate(direction, correctAction, speechRate, autoPlayAudio, { resetProgress: true });
    }
  };

  return html`
    <div className="il-settings-view">
        <div className="il-setting-group">
            <label className="il-setting-label">Quiz Direction</label>
            <select className="il-select" value=${direction} onChange=${handleDirChange}>
                <option value="german-to-dutch">German → Dutch</option>
                <option value="dutch-to-german">Dutch → German</option>
                <option value="mixed">Mixed</option>
            </select>
        </div>

        <div className="il-setting-group">
            <label className="il-setting-label">After Correct Answer</label>
            <select className="il-select" value=${correctAction} onChange=${handleActionChange}>
                <option value="next">Next Question (Fast)</option>
                <option value="stay">Stay (Review)</option>
            </select>
        </div>

        <div className="il-setting-group">
            <label className="il-setting-label">Speech Rate (${speechRate}x)</label>
            <div style=${{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <span style=${{fontSize: '12px', color: '#64748b'}}>Slow</span>
                <input 
                    type="range" 
                    min="0.5" 
                    max="1.5" 
                    step="0.1" 
                    value=${speechRate} 
                    onChange=${handleRateChange}
                    style=${{flex: 1}}
                />
                <span style=${{fontSize: '12px', color: '#64748b'}}>Fast</span>
            </div>
        </div>

        <div className="il-setting-group">
            <label className="il-setting-label" style=${{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                <input 
                    type="checkbox" 
                    checked=${autoPlayAudio} 
                    onChange=${handleAutoPlayChange} 
                    style=${{width: '16px', height: '16px'}}
                />
                Auto-play Audio on New Question
            </label>
        </div>

        <div className="il-settings-divider"></div>

        <div className="il-setting-group">
            <label className="il-setting-label">Debug / Danger Zone</label>
            <button className="il-reset-progress-btn" onClick=${handleResetProgress}>
                Reset All Progress
            </button>
        </div>
    </div>
  `;
};
