// pages/api/chat-stream.js
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  try {
    // ✅ Stream-safe way to read the body in Vercel
    const buffers = [];
    for await (const chunk of req.body) {
      buffers.push(chunk);
    }
    const body = JSON.parse(Buffer.concat(buffers).toString());

    const userMessage = body.message;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are Sir Algernon, a scholarly rabbit mentor from Verity House. Reply with wit, warmth, and classical elegance.' },
        { role: 'user', content: userMessage }
      ],
      stream: true
    });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });

    for await (const chunk of completion) {
      const content = chunk.choices?.[0]?.delta?.content || '';
      if (content) {
        res.write(content);
      }
    }

    res.end();
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
}