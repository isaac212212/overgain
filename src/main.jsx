// Android WebView & Browser polyfills
if (typeof window !== 'undefined') {
  window.global = window.global || window;
  window.process = window.process || { env: {} };
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <DataProvider>
              <App />
            </DataProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

// Register Service Worker for PWA with full security checks for Mobile/Android APK
if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  window.location &&
  (window.location.protocol === 'https:' || window.location.hostname === 'localhost') &&
  import.meta.env?.PROD
) {
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registrado com sucesso: ', reg.scope);
        })
        .catch((err) => {
          console.warn('Falha ao registrar Service Worker (ignorado para APK/local): ', err);
        });
    } catch (err) {
      console.warn('Erro ao inicializar Service Worker: ', err);
    }
  });
}

