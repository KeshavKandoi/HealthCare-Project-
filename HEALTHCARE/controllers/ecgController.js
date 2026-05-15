import ECG from "../models/ecgModel.js";
import { io } from "../server.js";

export const receiveECG = async (req, res) => {
  try {
    const { patientId, values, bpm } = req.body;
    const status = bpm > 120 || bpm < 40 ? "critical" : bpm > 100 ? "abnormal" : "normal";
    const record = await ECG.create({ patientId, values, bpm, status });

    console.log("Emitting to room:", patientId);
    console.log("Connected rooms:", io.sockets.adapter.rooms);

    io.emit("ecg-data", { values, bpm, status, timestamp: new Date() });

    if (status === "critical") {
      io.emit("alert", { message: "Critical ECG detected!", bpm, status });
    }

    res.status(201).json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
