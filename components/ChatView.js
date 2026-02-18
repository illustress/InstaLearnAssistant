// ChatView — Extracted Gemini chat (from original App.js)

import { React } from "../deps.js";
const { useState, useRef, useEffect } = React;
import { html } from "../utils.js";
import {
  sendMessageStream,
  resetChatSession,
} from "../services/geminiService.js";
import { MessageItem } from "./MessageItem.js";
import { InputArea } from "./InputArea.js";
import {
  Sparkles,
  Trash2,
} from "https://esm.sh/lucide-react@0.263.1?deps=react@18.2.0";

export const ChatView = () => {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "model",
      text: "Hello! I'm your InstaLearning assistant. Ask me anything about German-Dutch vocabulary!",
      timestamp: Date.now(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text) => {
    const userMsgId = Date.now().toString();
    const userMessage = {
      id: userMsgId,
      role: "user",
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const botMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: botMsgId, role: "model", text: "", timestamp: Date.now() },
    ]);

    try {
      let accumulatedText = "";
      await sendMessageStream(text, (chunk) => {
        accumulatedText += chunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId ? { ...msg, text: accumulatedText } : msg,
          ),
        );
      });
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
                ...msg,
                text: "Sorry, I encountered an error connecting to Gemini. Check your API Key.",
                isError: true,
              }
            : msg,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: "model",
        text: "Chat cleared. What else can I do for you?",
        timestamp: Date.now(),
      },
    ]);
    resetChatSession();
  };

  const isThinking = isLoading && messages[messages.length - 1]?.text === "";

  return html`
    <div className="chat-view">
      <div className="chat-toolbar">
        <button onClick=${handleClear} className="icon-btn" title="Clear Chat">
          <${Trash2} size=${14} />
        </button>
      </div>
      <div className="chat-messages">
        ${messages.map(
          (msg) => html`<${MessageItem} key=${msg.id} message=${msg} />`,
        )}
        ${isThinking
          ? html`
              <div className="message-row model">
                <div className="message-content">
                  <div className="avatar model" style=${{ opacity: 0.7 }}>
                    <${Sparkles} size=${16} />
                  </div>
                  <div className="loading-dots">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                  </div>
                </div>
              </div>
            `
          : null}
        <div ref=${messagesEndRef} />
      </div>
      <${InputArea} onSend=${handleSend} isLoading=${isLoading} />
    </div>
  `;
};
