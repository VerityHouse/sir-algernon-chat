import React, { useState } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
const [chatOpen, setChatOpen] = useState(false);
const [hasGreeted, setHasGreeted] = useState(false);
  const [input, setInput] = useState('');
  useEffect(() => {
  const greetTimer = setTimeout(() => {
    setChatOpen(true);
    if (!hasGreeted) {
      setMessages(prev => [
        ...prev,
        { sender: 'Sir Algernon', text: 'Ah, a guest at the gate! Welcome to Verity House, where wonder awaits. How may I be of service?' }
      ]);
      setHasGreeted(true);
    }
  }, 2000); // Delay in milliseconds before greeting

  return () => clearTimeout(greetTimer);
}, []);

  const handleSend = async () => {
    if (input.trim() === '') return;

    // Add user's message to the chat
    const newMessage = { sender: 'You', text: input };
    setMessages(prev => [...prev, newMessage]);
    setInput('');

    try {
      // Send input to your backend API route
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong with Sir Algernon\'s reply.');
      }

      // Add Sir A's response
      const replyMessage = { sender: 'Sir Algernon', text: data.reply };
      setMessages(prev => [...prev, replyMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        { sender: 'Sir Algernon', text: 'Oh dear, something has gone awry with the thinking engine.' }
      ]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

 return (
  <div className="App">
    <div className="chat-header">
      <img src="/sir-algernon.png" alt="Sir Algernon" className="sir-img" />
      
      <h1>Sir Algernon</h1>
    </div>

    <div className="chat-box">
      {messages.map((msg, index) => (
        <p key={index}>
          <strong>{msg.sender}:</strong> {msg.text}
        </p>
      ))}
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