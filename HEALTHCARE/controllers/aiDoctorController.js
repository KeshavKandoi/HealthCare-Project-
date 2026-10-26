import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL = "gemini-3.6-flash";
const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_ITEMS = 10;
const SYSTEM_INSTRUCTION = [
  "You are Heartline's AI health information assistant.",
  "Use clear, supportive language. Give general health information, not a diagnosis or a treatment prescription.",
  "Ask a concise follow-up question when important context is missing.",
  "If the user describes possible emergency symptoms, advise immediate local emergency care.",
  "End medical responses with: This is general information, not a medical diagnosis. Please consult a qualified doctor.",
].join(" ");

function publicError(error) {
  const status = Number(error?.status || error?.code);
  if (status === 400) return { status: 400, message: "Gemini could not process this request. Try shorter text or another image." };
  if (status === 401 || status === 403) return { status: 503, message: "The Gemini API key was rejected. Check the key in the backend configuration." };
  if (status === 404) return { status: 503, message: "The configured Gemini model is unavailable. Check GEMINI_MODEL on the backend." };
  if (status === 429) return { status: 429, message: "Gemini is at its request or quota limit. Please try again later." };
  if (status === 503 || status === 504) return { status: 503, message: "Gemini is temporarily unavailable. Please try again shortly." };
  if (error?.name === "AbortError" || error?.name === "TimeoutError" || /timed? out/i.test(error?.message || "")) {
    return { status: 504, message: "Gemini did not respond in time. Please check the server connection and try again." };
  }
  return { status: 502, message: "The AI service is unavailable right now. Please try again later." };
}

export const aiDoctor = async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    return res.status(503).json({ error: "Gemini is not configured. Add GEMINI_API_KEY to the backend .env and restart the server." });
  }

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message && !req.file) return res.status(400).json({ error: "Enter a message or attach an image." });
  if (message.length > MAX_MESSAGE_LENGTH) return res.status(400).json({ error: "Message is too long. Please keep it under 4,000 characters." });
  if (req.file && !["image/jpeg", "image/png", "image/webp"].includes(req.file.mimetype)) {
    return res.status(400).json({ error: "Attach a JPEG, PNG, or WebP image." });
  }

  let history = [];
  try {
    const parsed = JSON.parse(req.body?.history || "[]");
    if (Array.isArray(parsed)) history = parsed.slice(-MAX_HISTORY_ITEMS)
      .filter(item => ["user", "model"].includes(item?.role) && typeof item?.text === "string")
      .map(item => ({ role: item.role, parts: [{ text: item.text.slice(0, MAX_MESSAGE_LENGTH) }] }));
  } catch {
    return res.status(400).json({ error: "Invalid chat history." });
  }

  const parts = [{ text: message || "Please describe the attached image in general health terms." }];
  if (req.file) parts.push({ inlineData: { mimeType: req.file.mimetype, data: req.file.buffer.toString("base64") } });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: [...history, { role: "user", parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        httpOptions: { timeout: 15000, retryOptions: { attempts: 1 } },
      },
    });
    const reply = response.text?.trim();
    if (!reply) return res.status(502).json({ error: "The AI service returned an empty response. Please try again." });
    return res.status(200).json({ reply });
  } catch (error) {
    const result = publicError(error);
    console.error("AI Doctor request failed:", { status: error?.status || error?.code || "unknown", model });
    return res.status(result.status).json({ error: result.message });
  }
};
