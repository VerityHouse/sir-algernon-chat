import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const greetTimer = setTimeout(() => {
      setChatOpen(true);
      if (!hasGreeted) {
        setMessages(prev => [
          ...prev,
          {
            sender: 'Sir Algernon',
            text: 'Ah, a guest at the gate! Welcome to Verity House, where wonder brews.',
          }
        ]);
        setHasGreeted(true);
      }
    }, 2000);

    return () => clearTimeout(greetTimer);
  }, [hasGreeted]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { sender: 'You', text: userMessage }]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullMessage += chunk;
      }

      // Attempt to parse JSON (in case it's wrapped in { "reply": "..." })
      let replyText = fullMessage;
      try {
        const parsed = JSON.parse(fullMessage);
        replyText = parsed.reply || fullMessage;
      } catch (e) {
        // Not JSON — leave it raw
      }

      setMessages(prev => [
        ...prev,
        { sender: 'Sir Algernon', text: replyText },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          sender: 'Sir Algernon',
          text: 'Oh dear, something went wrong while I was steeping my thoughts.',
        },
      ]);
    } finally {
      setIsTyping(false);
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
        <img src="sir-algernon.png" alt="Sir Algernon" className="sir-img" />
        <h1>Sir Algernon</h1>
      </div>

      {chatOpen && (
        <div className={`chat-wrapper ${chatOpen ? 'visible' : ''}`}>
          <img src="sir-algernon.png" alt="Sir Algernon" className="sir-img" />
          <div className="chat-box">
            {messages.map((msg, index) => (
              <p key={index}>
                <strong>{msg.sender}:</strong> {msg.text}
              </p>
            ))}
          </div>

          {isTyping && (
            <div className="message assistant typing-indicator">
              <span role="img" aria-label="teapot">🫖</span> Sir A is brewing a reply
              <div className="dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}

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
      )}
    </div>
  );
}

export default App;