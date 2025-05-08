import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import Login from './Login';
import Register from './Register';
import Portal from './Portal';
import Chat from './Chat';
import DirectMessage from './DirectMessage';
import GroupChat from './GroupChat';
import GroupCalendar from './GroupCalendar';
import GroupFiles from './GroupFiles';

// Helper component to protect routes
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const isAuthenticated = !!localStorage.getItem('username'); // Simple check
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/portal" 
          element={<ProtectedRoute><Portal /></ProtectedRoute>} 
        />
        <Route 
          path="/chat" 
          element={<ProtectedRoute><Chat /></ProtectedRoute>} 
        />
        <Route 
          path="/direct-message" 
          element={<ProtectedRoute><DirectMessage /></ProtectedRoute>} 
        />
        <Route 
          path="/groups/:groupId" 
          element={<ProtectedRoute><GroupChat /></ProtectedRoute>}
        />
        <Route 
          path="/group/:groupId/calendar" 
          element={<ProtectedRoute><GroupCalendar /></ProtectedRoute>}
        />
        <Route 
          path="/group/:groupId/files" 
          element={<ProtectedRoute><GroupFiles /></ProtectedRoute>}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
