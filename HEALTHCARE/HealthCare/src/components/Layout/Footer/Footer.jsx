import React from 'react'
import './Footer.css'

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <h2>HeartSync</h2>
          <p>Advanced cardiac care powered by technology and compassion. Available 24/7 for you and your family.</p>
        </div>
        <div className="footer-links">
          <h4>Services</h4>
          <a href="/ecg-monitor">ECG Monitor</a>
          <a href="/doctors">Our Doctors</a>
          <a href="/ai-doctor">AI Doctor</a>
          <a href="/subscription">Subscription Plans</a>
        </div>
        <div className="footer-links">
          <h4>Company</h4>
          <a href="/about">About Us</a>
          <a href="/contact">Contact</a>
          <a href="/health-monitor">Health Monitor</a>
        </div>
        <div className="footer-links">
          <h4>Connect</h4>
          <a href="#"><i className="fa-brands fa-instagram"></i> Instagram</a>
          <a href="#"><i className="fa-brands fa-twitter"></i> Twitter</a>
          <a href="#"><i className="fa-brands fa-facebook"></i> Facebook</a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© HeartSync 2026 — All Rights Reserved</p>
        <p style={{fontFamily:"cursive"}}>
          Made with <i className="fas fa-heart" style={{color:"#ef4444"}}></i> from India
        </p>
      </div>
    </footer>
  )
}

export default Footer
