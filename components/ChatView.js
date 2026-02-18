import { React } from "../deps.js";
const { useState, useRef, useEffect } = React;
import { html } from "../utils.js";
import { sendMessageStream } from "../services/geminiService.js";
import {
  Send,
  Loader2,
  Bot,
  User,
  Trash2,
} from "https://esm.sh/lucide-react@0.263.1?deps=react@18.2.0";

export const ChatView = () => {
  const [messages, setMessages] = useState([
    {
      role: "model",
      text: "Hallo! Ik ben je AI taalcoach. Vraag me alles over Duits of Nederlands!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Stream response
      const stream = await sendMessageStream(userMsg.text, messages);

      setMessages((prev) => [...prev, { role: "model", text: "" }]);

      let fullText = "";
      for await (const chunk of stream) {
        if (chunk.text) {
          fullText += chunk.text;
          setMessages((prev) => {
            const newArr = [...prev];
            newArr[newArr.length - 1] = { role: "model", text: fullText };
            return newArr;
          });
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "Sorry, er ging iets mis. Controleer je API key.",
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return html`
    <div className="chat-view">
      <div className="chat-toolbar">
        <button
          className="icon-btn"
          onClick=${() => setMessages([])}
          title="Clear Chat"
        >
          <${Trash2} size=${14} />
        </button>
      </div>
      <div className="chat-messages">
        ${messages.map(
          (m, i) => html`
            <div key=${i} className=${`message-row ${m.role}`}>
              <div className="message-content">
                <div className=${`avatar ${m.role}`}>
                  <${m.role === "user" ? User : Bot} size=${16} />
                </div>
                <div className="bubble-col">
                  <div
                    className=${`bubble ${m.role} ${m.isError ? "error" : ""}`}
                  >
                    ${m.text}
                  </div>
                </div>
              </div>
            </div>
          `,
        )}
        <div ref=${bottomRef} />
      </div>
      <div className="input-area">
        <div className="input-wrapper">
          <textarea
            value=${input}
            onChange=${(e) => setInput(e.target.value)}
            onKeyDown=${(e) =>
              e.key === "Enter" &&
              !e.shiftKey &&
              (e.preventDefault(), handleSend())}
            placeholder="Vraag om hulp..."
            rows=${1}
          />
          <button
            className="send-btn"
            onClick=${handleSend}
            disabled=${loading || !input.trim()}
          >
            ${loading
              ? html`<${Loader2} className="animate-spin" size=${16} />`
              : html`<${Send} size=${16} />`}
          </button>
        </div>
      </div>
    </div>
  `;
};
