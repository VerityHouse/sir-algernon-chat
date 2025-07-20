// /api/chat.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'No message provided' });
  }

  const assistantId = process.env.OPENAI_ASSISTANT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

console.log("Using Assistant ID:", assistantId);
console.log("Using OpenAI API Key present:", !!OPENAI_API_KEY);
  try {
    // 1. Create a thread
    const threadRes = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
    });

    if (!threadRes.ok) {
      throw new Error('Failed to create thread');
    }

    const thread = await threadRes.json();

    // 2. Add user message to the thread
    await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        role: 'user',
        content: message,
      }),
    });

    // 3. Run the assistant
    const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        assistant_id: assistantId,
      }),
    });

    if (!runRes.ok) {
      throw new Error('Failed to start assistant run');
    }

    const run = await runRes.json();

    // 4. Poll until run is complete
    let runStatus = run.status;
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusCheck = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
      });

      const statusData = await statusCheck.json();
      runStatus = statusData.status;

      if (runStatus === 'failed') {
        throw new Error('Assistant run failed');
      }
    }

    // 5. Get the assistant's reply
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
    });

    const messages = await messagesRes.json();

    const assistantMessage = messages.data
      .reverse()
      .find(m => m.role === 'assistant')
      ?.content?.[0]?.text?.value || "Hmm, I couldn’t find a proper response.";

    res.status(200).json({ reply: assistantMessage });
  } catch (error) {
    console.error('Assistant error:', error);
    res.status(500).json({ error: 'Failed to get assistant reply.' });
  }
}