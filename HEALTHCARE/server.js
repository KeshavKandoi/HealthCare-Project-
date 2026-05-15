import express from "express"
import dotenv from "dotenv"
import "colors"
import morgan from "morgan"
import cors from "cors"
import { createServer } from "http"
import { Server } from "socket.io"
import connectDB from "./config/db.js"
import userRoutes from "./routes/userRoutes.js"
import webMessageRoutes from "./routes/webMessageRoutes.js"
import doctorRoutes from "./routes/doctorRoutes.js"
import appointmentRoutes from "./routes/appointmentRoutes.js"
import healthRoutes from "./routes/healthRoutes.js"
import aiDoctorRoutes from "./routes/aiDoctorRoutes.js"
import ecgRoutes from "./routes/ecg_routes.js"

dotenv.config()
connectDB()

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: "*" } })

io.on("connection", (socket) => {
  socket.on("join-patient", (patientId) => socket.join(patientId))
})

export { io }

app.use(express.json())
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true
}))

app.use("/api/v1/user", userRoutes)
app.use("/api/v1/webMessage", webMessageRoutes)
app.use("/api/v1/doctor", doctorRoutes)
app.use("/api/v1/appointment", appointmentRoutes)
app.use("/api/v1/health", healthRoutes)
app.use("/api/v1/ai-doctor", aiDoctorRoutes)
app.use("/api/v1/ecg", ecgRoutes)

app.get("/", (req, res) => {
  res.send("node is running")
})

const PORT = process.env.PORT

httpServer.listen(PORT, () => {
  console.log("server is running".green)
})
