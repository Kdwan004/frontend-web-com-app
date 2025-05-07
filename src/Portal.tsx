import React from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

const Portal: React.FC = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");

  const handleLogout = () => {
    localStorage.removeItem("username");
    navigate("/login");
  };

  return (
    <div className="app portal">
      <div className="portal-header">
        <h1>Welcome, {username}</h1>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </div>
      
      <div className="portal-actions">
        <button 
          className="portal-button create-group"
          onClick={() => navigate("/create-group")}
        >
          <span className="button-icon">👥</span>
          <span className="button-text">Create a Group</span>
          <span className="button-description">Start a new group chat</span>
        </button>

        <button 
          className="portal-button join-group"
          onClick={() => navigate("/join-group")}
        >
          <span className="button-icon">🔗</span>
          <span className="button-text">Join a Group</span>
          <span className="button-description">Enter an existing group</span>
        </button>

        <button 
          className="portal-button direct-message"
          onClick={() => navigate("/direct-message")}
        >
          <span className="button-icon">💬</span>
          <span className="button-text">Direct Message</span>
          <span className="button-description">Chat with someone individually</span>
        </button>
      </div>
    </div>
  );
};

export default Portal; 