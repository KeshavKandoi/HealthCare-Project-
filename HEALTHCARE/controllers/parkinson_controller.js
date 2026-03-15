import axios from "axios";
import FormData from "form-data";

const FASTAPI = "http://127.0.0.1:8000";

const forwardToFastAPI = async (endpoint, file) => {
  const form = new FormData();

  // Force correct content type — multer often sets application/octet-stream for CSV
  const ext = file.originalname.split(".").pop().toLowerCase();
  const contentType =
    ext === "csv" || ext === "data" || ext === "txt"
      ? "text/plain"
      : file.mimetype;

  form.append("file", file.buffer, {
    filename:    file.originalname,
    contentType: contentType,
  });

  const response = await axios.post(`${FASTAPI}${endpoint}`, form, {
    headers: form.getHeaders(),
  });

  return response.data;
};

export const detectSpiral = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json(await forwardToFastAPI("/predict/spiral", req.file));
  } catch (error) {
    console.error("Spiral error:", error.response?.data || error.message);
    res.status(500).json({ message: "AI server error", detail: error.response?.data?.detail || error.message });
  }
};

export const detectWave = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json(await forwardToFastAPI("/predict/wave", req.file));
  } catch (error) {
    console.error("Wave error:", error.response?.data || error.message);
    res.status(500).json({ message: "AI server error", detail: error.response?.data?.detail || error.message });
  }
};

export const detectVoice = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json(await forwardToFastAPI("/predict/voice", req.file));
  } catch (error) {
    console.error("Voice error:", error.response?.data || error.message);
    res.status(500).json({ message: "AI server error", detail: error.response?.data?.detail || error.message });
  }
};

export const detectGait = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json(await forwardToFastAPI("/predict/gait", req.file));
  } catch (error) {
    console.error("Gait error:", error.response?.data || error.message);
    res.status(500).json({ message: "AI server error", detail: error.response?.data?.detail || error.message });
  }
};