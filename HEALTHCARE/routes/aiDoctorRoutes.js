import express from "express";
import upload from "../middlewares/multer.js";
import { aiDoctor } from "../controllers/aiDoctorController.js";
import { patientAuth } from "../middlewares/ecgAuth.js";

const router = express.Router();

// Heartline Companion is available to signed-in accounts whenever GEMINI_API_KEY is configured.
router.post("/chat", patientAuth, upload.single("image"), aiDoctor);

export default router;
