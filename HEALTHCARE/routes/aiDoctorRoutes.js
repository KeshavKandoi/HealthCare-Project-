import express from "express";
import upload from "../middlewares/multer.js";
import { aiDoctor } from "../controllers/aiDoctorController.js";

const router = express.Router();

router.post("/chat", upload.single("image"), aiDoctor);

export default router;
