import mongoose from "mongoose";

const healthRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    age: Number,
    gender: String,
    medicalHistory: String,
    bp: Number,
    sugar: Number,
    heartRate: Number,
    oxygen: Number,
    riskScore: Number,
    icuRisk: String,
    confidence: Number,
  },
  { timestamps: true }
);

export default mongoose.model("HealthRecord", healthRecordSchema);