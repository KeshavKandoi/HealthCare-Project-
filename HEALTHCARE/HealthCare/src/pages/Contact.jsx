import React from 'react'
import ContactMessage from "../components/Static/ContactMessage/ContactMessage"

function Contact() {
  return (
    <div style={{ background: "#000", minHeight: "100vh" }}>
      {/* HERO */}
      <div style={{ background: "#000", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "80px 60px", textAlign: "center" }}>
        <span style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", padding: "6px 18px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", display: "inline-block", marginBottom: "20px" }}>
          Get In Touch
        </span>
        <h1 style={{ fontSize: "52px", fontWeight: 900, color: "#fff", margin: "0 0 16px", letterSpacing: "-1px" }}>Contact Us</h1>
        <p style={{ fontSize: "17px", color: "rgba(255,255,255,0.45)", maxWidth: "520px", margin: "0 auto", lineHeight: 1.7 }}>
          Our team is available 24/7. Reach out for emergencies, consultations, or general inquiries.
        </p>

        {/* INFO STRIP */}
        <div style={{ display: "flex", justifyContent: "center", gap: "40px", marginTop: "40px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "16px 24px" }}>
            <i className="fa-solid fa-phone-volume" style={{ color: "#ef4444", fontSize: "18px" }}></i>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "4px" }}>Emergency</div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>08043420100</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "16px 24px" }}>
            <i className="fa-solid fa-location-dot" style={{ color: "#ef4444", fontSize: "18px" }}></i>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "4px" }}>Location</div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>Bangalore, India</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "16px 24px" }}>
            <i className="fa-solid fa-heart-pulse" style={{ color: "#ef4444", fontSize: "18px" }}></i>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "4px" }}>Support</div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>24/7 Available</div>
            </div>
          </div>
        </div>
      </div>

      <ContactMessage />
    </div>
  )
}

export default Contact
