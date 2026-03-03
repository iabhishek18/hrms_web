// ============================================
// Application Entry Point
// ============================================
// Bootstraps the React application with all required providers:
//   - React 18 createRoot for concurrent features
//   - Redux Provider for global state management
//   - BrowserRouter for client-side routing
//   - Toaster for toast notifications
//
// This file is referenced by index.html via:
//   <script type="module" src="/src/main.tsx"></script>

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import App from './App';
import { store } from './store/store';

// Import global styles (Tailwind CSS base + custom styles)
import './index.css';

// ============================================
// Toast Configuration
// ============================================
// Default toast options applied to all toast notifications.
// Individual toasts can override these settings.

const toastOptions = {
  // Default duration in milliseconds
  duration: 4000,

  // Position on screen
  position: 'top-right' as const,

  // Style overrides for dark theme compatibility
  style: {
    background: '#1e293b',
    color: '#e2e8f0',
    borderRadius: '12px',
    border: '1px solid #334155',
    padding: '12px 16px',
    fontSize: '14px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.2)',
  },

  // Success toast styling
  success: {
    iconTheme: {
      primary: '#22c55e',
      secondary: '#1e293b',
    },
    style: {
      background: '#1e293b',
      color: '#e2e8f0',
      border: '1px solid #166534',
    },
  },

  // Error toast styling
  error: {
    duration: 5000, // Errors stay longer
    iconTheme: {
      primary: '#ef4444',
      secondary: '#1e293b',
    },
    style: {
      background: '#1e293b',
      color: '#e2e8f0',
      border: '1px solid #991b1b',
    },
  },

  // Loading toast styling
  loading: {
    iconTheme: {
      primary: '#6366f1',
      secondary: '#1e293b',
    },
  },
};

// ============================================
// Root Element
// ============================================

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    'Root element not found. Make sure there is a <div id="root"></div> in your index.html.',
  );
}

// ============================================
// Render Application
// ============================================
// Uses React 18's createRoot API for concurrent rendering.
// StrictMode is enabled to help catch potential issues:
//   - Warns about deprecated lifecycle methods
//   - Detects unexpected side effects
//   - Ensures reusable state
//   - In development, components render twice to expose bugs

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    {/* Redux store provider — makes the store available to all components */}
    <Provider store={store}>
      {/* BrowserRouter — enables client-side routing with clean URLs */}
      <BrowserRouter>
        {/* Main application component with all routes */}
        <App />

        {/* Global toast notification container */}
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          containerClassName=""
          containerStyle={{
            top: 20,
            right: 20,
          }}
          toastOptions={toastOptions}
        />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);
