import express from "express"
import axios from "axios"

const router = express.Router()

router.get("/detect", async (req, res) => {

  try {

    const response = await axios.get(
      "http://127.0.0.1:8000/predict/parkinson"
    )

    res.json(response.data)

  } catch (error) {

    console.log(error.message)

    res.status(500).json({
      message: "AI server error"
    })

  }

})

export default router
