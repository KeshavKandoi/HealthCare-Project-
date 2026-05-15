import React from 'react'

function Subscription() {
  return (
    <div style={{ fontFamily: "sans-serif", color: "#064d4d" }}>

      {/* HERO */}
      <div style={{ background: "linear-gradient(135deg, #064d4d, #0a7a7a)", color: "white", padding: "70px 60px", textAlign: "center" }}>
        <span style={{ background: "rgba(255,255,255,0.15)", padding: "6px 16px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Pricing Plans</span>
        <h1 style={{ fontSize: "48px", fontWeight: 800, margin: "16px 0 12px" }}>Simple, Honest Pricing</h1>
        <p style={{ fontSize: "17px", opacity: 0.85, maxWidth: "600px", margin: "0 auto" }}>
          One plan. Everything included. Your ECG machine delivered home — start monitoring your heart today.
        </p>
      </div>

      {/* PLANS */}
      <div style={{ padding: "80px 60px", background: "#f8ffff" }}>
        <div style={{ display: "flex", gap: "30px", justifyContent: "center", flexWrap: "wrap", alignItems: "stretch" }}>

          {/* STARTER */}
          <div style={{ background: "white", borderRadius: "24px", padding: "44px 36px", width: "340px", boxShadow: "0 8px 40px rgba(0,0,0,0.08)", border: "2px solid #e0f0f0" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#0a7a7a", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Starter Pack</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", marginBottom: "4px" }}>
              <span style={{ fontSize: "56px", fontWeight: 900, color: "#064d4d", lineHeight: 1 }}>$10</span>
              <span style={{ fontSize: "16px", color: "#888", marginBottom: "12px" }}>one-time</span>
            </div>
            <p style={{ fontSize: "13px", color: "#e53e3e", fontWeight: 600, marginBottom: "28px" }}>Then only $2/month after 2 months</p>
            <div style={{ borderTop: "1px solid #e0f0f0", paddingTop: "24px", marginBottom: "28px" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#064d4d", marginBottom: "16px" }}>WHAT'S INCLUDED:</p>
              {[
                { icon: "fa-solid fa-box", text: "ECG machine delivered to your home" },
                { icon: "fa-solid fa-microchip", text: "AD8232 sensor + ESP32 hardware" },
                { icon: "fa-solid fa-user-doctor", text: "2 months FREE doctor subscription" },
                { icon: "fa-solid fa-heart-pulse", text: "24/7 live ECG monitoring" },
                { icon: "fa-solid fa-comments", text: "Free doctor consultations (2 months)" },
                { icon: "fa-solid fa-brain", text: "AI-powered heart analysis" },
                { icon: "fa-solid fa-bell", text: "Emergency alerts to family & doctor" },
                { icon: "fa-solid fa-chart-line", text: "Heart history dashboard & reports" },
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <i className={f.icon} style={{ color: "#0a7a7a", fontSize: "14px", width: "16px" }}></i>
                  <span style={{ fontSize: "14px", color: "#444" }}>{f.text}</span>
                </div>
              ))}
            </div>
            <a href="/doctors" style={{ display: "block", background: "linear-gradient(135deg, #064d4d, #0a7a7a)", color: "white", padding: "15px", borderRadius: "999px", textAlign: "center", fontWeight: 700, fontSize: "15px", textDecoration: "none" }}>
              Get Started — $10
            </a>
          </div>

          {/* MONTHLY */}
          <div style={{ background: "linear-gradient(160deg, #064d4d, #0a7a7a)", borderRadius: "24px", padding: "44px 36px", width: "340px", boxShadow: "0 20px 60px rgba(6,77,77,0.3)", color: "white", position: "relative" }}>
            <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: "#e53e3e", color: "white", padding: "5px 20px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap" }}>
              AFTER 2 MONTHS
            </div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#7dd3d3", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Ongoing Plan</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", marginBottom: "4px" }}>
              <span style={{ fontSize: "56px", fontWeight: 900, lineHeight: 1 }}>$2</span>
              <span style={{ fontSize: "16px", opacity: 0.7, marginBottom: "12px" }}>/month</span>
            </div>
            <p style={{ fontSize: "13px", color: "#7dd3d3", fontWeight: 600, marginBottom: "28px" }}>Continue full service, cancel anytime</p>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "24px", marginBottom: "28px" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#7dd3d3", marginBottom: "16px" }}>WHAT'S INCLUDED:</p>
              {[
                { icon: "fa-solid fa-heart-pulse", text: "24/7 live ECG monitoring" },
                { icon: "fa-solid fa-comments", text: "Unlimited doctor consultations" },
                { icon: "fa-solid fa-brain", text: "AI heart analysis & reports" },
                { icon: "fa-solid fa-bell", text: "Emergency SOS alerts" },
                { icon: "fa-solid fa-chart-line", text: "Heart history dashboard" },
                { icon: "fa-solid fa-star", text: "Priority doctor response" },
                { icon: "fa-solid fa-file-medical", text: "Monthly heart health report" },
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <i className={f.icon} style={{ color: "#7dd3d3", fontSize: "14px", width: "16px" }}></i>
                  <span style={{ fontSize: "14px", opacity: 0.9 }}>{f.text}</span>
                </div>
              ))}
            </div>
            <a href="/doctors" style={{ display: "block", background: "white", color: "#064d4d", padding: "15px", borderRadius: "999px", textAlign: "center", fontWeight: 700, fontSize: "15px", textDecoration: "none" }}>
              Continue Plan — $2/mo
            </a>
          </div>
        </div>

        {/* DELIVERY BADGES */}
        <div style={{ display: "flex", justifyContent: "center", gap: "50px", marginTop: "60px", flexWrap: "wrap" }}>
          {[
            { icon: "fa-solid fa-truck-fast", title: "Free Home Delivery", desc: "ECG machine shipped to your doorstep within 3-5 business days across India" },
            { icon: "fa-solid fa-headset", title: "Setup Support", desc: "Our team helps you set up via video call — no technical knowledge needed" },
            { icon: "fa-solid fa-rotate-left", title: "30-Day Return", desc: "Not satisfied? Return within 30 days for a full refund, no questions asked" },
            { icon: "fa-solid fa-lock", title: "Cancel Anytime", desc: "No long-term contracts. Cancel your monthly plan whenever you want" },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: "center", maxWidth: "200px" }}>
              <i className={item.icon} style={{ fontSize: "30px", color: "#0a7a7a", marginBottom: "12px", display: "block" }}></i>
              <h5 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "6px" }}>{item.title}</h5>
              <p style={{ fontSize: "13px", color: "#666", lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ padding: "60px", background: "white", maxWidth: "700px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "30px", fontWeight: 800, textAlign: "center", marginBottom: "40px" }}>Frequently Asked Questions</h2>
        {[
          { q: "What is included in the $10 starter pack?", a: "You get the physical ECG machine (AD8232 + ESP32) delivered to your home, plus 2 months of full service — 24/7 ECG monitoring, AI analysis, free doctor consultations, and emergency alerts." },
          { q: "How does the ECG machine work?", a: "You attach small electrode pads to your chest. The AD8232 sensor captures your heart's electrical signals, the ESP32 connects to your WiFi, and streams live data to your NARAYANA dashboard." },
          { q: "What happens after 2 months?", a: "After the free 2-month period, your plan automatically continues at just $2/month. You can cancel anytime before the billing date — no penalties." },
          { q: "What if something critical is detected?", a: "Our AI model instantly detects abnormal ECG patterns. It sends an alert to you, your emergency contact, and your assigned cardiologist within seconds." },
          { q: "Is the ECG machine easy to set up?", a: "Yes. Our team will guide you through setup via video call. Most patients are up and running within 15 minutes of receiving the device." },
        ].map((item, i) => (
          <div key={i} style={{ borderBottom: "1px solid #e0f0f0", padding: "20px 0" }}>
            <h5 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>Q: {item.q}</h5>
            <p style={{ fontSize: "14px", color: "#666", lineHeight: 1.7, margin: 0 }}>A: {item.a}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ background: "linear-gradient(135deg, #e53e3e, #c53030)", padding: "60px", textAlign: "center", color: "white" }}>
        <h2 style={{ fontSize: "36px", fontWeight: 800, margin: "0 0 12px" }}>Start Monitoring Your Heart Today</h2>
        <p style={{ fontSize: "16px", opacity: 0.9, margin: "0 0 8px" }}>Get your ECG machine delivered home for just <strong>$10</strong></p>
        <p style={{ fontSize: "14px", opacity: 0.75, margin: "0 0 28px" }}>Includes 2 months free doctor care. Then $2/month. Cancel anytime.</p>
        <a href="/doctors" style={{ background: "white", color: "#e53e3e", padding: "14px 36px", borderRadius: "999px", fontWeight: 700, fontSize: "16px", textDecoration: "none" }}>Get Your ECG Device — $10</a>
      </div>

    </div>
  )
}

export default Subscription
