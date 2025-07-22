import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const scrollToBottom = () => {
  if (chatEndRef.current) {
    chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }
};
useEffect(() => {
  scrollToBottom();
}, [messages]);

// First-time greeting logic
useEffect(() => {
  const hasGreeted = localStorage.getItem('hasChattedwithSirA');

  const initialGreeting = hasGreeted
    ? {
        sender: 'Sir Algernon',
        text: 'Ah! A familiar face. Welcome back, dear friend. What curiosity brings you today?'
      }
    : {
        sender: 'Sir Algernon',
        text: 'Ah, a guest at the gate! Welcome to Verity House, where wonder brews...'
      };

  setMessages([initialGreeting]);
  setChatOpen(true);
  localStorage.setItem('hasChattedwithSirA', 'true');
}, []);

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
  <div className="chat-widget-container">
    <div className={`chat-wrapper ${chatOpen ? 'visible' : ''}`}>
      <img src="sir-algernon.png" alt="Sir Algernon" className="sir-img" />
      <div className="chat-box">
        {messages.map((msg, index) => (
          <p key={index}>
            <strong>{msg.sender}:</strong> {msg.text}
          </p>
        ))}
         <div ref={chatEndRef} />
        {isTyping && (
          <div className="message assistant typing-indicator">
            <span role="img" aria-label="teapot">🫖</span> Sir A is brewing a reply
            <span className="dots">
              <span></span><span></span><span></span>
            </span>
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
    </div>
  </div>
);
}
export default App;