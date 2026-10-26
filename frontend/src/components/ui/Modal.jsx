import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import './Modal.css';

export const Modal = React.forwardRef(({
  open = false,
  onClose,
  title,
  children,
  size = 'md',
  className = '',
  ...props
}, ref) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape' && open) {
      onClose();
    }
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
      
      if (modalRef.current) {
        modalRef.current.focus();
      }
    } else {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
      
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={(node) => {
          modalRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={`modal modal-${size} ${className}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
        {...props}
      >
        {title && (
          <div className="modal-header">
            <h2 id="modal-title" className="modal-title">{title}</h2>
            <button
              className="modal-close"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
});

Modal.displayName = 'Modal';

export const Drawer = React.forwardRef(({
  open = false,
  onClose,
  position = 'right',
  children,
  size = 'md',
  className = '',
  ...props
}, ref) => {
  const drawerRef = useRef(null);
  const previousActiveElement = useRef(null);

  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape' && open) {
      onClose();
    }
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
      
      if (drawerRef.current) {
        drawerRef.current.focus();
      }
    } else {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
      
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        ref={(node) => {
          drawerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={`drawer drawer-${position} drawer-${size} ${className}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        {...props}
      >
        <button
          className="drawer-close"
          onClick={onClose}
          aria-label="Close drawer"
        >
          <X size={20} />
        </button>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  );
});

Drawer.displayName = 'Drawer';
