import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import API from '../../Api/API';
import { onCompanionOpen, openCompanion } from './companionEvents';
import './Companion.css';

type Message = { sender: 'user' | 'bot'; text: string; hasImage?: boolean };
type SpeechResult = { results: { 0: { 0: { transcript: string } } } };
type Recognition = { lang: string; onresult: (event: SpeechResult) => void; onerror: () => void; start: () => void };
type RecognitionConstructor = new () => Recognition;

const suggestions = ['What does an ECG show?', 'How can I prepare for a cardiology appointment?', 'What should I ask my doctor about my heart rate?'];
const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];

// Replies may use **bold**; render that and keep everything else as plain text.
const formatted = (text: string): ReactNode[] => text.split(/(\*\*[^*]+\*\*)/).map((part, i) => /^\*\*[^*]+\*\*$/.test(part) ? <strong key={i}>{part.slice(2, -2)}</strong> : part);

/** The old /ai-doctor address now opens the floating chat on the home page. */
export function OpenCompanion() {
  useEffect(() => { openCompanion(); }, []);
  return <Navigate to="/" replace />;
}

/** Heartline Companion as a floating chat on every page. The conversation persists across pages. */
export default function Companion({ userId }: { userId: string | null }) {
  const signedIn = !!userId;
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [chat, setChat] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // A different account never sees the previous conversation; the panel stays open across sign-in.
  const [owner, setOwner] = useState(userId);
  if (owner !== userId) { setOwner(userId); setChat([]); setMessage(''); setImage(null); setError(''); setNotice(''); }
  const log = useRef<HTMLDivElement>(null), input = useRef<HTMLTextAreaElement>(null), file = useRef<HTMLInputElement>(null), launcher = useRef<HTMLButtonElement>(null);

  useEffect(() => onCompanionOpen(() => setOpen(true)), []);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [chat, loading, open]);

  const close = () => { setOpen(false); launcher.current?.focus(); };
  const clearImage = () => { setImage(null); if (file.current) file.current.value = ''; };
  const selectImage = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    if (!chosen) return;
    if (!imageTypes.includes(chosen.type)) { setError('Choose a JPEG, PNG, or WebP image.'); event.target.value = ''; return; }
    if (chosen.size > 5 * 1024 * 1024) { setError('Images must be smaller than 5 MB.'); event.target.value = ''; return; }
    setError(''); setImage(chosen);
  };
  const startVoice = () => {
    const speech = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const Speech = speech.SpeechRecognition || speech.webkitSpeechRecognition;
    if (!Speech) { setNotice('Voice input is unavailable in this browser. Please type your question.'); return; }
    const recognition = new Speech();
    recognition.lang = 'en-US';
    recognition.onresult = event => { setMessage(event.results[0][0].transcript); setNotice(''); };
    recognition.onerror = () => setNotice('Voice input stopped. Please try again or type your question.');
    setNotice('Listening…');
    recognition.start();
  };
  async function send(event?: FormEvent) {
    event?.preventDefault();
    const draft = message.trim(), attachment = image, previous = chat;
    if ((!draft && !attachment) || loading) return;
    const form = new FormData();
    form.append('message', draft);
    form.append('history', JSON.stringify(previous.slice(-10).map(item => ({ role: item.sender === 'user' ? 'user' : 'model', text: item.text }))));
    if (attachment) form.append('image', attachment);
    setError(''); setNotice('');
    setChat([...previous, { sender: 'user', text: draft, hasImage: !!attachment }]);
    setMessage(''); clearImage(); setLoading(true);
    try {
      const { data } = await API.post<{ reply?: string }>('/ai-doctor/chat', form);
      if (!data?.reply) throw new Error('The Companion returned an empty response. Please try again.');
      setChat(current => [...current, { sender: 'bot', text: data.reply! }]);
    } catch (cause) {
      setChat(previous); setMessage(draft); setImage(attachment);
      setError(axios.isAxiosError(cause) ? cause.response?.data?.error || cause.response?.data?.message || 'Could not reach the Companion. Please try again.' : cause instanceof Error ? cause.message : 'Could not send your message.');
    } finally {
      setLoading(false);
    }
  }

  return <div className="companion">
    {open && <section id="companion-panel" className="companion-panel" role="dialog" aria-label="Heartline Companion" onKeyDown={event => { if (event.key === 'Escape') close(); }}>
      <header className="companion-head">
        <span className="companion-avatar" aria-hidden="true"><i className="fa-solid fa-heart-pulse" /></span>
        <div><h2>Heartline Companion</h2><p>General heart-health information</p></div>
        <button type="button" className="companion-icon" onClick={close} aria-label="Close chat"><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
      </header>
      {signedIn ? <>
        <div className="companion-log" ref={log} aria-live="polite">
          {!chat.length && !loading && <div className="companion-empty">
            <p>Hi! Ask about heart health, ECG terms, or how to prepare for a conversation with your doctor.</p>
            <div className="companion-suggestions">{suggestions.map(item => <button type="button" key={item} onClick={() => { setMessage(item); input.current?.focus(); }}>{item}</button>)}</div>
          </div>}
          {chat.map((item, index) => <div key={index} className={`companion-bubble is-${item.sender}`}>
            {item.hasImage && <span className="companion-tag"><i className="fa-solid fa-image" aria-hidden="true" /> Image attached</span>}
            {item.sender === 'bot' ? formatted(item.text) : item.text}
          </div>)}
          {loading && <div className="companion-bubble is-bot companion-typing" role="status" aria-label="Companion is typing"><span /><span /><span /></div>}
        </div>
        <div className="companion-compose">
          {error && <p className="companion-error" role="alert">{error}</p>}
          {notice && <p className="companion-notice" role="status">{notice}</p>}
          {image && <div className="companion-file"><i className="fa-solid fa-image" aria-hidden="true" /><span>{image.name}</span><button type="button" onClick={clearImage} aria-label="Remove image">×</button></div>}
          <form className="companion-form" onSubmit={send}>
            <button type="button" className="companion-icon" onClick={() => file.current?.click()} aria-label="Attach image" title="Attach image"><i className="fa-solid fa-paperclip" aria-hidden="true" /></button>
            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" onChange={selectImage} hidden />
            <textarea ref={input} rows={1} maxLength={4000} placeholder="Ask about your heart health…" value={message} onChange={event => setMessage(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} aria-label="Your question" />
            <button type="button" className="companion-icon" onClick={startVoice} aria-label="Use voice input" title="Use voice input"><i className="fa-solid fa-microphone" aria-hidden="true" /></button>
            <button type="submit" className="companion-send" disabled={loading || (!message.trim() && !image)} aria-label="Send message"><i className="fa-solid fa-arrow-up" aria-hidden="true" /></button>
          </form>
          <p className="companion-disclaimer">General information, not medical advice. For urgent symptoms, seek emergency care.</p>
        </div>
      </> : <div className="companion-signin">
        <span className="companion-avatar" aria-hidden="true"><i className="fa-solid fa-comment-medical" /></span>
        <p>Sign in to chat with Heartline Companion about heart health and your care.</p>
        <Link to="/login" onClick={() => setOpen(false)}>Log in</Link>
      </div>}
    </section>}
    <button ref={launcher} type="button" className={`companion-launcher${open ? ' is-open' : ''}`} onClick={() => open ? close() : setOpen(true)} aria-expanded={open} aria-controls="companion-panel" aria-label={open ? 'Close Heartline Companion' : 'Open Heartline Companion'}>
      <i className={`fa-solid ${open ? 'fa-xmark' : 'fa-comment-medical'}`} aria-hidden="true" />
    </button>
  </div>;
}
