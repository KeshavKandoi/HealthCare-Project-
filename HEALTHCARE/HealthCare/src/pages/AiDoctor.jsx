import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

function AIDoctor() {
  const [message, setMessage] = useState("");
  const [image, setImage] = useState(null);
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // 🎤 Voice
  const startVoice = () => {
    const recognition =
      new (window.SpeechRecognition || window.webkitSpeechRecognition)();

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

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BASEURL}/ai-doctor/chat`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setChat((prev) => [
        ...prev,
        { sender: "bot", text: res.data.reply },
      ]);
    } catch (error) {
      setChat((prev) => [
        ...prev,
        { sender: "bot", text: "⚠ Something went wrong." },
      ]);
    }

    setLoading(false);
    setMessage("");
    setImage(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #4e73df, #1cc88a)",
        padding: "40px 0",
      }}
    >
      <div
        className="container"
        style={{
          maxWidth: "700px",
          background: "rgba(255,255,255,0.9)",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          padding: "20px",
        }}
      >
        <h3 className="text-center mb-3 text-primary">
          🤖 AI Doctor Assistant
        </h3>

        {/* Chat Area */}
        <div
          style={{
            height: "400px",
            overflowY: "auto",
            padding: "15px",
            borderRadius: "15px",
            background: "#f8f9fc",
            marginBottom: "15px",
          }}
        >
          {chat.map((msg, index) => (
            <div
              key={index}
              style={{
                textAlign: msg.sender === "user" ? "right" : "left",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "12px 18px",
                  borderRadius: "20px",
                  background:
                    msg.sender === "user"
                      ? "linear-gradient(135deg,#4e73df,#224abe)"
                      : "#e2e6ea",
                  color: msg.sender === "user" ? "white" : "#333",
                  maxWidth: "75%",
                  animation: "fadeIn 0.3s ease-in-out",
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "10px 15px",
                  borderRadius: "20px",
                  background: "#e2e6ea",
                }}
              >
                🤖 Typing...
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Selected Image Preview */}
        {image && (
          <div className="mb-2 text-center">
            <small className="text-muted">Image Selected:</small>
            <div>
              <img
                src={URL.createObjectURL(image)}
                alt="preview"
                style={{
                  maxWidth: "120px",
                  borderRadius: "10px",
                  marginTop: "5px",
                }}
              />
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-light"
            onClick={startVoice}
            title="Speak"
          >
            🎤
          </button>

          <label className="btn btn-light mb-0" title="Upload Image">
            📎
            <input
              type="file"
              hidden
              onChange={(e) => setImage(e.target.files[0])}
            />
          </label>

          <input
            type="text"
            className="form-control"
            placeholder="Type your symptoms..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />

          <button
            className="btn btn-primary"
            onClick={handleSend}
          >
            Send
          </button>
        </div>
      </div>

      {/* Animation */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
}

export default AIDoctor;
