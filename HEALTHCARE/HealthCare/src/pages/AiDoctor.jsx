import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./AiDoctor.css";

function AIDoctor() {
  const [message, setMessage] = useState("");
  const [image, setImage] = useState(null);
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice not supported in this browser");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.start();
    recognition.onresult = (event) => {
      setMessage(event.results[0][0].transcript);
    };
    recognition.onerror = () => {
      alert("Voice not supported in this browser");
    };
  };

  const handleSend = async () => {
    if (!message && !image) return;

    const formData = new FormData();
    formData.append("message", message);
    if (image) formData.append("image", image);

    setChat((prev) => [...prev, { sender: "user", text: message }]);
    setLoading(true);
    setMessage("");
    setImage(null);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BASEURL}/ai-doctor/chat`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setChat((prev) => [...prev, { sender: "bot", text: res.data.reply }]);
    } catch (error) {
      setChat((prev) => [...prev, { sender: "bot", text: "Something went wrong. Please try again." }]);
    }

    setLoading(false);
  };

  return (
    <div className="aidoc-page">
      <div className="aidoc-container">
        <div className="aidoc-header">
          <div className="aidoc-header-icon">
            <i className="fa-solid fa-robot" style={{ color: '#fca5a5' }}></i>
          </div>
          <h3>AI Doctor Assistant</h3>
        </div>

        <div className="aidoc-chat">
          {chat.length === 0 && !loading && (
            <div className="aidoc-empty">
              <i className="fa-solid fa-comment-medical"></i>
              <p>Describe your symptoms to get started.</p>
              <p style={{ fontSize: 12, opacity: 0.7 }}>This assistant does not replace professional medical advice.</p>
            </div>
          )}

          {chat.map((msg, index) => (
            <div key={index} className={`aidoc-row ${msg.sender}`}>
              <div className={`aidoc-bubble ${msg.sender}`}>{msg.text}</div>
            </div>
          ))}

          {loading && (
            <div className="aidoc-row bot">
              <div className="aidoc-bubble bot">
                <div className="aidoc-typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {image && (
          <div className="aidoc-preview">
            <div className="aidoc-preview-label">Image attached</div>
            <img src={URL.createObjectURL(image)} alt="preview" />
          </div>
        )}

        <div className="aidoc-input-bar">
          <button className="aidoc-icon-btn" onClick={startVoice} title="Speak">
            <i className="fa-solid fa-microphone"></i>
          </button>

          <label className="aidoc-icon-btn" title="Upload Image" style={{ marginBottom: 0 }}>
            <i className="fa-solid fa-paperclip"></i>
            <input type="file" hidden onChange={(e) => setImage(e.target.files[0])} />
          </label>

          <input
            type="text"
            className="aidoc-text-input"
            placeholder="Type your symptoms..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />

          <button className="aidoc-send-btn" onClick={handleSend} disabled={!message && !image}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIDoctor;
