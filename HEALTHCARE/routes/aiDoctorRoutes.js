import express from "express";
import upload from "../middlewares/multer.js";
import { aiDoctor } from "../controllers/aiDoctorController.js";
import { patientAuth } from "../middlewares/ecgAuth.js";

const router = express.Router();

router.post("/chat", patientAuth, (req,res,next) => process.env.ENABLE_EXPERIMENTAL_AI === "true" ? next() : res.status(503).json({error:"Experimental AI is disabled. Clinical validation and privacy controls are pending."}), upload.single("image"), aiDoctor);

export default router;
