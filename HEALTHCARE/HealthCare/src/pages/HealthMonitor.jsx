import React, { useState } from "react";

const HealthMonitor = () => {
  const [formData, setFormData] = useState({
    age: "", gender: "", medicalHistory: "", bp: "", sugar: "", heartRate: "", oxygen: "",
  });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const appData = JSON.parse(localStorage.getItem("appData"));
    const user = appData?.user;
    const token = appData?.token;

    const response = await fetch("http://localhost:4000/api/v1/health/add", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token },
      body: JSON.stringify({ userId: user._id, ...formData }),
    });

    const data = await response.json();
    setMessage(data.success ? "Health data saved successfully ✅" : "Something went wrong ⚠️");
  };

  return (
    <div style={{ padding: '50px 40px', maxWidth: 560, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 24 }}>Advanced Health Monitor</h2>

      <form onSubmit={handleSubmit} className="card-ds">
        <input className="input-ds" type="number" name="age" placeholder="Age" onChange={handleChange} required />

        <select className="input-ds" name="gender" onChange={handleChange} required defaultValue="">
          <option value="" disabled>Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <textarea
          className="input-ds"
          name="medicalHistory"
          placeholder="Enter Medical Issues (e.g., Diabetes, Kidney Problem, Asthma)"
          onChange={handleChange}
          rows="4"
        />

        <input className="input-ds" type="number" name="bp" placeholder="Blood Pressure" onChange={handleChange} required />
        <input className="input-ds" type="number" name="sugar" placeholder="Sugar Level" onChange={handleChange} required />
        <input className="input-ds" type="number" name="heartRate" placeholder="Heart Rate" onChange={handleChange} required />
        <input className="input-ds" type="number" name="oxygen" placeholder="Oxygen Level" onChange={handleChange} required style={{ marginBottom: 24 }} />

        <button type="submit" className="btn-ds btn-ds-primary" style={{ width: '100%', justifyContent: 'center' }}>
          Save Health Data
        </button>
      </form>

      {message && <p style={{ marginTop: 16, color: '#fff' }}>{message}</p>}
    </div>
  );
};

export default HealthMonitor;
