import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Overgain ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    try {
      window.location.reload();
    } catch {
      // fallback
    }
  };

  handleClearDataAndReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
    try {
      window.location.href = '/';
    } catch {
      // fallback
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0a0a0a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          boxSizing: 'border-box'
        }}>
          {/* Logo / Icon */}
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '20px',
            backgroundColor: '#18181b',
            border: '1px solid #27272a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
          }}>
            <span style={{ fontSize: '32px' }}>🏋️</span>
          </div>

          <h2 style={{
            fontSize: '1.375rem',
            fontWeight: 800,
            color: '#f4f4f5',
            margin: '0 0 10px 0',
            letterSpacing: '-0.02em'
          }}>
            Overgain — Recuperação Segura
          </h2>

          <p style={{
            fontSize: '0.875rem',
            color: '#a1a1aa',
            maxWidth: '340px',
            lineHeight: 1.5,
            margin: '0 0 24px 0'
          }}>
            O aplicativo identificou uma inconsistência durante a inicialização no dispositivo. Toque abaixo para recarregar normalmente.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '300px' }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: '12px',
                border: 'none',
                background: '#3b82f6',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.9375rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
            >
              Tentar Novamente
            </button>

            <button
              type="button"
              onClick={this.handleClearDataAndReset}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: '12px',
                border: '1px solid #27272a',
                background: '#18181b',
                color: '#a1a1aa',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: 'pointer'
              }}
            >
              Restaurar Padrões e Limpar Cache
            </button>
          </div>

          {/* Collapsible Error Details for APK debugging */}
          {this.state.error && (
            <details style={{ marginTop: '28px', maxWidth: '340px', textAlign: 'left', color: '#71717a', fontSize: '0.6875rem' }}>
              <summary style={{ cursor: 'pointer', outline: 'none' }}>Detalhes técnicos do erro</summary>
              <pre style={{
                background: '#141416',
                padding: '10px',
                borderRadius: '8px',
                overflowX: 'auto',
                marginTop: '6px',
                color: '#ef4444',
                fontFamily: 'monospace'
              }}>
                {String(this.state.error.toString())}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
