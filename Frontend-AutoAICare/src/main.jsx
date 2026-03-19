import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import ScrollToTop from './components/ScrollToTop';
import { AuthProvider } from './contexts/AuthContext';
import { BranchProvider } from './contexts/BranchContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AppProvider } from './contexts/AppContext';
import { TimerProvider } from './contexts/TimerContext';
import TimerAlertToast from './components/TimerAlertToast';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <BranchProvider>
          <NotificationProvider>
            <TimerProvider>
              <AppProvider>
                <ScrollToTop />
                <App />
                <TimerAlertToast />
              </AppProvider>
            </TimerProvider>
          </NotificationProvider>
        </BranchProvider>
      </AuthProvider>
    </Router>
  </React.StrictMode>,
);

