import React from 'react'

const LocationMap = () => {
  return (
    <div style={{ paddingRight: "30px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>Find Us Here</h3>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", margin: 0 }}>Heartline, Bangalore, Karnataka</p>
      </div>
      <div style={{
        borderRadius: "20px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
      }}>
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d47518.19474108496!2d77.54854628172266!3d13.046428972030792!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sin!4v1770666215358!5m2!1sen!2sin"
          width="100%"
          height="420"
          style={{ border: 0, display: "block", filter: "invert(90%) hue-rotate(180deg)" }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {/* Quick info */}
      <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {[
          { icon: "fa-solid fa-clock", label: "Working Hours", value: "10:00am – 10:00pm" },
          { icon: "fa-solid fa-truck-medical", label: "Emergency", value: "24/7 Available" },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "14px", background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "14px 18px" }}>
            <i className={item.icon} style={{ color: "#ef4444", fontSize: "16px", width: "20px", textAlign: "center" }}></i>
            <div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "1px", textTransform: "uppercase" }}>{item.label}</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#fff", marginTop: "2px" }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LocationMap
