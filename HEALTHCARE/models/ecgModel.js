import mongoose from "mongoose";

const ecgSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  values: [Number],
  bpm: Number,
  status: { type: String, enum: ["normal", "abnormal", "critical"], default: "normal" },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("ECG", ecgSchema);