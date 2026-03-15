import express from "express";
import multer from "multer";
import {
  detectSpiral,
  detectWave,
  detectVoice,
  detectGait,
} from "../controllers/parkinson_controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/detect/spiral", upload.single("file"), detectSpiral);
router.post("/detect/wave",   upload.single("file"), detectWave);
router.post("/detect/voice",  upload.single("file"), detectVoice);
router.post("/detect/gait",   upload.single("file"), detectGait);

export default router;