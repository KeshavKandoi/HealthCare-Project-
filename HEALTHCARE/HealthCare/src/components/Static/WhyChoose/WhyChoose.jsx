import React from "react";
import "./WhyChoose.css";
import Image1 from "../../../assets/images/hospital/Image1.png";
import Image2 from "../../../assets/images/hospital/Image2.png";
import Image3 from "../../../assets/images/hospital/Image3.png";

function WhyChoose() {
  return (
    <section className="why-section">
      <h1>Why Choose Us?</h1>
      <p className="why-subtitle">Trusted by thousands of patients across India</p>
      <div className="why-grid">
        <div className="why-card">
          <img src={Image1} alt="Personalized Excellence" />
          <h2>Personalized Excellence</h2>
          <p>We focus on personalized treatment plans tailored to each patient's unique needs, ensuring the highest quality of care.</p>
        </div>
        <div className="why-card">
          <img src={Image2} alt="Trusted Care" />
          <h2>Trusted Care</h2>
          <p>We provide safe, reliable, and transparent healthcare services you can trust.</p>
        </div>
        <div className="why-card">
          <img src={Image3} alt="Empowering Wellness Journey" />
          <h2>Empowering Wellness Journey</h2>
          <p>We support your complete wellness journey with holistic and patient-centered care.</p>
        </div>
      </div>
    </section>
  );
}
export default WhyChoose;
