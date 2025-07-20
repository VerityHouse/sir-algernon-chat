import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([
    { sender: 'Sir Algernon', text: 'Ah, welcome to Verity House. What question troubles your tea today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);

  const handleSend = async () => {
    if (input.trim() === '') return;

    const newMessage = { sender: 'You', text: input };
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, thread_id: threadId })
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        throw new Error('Invalid JSON returned from server.');
      }

      if (!response.ok || !data.reply) {
        throw new Error(data.error || 'Something went wrong.');
      }

      setMessages(prev => [...prev, { sender: 'Sir Algernon', text: data.reply }]);
      if (data.thread_id && !threadId) {
        setThreadId(data.thread_id);
      }
    } catch (error) {
      console.error('Frontend error:', error);
      setMessages(prev => [...prev, {
        sender: 'Sir Algernon',
        text: 'Oh dear, something has gone awry with the thinking engine.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="App">
      <img src="/sir-algernon.png" alt="Sir Algernon" style={{ height: '200px', margin: '20px auto' }} />
      <h1>Sir Algernon</h1>

      <div className="chat-box">
        {messages.map((msg, index) => (
          <p key={index}><strong>{msg.sender}:</strong> {msg.text}</p>
        ))}
        {loading && <p><strong>Sir Algernon:</strong> ...brewing thoughts 🍵</p>}
      </div>

      <div className="input-box">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Sir Algernon a question..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}

export default App;