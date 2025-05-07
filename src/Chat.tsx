import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

interface ChatMessage {
  user: string;
  text: string;
  timestamp: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const username = localStorage.getItem("username") || "Anonymous";
  const navigate = useNavigate();

  const sendMessage = () => {
    if (!text.trim()) return;

    const newMsg: ChatMessage = {
      user: username,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, newMsg]);
    setText("");
  };

  const logout = () => {
    localStorage.removeItem("username");
    navigate("/login");
  };

  return (
    <div className="app">
      <div className="chat">
        <div className="chat-header">
          <h1>Chat Room</h1>
          <button onClick={logout} className="logout-button">Logout</button>
        </div>
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className="message">
              <strong>{msg.user}</strong>
              <span>{msg.text}</span>
              <span className="timestamp">{msg.timestamp}</span>
            </div>
          ))}
        </div>
        <div className="inputContainer">
          <input
            placeholder="Type a message..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
