import { useEffect, useRef, useState } from "react";
import API from "../Api/API";
import "./AiDoctor.css";

const suggestions = [
  "What does an ECG show?",
  "How can I prepare for a cardiology appointment?",
  "What should I ask my doctor about my heart rate?",
];

function AIDoctor() {
  const [message, setMessage] = useState("");
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [voiceMessage, setVoiceMessage] = useState("");
  const chatBoxRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!image) return undefined;
    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    return () => { URL.revokeObjectURL(url); setPreviewUrl(""); };
  }, [image]);

  useEffect(() => {
    if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [chat, loading, error]);

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceMessage("Voice input is unavailable in this browser. You can type your question instead.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.onresult = event => { setMessage(event.results[0][0].transcript); setVoiceMessage(""); };
    recognition.onerror = () => setVoiceMessage("Voice input stopped. Please try again or type your question.");
    recognition.start();
  };

  const selectImage = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Images must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }
    setError("");
    setImage(file);
  };

  const send = async event => {
    event?.preventDefault();
    const draft = message.trim();
    if ((!draft && !image) || loading) return;
    const attachment = image;
    const previousChat = chat;
    const formData = new FormData();
    formData.append("message", draft);
    formData.append("history", JSON.stringify(previousChat.slice(-10).map(item => ({
      role: item.sender === "user" ? "user" : "model",
      text: item.text,
    }))));
    if (attachment) formData.append("image", attachment);

    setError("");
    setChat([...previousChat, { sender: "user", text: draft || "Image attached", hasImage: Boolean(attachment) }]);
    setLoading(true);
    setMessage("");
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      const response = await API.post("/ai-doctor/chat", formData);
      if (!response.data?.reply) throw new Error("The AI service returned an empty response.");
      setChat(current => [...current, { sender: "bot", text: response.data.reply }]);
    } catch (requestError) {
      setChat(previousChat);
      setMessage(draft);
      setImage(attachment);
      setError(requestError.response?.data?.error || requestError.message || "Could not send your message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="aidoc-page">
      <div className="aidoc-container">
        <aside className="aidoc-sidebar">
          <div className="aidoc-brand"><span><i className="fa-solid fa-heart-pulse" aria-hidden="true" /></span> HEARTLINE / ASSISTANT</div>
          <h1>A little clarity<br />for your <em>health questions.</em></h1>
          <p>Ask about heart health, ECG terms, or how to prepare for a conversation with your doctor.</p>
          <div className="aidoc-sidebar-note"><i className="fa-solid fa-shield-heart" aria-hidden="true" /><span>For general information only. For urgent symptoms, seek immediate local medical care.</span></div>
        </aside>

        <section className="aidoc-panel" aria-label="AI health assistant chat">
          <header className="aidoc-header"><div className="aidoc-header-icon"><i className="fa-solid fa-comment-medical" aria-hidden="true" /></div><div><h2>Heartline Companion</h2><p>Ask a question or attach an image</p></div><span className="aidoc-header-badge">INFORMATIONAL</span></header>

          <div className="aidoc-chat" ref={chatBoxRef} aria-live="polite" aria-relevant="additions text">
            {chat.length === 0 && !loading && <div className="aidoc-empty"><div className="aidoc-empty-icon"><i className="fa-solid fa-wave-square" aria-hidden="true" /></div><h3>What would you like to understand?</h3><p>Start with a question, or choose one below.</p><div className="aidoc-suggestions">{suggestions.map(item => <button type="button" key={item} onClick={() => setMessage(item)}>{item}<i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></button>)}</div></div>}

            {chat.map((item, index) => <div className={`aidoc-row ${item.sender}`} key={index}><div className="aidoc-message-meta">{item.sender === "user" ? "YOU" : "COMPANION · AI"}</div><div className={`aidoc-bubble ${item.sender}`}>{item.hasImage && <span className="aidoc-attachment-tag"><i className="fa-solid fa-image" aria-hidden="true" /> Image attached</span>}{item.text !== "Image attached" && item.text}</div></div>)}

            {loading && <div className="aidoc-row bot"><div className="aidoc-message-meta">COMPANION · AI</div><div className="aidoc-bubble bot aidoc-typing" aria-label="Thinking"><span /><span /><span /></div></div>}
          </div>

          <div className="aidoc-composer-area">
            {error && <div className="aidoc-error" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /><span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError("")}>×</button></div>}
            {voiceMessage && <div className="aidoc-voice-message" role="status">{voiceMessage}</div>}
            {image && <div className="aidoc-preview">{previewUrl && <img src={previewUrl} alt="Selected attachment preview" />}<div><strong>{image.name}</strong><span>Image ready to send</span></div><button type="button" onClick={() => { setImage(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} aria-label="Remove image">×</button></div>}
            <form className="aidoc-input-bar" onSubmit={send}>
              <label className="aidoc-icon-btn" aria-label="Attach image" title="Attach image"><i className="fa-solid fa-paperclip" aria-hidden="true" /><input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={selectImage} /></label>
              <textarea className="aidoc-text-input" rows="1" maxLength="4000" placeholder="Ask about your heart health..." value={message} onChange={event => setMessage(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} aria-label="Your question" />
              <button type="button" className="aidoc-icon-btn aidoc-voice-btn" onClick={startVoice} aria-label="Use voice input" title="Use voice input"><i className="fa-solid fa-microphone" aria-hidden="true" /></button>
              <button type="submit" className="aidoc-send-btn" disabled={loading || (!message.trim() && !image)} aria-label="Send message"><i className="fa-solid fa-arrow-up" aria-hidden="true" /></button>
            </form>
            <p className="aidoc-disclaimer">AI responses can be inaccurate. Consult a qualified doctor for medical advice.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default AIDoctor;
