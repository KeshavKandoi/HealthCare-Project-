import React from "react";
import "./ShortIntro.css";
import hos from "../../../assets/images/hospital/hos.jpg";

const ShortIntro = () => {
  return (
    <section className="intro-section">
      <div className="intro-inner">
        <div className="intro-img">
          <img src={hos} alt="hospital" />
        </div>
        <div className="intro-text">
          <span className="intro-tag">About Us</span>
          <h1>HEARTSYNC</h1>
          <p>HEARTSYNC Hospital is a trusted healthcare center committed to providing quality medical services with care and compassion. We offer modern facilities, experienced doctors, and patient-focused treatment to ensure the best health outcomes.</p>
          <p>We stand as a symbol of excellence in healthcare, offering comprehensive medical services across multiple specialties with state-of-the-art infrastructure and a skilled medical team focused on personalized patient care.</p>
          <a href="/doctors" className="intro-btn">Book an Appointment</a>
        </div>
      </div>
    </section>
  );
};
export default ShortIntro;
