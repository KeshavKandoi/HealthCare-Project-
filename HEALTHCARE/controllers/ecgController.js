import ECG from "../models/ecgModel.js";
import { io } from "../server.js";
import { getPool } from "../config/db.js";

const LEGACY_DEMO_PATIENT_ID = "675a1234567890abcdef1234";

async function resolvePatientId(patientId) {
  if (patientId !== LEGACY_DEMO_PATIENT_ID) return patientId;
  const { rows } = await getPool().query("select id from app_users limit 2");
  if (rows.length !== 1) return null;
  return rows[0].id;
}

export const receiveECG = async (req, res) => {
  try {
    const { patientId, values, bpm } = req.body;
    if (typeof patientId !== "string" || !patientId.trim() || !Array.isArray(values) || !values.length || !values.every(value => typeof value === "number" && Number.isFinite(value)) || typeof bpm !== "number" || !Number.isFinite(bpm)) {
      return res.status(400).json({ success: false, message: "patientId, numeric values, and numeric bpm are required." });
    }
    const resolvedPatientId = await resolvePatientId(patientId);
    if (!resolvedPatientId) return res.status(400).json({ success: false, message: "Demo patient ID requires exactly one registered patient. Provide a real patient ID instead." });
    const status = bpm > 120 || bpm < 40 ? "critical" : bpm > 100 ? "abnormal" : "normal";
    const record = await ECG.create({ patientId: resolvedPatientId, values, bpm, status });

    io.to(resolvedPatientId).emit("ecg-data", record);

    if (status === "critical") {
      io.to(resolvedPatientId).emit("alert", { message: "Critical ECG detected!", bpm, status });
    }

    res.status(201).json({ success: true, record });
  } catch (err) {
    res.status(err.code === "23503" ? 400 : 500).json({ success: false, message: err.code === "23503" ? "Patient ID does not match an existing account." : err.message });
  }
};

export const getECGHistory = async (req, res) => {
  try {
    const records = await ECG.find({ patientId: req.params.patientId })
      .sort({ timestamp: -1 })
      .limit(100);
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
