import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

// Global listener for non-React contexts (e.g., supabase.js)
let globalToastHandler = null;

export const showToast = (message, type = 'error', duration = 4000) => {
  if (globalToastHandler) {
    globalToastHandler({ message, type, duration });
  } else {
    console.log(`[Toast ${type.toUpperCase()}]: ${message}`);
  }
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = 'info', duration = 4000 }) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Register global handler
  React.useEffect(() => {
    globalToastHandler = addToast;
    return () => {
      globalToastHandler = null;
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ showToast: addToast, removeToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          left: 'auto',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '380px',
          width: 'calc(100% - 40px)',
          pointerEvents: 'none'
        }}
      >
        {toasts.map(toast => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';

          const bgColor = isError
            ? 'rgba(239, 68, 68, 0.95)'
            : isSuccess
            ? 'rgba(34, 197, 94, 0.95)'
            : 'rgba(39, 39, 42, 0.95)';

          const borderColor = isError
            ? '#dc2626'
            : isSuccess
            ? '#16a34a'
            : '#3f3f46';

          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: bgColor,
                border: `1px solid ${borderColor}`,
                backdropFilter: 'blur(8px)',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 500,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
                animation: 'slideIn 0.2s ease-out forwards',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                {isError ? (
                  <AlertCircle size={18} style={{ flexShrink: 0, color: '#fee2e2' }} />
                ) : isSuccess ? (
                  <CheckCircle size={18} style={{ flexShrink: 0, color: '#dcfce7' }} />
                ) : (
                  <Info size={18} style={{ flexShrink: 0, color: '#e0e7ff' }} />
                )}
                <span>{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.8,
                  borderRadius: '6px'
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (msg, type) => showToast(msg, type),
      removeToast: () => {}
    };
  }
  return context;
}
