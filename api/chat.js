// /api/chat.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { message, thread_id } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'No message provided' });
  }

  const assistantId = process.env.OPENAI_ASSISTANT_ID;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  try {
    // 1. Reuse thread or create new one
    let thread = { id: thread_id };
    if (!thread_id) {
      const threadRes = await fetch("https://api.openai.com/v1/threads", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      });
      if (!threadRes.ok) throw new Error('Failed to create thread');
      thread = await threadRes.json();
    }

    // 2. Add user message
    await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        role: 'user',
        content: message
      })
    });

    // 3. Run the assistant
    const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({ assistant_id: assistantId })
    });
    if (!runRes.ok) throw new Error('Failed to start assistant run');
    const run = await runRes.json();

    // 4. Poll until run completes
    let runStatus = run.status;
    let finalResponse = null;
    while (runStatus !== 'completed' && runStatus !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const check = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      });
      const checkJson = await check.json();
      runStatus = checkJson.status;
    }

    if (runStatus === 'failed') throw new Error('Assistant run failed');

    // 5. Get the reply
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    });
    const messages = await messagesRes.json();
    const assistantMessage = messages.data.reverse().find(m => m.role === 'assistant');

    return res.status(200).json({ reply: assistantMessage?.content?.[0]?.text?.value, thread_id: thread.id });

  } catch (error) {
    console.error("Assistant error:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
