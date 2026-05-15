import express from "express";
import { receiveECG, getECGHistory } from "../controllers/ecgController.js";

const router = express.Router();

router.post("/data", receiveECG);               // ESP32 posts here
router.get("/history/:patientId", getECGHistory); // frontend fetches here

export default router;