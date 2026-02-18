import { html } from '../utils.js';
import { User, Bot, AlertCircle } from 'https://esm.sh/lucide-react@0.263.1?deps=react@18.2.0';

export const MessageItem = ({ message }) => {
  const isUser = message.role === 'user';
  
  // Determine avatar properties
  let avatarBg = isUser ? 'user' : (message.isError ? 'error' : 'model');
  let Icon = isUser ? User : (message.isError ? AlertCircle : Bot);

  // Determine bubble style
  let bubbleClass = isUser ? 'user' : (message.isError ? 'error' : 'model');

  return html`
    <div className=${`message-row ${isUser ? 'user' : 'model'}`}>
      <div className="message-content">
        <!-- Avatar -->
        <div className=${`avatar ${avatarBg}`}>
          <${Icon} size=${16} />
        </div>

        <!-- Bubble -->
        <div className="bubble-col">
          <div className=${`bubble ${bubbleClass}`}>
            ${message.text}
          </div>
          <span className="timestamp">
            ${new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  `;
};