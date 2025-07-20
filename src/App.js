import React, { useState } from 'react';
import axios from 'axios';

const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

function App() {
  const [messages, setMessages] = useState([
    { sender: 'Sir Algernon', text: 'Ah, welcome to Verity House. What question troubles your tea today?' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (input.trim() === '') return;

    const newMessage = { sender: 'You', text: input };
    setMessages(prev => [...prev, newMessage]);
    setInput('');

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are Sir Algernon Thistledown, a warm, witty, classically educated rabbit who responds like C.S. Lewis and Sherlock Holmes in a garden shed.' },
            ...messages.map(msg => ({
              role: msg.sender === 'You' ? 'user' : 'assistant',
              content: msg.text
            })),
            { role: 'user', content: input }
          ],
          temperature: 0.7
        },
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const reply = response.data.choices[0].message.content;
      setMessages(prev => [...prev, { sender: 'Sir Algernon', text: reply }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        { sender: 'Sir Algernon', text: 'Oh dear, something has gone awry with the thinking engine.' }
      ]);
    }
  };

  return (
  <div style={{ fontFamily: 'serif', padding: '2rem', maxWidth: '600px', margin: 'auto' }}>
    <div style={{ fontFamily: 'serif', padding: '2rem', maxWidth: '600px', margin: 'auto', textAlign: 'center' }}>
      <img
        src="/sir-algernon.png"
        alt="Sir Algernon Thistledown"
        style={{
  width: '200px',
  height: 'auto',
  marginBottom: '1rem',
  boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
}}
      />
    </div>
      <h1>Sir Algernon</h1>
      <div style={{ minHeight: '300px', border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
        {messages.map((msg, i) => (
          <p key={i}><strong>{msg.sender}:</strong> {msg.text}</p>
        ))}
      </div>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSend()}
        placeholder="Ask Sir Algernon a question..."
        style={{ width: '80%', padding: '0.5rem' }}
      />
      <button onClick={handleSend} style={{ padding: '0.5rem' }}>Send</button>
    </div>
  );
}

export default App;