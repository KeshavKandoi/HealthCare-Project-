import { GoogleGenAI } from "@google/genai";

export const aiDoctor = async (req, res) => {
  try {
    const { message } = req.body;

    const ai = new GoogleGenAI({
      apiKey: process.env.API_KEY,
    });

    let parts = [];

    // If text exists
    if (message) {
      parts.push({
        text: `
You are an AI Medical Assistant.

Respond in simple language.
Always add:
"This is not a medical diagnosis. Please consult a qualified doctor."

User Message:
${message}
        `,
      });
    }

    // If image exists
    if (req.file) {
      const base64Image = req.file.buffer.toString("base64");

      parts.push({
        inlineData: {
          mimeType: req.file.mimetype,
          data: base64Image,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts,
        },
      ],
    });

    res.status(200).json({
      reply: response.text,
    });

  } catch (error) {
    console.error("AI Doctor Error:", error);

    if (error.status === 429) {
      return res.status(200).json({
        reply:
          "AI quota exceeded. Demo response: Please consult a doctor for proper diagnosis.",
      });
    }

    res.status(500).json({
      error: "AI Doctor Failed",
    });
  }
};
