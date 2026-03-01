import React, { useState } from "react";

const HealthMonitor = () => {
  const [formData, setFormData] = useState({
    age: "",
    gender: "",
    medicalHistory: "",
    bp: "",
    sugar: "",
    heartRate: "",
    oxygen: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const appData = JSON.parse(localStorage.getItem("appData"));
    const user = appData?.user;
    const token = appData?.token;

    const response = await fetch(
      "http://localhost:4000/api/v1/health/add",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          userId: user._id,
          ...formData,
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      setMessage("Health data saved successfully ");
    } else {
      setMessage("Something went wrong ");
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>Advanced Health Monitor</h2>

      <form onSubmit={handleSubmit}>
        <input type="number" name="age" placeholder="Age" onChange={handleChange} required />
        <br /><br />

        <select name="gender" onChange={handleChange} required>
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
        <br /><br />

        <textarea
  name="medicalHistory"
  placeholder="Enter Medical Issues (e.g., Diabetes, Kidney Problem, Asthma)"
  onChange={handleChange}
  rows="4"
  style={{
    width: "50%",
    padding: "10px",
    fontSize: "16px",
    borderRadius: "5px",
  }}
></textarea>
        <br /><br />

        <input type="number" name="bp" placeholder="Blood Pressure" onChange={handleChange} required />
        <br /><br />

        <input type="number" name="sugar" placeholder="Sugar Level" onChange={handleChange} required />
        <br /><br />

        <input type="number" name="heartRate" placeholder="Heart Rate" onChange={handleChange} required />
        <br /><br />

        <input type="number" name="oxygen" placeholder="Oxygen Level" onChange={handleChange} required />
        <br /><br />

        <button type="submit">Save Health Data</button>
      </form>

      <br />
      <p>{message}</p>
    </div>
  );
};

export default HealthMonitor;