import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from './config';
import './index.css';
import { decryptMessageRsa, getPrivateKeyFromStorage } from './utils/encryption';

interface DisplayMessage {
  id: string;
  sender: string;
  content: string;
  originalContent: string;
  timestamp: string;
  isDecrypted: boolean;
}

interface ChatPartner {
  username: string;
}

const DirectMessage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>(localStorage.getItem('username') || '');
  const [receiver, setReceiver] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [error, setError] = useState<string>('');
  const [chatPartners, setChatPartners] = useState<ChatPartner[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [newChatInput, setNewChatInput] = useState<string>('');

  useEffect(() => {
    if (!username) {
      navigate('/login');
    }
  }, [username, navigate]);

  useEffect(() => {
    fetchChatPartners();
  }, [username]);

  const fetchChatPartners = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/partners?username=${username}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chat partners');
      }
      const data = await response.json();
      setChatPartners(data.partners.map((partner: string) => ({ username: partner })));
    } catch (error) {
      console.error('Error fetching chat partners:', error);
      setError('Failed to load chat partners');
    }
  };

  const fetchMessages = useCallback(async () => {
    if (!receiver || !username) return;
    
    setLoading(true);
    setError('');
    try {
      console.log(`Fetching messages for user: ${username}, partner: ${receiver}`);
      const response = await fetch(`${API_BASE_URL}/api/messages?username=${username}&partner=${receiver}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch messages');
      }
      const data = await response.json();
      console.log('Received raw messages:', data.messages);

      const privateKey = getPrivateKeyFromStorage();

      const processedMessages: DisplayMessage[] = await Promise.all(
        data.messages.map(async (msg: any, index: number) => {
          let displayContent = msg.content;
          let successfullyDecrypted = false;
          const messageId = msg.id || `msg-${index}-${new Date().getTime()}`;

          if (privateKey) {
            try {
              displayContent = await decryptMessageRsa(msg.content, privateKey);
              successfullyDecrypted = true;
              console.log(`Message ${messageId} (sender: ${msg.sender}) decrypted successfully by ${username}.`);
            } catch (decryptionError) {
              console.warn(`User ${username} failed to decrypt message ${messageId} (sender: ${msg.sender}). This is expected if it's not a message sent by ${username}. Error:`, decryptionError);
              displayContent = "[Encrypted message from " + msg.sender + "]";
            }
          } else {
            console.warn(`User ${username} is missing private key. Cannot decrypt message ${messageId} (sender: ${msg.sender}).`);
            displayContent = "[Cannot decrypt - Your private key is missing]";
          }

          return {
            id: messageId,
            sender: msg.sender,
            content: displayContent,
            originalContent: msg.content,
            timestamp: msg.timestamp,
            isDecrypted: successfullyDecrypted,
          };
        })
      );

      setMessages(processedMessages);
      console.log('Processed messages with decryption attempt:', processedMessages);

      setTimeout(() => {
        const messagesContainer = document.querySelector('.chat-messages');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
    } catch (err: any) {
      console.error('Error fetching or processing messages:', err);
      setError(err.message || 'Failed to load or decrypt messages');
    } finally {
      setLoading(false);
    }
  }, [receiver, username]);

  useEffect(() => {
    if (receiver && username) {
      fetchMessages();
    }
  }, [receiver, username, fetchMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !receiver) return;

    try {
      console.log('Sending message:', { sender: username, receiver, message });
      const response = await fetch(`${API_BASE_URL}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: username,
          receiver: receiver,
          message: message,
        }),
      });

      const data = await response.json();
      console.log('Send message response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setMessage('');
      fetchMessages();
      setTimeout(() => {
        const messagesContainer = document.querySelector('.chat-messages');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  };

  const handlePartnerClick = (partner: string) => {
    setReceiver(partner);
  };

  const handleNewChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChatInput.trim()) {
      setReceiver(newChatInput.trim());
      setNewChatInput('');
    }
  };

  return (
    <div className="app">
      <div className="chat">
        <div className="chat-header">
          <h1>Direct Message</h1>
          <button onClick={() => navigate('/portal')} className="back-button">Back to Portal</button>
        </div>

        <div className="chat-content">
          <div className="chat-sidebar">
            <h2>Chat History</h2>
            {chatPartners.length === 0 ? (
              <p className="no-partners">No previous chats</p>
            ) : (
              <div className="partners-list">
                {chatPartners.map((partner) => (
                  <div
                    key={partner.username}
                    className={`partner-item ${receiver === partner.username ? 'active' : ''}`}
                    onClick={() => handlePartnerClick(partner.username)}
                  >
                    {partner.username}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="chat-main">
            {!receiver ? (
              <div className="select-partner">
                <p>Select a chat partner from the sidebar or start a new conversation</p>
                <form onSubmit={handleNewChatSubmit} className="new-chat-form">
                  <input
                    type="text"
                    placeholder="Enter username to chat with"
                    value={newChatInput}
                    onChange={(e) => setNewChatInput(e.target.value)}
                  />
                  <button type="submit">Start Chat</button>
                </form>
              </div>
            ) : (
              <>
                <div className="chat-messages">
                  {loading ? (
                    <div className="loading">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="no-messages">No messages yet. Start the conversation!</div>
                  ) : (
                    messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`message ${msg.sender === username ? 'sent' : 'received'}`}
                      >
                        <strong>{msg.sender}</strong>
                        <p>{msg.content}</p>
                        <span className="timestamp">{msg.timestamp}</span>
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
                  />
                  <button type="submit" className="send-button">Send</button>
                </form>
              </>
            )}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
};

export default DirectMessage; 