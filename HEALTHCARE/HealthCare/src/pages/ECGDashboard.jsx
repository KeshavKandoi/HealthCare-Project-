import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, LineElement, CategoryScale,
  LinearScale, PointElement, Filler
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Filler);

const socket = io("http://localhost:4000");

const ECGDashboard = ({ patientId = "675a1234567890abcdef1234" }) => {
  const [ecgData, setEcgData] = useState(Array(100).fill(0));
  const [bpm, setBpm] = useState(0);
  const [status, setStatus] = useState("normal");
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    socket.emit("join-patient", patientId);
    socket.on("ecg-data", (data) => {
      setEcgData(prev => [...prev.slice(-99), ...data.values].slice(-100));
      setBpm(data.bpm);
      setStatus(data.status);
    });
    socket.on("alert", (data) => {
      setAlert(data.message);
      setTimeout(() => setAlert(null), 5000);
    });
    return () => { socket.off("ecg-data"); socket.off("alert"); };
  }, [patientId]);

  const color = status === "critical" ? "#ef4444" : status === "abnormal" ? "#f59e0b" : "#22c55e";

  return (
    <div style={{ padding: "2rem", background: "#0f172a", minHeight: "100vh", color: "#fff" }}>
      {alert && (
        <div style={{ background: "#ef4444", padding: "1rem", borderRadius: "8px",
          marginBottom: "1rem", fontWeight: "bold", fontSize: "1.1rem" }}>
           {alert}
        </div>
      )}
      <h2 style={{ color, marginBottom: "0.5rem" }}>Live ECG Monitor</h2>
      <div style={{ fontSize: "3rem", fontWeight: "bold", color, marginBottom: "1rem" }}>
        {bpm} BPM
        <span style={{ fontSize: "1rem", marginLeft: "1rem", background: color + "33",
          padding: "4px 14px", borderRadius: "999px" }}>
          {status.toUpperCase()}
        </span>
      </div>
      <div style={{ background: "#1e293b", borderRadius: "12px", padding: "1rem" }}>
        <Line data={{
          labels: ecgData.map((_, i) => i),
          datasets: [{ data: ecgData, borderColor: color, borderWidth: 2,
            fill: true, backgroundColor: color + "22", tension: 0.3, pointRadius: 0 }]
        }} options={{
          animation: false,
          scales: {
            x: { display: false },
            y: { ticks: { color: "#94a3b8" }, grid: { color: "#ffffff11" } }
          },
          plugins: { legend: { display: false } }
        }} />
      </div>
    </div>
  );
};

export default ECGDashboard;
