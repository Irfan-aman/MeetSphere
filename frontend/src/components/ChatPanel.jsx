import { useEffect, useRef, useState } from 'react';
import { Send, X } from 'lucide-react';
import { fmtTime } from '../utils';

export default function ChatPanel({ messages, selfId, onSend, onClose }) {
  const [text, setText] = useState('');
  const list = useRef(null);
  // Scroll only the chat list. (scrollIntoView can also scroll the page layout and push the room off-screen.)
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    if (el.scrollTo) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    else el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <aside className="side" aria-label="Chat">
      <div className="side-head">
        <h2>Chat</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Close chat"><X size={18} /></button>
      </div>
      <div className="side-body chat-list" ref={list}>
        {messages.length === 0 && <p className="side-empty">No messages yet. Messages are saved with the meeting notes.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`msg${m.senderId === selfId ? ' msg-me' : ''}`}>
            <div className="msg-meta">{m.senderId === selfId ? 'You' : m.sender} <time>{fmtTime(m.at)}</time></div>
            <div className="msg-text">{m.text}</div>
          </div>
        ))}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Send a message" maxLength={2000} aria-label="Message" />
        <button className="btn btn-primary btn-icon" aria-label="Send" disabled={!text.trim()}><Send size={18} /></button>
      </form>
    </aside>
  );
}
