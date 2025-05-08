import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from './config';
import './index.css';
import { decryptMessageRsa, getPrivateKeyFromStorage } from './utils/encryption';

interface DisplayMessage {
  id: string;
  sender: string;
  receiver?: string;
  content: string;
  originalContent?: string;
  timestamp: string;
  isDecrypted?: boolean;
  isSentByMe?: boolean;
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

  const getChatLocalStorageKey = useCallback((user1: string, user2: string) => {
    const sortedUsers = [user1, user2].sort();
    return `chat_history_${sortedUsers[0]}_${sortedUsers[1]}`;
  }, []);

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

  const loadAndFetchMessages = useCallback(async () => {
    if (!receiver || !username) return;

    setLoading(true);
    setError('');
    setMessages([]);

    let localMessages: DisplayMessage[] = [];
    try {
      const storageKey = getChatLocalStorageKey(username, receiver);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        localMessages = JSON.parse(stored) as DisplayMessage[];
        localMessages = localMessages.map(m => ({...m, isSentByMe: m.sender === username, isDecrypted: true }));
      }
    } catch (e) {
      console.error("Error loading messages from localStorage:", e);
    }
    
    let serverMessages: DisplayMessage[] = [];
    try {
      console.log(`Fetching messages for user: ${username}, partner: ${receiver}`);
      const response = await fetch(`${API_BASE_URL}/api/messages?username=${username}&partner=${receiver}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch messages');
      }
      const data = await response.json();
      console.log('Received raw messages from server:', data.messages);

      const privateKey = getPrivateKeyFromStorage();

      serverMessages = await Promise.all(
        (data.messages as any[]).map(async (msg: any, index: number): Promise<DisplayMessage> => {
          const messageId = msg.id || `${msg.sender}-${msg.timestamp}-${index}`;
          
          if (msg.sender === username) {
            return {
              id: messageId,
              sender: msg.sender,
              receiver: msg.receiver,
              content: "[You sent an encrypted message - view from your history]",
              originalContent: msg.content,
              timestamp: msg.timestamp,
              isDecrypted: false,
              isSentByMe: true,
            };
          } else {
            let displayContent = `[Encrypted message from ${msg.sender}]`;
            let successfullyDecrypted = false;
            if (privateKey) {
              try {
                displayContent = await decryptMessageRsa(msg.content, privateKey);
                successfullyDecrypted = true;
                console.log(`Message ${messageId} (sender: ${msg.sender}) decrypted successfully by ${username}.`);
              } catch (decryptionError) {
                console.warn(`User ${username} failed to decrypt message ${messageId} (sender: ${msg.sender}). Error:`, decryptionError);
                displayContent = `[Failed to decrypt message from ${msg.sender}]`;
              }
            } else {
              console.warn(`User ${username} is missing private key. Cannot decrypt message ${messageId} (sender: ${msg.sender}).`);
              displayContent = "[Cannot decrypt - Your private key is missing]";
            }
            return {
              id: messageId,
              sender: msg.sender,
              receiver: username,
              content: displayContent,
              originalContent: msg.content,
              timestamp: msg.timestamp,
              isDecrypted: successfullyDecrypted,
              isSentByMe: false,
            };
          }
        })
      );
    } catch (err: any) {
      console.error('Error fetching or processing server messages:', err);
      setError(err.message || 'Failed to load or decrypt server messages');
    }

    const combinedMessages = [...localMessages];
    serverMessages.forEach(serverMsg => {
      if (serverMsg.sender === username) {
        const isAlreadyLocallyStored = localMessages.some(lm => lm.content === serverMsg.originalContent && lm.sender === serverMsg.sender);
        if (!isAlreadyLocallyStored || serverMsg.sender !== username) {
             combinedMessages.push(serverMsg);
        }
      } else {
        combinedMessages.push(serverMsg);
      }
    });

    combinedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    setMessages(combinedMessages);
    
    console.log('Final combined and sorted messages:', combinedMessages);

    setTimeout(() => {
      const messagesContainer = document.querySelector('.chat-messages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);

    setLoading(false);
  }, [username, receiver, getChatLocalStorageKey]);

  useEffect(() => {
    if (receiver && username) {
      loadAndFetchMessages();
    } else {
      setMessages([]);
    }
  }, [receiver, username]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !receiver || !username) return;

    const plaintextMessage = message;
    setMessage('');

    const localMessageId = `local-${username}-${receiver}-${new Date().getTime()}`;
    const sentMessageForDisplay: DisplayMessage = {
      id: localMessageId,
      sender: username,
      receiver: receiver,
      content: plaintextMessage,
      timestamp: new Date().toISOString(),
      isDecrypted: true,
      isSentByMe: true,
    };

    setMessages(prevMessages => {
      const newMessages = [...prevMessages, sentMessageForDisplay];
      newMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      return newMessages;
    });

    try {
      const storageKey = getChatLocalStorageKey(username, receiver);
      const existingMessages = localStorage.getItem(storageKey);
      const allMessages = existingMessages ? JSON.parse(existingMessages) : [];
      allMessages.push(sentMessageForDisplay);
      localStorage.setItem(storageKey, JSON.stringify(allMessages));
    } catch (error) {
      console.error("Error saving message to localStorage:", error);
    }

    try {
      console.log('Sending plaintext message to backend:', { sender: username, receiver, message: plaintextMessage });
      const response = await fetch(`${API_BASE_URL}/api/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: username, receiver: receiver, message: plaintextMessage }),
      });

      const data = await response.json();
      console.log('Send message response from backend:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message to server');
      }
    } catch (error) {
      console.error('Error sending message to server:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== localMessageId));
      try {
        const storageKey = getChatLocalStorageKey(username, receiver);
        const existingMessages = localStorage.getItem(storageKey);
        if (existingMessages) {
          let allMessages = JSON.parse(existingMessages) as DisplayMessage[];
          allMessages = allMessages.filter(m => m.id !== localMessageId);
          localStorage.setItem(storageKey, JSON.stringify(allMessages));
        }
      } catch (e) {
        console.error("Error removing message from localStorage after failed send:", e);
      }
    } finally {
      setTimeout(() => {
        const messagesContainer = document.querySelector('.chat-messages');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
    }
  };

  const handlePartnerClick = (partnerUsername: string) => {
    setReceiver(partnerUsername);
  };

  const handleNewChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChatInput.trim() && newChatInput.trim() !== username) {
      setReceiver(newChatInput.trim());
      if (!chatPartners.find(p => p.username === newChatInput.trim())) {
        setChatPartners(prev => [...prev, { username: newChatInput.trim() }]);
      }
      setNewChatInput('');
    } else if (newChatInput.trim() === username) {
        setError("You cannot chat with yourself.");
    }
  };

  return (
    <div className="app">
      <div className="chat">
        <div className="chat-header">
          <h1>Direct Message</h1>
          <p>Logged in as: <strong>{username}</strong></p>
          {receiver && <p>Chatting with: <strong>{receiver}</strong></p>}
          <button onClick={() => { localStorage.removeItem('username'); localStorage.removeItem('privateKey'); navigate('/login');}} className="logout-button">Logout</button>
          <button onClick={() => navigate('/portal')} className="back-button">Back to Portal</button>
        </div>

        <div className="chat-content">
          <div className="chat-sidebar">
            <h2>Chat History</h2>
            <form onSubmit={handleNewChatSubmit} className="new-chat-form-sidebar">
              <input
                type="text"
                placeholder="Enter username to chat"
                value={newChatInput}
                onChange={(e) => setNewChatInput(e.target.value)}
              />
              <button type="submit">Open Chat</button>
            </form>
            {chatPartners.length === 0 && !receiver ? (
              <p className="no-partners">No previous chats. Start a new one!</p>
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
                <p>Select a chat partner from the sidebar or start a new conversation above.</p>
              </div>
            ) : (
              <>
                <div className="chat-messages">
                  {loading && messages.length === 0 ? (
                    <div className="loading">Loading messages...</div>
                  ) : !loading && messages.length === 0 ? (
                    <div className="no-messages">No messages yet. Start the conversation!</div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`message ${msg.sender === username ? 'sent' : 'received'}`}
                      >
                        <strong>{msg.sender === username ? 'You' : msg.sender}</strong>
                        <p dangerouslySetInnerHTML={{ __html: msg.content.replace(/\\n/g, '<br />') }}></p>
                        <span className="timestamp">{new Date(msg.timestamp).toLocaleString()}</span>
                        {!msg.isDecrypted && msg.sender !== username && (
                            <small style={{color: 'red'}}> (Decryption Failed)</small>
                        )}
                        {msg.sender === username && msg.content.startsWith("[You sent an encrypted message") && (
                            <small style={{color: 'grey'}}> (On server, encrypted for {receiver})</small>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {error && <div className="error-message" style={{padding: '10px', color: 'red'}}>{error}</div>}
                <form onSubmit={handleSendMessage} className="inputContainer">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    disabled={!receiver || loading}
                  />
                  <button type="submit" className="send-button" disabled={!message.trim() || !receiver || loading}>Send</button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectMessage; 