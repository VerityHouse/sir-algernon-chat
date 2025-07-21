// pages/api/chat-stream.js
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  try {
    const buffers = [];

    for await (const chunk of req) {
      buffers.push(chunk);
    }

    const data = JSON.parse(Buffer.concat(buffers).toString());
    const userMessage = data.message;

    if (!userMessage) {
      return res.status(400).json({ error: 'No message provided' });
    }

    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: userMessage }],
      stream: true,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of chatCompletion) {
          const content = chunk.choices?.[0]?.delta?.content || '';
          controller.enqueue(encoder.encode(content));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
}
