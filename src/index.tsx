import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import Login from './Login';
import Register from './Register';
import Portal from './Portal';
import Chat from './Chat';
import DirectMessage from './DirectMessage';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/portal" element={<Portal />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/direct-message" element={<DirectMessage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
