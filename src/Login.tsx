import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from './config';

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const validateForm = () => {
    setError("");
    setSuccess("");

    if (!username || !password) {
      setError("Username and password are required");
      return false;
    }

    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
  
      const data = await response.json();
      
      if (response.ok && data.message === "Login successful") {
        setSuccess(data.message);
        localStorage.setItem("username", username);
        setTimeout(() => navigate("/portal"), 1500);
      } else {
        setError(data.error || "Login failed. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
      console.error('Login Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
<div className="app">
  <div className="auth-form">
    <h1 className="form-title">Login</h1>
    <form onSubmit={handleLogin}>
      <div className="form-group">
        <input 
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      <div className="form-group">
        <input 
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      <div className="form-group">
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Processing..." : "Login"}
        </button>
      </div>

      <div className="form-group center-link">
        <button 
          type="button" 
          onClick={() => navigate("/register")}
          disabled={isLoading}
          className="link-button"
        >
          Don't have an account? Register
        </button>
      </div>
    </form>
    {error && <p className="error">{error}</p>}
    {success && <p className="success">{success}</p>}
  </div>
</div>

  );
};

export default Login;
