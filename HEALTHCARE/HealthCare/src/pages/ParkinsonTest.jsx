import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

const TABS = [
  {
    id:       "spiral",
    label:    "🌀 Spiral",
    desc:     "Draw a spiral on paper and upload a photo, OR use your camera to capture it live.",
    accept:   "image/*",
    endpoint: "/api/v1/parkinson/detect/spiral",
    mode:     "image",
  },
  {
    id:       "wave",
    label:    "〰️ Wave",
    desc:     "Draw a wave pattern on paper and upload a photo, OR use your camera to capture it live.",
    accept:   "image/*",
    endpoint: "/api/v1/parkinson/detect/wave",
    mode:     "image",
  },
  {
    id:       "voice",
    label:    "🎙️ Voice",
    desc:     'Record your voice live (say "Ahhh" for 5 seconds), or upload a voice CSV file.',
    accept:   ".csv,.data,.txt",
    endpoint: "/api/v1/parkinson/detect/voice",
    mode:     "voice",
  },
  {
    id:       "gait",
    label:    "🚶 Walking",
    desc:     "Record or upload a short 5–10 second video of yourself walking normally.",
    accept:   "video/*",
    endpoint: "/api/v1/parkinson/detect/gait",
    mode:     "video",
  },
];

// ─── Voice Recorder Hook ──────────────────────────────────────────────────
function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL,  setAudioURL]  = useState(null);
  const [seconds,   setSeconds]   = useState(0);
  const mediaRef  = useRef(null);
  const chunksRef = useRef([]);
  const timerRef  = useRef(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current  = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      alert("Microphone access denied. Please allow microphone in browser settings.");
    }
  };

  const stop = () => {
    mediaRef.current?.stop();
    setRecording(false);
    clearInterval(timerRef.current);
  };

  const reset = () => { setAudioBlob(null); setAudioURL(null); setSeconds(0); };
  useEffect(() => () => clearInterval(timerRef.current), []);
  return { recording, audioBlob, audioURL, seconds, start, stop, reset };
}

// ─── Camera Capture Hook ──────────────────────────────────────────────────
function useCameraCapture() {
  const [open,         setOpen]         = useState(false);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedURL,  setCapturedURL]  = useState(null);
  const videoRef  = useRef(null);
  const streamRef = useRef(null);

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setOpen(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch {
      alert("Camera access denied. Please allow camera in browser settings.");
    }
  };

  const capture = () => {
    const video  = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      setCapturedBlob(blob);
      setCapturedURL(URL.createObjectURL(blob));
      closeCamera();
    }, "image/png");
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setOpen(false);
  };

  const reset = () => { setCapturedBlob(null); setCapturedURL(null); };
  return { open, capturedBlob, capturedURL, openCamera, capture, closeCamera, videoRef, reset };
}

// ─── Video Recorder Hook ──────────────────────────────────────────────────
function useVideoRecorder() {
  const [recording,  setRecording]  = useState(false);
  const [videoBlob,  setVideoBlob]  = useState(null);
  const [videoURL,   setVideoURL]   = useState(null);
  const [seconds,    setSeconds]    = useState(0);
  const [streamOpen, setStreamOpen] = useState(false);
  const mediaRef   = useRef(null);
  const chunksRef  = useRef([]);
  const timerRef   = useRef(null);
  const previewRef = useRef(null);
  const streamRef  = useRef(null);

  const openPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      setStreamOpen(true);
      setTimeout(() => { if (previewRef.current) previewRef.current.srcObject = stream; }, 100);
    } catch {
      alert("Camera access denied. Please allow camera in browser settings.");
    }
  };

  const start = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const mr = new MediaRecorder(stream);
    mediaRef.current  = mr;
    chunksRef.current = [];
    mr.ondataavailable = (e) => chunksRef.current.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setVideoBlob(blob);
      setVideoURL(URL.createObjectURL(blob));
      stream.getTracks().forEach((t) => t.stop());
      setStreamOpen(false);
    };
    mr.start();
    setRecording(true);
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const stop = () => {
    mediaRef.current?.stop();
    setRecording(false);
    clearInterval(timerRef.current);
  };

  const reset = () => {
    setVideoBlob(null);
    setVideoURL(null);
    setSeconds(0);
    setStreamOpen(false);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);
  return { recording, videoBlob, videoURL, seconds, streamOpen, previewRef, openPreview, start, stop, reset };
}

