import React from "react";
import "./ShortIntro.css";
import hos from "../../../assets/images/hospital/hos.jpg";

const ShortIntro = () => {
  return (
    <>
      <div className="container intro-container">
        <div className="row align-items-center">
          <div className="col-md-6 img-container">
            <img src={hos} alt="hospital" className="hos-image" />
          </div>

          <div className="col-md-6 info-container">
            <h1> KANDOI &nbsp; HOSPITAL </h1>
            <br/>

            <p>
              Kandoi Hospital is a trusted healthcare center committed to
              providing quality medical services with care and compassion. We
              offer modern facilities, experienced doctors, and patient-focused
              treatment to ensure the best health outcomes.
            </p>
           <br/>
            <p>
              Kandoi Hospital stands as a symbol of excellence in healthcare,
              offering comprehensive medical services across multiple
              specialties. With state-of-the-art infrastructure and a skilled
              medical team, we focus on personalized patient care.
            </p>
            <br/>
            <button className="btn btn-primary">
              Book an Appointment
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShortIntro;
