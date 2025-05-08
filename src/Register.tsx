import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from './config';
import { generateKeyPair, storePrivateKey } from './utils/crypto';
import './index.css';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Generate key pair
      const keyPair = await generateKeyPair();

      // Store private key in localStorage
      storePrivateKey(keyPair.privateKey);

      // Register user with public key
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          public_key: keyPair.publicKey
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store username in localStorage
      localStorage.setItem('username', username);
      
      // Navigate to portal
      navigate('/portal');
    } catch (error) {
      console.error('Registration error:', error);
      setError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="auth-container">
        <h1>Register</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        {error && <div className="error-message">{error}</div>}
        <p className="auth-link">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="link-button">
            Login
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;
