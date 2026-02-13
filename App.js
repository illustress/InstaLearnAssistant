import { React } from './deps.js';
const { useState, useRef, useEffect } = React;
import { html } from './utils.js';
import { sendMessageStream, resetChatSession } from './services/geminiService.js';
import { MessageItem } from './components/MessageItem.js';
import { InputArea } from './components/InputArea.js';
import { Sparkles, Trash2 } from 'https://esm.sh/lucide-react@0.263.1?deps=react@18.2.0';

const App = () => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'model',
      text: "Hello! I'm your Gemini extension assistant. How can I help you browse today?",
      timestamp: Date.now()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text) => {
    const userMsgId = Date.now().toString();
    const userMessage = {
      id: userMsgId,
      role: 'user',
      text: text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const botMsgId = (Date.now() + 1).toString();
    const botMessagePlaceholder = {
      id: botMsgId,
      role: 'model',
      text: '', 
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, botMessagePlaceholder]);

    try {
      let accumulatedText = '';
      
      await sendMessageStream(text, (chunk) => {
        accumulatedText += chunk;
        setMessages(prev => 
          prev.map(msg => 
            msg.id === botMsgId 
              ? { ...msg, text: accumulatedText }
              : msg
          )
        );
      });
      
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === botMsgId 
            ? { ...msg, text: "Sorry, I encountered an error connecting to Gemini. Check your API Key.", isError: true }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
        {
        id: Date.now().toString(),
        role: 'model',
        text: "Chat cleared. What else can I do for you?",
        timestamp: Date.now()
      }
    ]);
    resetChatSession();
  };

  const isThinking = isLoading && messages[messages.length - 1].text === '';

  // Check for API Key presence visually
  const hasApiKey = window.process?.env?.API_KEY && window.process.env.API_KEY !== "YOUR_API_KEY_HERE";

  return html`
    <div className="app-container">
      <header>
        <div className="header-title">
          <div className="logo-box">
            <${Sparkles} size=${18} color="white" />
          </div>
          <span>Gemini</span>
        </div>
        <button 
          onClick=${handleClearChat}
          className="icon-btn"
          title="Clear Chat"
        >
          <${Trash2} size=${16} />
        </button>
      </header>

      <main>
        ${!hasApiKey && html`
          <div style=${{padding: '10px', background: '#450a0a', color: '#fca5a5', fontSize: '12px', textAlign: 'center'}}>
            Warning: API Key not configured in polyfill.js
          </div>
        `}
        ${messages.map((msg) => html`<${MessageItem} key=${msg.id} message=${msg} />`)}
        
        ${isThinking && html`
           <div className="message-row model">
             <div className="message-content">
               <div className="avatar model" style=${{opacity: 0.7}}>
                  <${Sparkles} size=${16} />
               </div>
               <div className="loading-dots">
                 <div className="dot"></div>
                 <div className="dot"></div>
                 <div className="dot"></div>
               </div>
             </div>
           </div>
        `}
        <div ref=${messagesEndRef} />
      </main>

      <${InputArea} onSend=${handleSend} isLoading=${isLoading} />
    </div>
  `;
};

export default App;