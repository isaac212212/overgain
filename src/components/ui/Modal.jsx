import './Modal.css';
import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md', // sm, md, lg, full
  showClose = true
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content modal-${size} animate-scale-in`}
        onClick={e => e.stopPropagation()}
      >
        {(title || showClose) && (
          <div className="modal-header">
            {title && <h3 className="modal-title">{title}</h3>}
            {showClose && (
              <button className="modal-close" onClick={onClose} aria-label="Fechar">
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
