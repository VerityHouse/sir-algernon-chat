export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Only POST requests allowed' }), {
      status: 405,
    });
  }

  try {
    const { message } = await req.json();

    const response = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const thread = await response.json();

    const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistant_id: process.env.OPENAI_ASSISTANT_ID,
        instructions: 'You are Sir Algernon, Chief Curiosity Officer at Verity House. Answer with warmth, wit, and wisdom.',
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      }),
    });

    const run = await runRes.json();

    const checkRun = async () => {
      let status;
      let result;

      while (true) {
        const res = await fetch(
          `https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              'OpenAI-Beta': 'assistants=v2',
            },
          }
        );

        result = await res.json();
        status = result.status;

        if (status === 'completed') break;
        if (status === 'failed' || status === 'cancelled') {
          throw new Error('Assistant run failed.');
        }

        await new Promise((r) => setTimeout(r, 1000));
      }

      return result;
    };

    const runResult = await checkRun();

    const messagesRes = await fetch(
      `https://api.openai.com/v1/threads/${thread.id}/messages`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2',
        },
      }
    );

    const messagesData = await messagesRes.json();
    const finalMessage = messagesData.data
      ?.find((m) => m.role === 'assistant')
      ?.content[0]?.text?.value || 'Sir Algernon was momentarily speechless.';

    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(finalMessage));
          controller.close();
        },
      }),
      {
        headers: {
          'Content-Type': 'text/plain',
        },
      }
    );
  } catch (err) {
    console.error('❌ Server error:', err);
    return new Response(JSON.stringify({ error: 'Failed to generate response' }), {
      status: 500,
    });
  }
}
