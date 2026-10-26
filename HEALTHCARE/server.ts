import { express, dotenv, cors, morgan } from "./serverDependencies.js"
import "colors"
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
import myHealthRoutes from "./routes/myHealthRoutes.js"
import schedulingRoutes from "./routes/schedulingRoutes.js"
import hospitalRequestRoutes from "./routes/hospitalRequestRoutes.js"
import planInquiryRoutes from "./routes/planInquiryRoutes.js"
import monitoringRoutes from "./routes/monitoringRoutes.js"
import bpAlertRoutes from "./routes/bpAlertRoutes.js"
import careCommunicationRoutes, { careAppointment } from "./routes/careCommunicationRoutes.js"
import { startBpAlertWorker } from "./lib/bpAlerts.js"
import { authenticateSocket } from "./middlewares/ecgAuth.js"

dotenv.config()
await connectDB()

const app = express()
const httpServer = createServer(app)
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:5174").split(",").map(value => value.trim());
const io = new Server(httpServer, { cors: { origin: allowedOrigins } });
io.use(authenticateSocket);
io.on("connection", (socket) => {
  socket.join(`patient:${socket.data.patientId}`);
  socket.on('care:join', async (payload: {appointmentId?: string; callId?: string}, ack?: (result: {ok: boolean; message?: string}) => void) => {
    try {
      if (!payload?.appointmentId || !payload?.callId || !await careAppointment(payload.appointmentId, socket.data.patientId)) throw new Error('Call unavailable');
      const {rows} = await (await import('./config/db.js')).getPool().query("select id from appointment_calls where id=$1 and appointment_id=$2 and status in ('ringing','connected')", [payload.callId,payload.appointmentId]);
      if (!rows[0]) throw new Error('Call unavailable');
      socket.data.careCallId = payload.callId;
      socket.join(`care-call:${payload.callId}`);
      ack?.({ok:true});
      socket.to(`care-call:${payload.callId}`).emit('care:peer-joined');
    } catch { ack?.({ok:false,message:'Call unavailable'}); }
  });
  socket.on('care:signal', async (payload: {callId?: string; signal?: unknown}) => {
    if (!payload?.callId || payload.callId !== socket.data.careCallId || JSON.stringify(payload.signal || {}).length > 50000) return;
    const {rows} = await (await import('./config/db.js')).getPool().query("select 1 from appointment_calls where id=$1 and status in ('ringing','connected')", [payload.callId]);
    if (rows[0]) socket.to(`care-call:${payload.callId}`).emit('care:signal', payload.signal);
  });
  socket.on('disconnect', () => { if (socket.data.careCallId) socket.to(`care-call:${socket.data.careCallId}`).emit('care:peer-left'); });
});

export { io }

app.use(express.json())
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))

app.use("/api/v1/user", userRoutes)
app.use("/api/v1/webMessage", webMessageRoutes)
app.use("/api/v1/doctor", doctorRoutes)
app.use("/api/v1/appointment", appointmentRoutes)
app.use("/api/v1/health", healthRoutes)
app.use("/api/v1/ai-doctor", aiDoctorRoutes)
app.use("/api/v1/ecg", ecgRoutes)
app.use("/api/v1/my-health", myHealthRoutes)
app.use("/api/v1/scheduling", schedulingRoutes)
app.use("/api/v1/hospital-requests", hospitalRequestRoutes)
app.use("/api/v1/plan-inquiries", planInquiryRoutes)
app.use("/api/v1/monitoring", monitoringRoutes)
app.use("/api/v1/bp-alerts", bpAlertRoutes)
app.use("/api/v1/care-communications", careCommunicationRoutes)

app.get("/healthz", async (_req: unknown,res: {json(body:object):void;status(code:number):{json(body:object):void}}) => { try { await (await import("./config/db.js")).getPool().query("select 1"); res.json({status:"ok",database:"ok"}); } catch { res.status(503).json({status:"unavailable",database:"unavailable"}); } });

app.get("/", (_req: unknown, res: {send(body:string):void}) => {
  res.send("node is running")
})

const PORT = process.env.PORT || 4000

httpServer.listen(PORT, () => {
  console.log("server is running".green)
  startBpAlertWorker()
})
