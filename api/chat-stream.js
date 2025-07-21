import { Readable } from 'stream';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  try {
    const { message } = req.body;

    // Step 1: Create a thread
    const threadRes = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const thread = await threadRes.json();

    // Step 2: Start the assistant run
    const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistant_id: process.env.OPENAI_ASSISTANT_ID,
        instructions: 'You are Sir Algernon, a witty and warm classical guide.',
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      }),
    });

    const run = await runRes.json();

    // Step 3: Wait for completion (poll loop with a limit)
    const waitForCompletion = async () => {
      let status = 'queued';
      let result = null;
      let attempts = 0;

      while (status !== 'completed' && attempts < 15) {
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
        if (status === 'failed') throw new Error('Assistant run failed.');

        await new Promise((r) => setTimeout(r, 1500));
        attempts++;
      }

      return result;
    };

    await waitForCompletion();

    // Step 4: Fetch the messages
    const messagesRes = await fetch(
      `https://api.openai.com/v1/threads/${thread.id}/messages`,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2',
        },
      }
    );

    const messagesData = await messagesRes.json();
    const reply = messagesData.data?.find((m) => m.role === 'assistant')?.content?.[0]?.text?.value;

    if (!reply) throw new Error('No reply found');

    // Step 5: Send back response
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(reply);
  } catch (error) {
    console.error('❌ Assistant error:', error);
    return res.status(500).json({ error: 'Failed to generate response' });
  }
}
