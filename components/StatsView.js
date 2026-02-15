// StatsView — Learning statistics display

import { React } from '../deps.js';
const { useState, useEffect } = React;
import { html } from '../utils.js';
import { loadSessions } from '../services/learningService.js';

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export const StatsView = ({ credits, streak, wordProgress, words }) => {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    loadSessions().then(setSessions);
  }, []);

  const totalWords = words.length;
  const totalCorrect = sessions.reduce((sum, s) => sum + (s.correct || 0), 0);
  const totalWrong = sessions.reduce((sum, s) => sum + (s.wrong || 0), 0);
  const totalAccuracy = totalCorrect + totalWrong > 0
    ? Math.round(totalCorrect / (totalCorrect + totalWrong) * 100) : 0;
  const totalTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalCreditsEarned = sessions.reduce((sum, s) => sum + (s.creditsEarned || 0), 0);
  const bestStreak = sessions.length > 0 ? Math.max(...sessions.map(s => s.bestStreak || 0)) : 0;

  let mastered = 0, inProgress = 0, newCount = 0;
  words.forEach((_, i) => {
    const lvl = wordProgress[i]?.level || 1;
    if (lvl === 4) mastered++;
    else if (lvl > 1) inProgress++;
    else newCount++;
  });

  const levelCounts = [0, 0, 0, 0];
  words.forEach((_, i) => {
    const lvl = wordProgress[i]?.level || 1;
    levelCounts[lvl - 1]++;
  });

  return html`
    <div className="il-stats-view">
      <div className="il-stats-grid">
        <div className="il-stat-card">
          <div className="il-stat-value">📚 ${totalWords}</div>
          <div className="il-stat-label">Total Words</div>
        </div>
        <div className="il-stat-card">
          <div className="il-stat-value">⭐ ${mastered}</div>
          <div className="il-stat-label">Mastered</div>
        </div>
        <div className="il-stat-card">
          <div className="il-stat-value">📝 ${inProgress}</div>
          <div className="il-stat-label">In Progress</div>
        </div>
        <div className="il-stat-card">
          <div className="il-stat-value">🆕 ${newCount}</div>
          <div className="il-stat-label">New</div>
        </div>
      </div>

      ${sessions.length > 0 ? html`
        <div className="il-alltime-stats">
          <h4 className="il-section-title">📈 All-Time Stats</h4>
          <div className="il-alltime-grid">
            <span>⏱️ Total time: <strong>${formatDuration(totalTime)}</strong></span>
            <span>✓ Correct: <strong>${totalCorrect}</strong> | ✗ Wrong: <strong>${totalWrong}</strong></span>
            <span>💰 Credits earned: <strong>${totalCreditsEarned}</strong></span>
            <span>🔥 Best streak: <strong>${bestStreak}</strong></span>
            <span>🎯 Avg accuracy: <strong>${totalAccuracy}%</strong></span>
          </div>
        </div>
      ` : null}

      <div className="il-level-overview">
        <h4 className="il-section-title">Word Levels</h4>
        <div className="il-level-bars">
          ${['L1 Beginner', 'L2 Learning', 'L3 Advanced', 'L4 Mastered'].map((label, i) => html`
            <div key=${i} className="il-level-bar-row">
              <span className="il-level-bar-label">${label}</span>
              <div className="il-level-bar-track">
                <div className=${`il-level-bar-fill level-${i + 1}`}
                  style=${{ width: totalWords > 0 ? `${(levelCounts[i] / totalWords) * 100}%` : '0%' }} />
              </div>
              <span className="il-level-bar-count">${levelCounts[i]}</span>
            </div>
          `)}
        </div>
      </div>

      <h4 className="il-section-title">Recent Sessions</h4>
      <div className="il-sessions-list">
        ${sessions.length === 0 ? html`<div className="il-empty">No sessions yet. Start learning!</div>` : null}
        ${sessions.slice().reverse().slice(0, 15).map((s, i) => html`
          <div key=${i} className="il-session-item">
            <div className="il-session-date">${new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${new Date(s.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="il-session-stats">
              ⏱️${formatDuration(s.duration || 0)} ✓${s.correct || 0} ✗${s.wrong || 0} 🎯${s.accuracy || 0}%
            </div>
          </div>
        `)}
      </div>
    </div>
  `;
};
