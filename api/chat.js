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

  console.log('🐰 Assistant ID:', assistantId);
  console.log('🔑 OpenAI API key present:', !!OPENAI_API_KEY);

  try {
    // Step 1: Create a thread
    const threadRes = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    });

    if (!threadRes.ok) {
      const errText = await threadRes.text();
      console.error('❌ Failed to create thread:', errText);
      throw new Error('Failed to create thread');
    }

    const thread = await threadRes.json();

    // Step 2: Add user message to the thread
    await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        role: 'user',
        content: message,
      }),
    });

    // Step 3: Run the assistant
    const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        assistant_id: assistantId,
      }),
    });

    if (!runRes.ok) {
      const errText = await runRes.text();
      console.error('❌ Failed to start assistant run:', errText);
      throw new Error('Failed to start assistant run');
    }

    const run = await runRes.json();

    // Step 4: Wait for completion
    let runStatus = run.status;
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1 sec

      const statusRes = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`,
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        }
      );

      const statusData = await statusRes.json();
      runStatus = statusData.status;
      console.log('⏳ Run status:', runStatus);

      if (runStatus === 'failed') {
        console.error('❌ Assistant run failed');
        throw new Error('Assistant run failed');
      }
    }

    // Step 5: Get the assistant’s reply
    const messagesRes = await fetch(
      `https://api.openai.com/v1/threads/${thread.id}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2',
        },
      }
    );

    const messages = await messagesRes.json();

    const assistantMessage = messages.data
  .reverse()
  .find(m => m.role === 'assistant')
  ?.content?.[0]?.text?.value
  ?.replace(/【\d+:\d+†source†】/g, '') // Remove [4:1†source] tags
  ?.trim() || "Hmm, I couldn't find a proper response.";

res.status(200).json({ reply: assistantMessage });

  } catch (error) {
    console.error('🔥 Assistant error:', error);
    res.status(500).json({ error: error.message || 'Failed to get assistant reply.' });
  }
}