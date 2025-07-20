export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'No message provided' });
  }

  try {
    const assistantId = 'asst_9hL75WshgZR3IBJkAPLl58mT'; // Your real assistant ID

    // 1. Create a new thread
    const threadRes = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });

    if (!threadRes.ok) {
      throw new Error('Failed to create thread');
    }

    const thread = await threadRes.json();

    // 2. Add user's message to the thread
    const messageRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        role: 'user',
        content: message,
      }),
    });

    if (!messageRes.ok) {
      throw new Error('Failed to add message to thread');
    }

    // 3. Run the assistant
    const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        assistant_id: assistantId,
      }),
    });

    if (!runRes.ok) {
      throw new Error('Failed to start assistant run');
    }

    const run = await runRes.json();

    // 4. Poll until assistant completes
    let runStatus = run.status;
    let runData = null;

    while (runStatus === 'queued' || runStatus === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusCheck = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      });

      if (!statusCheck.ok) {
        throw new Error("Failed to check run status from OpenAI.");
      }

      runData = await statusCheck.json();
      runStatus = runData?.status || 'failed';
    }

    // 5. Get the assistant's response
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });

    if (!messagesRes.ok) {
      throw new Error('Failed to retrieve assistant messages');
    }

    const messages = await messagesRes.json();

    const assistantMessage = messages.data.find(m => m.role === 'assistant')?.content?.[0]?.text?.value 
      || "Hmm, I couldn't find a proper reply.";

    return res.status(200).json({ reply: assistantMessage });

  } catch (error) {
    console.error('Assistant error:', error);
    return res.status(500).json({ error: 'Failed to get assistant reply.' });
  }
}