import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, LineElement, CategoryScale,
  LinearScale, PointElement, Filler
} from "chart.js";
import heartImage from "../assets/anatomical-heart.png";
import "./ECGDashboard.css";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Filler);

const SOCKET_URL = (import.meta.env.VITE_BASEURL || "http://localhost:4000").replace(/\/api\/v1\/?$/, "");
const API_URL = `${SOCKET_URL}/api/v1/ecg`;
const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  scales: {
    x: { display: false, grid: { display: false } },
    y: { ticks: { color: "#81858f", maxTicksLimit: 5 }, grid: { color: "rgba(255,255,255,.07)" }, border: { display: false } },
  },
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
};

function ECGDashboard() {
  const { user } = useSelector((state) => state.auth);
  const patientId = user?._id || user?.id;
  const [ecgData, setEcgData] = useState([]);
  const [bpm, setBpm] = useState(null);
  const [status, setStatus] = useState(null);
  const [alert, setAlert] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastReading, setLastReading] = useState(null);
  const [historyError, setHistoryError] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [now, setNow] = useState(0);
  const lastAppliedAt = useRef(0);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!patientId) return undefined;
    const controller = new AbortController();
    lastAppliedAt.current = 0;
    const loadHistory = () => fetch(`${API_URL}/history/${encodeURIComponent(patientId)}`, { signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Could not load ECG history.");
        return result.records;
      })
      .then(records => {
        if (!records.length) return;
        const latest = records[0];
        const receivedAt = Date.parse(latest.timestamp || latest.createdAt);
        if (!Number.isFinite(receivedAt) || receivedAt <= lastAppliedAt.current) return;
        lastAppliedAt.current = receivedAt;
        const ordered = [...records].reverse();
        setEcgData(ordered.flatMap(record => Array.isArray(record.values) ? record.values.filter(Number.isFinite) : []).slice(-120));
        if (Number.isFinite(latest.bpm)) setBpm(latest.bpm);
        setStatus(latest.status || null);
        setLastReading(new Date(receivedAt));
      })
      .catch(error => { if (error.name !== "AbortError") setHistoryError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoadingHistory(false); });
    loadHistory();
    const interval = window.setInterval(loadHistory, 3000);
    return () => { window.clearInterval(interval); controller.abort(); };
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return undefined;
    const socket = io(SOCKET_URL, { autoConnect: true });
    const onConnect = () => {
      setConnected(true);
      socket.emit("join-patient", patientId);
    };
    const onDisconnect = () => setConnected(false);
    const onData = (data) => {
      if (data?.patientId !== patientId) return;
      const receivedAt = Date.parse(data.timestamp || data.createdAt || new Date().toISOString());
      if (Number.isFinite(receivedAt)) lastAppliedAt.current = Math.max(lastAppliedAt.current, receivedAt);
      if (Array.isArray(data?.values)) {
        const values = data.values.filter((value) => typeof value === "number" && Number.isFinite(value));
        if (values.length) setEcgData((previous) => [...previous, ...values].slice(-120));
      }
      if (typeof data?.bpm === "number" && Number.isFinite(data.bpm)) setBpm(data.bpm);
      if (typeof data?.status === "string") setStatus(data.status);
      setLastReading(new Date(data.timestamp || Date.now()));
    };
    const onAlert = (data) => setAlert(data?.message || "An ECG alert was received.");
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("ecg-data", onData);
    socket.on("alert", onAlert);
    return () => socket.disconnect();
  }, [patientId]);

  const displayStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Awaiting reading";
  const isBeating = Boolean(connected && bpm !== null && lastReading && now - lastReading.getTime() < 5000);
  const beatDuration = `${60 / Math.max(40, bpm || 72)}s`;
  const chartData = useMemo(() => ({
    labels: ecgData.map((_, index) => index),
    datasets: [{
      data: ecgData,
      borderColor: "#f16d73",
      borderWidth: 2.4,
      fill: true,
      backgroundColor: "rgba(241, 109, 115, .08)",
      tension: 0.18,
      pointRadius: 0,
    }],
  }), [ecgData]);

  return (
    <main className="ecg-page">
      <div className="ecg-shell">
        <div className="ecg-layout">
          <section className="ecg-workspace" aria-label="ECG monitoring dashboard">
            <div className="ecg-heading-row">
              <div><p className="ecg-eyebrow">HEART HEALTH / LIVE READINGS</p><h1>ECG monitoring<span className="ecg-heading-period">.</span></h1><p className="ecg-heading-description">Your heart rate and ECG signal update as readings arrive.</p></div>
              {lastReading && <div className="ecg-heading-meta"><span className="ecg-last-reading">Last reading {lastReading.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>}
            </div>

            {alert && <div className="ecg-alert" role="alert"><span>{alert}</span><button type="button" onClick={() => setAlert(null)} aria-label="Dismiss alert">×</button></div>}
            {historyError && <div className="ecg-alert" role="alert">Could not load saved readings: {historyError}</div>}

            <div className="ecg-content-grid">
              <div className="ecg-heart-card">
                <div className="ecg-orbit ecg-orbit-one" /><div className="ecg-orbit ecg-orbit-two" />
                <div className={`ecg-heart-visual ${isBeating ? "is-beating" : ""}`} style={{ "--beat-duration": beatDuration }}><img src={heartImage} alt="Anatomical illustration of a human heart" /></div>
                <div className="ecg-heart-caption"><span className="ecg-caption-line" /><span>THE HUMAN HEART</span><small>{isBeating ? `Beating at ${bpm} bpm` : "Waiting for a live beat"}</small></div>
              </div>

              <div className="ecg-card-column">
                <article className="ecg-metric-card ecg-rate-card">
                  <div className="ecg-card-top"><span>HEART RATE</span></div>
                  <div className="ecg-rate-value">{bpm === null ? "—" : bpm}<small>bpm</small></div>
                  <p>{bpm === null ? "Waiting for a device reading" : displayStatus}</p>
                  <div className="ecg-rate-decoration" aria-hidden="true" />
                </article>
                <article className="ecg-metric-card ecg-signal-card">
                  <div className="ecg-card-top"><span>LIVE ECG SIGNAL</span><span className="ecg-card-icon">⌁</span></div>
                  <div className="ecg-chart-wrap">{ecgData.length ? <Line data={chartData} options={CHART_OPTIONS} /> : <div className="ecg-empty-chart"><span className="ecg-empty-line" />{!patientId ? "Sign in to view ECG readings" : loadingHistory ? "Loading saved readings…" : "No waveform received yet"}</div>}</div>
                  <div className="ecg-chart-footer"><span><i /> {ecgData.length ? isBeating ? "Live signal" : "Last saved signal" : "Awaiting device data"}</span></div>
                </article>
                <article className="ecg-metric-card ecg-device-card">
                  <div className="ecg-card-top"><span>CURRENT STATUS</span></div>
                  <strong>{displayStatus}</strong>
                  <p>{lastReading ? "Based on the latest received ECG packet." : "Your status will appear when data arrives."}</p>
                </article>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default ECGDashboard;
