import express from "express"
import { checkMentalHealth } from "../controllers/mentalHealthController.js"

const router = express.Router()

router.post("/check",checkMentalHealth)

export default router