// ─── Main Component ───────────────────────────────────────────────────────
const ParkinsonTest = () => {
  const [activeTab, setActiveTab] = useState("spiral");
  const [files,     setFiles]     = useState({});
  const [results,   setResults]   = useState({});
  const [loading,   setLoading]   = useState({});
  const fileInputRefs             = useRef({});

  const voice  = useVoiceRecorder();
  const camera = useCameraCapture();
  const video  = useVideoRecorder();

  const currentTab = TABS.find((t) => t.id === activeTab);

  const handleFileChange = (tabId, e) => {
    const file = e.target.files[0];
    if (file) setFiles((prev) => ({ ...prev, [tabId]: file }));
  };

  const getPayload = (tab) => {
    if (tab.mode === "voice" && voice.audioBlob)
      return new File([voice.audioBlob], "recording.webm", { type: "audio/webm" });
    if (tab.mode === "image" && camera.capturedBlob)
      return new File([camera.capturedBlob], "capture.png", { type: "image/png" });
    if (tab.mode === "video" && video.videoBlob)
      return new File([video.videoBlob], "walking.webm", { type: "video/webm" });
    return files[tab.id] || null;
  };

  const runDetection = async (tab) => {
    const file = getPayload(tab);
    if (!file) {
      alert(`Please upload or record a ${tab.label} first.`);
      return;
    }
    setLoading((prev) => ({ ...prev, [tab.id]: true }));
    setResults((prev) => ({ ...prev, [tab.id]: null }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post(
        `http://localhost:4000${tab.endpoint}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setResults((prev) => ({ ...prev, [tab.id]: response.data }));
    } catch (error) {
      const detail = error.response?.data?.detail || error.message;
      setResults((prev) => ({
        ...prev,
        [tab.id]: { error: detail || "Failed to connect. Is the server running?" },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [tab.id]: false }));
    }
  };

  // ── FIX 1: no more border + borderColor conflict ──────────────
  const renderResult = (tabId) => {
    const res = results[tabId];
    if (!res) return null;
    if (res.error) return <div style={s.errorBox}>⚠️ {res.error}</div>;
    const detected = res.result === "Parkinson Detected";
    return (
      <div style={{ ...s.resultBox, border: `2px solid ${detected ? "#e74c3c" : "#27ae60"}` }}>
        <div style={{ fontSize: 36 }}>{detected ? "🔴" : "🟢"}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: detected ? "#e74c3c" : "#27ae60", marginTop: 8 }}>
          {res.result}
        </div>
        {res.confidence !== undefined && (
          <div style={{ color: "#666", marginTop: 4, fontSize: 14 }}>
            Confidence: <strong>{(res.confidence * 100).toFixed(1)}%</strong>
          </div>
        )}
      </div>
    );
  };

  const renderVoiceInput = () => (
    <div>
      <div style={s.inputGroup}>
        <div style={s.sectionLabel}>🎙️ Live Recording</div>
        <div style={s.recordRow}>
          {!voice.recording && !voice.audioURL && (
            <button style={s.actionBtn} onClick={voice.start}>⏺ Start Recording</button>
          )}
          {voice.recording && (
            <>
              <button style={{ ...s.actionBtn, background: "#e74c3c" }} onClick={voice.stop}>⏹ Stop</button>
              <span style={s.timerPill}>🔴 {voice.seconds}s</span>
              <span style={{ color: "#888", fontSize: 13 }}>Say "Ahhh" steadily...</span>
            </>
          )}
          {voice.audioURL && !voice.recording && (
            <div style={s.mediaRow}>
              <audio controls src={voice.audioURL} style={{ height: 36 }} />
              <button style={s.resetBtn} onClick={voice.reset}>✕ Redo</button>
            </div>
          )}
        </div>
      </div>
      <div style={s.divider}>— or upload a CSV file instead —</div>
      <div style={s.inputGroup}>
        <div style={s.sectionLabel}>📁 Upload Voice CSV</div>
        <div style={s.uploadRow}>
          <input type="file" accept={currentTab.accept}
            ref={(el) => (fileInputRefs.current[currentTab.id] = el)}
            onChange={(e) => handleFileChange(currentTab.id, e)}
            style={{ display: "none" }}
          />
          <button style={s.uploadBtn} onClick={() => fileInputRefs.current[currentTab.id]?.click()}>
            📁 Choose CSV
          </button>
          {files[currentTab.id] && <span style={s.fileName}>📎 {files[currentTab.id].name}</span>}
        </div>
        <div style={s.hint}>CSV must match UCI parkinsons.data format (22 acoustic features)</div>
      </div>
    </div>
  );

  const renderImageInput = () => (
    <div>
      <div style={s.inputGroup}>
        <div style={s.sectionLabel}>📷 Capture with Camera</div>
        {!camera.capturedURL ? (
          <button style={s.actionBtn} onClick={camera.openCamera}>📷 Open Camera</button>
        ) : (
          <div style={s.mediaRow}>
            <img src={camera.capturedURL} alt="Captured" style={s.preview} />
            <button style={s.resetBtn} onClick={camera.reset}>✕ Retake</button>
          </div>
        )}
      </div>
      {camera.open && (
        <div style={s.modal}>
          <div style={s.modalBox}>
            <div style={s.modalTitle}>📷 Position your drawing in frame</div>
            <video ref={camera.videoRef} autoPlay playsInline style={s.videoFeed} />
            <div style={s.modalControls}>
              <button style={s.captureBtn} onClick={camera.capture}>📸 Capture Photo</button>
              <button style={s.cancelBtn}  onClick={camera.closeCamera}>✕ Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={s.divider}>— or upload an image file instead —</div>
      <div style={s.inputGroup}>
        <div style={s.sectionLabel}>📁 Upload Image</div>
        <div style={s.uploadRow}>
          <input type="file" accept={currentTab.accept}
            ref={(el) => (fileInputRefs.current[currentTab.id] = el)}
            onChange={(e) => handleFileChange(currentTab.id, e)}
            style={{ display: "none" }}
          />
          <button style={s.uploadBtn} onClick={() => fileInputRefs.current[currentTab.id]?.click()}>
            📁 Choose Image
          </button>
          {files[currentTab.id] && <span style={s.fileName}>📎 {files[currentTab.id].name}</span>}
        </div>
      </div>
    </div>
  );

  const renderVideoInput = () => (
    <div>
      <div style={s.tipsBox}>
        <strong>📋 Recording tips:</strong>
        <ul style={{ margin: "6px 0 0 0", paddingLeft: 18, fontSize: 13, color: "#555" }}>
          <li>Walk in a straight line for 5–10 seconds</li>
          <li>Keep phone/camera steady at waist height</li>
          <li>Walk at your normal pace</li>
          <li>Good lighting helps accuracy</li>
        </ul>
      </div>
      <div style={s.inputGroup}>
        <div style={s.sectionLabel}>🎥 Record Walking Video</div>
        {!video.streamOpen && !video.recording && !video.videoURL && (
          <button style={s.actionBtn} onClick={video.openPreview}>📷 Open Camera</button>
        )}
        {video.streamOpen && !video.recording && (
          <div>
            <video ref={video.previewRef} autoPlay playsInline muted style={s.videoFeed} />
            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              <button style={s.actionBtn} onClick={video.start}>⏺ Start Recording</button>
              <button style={s.cancelBtn} onClick={video.reset}>✕ Cancel</button>
            </div>
          </div>
        )}
        {video.recording && (
          <div>
            <video ref={video.previewRef} autoPlay playsInline muted style={s.videoFeed} />
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
              <button style={{ ...s.actionBtn, background: "#e74c3c" }} onClick={video.stop}>⏹ Stop Recording</button>
              <span style={s.timerPill}>🔴 {video.seconds}s</span>
              <span style={{ color: "#888", fontSize: 13 }}>Walk normally...</span>
            </div>
          </div>
        )}
        {video.videoURL && !video.recording && (
          <div style={s.mediaRow}>
            <video src={video.videoURL} controls style={{ ...s.preview, width: 220, height: 140 }} />
            <button style={s.resetBtn} onClick={video.reset}>✕ Re-record</button>
          </div>
        )}
      </div>
      <div style={s.divider}>— or upload a walking video file instead —</div>
      <div style={s.inputGroup}>
        <div style={s.sectionLabel}>📁 Upload Video</div>
        <div style={s.uploadRow}>
          <input type="file" accept="video/*"
            ref={(el) => (fileInputRefs.current[currentTab.id] = el)}
            onChange={(e) => handleFileChange(currentTab.id, e)}
            style={{ display: "none" }}
          />
          <button style={s.uploadBtn} onClick={() => fileInputRefs.current[currentTab.id]?.click()}>
            📁 Choose Video
          </button>
          {files[currentTab.id] && <span style={s.fileName}>📎 {files[currentTab.id].name}</span>}
        </div>
        <div style={s.hint}>Accepted formats: .mp4, .mov, .webm (5–10 seconds recommended)</div>
      </div>
    </div>
  );

  const completedTabs = TABS.filter((t) => results[t.id] && !results[t.id].error);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>🧠 Parkinson Detection AI</h2>
        <p style={s.subtitle}>4 independent AI models — run any or all tests below.</p>
        {completedTabs.length > 0 && (
          <span style={s.progressPill}>✅ {completedTabs.length} / {TABS.length} tests done</span>
        )}
      </div>

      {/* ── FIX 2: tab done state uses full border not borderColor ── */}
      <div style={s.tabBar}>
        {TABS.map((tab) => {
          const done     = results[tab.id] && !results[tab.id].error;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                ...s.tabBtn,
                ...(isActive ? s.tabActive : {}),
                ...(done ? { border: "2px solid #27ae60" } : {}),
              }}
            >
              {tab.label}{done ? " ✓" : ""}
            </button>
          );
        })}
      </div>

      <div style={s.card}>
        <h3 style={s.cardTitle}>{currentTab.label} Test</h3>
        <p style={s.cardDesc}>{currentTab.desc}</p>

        {currentTab.mode === "voice" && renderVoiceInput()}
        {currentTab.mode === "image" && renderImageInput()}
        {currentTab.mode === "video" && renderVideoInput()}

        <button
          style={{ ...s.runBtn, opacity: loading[currentTab.id] ? 0.7 : 1, cursor: loading[currentTab.id] ? "not-allowed" : "pointer" }}
          onClick={() => runDetection(currentTab)}
          disabled={loading[currentTab.id]}
        >
          {loading[currentTab.id] ? "⏳ Analyzing..." : "🚀 Run AI Detection"}
        </button>

        {renderResult(currentTab.id)}
      </div>

      {completedTabs.length >= 2 && (
        <div style={s.summaryBox}>
          <h4 style={{ marginBottom: 14, color: "#1a1a2e" }}>📊 Results Summary</h4>
          {completedTabs.map((tab) => {
            const r        = results[tab.id];
            const detected = r.result === "Parkinson Detected";
            return (
              <div key={tab.id} style={s.summaryRow}>
                <span style={{ fontWeight: 500 }}>{tab.label}</span>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {r.confidence !== undefined && (
                    <span style={{ color: "#888", fontSize: 13 }}>{(r.confidence * 100).toFixed(1)}%</span>
                  )}
                  <span style={{ color: detected ? "#e74c3c" : "#27ae60", fontWeight: 700 }}>
                    {detected ? "🔴 Detected" : "🟢 Healthy"}
                  </span>
                </div>
              </div>
            );
          })}
          {/* ── FIX 3: ensemble box uses full border not borderColor ── */}
          {completedTabs.length === TABS.length && (() => {
            const pos      = completedTabs.filter((t) => results[t.id].result === "Parkinson Detected").length;
            const majority = pos >= Math.ceil(TABS.length / 2);
            return (
              <div style={{
                ...s.ensembleBox,
                background:  majority ? "#fff0f0" : "#f0fff4",
                border: `2px solid ${majority ? "#e74c3c" : "#27ae60"}`,
              }}>
                <strong>🧠 Ensemble ({pos}/{TABS.length} models agree):</strong>
                <span style={{ color: majority ? "#e74c3c" : "#27ae60", marginLeft: 8, fontWeight: 700 }}>
                  {majority ? "Parkinson Detected" : "Likely Healthy"}
                </span>
              </div>
            );
          })()}
        </div>
      )}

      <p style={s.disclaimer}>
        ⚕️ This tool is for educational purposes only and is not a substitute for professional medical diagnosis.
      </p>
    </div>
  );
};

const s = {
  page:         { padding: "30px", maxWidth: 720, margin: "0 auto", fontFamily: "'Segoe UI', sans-serif" },
  header:       { marginBottom: 24 },
  title:        { margin: 0, fontSize: 26, color: "#1a1a2e" },
  subtitle:     { color: "#666", marginTop: 6, marginBottom: 10 },
  progressPill: { display: "inline-block", background: "#e0f4f4", color: "#0a9396", padding: "4px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600 },
  tabBar:       { display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" },
  tabBtn:       { padding: "10px 16px", borderRadius: 8, border: "2px solid #ddd", background: "#f9f9f9", cursor: "pointer", fontWeight: 500, fontSize: 14 },
  tabActive:    { border: "2px solid #0a9396", background: "#e0f4f4", color: "#0a9396" },
  card:         { border: "1px solid #e0e0e0", borderRadius: 12, padding: 28, background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  cardTitle:    { margin: "0 0 6px", fontSize: 20, color: "#1a1a2e" },
  cardDesc:     { color: "#888", marginBottom: 20, marginTop: 0, fontSize: 14 },
  inputGroup:   { marginBottom: 16 },
  sectionLabel: { fontWeight: 600, fontSize: 14, color: "#333", marginBottom: 10 },
  divider:      { textAlign: "center", color: "#aaa", fontSize: 13, margin: "18px 0", borderTop: "1px solid #eee", paddingTop: 14 },
  hint:         { color: "#999", fontSize: 12, marginTop: 8 },
  tipsBox:      { background: "#f0fbfb", border: "1px solid #b2e8e8", borderRadius: 8, padding: "12px 16px", marginBottom: 18, fontSize: 13 },
  recordRow:    { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  mediaRow:     { display: "flex", alignItems: "flex-start", gap: 12 },
  timerPill:    { background: "#fff0f0", color: "#e74c3c", padding: "4px 12px", borderRadius: 20, fontWeight: 700, fontSize: 14 },
  actionBtn:    { padding: "10px 20px", borderRadius: 8, border: "none", background: "#0a9396", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14 },
  resetBtn:     { padding: "6px 14px", borderRadius: 6, border: "1px solid #ddd", background: "#f9f9f9", cursor: "pointer", fontSize: 13, color: "#666" },
  uploadRow:    { display: "flex", alignItems: "center", gap: 14 },
  uploadBtn:    { padding: "10px 18px", borderRadius: 8, border: "2px dashed #0a9396", background: "#f0fbfb", color: "#0a9396", cursor: "pointer", fontWeight: 600 },
  fileName:     { color: "#555", fontSize: 13 },
  preview:      { width: 160, height: 120, objectFit: "cover", borderRadius: 8, border: "2px solid #0a9396" },
  videoFeed:    { width: "100%", borderRadius: 10, background: "#000", display: "block", maxHeight: 280 },
  modal:        { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalBox:     { background: "#fff", borderRadius: 16, padding: 24, maxWidth: 500, width: "90%" },
  modalTitle:   { fontWeight: 600, marginBottom: 12, color: "#1a1a2e", fontSize: 16 },
  modalControls:{ display: "flex", gap: 12, marginTop: 14 },
  captureBtn:   { flex: 1, padding: "12px", borderRadius: 8, border: "none", background: "#0a9396", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 15 },
  cancelBtn:    { padding: "10px 16px", borderRadius: 8, border: "1px solid #ddd", background: "#f9f9f9", cursor: "pointer", fontSize: 14 },
  runBtn:       { padding: "12px 28px", borderRadius: 8, border: "none", background: "#0a9396", color: "#fff", fontWeight: 700, fontSize: 15, width: "100%", marginTop: 20, cursor: "pointer" },
  resultBox:    { marginTop: 20, borderRadius: 10, padding: 20, textAlign: "center", background: "#fafafa" },
  errorBox:     { marginTop: 20, padding: 16, borderRadius: 8, background: "#fff3f3", border: "1px solid #f5c6cb", color: "#c0392b", fontSize: 14 },
  summaryBox:   { marginTop: 24, border: "1px solid #e0e0e0", borderRadius: 10, padding: 20, background: "#f9f9f9" },
  summaryRow:   { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #eee" },
  ensembleBox:  { marginTop: 14, padding: "12px 16px", borderRadius: 8, fontSize: 15 },
  disclaimer:   { marginTop: 24, color: "#999", fontSize: 12, textAlign: "center" },
};

export default ParkinsonTest;
