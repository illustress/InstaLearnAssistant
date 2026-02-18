import { React, ReactDOM } from './deps.js';
import { html } from './utils.js';
import App from './App.js';

const rootElement = document.getElementById('root');

// Global error handler for startup crashes
window.onerror = function(message, source, lineno, colno, error) {
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; color: #ef4444; background: #0f172a; height: 100vh;">
        <h3>App Crashed</h3>
        <pre style="white-space: pre-wrap; font-size: 12px;">${message}\n${error?.stack || ''}</pre>
      </div>
    `;
  }
};

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(html`
    <${React.StrictMode}>
      <${App} />
    <//>
  `);
} catch (e) {
  console.error("Render failed", e);
  rootElement.innerHTML = `<div style="color:red; padding:20px">Failed to render app: ${e.message}</div>`;
}