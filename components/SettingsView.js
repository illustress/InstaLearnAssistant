import { React } from '../deps.js';
import { html } from '../utils.js';
import { saveSettings } from '../services/learningService.js';

export const SettingsView = ({ direction, correctAction, credits, streak, wordProgress, onUpdate }) => {
  
  const handleDirChange = (e) => {
      const val = e.target.value;
      onUpdate(val, correctAction);
      saveSettings(val, correctAction);
  };

  const handleActionChange = (e) => {
      const val = e.target.value;
      onUpdate(direction, val);
      saveSettings(direction, val);
  };

  const handleResetProgress = () => {
    if (confirm("Are you sure? This will wipe credits, streak, and word levels.")) {
        onUpdate(direction, correctAction, { resetProgress: true });
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
