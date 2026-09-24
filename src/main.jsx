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

// Safe root mount — if #root doesn't exist, create it (prevents black screen on APK)
let rootElement = document.getElementById('root');
if (!rootElement) {
  rootElement = document.createElement('div');
  rootElement.id = 'root';
  document.body.appendChild(rootElement);
}

try {
  ReactDOM.createRoot(rootElement).render(
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
} catch (err) {
  // Ultimate fallback: if React itself fails to mount, show a basic recovery screen
  console.error('Overgain fatal mount error:', err);
  rootElement.innerHTML = `
    <div style="min-height:100vh;background:#0a0a0a;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:sans-serif">
      <div style="font-size:48px;margin-bottom:16px">🏋️</div>
      <h2 style="margin:0 0 12px;font-size:1.25rem">Overgain — Erro na Inicialização</h2>
      <p style="color:#a1a1aa;font-size:0.875rem;max-width:320px;margin:0 0 20px">
        Ocorreu um erro ao carregar o aplicativo. Toque abaixo para recarregar.
      </p>
      <button onclick="location.reload()" style="padding:14px 32px;border:none;border-radius:12px;background:#3b82f6;color:#fff;font-weight:700;font-size:0.9375rem;cursor:pointer">
        Recarregar
      </button>
      <button onclick="try{localStorage.clear();sessionStorage.clear()}catch(e){}location.href='/'" style="margin-top:10px;padding:10px 24px;border:1px solid #333;border-radius:12px;background:#18181b;color:#aaa;font-size:0.8125rem;cursor:pointer">
        Limpar Dados e Reiniciar
      </button>
    </div>
  `;
}

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
