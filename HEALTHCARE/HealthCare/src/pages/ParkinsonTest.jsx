import React, { useState } from "react";
import axios from "axios";

const ParkinsonTest = () => {

  const [result, setResult] = useState("");

  const runDetection = async () => {

    try {

      const response = await axios.get(
        "http://localhost:4000/api/v1/parkinson/detect"
      );

      setResult(response.data.result);

    } catch (error) {

      console.log(error);
      setResult("Error running AI test");

    }

  };

  return (
    <div style={{ padding: "30px" }}>

      <h2>Parkinson Detection AI</h2>

      <button onClick={runDetection}>
        Run AI Detection
      </button>

      <h3>{result}</h3>

    </div>
  );
};

export default ParkinsonTest;
