export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'No message provided' });
  }

  try {
    const assistantId = 'asst_9hL75WshgZ3R1BJkAP1L58mT'; // ← REPLACE THIS

    // 1. Create a new thread
    const threadRes = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
    });
    const thread = await threadRes.json();

    // 2. Add user's message to the thread
    await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        role: 'user',
        content: message
      }),
    });

    // 3. Run the assistant
    const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        assistant_id: assistantId
      }),
    });

    const run = await runRes.json();

    // 4. Poll for completion
    let runStatus = run.status;
    let result;
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusCheck = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
      });
      const statusData = await statusCheck.json();
      runStatus = statusData.status;
    }

    // 5. Get the messages
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
    });
    const messages = await messagesRes.json();

    const assistantMessage = messages.data
      .find(m => m.role === 'assistant')?.content?.[0]?.text?.value || "Hmm, I couldn't find a proper reply.";

    res.status(200).json({ reply: assistantMessage });

  } catch (error) {
    console.error('Assistant error:', error);
    res.status(500).json({ error: 'Failed to get assistant reply.' });
  }
}