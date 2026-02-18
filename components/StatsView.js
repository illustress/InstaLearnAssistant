import { React } from '../deps.js';
import { html } from '../utils.js';

export const StatsView = ({ credits, streak, wordProgress, words }) => {
  // Calculate mastery
  const totalWords = words.length;
  const levels = { 1: 0, 2: 0, 3: 0, 4: 0 };
  
  Object.values(wordProgress).forEach(p => {
      if (levels[p.level] !== undefined) levels[p.level]++;
  });
  
  // Implicitly level 1 for words without progress entry
  levels[1] += (totalWords - Object.keys(wordProgress).length);

  return html`
    <div className="il-stats-view">
        <div className="il-stats-grid">
            <div className="il-stat-card">
                <div className="il-stat-value">${credits}</div>
                <div className="il-stat-label">Credits</div>
            </div>
            <div className="il-stat-card">
                <div className="il-stat-value">${streak}</div>
                <div className="il-stat-label">Streak</div>
            </div>
            <div className="il-stat-card">
                <div className="il-stat-value">${totalWords}</div>
                <div className="il-stat-label">Words</div>
            </div>
            <div className="il-stat-card">
                <div className="il-stat-value">${Math.round((levels[4] / totalWords) * 100)}%</div>
                <div className="il-stat-label">Mastery</div>
            </div>
        </div>

        <h3 className="il-section-title">Word Mastery Levels</h3>
        <div className="il-level-bars">
            ${[4, 3, 2, 1].map(lvl => {
                const count = levels[lvl];
                const pct = (count / totalWords) * 100;
                return html`
                    <div key=${lvl} className="il-level-bar-row">
                        <div className="il-level-bar-label">Level ${lvl}</div>
                        <div className="il-level-bar-track">
                            <div className=${`il-level-bar-fill level-${lvl}`} style=${{width: `${pct}%`}} />
                        </div>
                        <div className="il-level-bar-count">${count}</div>
                    </div>
                `;
            })}
        </div>
    </div>
  `;
};
