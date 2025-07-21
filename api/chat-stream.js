// pages/api/chat-stream.js
import OpenAI from 'openai';

export const config = {
  runtime: 'edge', // Required for streaming on Vercel
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Only POST requests allowed' }), {
      status: 405,
    });
  }

  const { message } = await req.json();
  if (!message) {
    return new Response(JSON.stringify({ error: 'No message provided' }), {
      status: 400,
    });
  }

  const assistantId = process.env.OPENAI_ASSISTANT_ID;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. Create a new thread
        const thread = await openai.beta.threads.create();

        // 2. Send user message to the thread
        await openai.beta.threads.messages.create(thread.id, {
          role: 'user',
          content: message,
        });

        // 3. Start a run using streaming
        const response = await openai.beta.threads.runs.create(thread.id, {
          assistant_id: assistantId,
          stream: true,
        });

        // 4. Stream the assistant's response back
        for await (const chunk of response) {
          const content = chunk?.data?.content?.[0]?.text?.value;
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }

        controller.close();
      } catch (error) {
        console.error('🔥 Streaming error:', error);
        controller.enqueue(encoder.encode('[Sir A encountered an error.]'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}