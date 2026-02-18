import { React } from '../deps.js';
const { useState, useRef, useEffect } = React;
import { html } from '../utils.js';
import { Send, Loader2 } from 'https://esm.sh/lucide-react@0.263.1?deps=react@18.2.0';

export const InputArea = ({ onSend, isLoading }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    onSend(input);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const hasInput = input.trim().length > 0;

  return html`
    <div className="input-area">
      <div className="input-wrapper">
        <textarea
          ref=${textareaRef}
          value=${input}
          onChange=${(e) => setInput(e.target.value)}
          onKeyDown=${handleKeyDown}
          placeholder="Ask Gemini..."
          rows=${1}
          disabled=${isLoading}
        />
        <button
          onClick=${() => handleSubmit()}
          disabled=${!hasInput || isLoading}
          className="send-btn"
        >
          ${isLoading 
            ? html`<${Loader2} size=${18} className="animate-spin" />` 
            : html`<${Send} size=${18} />`
          }
        </button>
      </div>
    </div>
  `;
};