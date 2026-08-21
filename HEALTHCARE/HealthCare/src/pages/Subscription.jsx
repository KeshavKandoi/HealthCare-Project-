import React from 'react'
import './Subscription.css'

function Subscription() {
  return (
    <div className="sub-page">
      <div className="sub-hero">
        <span className="sub-hero-tag">Pricing Plans</span>
        <h1>Simple, Honest Pricing</h1>
        <p>One plan. Everything included. Your ECG machine delivered home — start monitoring your heart today.</p>
      </div>

      <div className="sub-plans-section">
        <div className="sub-plans-grid">
          <div className="sub-card sub-card-starter">
            <div className="sub-plan-label" style={{ color: '#0a7a7a' }}>Starter Pack</div>
            <div className="sub-price-row">
              <span className="sub-price" style={{ color: '#064d4d' }}>$10</span>
              <span className="sub-price-unit" style={{ color: '#888' }}>one-time</span>
            </div>
            <p className="sub-subtext" style={{ color: '#e53e3e' }}>Then only $2/month after 2 months</p>
            <div className="sub-features" style={{ borderTop: '1px solid #e0f0f0' }}>
              <p className="sub-features-title" style={{ color: '#064d4d' }}>WHAT'S INCLUDED:</p>
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
                <div key={i} className="sub-feature-row">
                  <i className={f.icon} style={{ color: '#0a7a7a' }}></i>
                  <span style={{ color: '#444' }}>{f.text}</span>
                </div>
              ))}
            </div>
            <a href="/doctors" className="sub-cta-btn" style={{ background: 'linear-gradient(135deg, #064d4d, #0a7a7a)', color: 'white' }}>
              Get Started — $10
            </a>
          </div>

          <div className="sub-card sub-card-monthly">
            <div className="sub-badge-top">AFTER 2 MONTHS</div>
            <div className="sub-plan-label" style={{ color: '#7dd3d3' }}>Ongoing Plan</div>
            <div className="sub-price-row">
              <span className="sub-price">$2</span>
              <span className="sub-price-unit">/month</span>
            </div>
            <p className="sub-subtext" style={{ color: '#7dd3d3' }}>Continue full service, cancel anytime</p>
            <div className="sub-features" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <p className="sub-features-title" style={{ color: '#7dd3d3' }}>WHAT'S INCLUDED:</p>
              {[
                { icon: "fa-solid fa-heart-pulse", text: "24/7 live ECG monitoring" },
                { icon: "fa-solid fa-comments", text: "Unlimited doctor consultations" },
                { icon: "fa-solid fa-brain", text: "AI heart analysis & reports" },
                { icon: "fa-solid fa-bell", text: "Emergency SOS alerts" },
                { icon: "fa-solid fa-chart-line", text: "Heart history dashboard" },
                { icon: "fa-solid fa-star", text: "Priority doctor response" },
                { icon: "fa-solid fa-file-medical", text: "Monthly heart health report" },
              ].map((f, i) => (
                <div key={i} className="sub-feature-row">
                  <i className={f.icon} style={{ color: '#7dd3d3' }}></i>
                  <span style={{ opacity: 0.9 }}>{f.text}</span>
                </div>
              ))}
            </div>
            <a href="/doctors" className="sub-cta-btn" style={{ background: 'white', color: '#064d4d' }}>
              Continue Plan — $2/mo
            </a>
          </div>
        </div>

        <div className="sub-badges-grid">
          {[
            { icon: "fa-solid fa-truck-fast", title: "Free Home Delivery", desc: "ECG machine shipped to your doorstep within 3-5 business days across India" },
            { icon: "fa-solid fa-headset", title: "Setup Support", desc: "Our team helps you set up via video call — no technical knowledge needed" },
            { icon: "fa-solid fa-rotate-left", title: "30-Day Return", desc: "Not satisfied? Return within 30 days for a full refund, no questions asked" },
            { icon: "fa-solid fa-lock", title: "Cancel Anytime", desc: "No long-term contracts. Cancel your monthly plan whenever you want" },
          ].map((item, i) => (
            <div key={i} className="sub-badge-item">
              <i className={item.icon}></i>
              <h5>{item.title}</h5>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="sub-faq-section">
        <div className="sub-faq-inner">
          <h2>Frequently Asked Questions</h2>
          {[
            { q: "What is included in the $10 starter pack?", a: "You get the physical ECG machine (AD8232 + ESP32) delivered to your home, plus 2 months of full service — 24/7 ECG monitoring, AI analysis, free doctor consultations, and emergency alerts." },
            { q: "How does the ECG machine work?", a: "You attach small electrode pads to your chest. The AD8232 sensor captures your heart's electrical signals, the ESP32 connects to your WiFi, and streams live data to your HeartSync dashboard." },
            { q: "What happens after 2 months?", a: "After the free 2-month period, your plan automatically continues at just $2/month. You can cancel anytime before the billing date — no penalties." },
            { q: "What if something critical is detected?", a: "Our AI model instantly detects abnormal ECG patterns. It sends an alert to you, your emergency contact, and your assigned cardiologist within seconds." },
            { q: "Is the ECG machine easy to set up?", a: "Yes. Our team will guide you through setup via video call. Most patients are up and running within 15 minutes of receiving the device." },
          ].map((item, i) => (
            <div key={i} className="sub-faq-item">
              <h5>Q: {item.q}</h5>
              <p>A: {item.a}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="sub-cta-section">
        <h2>Start Monitoring Your Heart Today</h2>
        <p>Get your ECG machine delivered home for just <strong>$10</strong></p>
        <p style={{ opacity: 0.75, fontSize: 13 }}>Includes 2 months free doctor care. Then $2/month. Cancel anytime.</p>
        <a href="/doctors">Get Your ECG Device — $10</a>
      </div>
    </div>
  )
}

export default Subscription
