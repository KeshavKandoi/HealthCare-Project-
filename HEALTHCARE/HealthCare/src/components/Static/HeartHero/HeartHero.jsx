import React, { useState, useEffect, useRef } from "react";
import "./HeartHero.css";
import heartImg from '../../../assets/heart.png';

const HeartHero = () => {
  return (
    <section className="heart-hero-section">
      <div className="heart-hero-left">
        <span className="hero-tag">Advanced Cardiac Care</span>
        <h1 className="hero-title">
          Your Heart <br />
          <span className="hero-highlight">Deserves</span> The Best
        </h1>
        <p className="hero-desc">
          Real-time ECG monitoring, AI-powered diagnosis, and 24/7 doctor support —
          all from the comfort of your home.
        </p>
        <div className="hero-stats">
          <div className="stat"><span>10K+</span><p>Patients Monitored</p></div>
          <div className="stat"><span>24/7</span><p>Live ECG Support</p></div>
          <div className="stat"><span>98%</span><p>Accuracy Rate</p></div>
        </div>
        <div className="hero-buttons">
          <a href="/ecg-monitor" className="btn-primary">Live ECG Monitor</a>
          <a href="/doctors" className="btn-secondary">Meet Our Doctors</a>
        </div>
      </div>

      <div className="heart-hero-right">
        <div className="heart-container">
          <div className="heart-glow-ring ring1"></div>
          <div className="heart-glow-ring ring2"></div>
          <div className="heart-glow-ring ring3"></div>
          <img src={heartImg} alt="Beating Heart" className="heart-img beating" />
          <div className="bpm-badge">
            <i className="fa-solid fa-heart-pulse"></i>
            <span>72 BPM</span>
            <small>Normal</small>
          </div>
          <div className="ecg-line-wrap">
            <svg viewBox="0 0 400 60" className="ecg-svg">
              <polyline
                className="ecg-path"
                points="0,30 40,30 55,30 60,10 65,50 70,30 100,30 115,30 120,5 125,55 130,30 160,30 175,30 180,8 185,52 190,30 220,30 235,30 240,10 245,50 250,30 280,30 295,30 300,6 305,54 310,30 340,30 355,30 360,9 365,51 370,30 400,30"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeartHero;
