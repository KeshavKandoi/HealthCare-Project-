
import express from "express"
import dotenv from "dotenv"
import "colors"
import morgan from "morgan"
import cors from "cors"
import connectDB from "./config/db.js"
import userRoutes from "./routes/userRoutes.js"
import webMessageRoutes from "./routes/webMessageRoutes.js"
import doctorRoutes from "./routes/doctorRoutes.js"
import appointmentRoutes from "./routes/appointmentRoutes.js"
import healthRoutes from "./routes/healthRoutes.js";
import aiDoctorRoutes from "./routes/aiDoctorRoutes.js";
import mentalHealthRoutes from "./routes/mentalHealthRoutes.js";


// config
dotenv.config()


// database
connectDB();



// rest object
const app=express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// react se connect kar rahe hai

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true
}));



// routes

app.use("/api/v1/user",userRoutes)
app.use("/api/v1/webMessage",webMessageRoutes)
app.use("/api/v1/doctor",doctorRoutes)
app.use("/api/v1/appointment",appointmentRoutes)
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/ai-doctor", aiDoctorRoutes);

app.use("/api/v1/mental-health",mentalHealthRoutes);





app.get("/",(req,res)=>{
  res.send("node is running")
})

// port
const PORT=process.env.PORT


// run server
app.listen((PORT),()=>{
  console.log("server is running")
})


// npm i colors morgan
//  dotenv cors