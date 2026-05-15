import React, { useState } from 'react'

function About() {
  const [selected, setSelected] = useState(null)

  return (
    <div style={{ fontFamily: "sans-serif", color: "#064d4d" }}>

      {/* HERO */}
      <div style={{ background: "linear-gradient(135deg, #064d4d, #0a7a7a)", color: "white", padding: "80px 60px", textAlign: "center" }}>
        <h1 style={{ fontSize: "48px", fontWeight: 800, margin: 0 }}>About NARAYANA Hospital</h1>
        <p style={{ fontSize: "18px", marginTop: "16px", opacity: 0.85, maxWidth: "700px", margin: "16px auto 0" }}>
          India's most advanced cardiac care platform — combining wearable ECG technology, AI diagnosis, and world-class cardiologists for 24/7 heart monitoring.
        </p>
      </div>

      {/* MISSION */}
      <div style={{ display: "flex", alignItems: "center", gap: "60px", padding: "80px 60px", background: "#f8ffff", flexWrap: "wrap" }}>
        <img src="https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=600&q=80" alt="hospital" style={{ width: "45%", minWidth: "280px", borderRadius: "16px", boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }} />
        <div style={{ flex: 1, minWidth: "280px" }}>
          <span style={{ background: "#e0f5f5", color: "#0a7a7a", padding: "6px 16px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Our Mission</span>
          <h2 style={{ fontSize: "36px", fontWeight: 800, margin: "16px 0" }}>Bringing Hospital-Grade<br/>Care To Your Home</h2>
          <p style={{ color: "#555", lineHeight: 1.8, fontSize: "16px" }}>NARAYANA Hospital was founded with a single vision — make world-class cardiac care accessible to every Indian, regardless of location. We provide wearable ECG devices that stream real-time heart data to our platform, where AI models and specialist doctors monitor your heart 24/7.</p>
          <p style={{ color: "#555", lineHeight: 1.8, fontSize: "16px", marginTop: "12px" }}>When something is wrong, our system alerts you, your family, and your doctor instantly — so you get help before a crisis becomes a catastrophe.</p>
        </div>
      </div>

      {/* STATS */}
      <div style={{ background: "linear-gradient(135deg, #064d4d, #0a7a7a)", padding: "60px", display: "flex", justifyContent: "center", gap: "80px", flexWrap: "wrap" }}>
        {[
          { number: "10,000+", label: "Patients Monitored" },
          { number: "4", label: "Top Cardiologists" },
          { number: "24/7", label: "Live ECG Support" },
          { number: "98%", label: "Detection Accuracy" },
          { number: "5 min", label: "Emergency Response" },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center", color: "white" }}>
            <div style={{ fontSize: "42px", fontWeight: 800 }}>{s.number}</div>
            <div style={{ fontSize: "14px", opacity: 0.8, marginTop: "6px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* HOW IT WORKS */}
      <div style={{ padding: "80px 60px", background: "#fff" }}>
        <div style={{ textAlign: "center", marginBottom: "50px" }}>
          <span style={{ background: "#e0f5f5", color: "#0a7a7a", padding: "6px 16px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>How It Works</span>
          <h2 style={{ fontSize: "36px", fontWeight: 800, marginTop: "16px" }}>Your Heart, Monitored In 4 Steps</h2>
        </div>
        <div style={{ display: "flex", gap: "30px", flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { step: "01", icon: "fa-solid fa-box-heart", title: "Get Your ECG Device", desc: "Subscribe and receive your wearable AD8232 ECG device powered by ESP32 delivered to your home." },
            { step: "02", icon: "fa-solid fa-heart-pulse", title: "Wear & Monitor", desc: "Attach the electrodes and wear the device. It streams your live ECG data to our platform in real time." },
            { step: "03", icon: "fa-solid fa-brain", title: "AI Analysis", desc: "Our CNN and LSTM models analyze your heart rhythm and detect arrhythmia, abnormal BPM, and risk patterns." },
            { step: "04", icon: "fa-solid fa-bell", title: "Instant Alerts", desc: "If something critical is detected, you, your emergency contact, and your assigned doctor are alerted immediately." },
          ].map((item, i) => (
            <div key={i} style={{ background: "#f8ffff", borderRadius: "16px", padding: "32px", width: "220px", textAlign: "center", border: "1px solid #e0f0f0" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#0a7a7a", marginBottom: "12px" }}>{item.step}</div>
              <i className={item.icon} style={{ fontSize: "36px", color: "#e53e3e", marginBottom: "16px", display: "block" }}></i>
              <h4 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "10px" }}>{item.title}</h4>
              <p style={{ fontSize: "14px", color: "#666", lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SUBSCRIPTION PLANS */}
      <div style={{ padding: "80px 60px", background: "linear-gradient(180deg, #f0f9f9, #fff)" }}>
        <div style={{ textAlign: "center", marginBottom: "50px" }}>
          <span style={{ background: "#e0f5f5", color: "#0a7a7a", padding: "6px 16px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Pricing</span>
          <h2 style={{ fontSize: "36px", fontWeight: 800, marginTop: "16px" }}>Simple, Transparent Pricing</h2>
          <p style={{ color: "#666", fontSize: "16px", maxWidth: "560px", margin: "12px auto 0" }}>One plan, everything included. Get your ECG machine delivered home and start monitoring your heart today.</p>
        </div>

        <div style={{ display: "flex", gap: "30px", justifyContent: "center", flexWrap: "wrap", alignItems: "stretch" }}>

          {/* STARTER PLAN */}
          <div style={{ background: "white", borderRadius: "24px", padding: "40px 36px", width: "320px", boxShadow: "0 8px 40px rgba(0,0,0,0.08)", border: "2px solid #e0f0f0", position: "relative" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0a7a7a", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Starter Pack</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", marginBottom: "6px" }}>
              <span style={{ fontSize: "52px", fontWeight: 900, color: "#064d4d", lineHeight: 1 }}>$10</span>
              <span style={{ fontSize: "16px", color: "#888", marginBottom: "10px" }}>one-time</span>
            </div>
            <p style={{ fontSize: "13px", color: "#e53e3e", fontWeight: 600, marginBottom: "24px" }}>Then only $2/month after 2 months</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                "✅ ECG Machine delivered to your home",
                "✅ AD8232 sensor + ESP32 hardware",
                "✅ 2 months FREE doctor subscription",
                "✅ 24/7 Live ECG monitoring",
                "✅ Free doctor consultations (2 months)",
                "✅ AI-powered heart analysis",
                "✅ Emergency alerts to family & doctor",
                "✅ Real-time ECG dashboard access",
                "✅ Heart health history & reports",
              ].map((f, i) => (
                <li key={i} style={{ fontSize: "14px", color: "#444", lineHeight: 1.5 }}>{f}</li>
              ))}
            </ul>
            <a href="/doctors" style={{ display: "block", background: "linear-gradient(135deg, #064d4d, #0a7a7a)", color: "white", padding: "14px", borderRadius: "999px", textAlign: "center", fontWeight: 700, fontSize: "15px", textDecoration: "none" }}>Get Started — $10</a>
          </div>

          {/* MONTHLY PLAN */}
          <div style={{ background: "linear-gradient(135deg, #064d4d, #0a7a7a)", borderRadius: "24px", padding: "40px 36px", width: "320px", boxShadow: "0 20px 60px rgba(6,77,77,0.3)", position: "relative", color: "white" }}>
            <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: "#e53e3e", color: "white", padding: "4px 20px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap" }}>AFTER 2 MONTHS</div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#7dd3d3", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Ongoing Plan</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", marginBottom: "6px" }}>
              <span style={{ fontSize: "52px", fontWeight: 900, lineHeight: 1 }}>$2</span>
              <span style={{ fontSize: "16px", opacity: 0.7, marginBottom: "10px" }}>/month</span>
            </div>
            <p style={{ fontSize: "13px", color: "#7dd3d3", fontWeight: 600, marginBottom: "24px" }}>Continue full service, cancel anytime</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                "✅ 24/7 Live ECG monitoring",
                "✅ Unlimited doctor consultations",
                "✅ AI heart analysis & reports",
                "✅ Emergency SOS alerts",
                "✅ Heart history dashboard",
                "✅ Priority doctor response",
                "✅ Monthly heart health report",
                "❌ Hardware not included",
              ].map((f, i) => (
                <li key={i} style={{ fontSize: "14px", opacity: 0.9, lineHeight: 1.5 }}>{f}</li>
              ))}
            </ul>
            <a href="/doctors" style={{ display: "block", background: "white", color: "#064d4d", padding: "14px", borderRadius: "999px", textAlign: "center", fontWeight: 700, fontSize: "15px", textDecoration: "none" }}>Continue Plan — $2/mo</a>
          </div>

        </div>

        {/* DELIVERY INFO */}
        <div style={{ display: "flex", justifyContent: "center", gap: "40px", marginTop: "50px", flexWrap: "wrap" }}>
          {[
            { icon: "fa-solid fa-truck-fast", title: "Free Home Delivery", desc: "ECG machine shipped to your doorstep within 3-5 business days across India" },
            { icon: "fa-solid fa-headset", title: "Setup Support", desc: "Our team helps you set up the device via video call — no technical knowledge needed" },
            { icon: "fa-solid fa-rotate-left", title: "30-Day Return", desc: "Not satisfied? Return the device within 30 days for a full refund, no questions asked" },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: "center", maxWidth: "220px" }}>
              <i className={item.icon} style={{ fontSize: "32px", color: "#0a7a7a", marginBottom: "12px", display: "block" }}></i>
              <h5 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "8px" }}>{item.title}</h5>
              <p style={{ fontSize: "13px", color: "#666", lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* TEAM */}
      <div style={{ padding: "80px 60px", background: "#f8ffff" }}>
        <div style={{ textAlign: "center", marginBottom: "50px" }}>
          <span style={{ background: "#e0f5f5", color: "#0a7a7a", padding: "6px 16px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Our Doctors</span>
          <h2 style={{ fontSize: "36px", fontWeight: 800, marginTop: "16px" }}>World-Class Cardiologists</h2>
        </div>
        <div style={{ display: "flex", gap: "30px", justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { name: "Dr. Devi Shetty", role: "Cardiothoracic Surgeon", hospital: "Narayana Health, Bangalore", img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3fSZ6VNO9G5I0BeJ6iEBblDqRaaORnpfSHw&s" },
            { name: "Dr. Ramakanta Panda", role: "Cardiothoracic & Vascular Surgeon", hospital: "Asian Heart Institute, Mumbai", img: "https://upload.wikimedia.org/wikipedia/commons/7/76/Dr._Ramakanta_Panda.jpg" },
            { name: "Dr. Rajesh Sharma", role: "Interventional Cardiologist", hospital: "AIIMS, New Delhi", img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmgtKqc_hKmFRu0VXmpE1Y8DWl5Yk6BLqhXw&s" },
            { name: "Dr. Priya Nair", role: "Cardiac Electrophysiologist", hospital: "Narayana Health, Bangalore", img: "https://images1-fabric.practo.com/doctor/785896/dr-priya-r-nair-5f40e6306a702.jpeg" },
          ].map((doc, i) => (
            <div key={i} style={{ background: "white", borderRadius: "16px", padding: "24px", width: "200px", textAlign: "center", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}>
              <img src={doc.img} alt={doc.name} style={{ width: "90px", height: "90px", borderRadius: "50%", objectFit: "cover", marginBottom: "14px", border: "3px solid #e0f5f5" }} />
              <h5 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 6px" }}>{doc.name}</h5>
              <p style={{ fontSize: "12px", color: "#0a7a7a", fontWeight: 600, margin: "0 0 4px" }}>{doc.role}</p>
              <p style={{ fontSize: "11px", color: "#888", margin: 0 }}>{doc.hospital}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: "linear-gradient(135deg, #e53e3e, #c53030)", padding: "60px", textAlign: "center", color: "white" }}>
        <h2 style={{ fontSize: "36px", fontWeight: 800, margin: "0 0 16px" }}>Start Monitoring Your Heart Today</h2>
        <p style={{ fontSize: "17px", opacity: 0.9, margin: "0 0 10px" }}>Get your ECG machine delivered home for just <strong>$10</strong> — includes 2 months free doctor care.</p>
        <p style={{ fontSize: "14px", opacity: 0.75, margin: "0 0 30px" }}>After 2 months, continue for only $2/month. Cancel anytime.</p>
        <a href="/doctors" style={{ background: "white", color: "#e53e3e", padding: "14px 36px", borderRadius: "999px", fontWeight: 700, fontSize: "16px", textDecoration: "none" }}>Get Your ECG Device — $10</a>
      </div>

    </div>
  )
}

export default About
