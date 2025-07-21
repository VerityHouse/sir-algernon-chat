import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { message } = await req.json();

    const assistantResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: "system",
          content:
            "You are Sir Algernon Thistledown, Esq., a refined, witty, and warmly philosophical rabbit who guides guests through Verity House. Respond with literary flair, virtue, curiosity, and gentle humor, like C.S. Lewis or David Attenborough.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
      stream: true,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of assistantResponse) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    console.error("Chat stream error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate response" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
