import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const HealthHistory = () => {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const appData = JSON.parse(localStorage.getItem("appData"));
        const user = appData?.user;
        const token = appData?.token;

        if (!user || !token) return;

        const response = await fetch(
          `http://localhost:4000/api/v1/health/${user._id}`,
          {
            headers: {
              Authorization: token,
            },
          }
        );

        const data = await response.json();

        if (data.success) {
          setRecords(data.data);
        }
      } catch (error) {
        console.log("Error fetching history:", error);
      }
    };

    fetchHistory();
  }, []);

  // Format data for charts
  const formattedData = records.map((item) => ({
    ...item,
    date: new Date(item.createdAt).toLocaleDateString(),
  }));

  return (
    <div style={{ padding: "30px" }}>
      <h2>Health History</h2>

      {/* TABLE */}
      <div style={{ overflowX: "auto" }}>
        <table border="1" width="100%" cellPadding="8">
          <thead>
            <tr>
              <th>Date</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Medical History</th>
              <th>BP</th>
              <th>Sugar</th>
              <th>Heart Rate</th>
              <th>Oxygen</th>
              <th>Risk Score</th>
              <th>ICU Risk</th>
              <th>Mental Score</th>
              <th>Mental Level</th>
            </tr>
          </thead>

          <tbody>
            {formattedData.map((item, index) => (
              <tr
                key={index}
                style={{
                  backgroundColor:
                    item.icuRisk === "High"
                      ? "#ffcccc"
                      : item.icuRisk === "Moderate"
                      ? "#fff3cd"
                      : item.mentalLevel === "Severe"
                      ? "#ffe0e0"
                      : "white",
                }}
              >
                <td>{item.date}</td>
                <td>{item.age || "N/A"}</td>
                <td>{item.gender || "N/A"}</td>
                <td>{item.medicalHistory || "None"}</td>
                <td>{item.bp || "N/A"}</td>
                <td>{item.sugar || "N/A"}</td>
                <td>{item.heartRate || "N/A"}</td>
                <td>{item.oxygen || "N/A"}</td>
                <td>{item.riskScore ? item.riskScore + "%" : "N/A"}</td>
                <td>{item.icuRisk || "N/A"}</td>
                <td>{item.mentalScore || "N/A"}</td>
                <td>{item.mentalLevel || "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <br />
      <br />

      {/* 📈 Risk Trend Chart */}
      <h3>Risk Score Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="riskScore" stroke="#ff0000" />
        </LineChart>
      </ResponsiveContainer>

      <br />
      <br />

      {/* 📊 Blood Pressure Chart */}
      <h3>Blood Pressure Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="bp" fill="#007bff" />
        </BarChart>
      </ResponsiveContainer>

      <br />
      <br />

      {/* 🧠 Mental Health Trend */}
      <h3>Mental Health Score Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="mentalScore" stroke="#8e44ad" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HealthHistory;