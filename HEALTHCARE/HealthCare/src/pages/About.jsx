import React from 'react'

const s = {
  page:    { background: "#000", color: "#fff", fontFamily: "sans-serif" },
  hero:    { background: "#000", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "100px 60px", textAlign: "center" },
  heroTag: { background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", padding: "6px 18px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", display: "inline-block", marginBottom: "24px" },
  heroH1:  { fontSize: "56px", fontWeight: 900, color: "#fff", margin: "0 0 20px", lineHeight: 1.1, letterSpacing: "-1px" },
  heroP:   { fontSize: "18px", color: "rgba(255,255,255,0.55)", maxWidth: "680px", margin: "0 auto", lineHeight: 1.7 },

  section: { padding: "90px 60px", background: "#000" },
  sectionAlt: { padding: "90px 60px", background: "#050505", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" },

  tag:     { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", padding: "6px 16px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", display: "inline-block", marginBottom: "16px" },
  h2:      { fontSize: "38px", fontWeight: 900, color: "#fff", margin: "0 0 16px", lineHeight: 1.1 },
  p:       { color: "rgba(255,255,255,0.5)", lineHeight: 1.8, fontSize: "16px", margin: "0 0 14px" },

  missionWrap: { display: "flex", alignItems: "center", gap: "70px", maxWidth: "1100px", margin: "0 auto", flexWrap: "wrap" },
  missionImg:  { width: "45%", minWidth: "280px", borderRadius: "20px", objectFit: "cover", border: "1px solid rgba(255,255,255,0.08)", filter: "brightness(0.8)" },

  statsBar: { background: "#0a0a0a", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "60px", display: "flex", justifyContent: "center", gap: "80px", flexWrap: "wrap" },
  statNum:  { fontSize: "44px", fontWeight: 900, color: "#fff", lineHeight: 1 },
  statLbl:  { fontSize: "13px", color: "rgba(255,255,255,0.4)", marginTop: "8px", letterSpacing: "1px" },

  stepsWrap: { display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center", maxWidth: "1100px", margin: "0 auto" },
  stepCard:  { background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "36px 28px", width: "230px", textAlign: "center", transition: "all 0.3s" },
  stepNum:   { fontSize: "11px", fontWeight: 800, color: "rgba(255,255,255,0.25)", letterSpacing: "2px", marginBottom: "14px" },
  stepIcon:  { fontSize: "38px", color: "#ef4444", marginBottom: "18px", display: "block" },
  stepTitle: { fontSize: "16px", fontWeight: 700, color: "#fff", marginBottom: "10px" },
  stepDesc:  { fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7, margin: 0 },

  teamWrap: { display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap", maxWidth: "1000px", margin: "0 auto" },
  docCard:  { background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "28px 22px", width: "210px", textAlign: "center" },
  docImg:   { width: "90px", height: "90px", borderRadius: "50%", objectFit: "cover", marginBottom: "16px", border: "2px solid rgba(255,255,255,0.1)" },
  docName:  { fontSize: "15px", fontWeight: 700, color: "#fff", margin: "0 0 6px" },
  docRole:  { fontSize: "12px", color: "#ef4444", fontWeight: 600, margin: "0 0 4px" },
  docHosp:  { fontSize: "11px", color: "rgba(255,255,255,0.35)", margin: 0 },

  cta:     { background: "#0a0a0a", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "80px 60px", textAlign: "center" },
  ctaH2:   { fontSize: "40px", fontWeight: 900, color: "#fff", margin: "0 0 16px" },
  ctaP:    { fontSize: "17px", color: "rgba(255,255,255,0.5)", margin: "0 0 36px" },
  ctaBtn:  { background: "#ef4444", color: "#fff", padding: "16px 40px", borderRadius: "999px", fontWeight: 700, fontSize: "16px", textDecoration: "none", display: "inline-block", transition: "all 0.3s" },
}

function About() {
  return (
    <div style={s.page}>

      {/* HERO */}
      <div style={s.hero}>
        <div style={s.heroTag}>Advanced Cardiac Care</div>
        <h1 style={s.heroH1}>About HEARTSYNC Hospital</h1>
        <p style={s.heroP}>
          India's most advanced cardiac care platform — combining wearable ECG technology,
          AI diagnosis, and world-class cardiologists for 24/7 heart monitoring.
        </p>
      </div>

      {/* MISSION */}
      <div style={s.section}>
        <div style={s.missionWrap}>
          <img
            src="https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=600&q=80"
            alt="hospital"
            style={s.missionImg}
          />
          <div style={{ flex: 1, minWidth: "280px" }}>
            <div style={s.tag}>Our Mission</div>
            <h2 style={s.h2}>Bringing Hospital-Grade<br/>Care To Your Home</h2>
            <p style={s.p}>HEARTSYNC Hospital was founded with a single vision — make world-class cardiac care accessible to every Indian, regardless of location. We provide wearable ECG devices that stream real-time heart data to our platform, where AI models and specialist doctors monitor your heart 24/7.</p>
            <p style={s.p}>When something is wrong, our system alerts you, your family, and your doctor instantly — so you get help before a crisis becomes a catastrophe.</p>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={s.statsBar}>
        {[
          { number: "10,000+", label: "Patients Monitored" },
          { number: "4",       label: "Top Cardiologists" },
          { number: "24/7",    label: "Live ECG Support" },
          { number: "98%",     label: "Detection Accuracy" },
          { number: "5 min",   label: "Emergency Response" },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={s.statNum}>{stat.number}</div>
            <div style={s.statLbl}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* HOW IT WORKS */}
      <div style={s.sectionAlt}>
        <div style={{ textAlign: "center", marginBottom: "50px" }}>
          <div style={s.tag}>How It Works</div>
          <h2 style={{ ...s.h2, marginTop: "12px" }}>Your Heart, Monitored In 4 Steps</h2>
        </div>
        <div style={s.stepsWrap}>
          {[
            { step: "01", icon: "fa-solid fa-box-heart",   title: "Get Your ECG Device", desc: "Subscribe and receive your wearable AD8232 ECG device powered by ESP32 delivered to your home." },
            { step: "02", icon: "fa-solid fa-heart-pulse", title: "Wear & Monitor",       desc: "Attach the electrodes and wear the device. It streams your live ECG data to our platform in real time." },
            { step: "03", icon: "fa-solid fa-brain",       title: "AI Analysis",          desc: "Our CNN and LSTM models analyze your heart rhythm and detect arrhythmia, abnormal BPM, and risk patterns." },
            { step: "04", icon: "fa-solid fa-bell",        title: "Instant Alerts",       desc: "If something critical is detected, you, your emergency contact, and your assigned doctor are alerted immediately." },
          ].map((item, i) => (
            <div key={i} style={s.stepCard}>
              <div style={s.stepNum}>{item.step}</div>
              <i className={item.icon} style={s.stepIcon}></i>
              <h4 style={s.stepTitle}>{item.title}</h4>
              <p style={s.stepDesc}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* TEAM */}
      <div style={s.section}>
        <div style={{ textAlign: "center", marginBottom: "50px" }}>
          <div style={s.tag}>Our Doctors</div>
          <h2 style={{ ...s.h2, marginTop: "12px" }}>World-Class Cardiologists</h2>
        </div>
        <div style={s.teamWrap}>
          {[
            { name: "Dr. Devi Shetty",     role: "Cardiothoracic Surgeon",            hospital: "HeartSync Health, Bangalore",    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3fSZ6VNO9G5I0BeJ6iEBblDqRaaORnpfSHw&s" },
            { name: "Dr. Ramakanta Panda", role: "Cardiothoracic & Vascular Surgeon", hospital: "Asian Heart Institute, Mumbai",  img: "https://upload.wikimedia.org/wikipedia/commons/7/76/Dr._Ramakanta_Panda.jpg" },
            { name: "Dr. Rajesh Sharma",   role: "Interventional Cardiologist",       hospital: "AIIMS, New Delhi",              img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmgtKqc_hKmFRu0VXmpE1Y8DWl5Yk6BLqhXw&s" },
            { name: "Dr. Priya Nair",      role: "Cardiac Electrophysiologist",       hospital: "HeartSync Health, Bangalore",    img: "https://images1-fabric.practo.com/doctor/785896/dr-priya-r-nair-5f40e6306a702.jpeg" },
          ].map((doc, i) => (
            <div key={i} style={s.docCard}>
              <img src={doc.img} alt={doc.name} style={s.docImg} />
              <h5 style={s.docName}>{doc.name}</h5>
              <p style={s.docRole}>{doc.role}</p>
              <p style={s.docHosp}>{doc.hospital}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={s.cta}>
        <h2 style={s.ctaH2}>Start Monitoring Your Heart Today</h2>
        <p style={s.ctaP}>Get your ECG machine delivered home and start 24/7 cardiac monitoring with AI and specialist doctors.</p>
        <a href="/doctors" style={s.ctaBtn}>Book a Consultation</a>
      </div>

    </div>
  )
}

export default About
