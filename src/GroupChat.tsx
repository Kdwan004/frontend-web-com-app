import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API_BASE_URL from './config';
import './index.css'; // Shared styles

interface GroupMessage {
  message_id: string;
  group_id: string;
  sender_username: string;
  content: string;
  timestamp: string;
}

interface GroupDetails {
  group_id: string;
  group_name: string;
  members: string[];
  creator_username: string;
  created_at: string;
}

const GroupChat: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || '';

  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  
  const [loadingDetails, setLoadingDetails] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const pollingIntervalRef = useRef<number | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const fetchGroupDetails = useCallback(async () => {
    if (!groupId || !username) return;
    setLoadingDetails(true);
    // setError(''); // Clear error specific to this fetch if needed
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}/details?username=${username}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch group details. You may not be a member or the group may not exist.');
      }
      setGroupDetails(data.group_details);
      setError(''); // Clear general error on successful fetch
    } catch (err) {
      console.error('Error fetching group details:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching details.');
      setGroupDetails(null); 
    } finally {
      setLoadingDetails(false);
    }
  }, [groupId, username]);

  const fetchMessages = useCallback(async (isPoll = false) => {
    if (!groupId || !username) return;
    if (!isPoll) {
        setLoadingMessages(true);
    }
    // setError(''); // Consider clearing error at the start of a fetch attempt, or more selectively
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}/messages?username=${username}`);
      const data = await response.json();
      console.log('API response for messages:', data); // Added for debugging

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch messages');
      }
      
      const sortedMessages = (Array.isArray(data.messages) ? data.messages : []).sort(
        (a: GroupMessage, b: GroupMessage) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setMessages(sortedMessages);
      // setError(''); // Clear general error on successful fetch, moved to be more specific
      if (!isPoll && sortedMessages.length > 0) {
        setError(''); // Clear error only if initial fetch is successful and brings messages
      } else if (!isPoll && sortedMessages.length === 0) {
        // setError('No messages found or group is empty.'); // Optionally set a specific info message
        setError(''); // Or just clear previous errors
      }

    } catch (err) {
      console.error('Error fetching messages:', err);
      // setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching messages.');
      // Always set error, regardless of isPoll, to make issues visible
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while fetching messages.';
      setError(errorMessage);
      if (!isPoll) {
        setMessages([]); // Clear messages on initial fetch error to avoid showing stale data
      }
    } finally {
      if (!isPoll) {
        setLoadingMessages(false);
        setInitialLoadComplete(true);
      }
    }
  }, [groupId, username]);

  useEffect(() => {
    if (!username) {
      navigate('/login');
      return;
    }
    if (groupId) {
      setError(''); // Clear previous errors when group changes
      setMessages([]); // Clear previous messages
      setGroupDetails(null); // Clear previous details
      setInitialLoadComplete(false);
      fetchGroupDetails();
      fetchMessages(false); // Initial fetch
    }

    // Cleanup polling on component unmount or groupId change
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [groupId, username, navigate, fetchGroupDetails, fetchMessages]);

  useEffect(() => {
    if(messages.length > 0){
        // Use auto for initial scroll to prevent jarring smooth scroll from top
        scrollToBottom(initialLoadComplete ? "smooth" : "auto"); 
    }
  }, [messages, initialLoadComplete]);

  // Polling for new messages
  useEffect(() => {
    if (!groupId || !username || !groupDetails || !initialLoadComplete) {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        return; 
    }

    // Clear existing interval before starting a new one
    if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
    }

    // window.setInterval returns a number in browser environments
    pollingIntervalRef.current = window.setInterval(() => { 
      console.log("Polling for new group messages...");
      fetchMessages(true); // Pass true for isPoll
    }, 7000); // Poll every 7 seconds

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [groupId, username, groupDetails, fetchMessages, initialLoadComplete]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !groupId || !username || !groupDetails) return;

    setSendingMessage(true);
    const tempMessageId = `temp-${Date.now()}`;
    const messageToSend = newMessage;
    setNewMessage(''); // Clear input immediately

    // Optimistic update
    const optimisticMessage: GroupMessage = {
        message_id: tempMessageId,
        group_id: groupId,
        sender_username: username,
        content: messageToSend,
        timestamp: new Date().toISOString(),
    };
    setMessages(prevMessages => 
        [...prevMessages, optimisticMessage].sort((a: GroupMessage, b: GroupMessage) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    );
    scrollToBottom();

    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_username: username, message: messageToSend }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }
      // Message sent, fetch to get actual message from server (with its ID and confirmed timestamp)
      // This will replace the optimistic one if IDs are handled or just refresh the list
      fetchMessages(true); // isPoll = true to avoid full loading indicator and use for quick refresh
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message. Please try again.');
      // Revert optimistic update
      setMessages(prevMessages => prevMessages.filter(msg => msg.message_id !== tempMessageId));
    } finally {
      setSendingMessage(false);
    }
  };

  if (!username) {
    // This case should ideally be handled by the useEffect redirect, 
    // but as a fallback:
    return <div className="app-container centered-message"><p>Please log in to view group chats.</p></div>;
  }

  // Show loading for details OR if initial messages haven't loaded yet
  if (loadingDetails || (loadingMessages && !initialLoadComplete)) {
    return <div className="app-container centered-message"><p>Loading group chat...</p></div>;
  }

  if (!groupDetails) {
    return (
      <div className="app-container centered-message">
        <p className="error-message">{error || 'Group not found, or you might not be a member.'}</p>
        <button onClick={() => navigate('/portal')} className="portal-nav-button">Back to Portal</button>
      </div>
    );
  }

  return (
    <div className="app chat-container group-chat-page themed-background">
      <aside className="group-members-sidebar">
        <h3>Members:</h3>
        <ul className="group-members-list">
            {groupDetails && groupDetails.members.map(member => 
                <li key={member} className={member === username ? 'current-user-member' : ''}>
                    {member}{member === groupDetails.creator_username ? <span className="admin-tag"> (Admin)</span> : ''}
                </li>
            )}
        </ul>
        {groupDetails && (
          <p className="group-creation-info">
            <small>
              Created by {groupDetails.creator_username} on {new Date(groupDetails.created_at).toLocaleDateString()}
            </small>
          </p>
        )}
      </aside>

      <main className="group-chat-main-content">
        <header className="chat-header group-chat-header">
          <h1>{groupDetails.group_name}</h1>
          <div className="header-actions">
              <button onClick={() => fetchMessages(false)} title="Refresh Messages" className="action-button refresh-button" disabled={loadingMessages}>
                  &#x21bb; {/* Unicode refresh symbol */}
              </button>
              <button onClick={() => navigate(`/group/${groupId}/calendar`)} title="View Calendar" className="action-button calendar-nav-button">
                  &#x1F4C5; {/* Calendar emoji/icon */}
              </button>
              <button onClick={() => navigate(`/group/${groupId}/files`)} title="View Files" className="action-button files-nav-button">
                  &#x1F4C1; {/* Folder emoji/icon */}
              </button>
              <button onClick={() => navigate('/portal')} className="action-button portal-nav-button">Portal</button>
          </div>
        </header>
        
        {error && !loadingMessages && <p className="error-message chat-error-message">{error}</p>}

        <div className="chat-messages group-chat-messages">
          {loadingMessages && messages.length === 0 ? (
            <p className="system-message">Loading messages...</p>
          ) : !loadingMessages && messages.length === 0 && initialLoadComplete ? (
            <p className="system-message">No messages in this group yet. Be the first to send one!</p>
          ) : (
            messages.map(msg => (
              <div key={msg.message_id} className={`message ${msg.sender_username === username ? 'sent' : 'received'}`}>
                {msg.sender_username !== username && (
                  <strong className="message-sender">{msg.sender_username}</strong>
                )}
                <p className="message-content">{msg.content}</p>
                <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="inputContainer group-input-container">
          <input 
            type="text" 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)} 
            placeholder="Type your message..."
            disabled={sendingMessage || !groupDetails}
          />
          <button type="submit" className="send-button" disabled={sendingMessage || !newMessage.trim() || !groupDetails}>
            {sendingMessage ? 'Sending...' : 'Send'}
          </button>
        </form>
      </main>
    </div>
  );
};

export default GroupChat; 