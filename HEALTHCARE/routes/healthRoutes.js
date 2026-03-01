import express from "express";
import {
  addHealthRecord,
  getHealthHistory,
} from "../controllers/healthController.js";

const router = express.Router();

// Add health record
router.post("/add", addHealthRecord);

// Get health history by user
router.get("/:userId", getHealthHistory);

export default router;