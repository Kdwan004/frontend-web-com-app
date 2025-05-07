import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Message {
  timestamp: string;
  sender: string;
  receiver: string;
  message: string;
}

const DirectMessage: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);
  

  const fetchMessages = async () => {
    try {
      const currentUser = localStorage.getItem('username');
      const response = await axios.get('https://web-app-image-320303374114.australia-southeast1.run.app/api/messages/conversation', {
        params: {
          username1: currentUser,
          username2: selectedUser
        }
      });

      if (response.data.status === 'success') {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleUserSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      setSelectedUser(username);
      setIsChatOpen(true);
      setSuccess('Chat opened!');
    } catch (error: any) {
      setError('Failed to open chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const sender = localStorage.getItem('username');
      const response = await axios.post('https://web-app-image-320303374114.australia-southeast1.run.app/api/messages/send', {
        sender,
        receiver: selectedUser,
        message
      });

      if (response.data.status === 'success') {
        setMessage('');
        fetchMessages();
      }
    } catch (error: any) {
      setError('Failed to send message. Please try again.');
    }
  };

  if (!isChatOpen) {
    return (
      <div className="app">
        <button 
          className="back-button"
          onClick={() => navigate('/portal')}
        >
          Back to Portal
        </button>
        <div className="direct-message">
          <div className="direct-message-header">
            <h1>Start a Conversation</h1>
          </div>

          <form onSubmit={handleUserSearch} className="direct-message-form">
            <div className="form-group">
              <label htmlFor="username">Enter Username:</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username to chat with"
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button 
              type="submit" 
              className="send-button"
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Start Chat'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <button 
        className="back-button"
        onClick={() => {
          setIsChatOpen(false);
          setSelectedUser('');
          setMessages([]);
        }}
      >
        Back to Search
      </button>
      <div className="chat">
        <div className="chat-header">
          <h1>Chat with '{selectedUser}'</h1>
        </div>

    <div className="chat-messages">
      {messages.length === 0 ? (
        <p>Send first message...</p>
      ) : (
        messages.map((msg, index) => (
          <div 
            key={index} 
            className={`message ${msg.sender === localStorage.getItem('username') ? 'sent' : 'received'}`}
          >
            <strong>{msg.sender}</strong>
            <span className="timestamp">{msg.timestamp}</span>
            <p>{msg.message}</p>
          </div>
        ))
      )}
    </div>

        <form onSubmit={handleSendMessage} className="inputContainer">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            required
          />
          <button type="submit" className="send-button">
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default DirectMessage; 