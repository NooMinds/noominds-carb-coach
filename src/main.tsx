import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import './index.css';

/**
 * NooMinds Carb Coach - Main Entry Point
 * 
 * This is the main entry point for the NooMinds Carb Coach application.
 * It sets up React Router and renders the App component.
 * 
 * The app is designed to help endurance athletes train their gut to tolerate
 * higher carbohydrate intake rates during training and competition.
 */

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);
