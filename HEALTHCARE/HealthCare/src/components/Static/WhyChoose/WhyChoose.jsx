import React from "react";
import "./WhyChoose.css";

import Image1 from "../../../assets/images/hospital/Image1.png";
import Image2 from "../../../assets/images/hospital/Image2.png";
import Image3 from "../../../assets/images/hospital/Image3.png";

function WhyChoose() {
  return (
    <>
      <h1 className="text-center mt-5">Why Choose Us?</h1>

      <div className="container">
        <div className="row why-container text-center mt-4">
          
          {/* Card 1 */}
          <div className="col-md-3">
            <img src={Image1} alt="Personalized Excellence" width="100%" />
            <h2 className="mt-3">Personalized Excellence</h2>
            <p>
              We focus on personalized treatment plans tailored to each patient’s
              unique needs, ensuring the highest quality of care.
            </p>
          </div>
    &nbsp;    &nbsp;    &nbsp;    &nbsp;    &nbsp;
          {/* Card 2 */}
          <div className="col-md-3">
            <img src={Image2} alt="Trusted Care" width="100%" />
            <h2 className="mt-3">Trusted Care</h2>
            <p>
              We provide safe, reliable, and transparent healthcare services you
              can trust.
            </p>
          </div>
          &nbsp;    &nbsp;    &nbsp;    &nbsp;    &nbsp; &nbsp;    &nbsp;    &nbsp;    &nbsp;    &nbsp;
          {/* Card 3 */}
          <div className="col-md-3">
            <img src={Image3} alt="Empowering Wellness Journey" width="100%" />
            <h2 className="mt-3">Empowering Wellness Journey</h2>
            <p>
              We support your complete wellness journey with holistic and
              patient-centered care.
            </p>
          </div>

        </div>
      </div>
    </>
  );
}

export default WhyChoose;
