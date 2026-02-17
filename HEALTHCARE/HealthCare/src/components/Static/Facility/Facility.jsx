import React from "react";
import "./Facility.css";
import FacilityData from "./FacilityData.json";

const Facility = () => {
  return (
    <>
      <h2 className="FacilityHeading">Facilities</h2>

      <div className="facility-container">
        {FacilityData.map((d, i) => (
          <div className="facility-card" key={i}>
            <i className={d.icon}></i>
            <p>{d.title}</p>
          </div>
        ))}
      </div>
    </>
  );
};

export default Facility;
