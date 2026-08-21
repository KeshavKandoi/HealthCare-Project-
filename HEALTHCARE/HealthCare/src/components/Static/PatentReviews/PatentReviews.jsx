import React from 'react'
import "./PatentReviews.css"
import ReviewData from "./PatentReviews.json"

const PatentReviews = () => {
  return (
    <section className="review-section">
      <div className="review-header">
        <p>Testimonial</p>
        <h1>What Our Patients<br/>Say About Us</h1>
      </div>
      <div className="review-grid">
        {ReviewData.map((d) => (
          <div className="review-card" key={d.id}>
            <img src={d.pic} alt={d.name} />
            <div className="review-name">{d.name}</div>
            <div className="review-address">{d.address}</div>
            <div className="review-stars">
              <i className="fas fa-star"></i>
              <i className="fas fa-star"></i>
              <i className="fas fa-star"></i>
              <i className="fas fa-star"></i>
              <i className="fas fa-star-half-alt"></i>
            </div>
            <div className="review-title">{d.commentTitle}</div>
            <p className="review-desc">{d.commentDescription}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
export default PatentReviews;
