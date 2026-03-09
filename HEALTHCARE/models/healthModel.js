import mongoose from "mongoose";

const healthSchema = new mongoose.Schema({

userId: {
type: mongoose.Schema.Types.ObjectId,
ref: "user"
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

mentalScore: Number,
mentalLevel: String

}, { timestamps: true });

export default mongoose.model("health", healthSchema);