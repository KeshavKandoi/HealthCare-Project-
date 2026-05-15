import React, { useState, useEffect, useRef } from "react";
import "./Facility.css";
import FacilityData from "./FacilityData.json";

const Facility = () => {
  const [selected, setSelected] = useState(null);
  const [visible, setVisible] = useState([]);
  const cardRefs = useRef([]);

  useEffect(() => {
    const observers = FacilityData.map((_, i) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible(prev => [...new Set([...prev, i])]);
          }
        },
        { threshold: 0.2 }
      );
      if (cardRefs.current[i]) observer.observe(cardRefs.current[i]);
      return observer;
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  return (
    <section className="facility-section">
      <div className="facility-header">
        <span className="facility-tag">Our Specialties</span>
        <h2 className="FacilityHeading">Heart Care Services</h2>
        <p className="facility-subtitle">
          Advanced cardiac care powered by technology and compassion
        </p>
        <div className="facility-divider">
          <span></span><i className="fa-solid fa-heart-pulse"></i><span></span>
        </div>
      </div>

      <div className="facility-container">
        {FacilityData.map((d, i) => (
          <div
            className={`facility-card ${visible.includes(i) ? "animate-in" : ""} ${selected === i ? "expanded" : ""}`}
            key={i}
            ref={el => cardRefs.current[i] = el}
            onClick={() => setSelected(selected === i ? null : i)}
            style={{ animationDelay: `${(i % 4) * 0.1}s` }}
          >
            <div className="card-image-wrap">
              <img src={d.image} alt={d.title} className="card-img" />
              <div className="card-overlay"></div>
              <div className="card-icon-wrap">
                <i className={d.icon}></i>
              </div>
            </div>
            <div className="card-body">
              <h3 className="card-title">{d.title}</h3>
              <div className={`card-desc ${selected === i ? "show" : ""}`}>
                <p>{d.description}</p>
                <button className="card-btn">Learn More</button>
              </div>
              <div className="card-arrow">
                <i className={`fa-solid fa-chevron-${selected === i ? "up" : "down"}`}></i>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected !== null && (
        <div className="facility-modal" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <img src={FacilityData[selected].image} alt={FacilityData[selected].title} className="modal-img" />
            <div className="modal-body">
              <i className={`${FacilityData[selected].icon} modal-icon`}></i>
              <h2>{FacilityData[selected].title}</h2>
              <p>{FacilityData[selected].description}</p>
              <button className="modal-btn">Book Consultation</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Facility;
