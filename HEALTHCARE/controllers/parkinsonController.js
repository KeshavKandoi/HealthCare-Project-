const axios = require("axios");

async function detectParkinson(req, res) {

  try {

    const response = await axios.get(
      "http://127.0.0.1:8000/predict/parkinson"
    );

    res.json(response.data);

  } catch (error) {

    res.status(500).json({
      message: "AI server error"
    });

  }

}

module.exports = { detectParkinson };
