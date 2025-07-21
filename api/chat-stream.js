// pages/api/chat-stream.js
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: message }],
      stream: false,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "";

    res.status(200).json({ reply });
  } catch (error) {
    console.error("Error from OpenAI:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
}
