import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  children?: React.ReactNode;
  primaryAction?: () => void;
  primaryText?: string;
}

export function Modal({ isOpen, onClose, title, message, children, primaryAction, primaryText }: ModalProps) {
  if (!isOpen) return null;
  
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: '#fff', padding: '2.5rem', borderRadius: '1.25rem',
        maxWidth: '450px', width: '90%', textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        {title && (
          <h2 style={{ color: '#0f172a', fontWeight: 800, fontSize: '1.5rem', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            {title}
          </h2>
        )}
        
        {children ? (
          <div style={{ textAlign: 'left' }}>
            {children}
          </div>
        ) : (
          <>
            {message && (
              <p style={{ color: '#475569', fontSize: '1.1rem', marginBottom: '2.5rem', lineHeight: 1.6 }}>
                {message}
              </p>
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={onClose} 
                style={{ 
                  padding: '0.75rem 1.5rem', border: 'none', backgroundColor: '#f1f5f9', color: '#475569',
                  borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'background-color 0.2s', flex: 1
                }}
              >
                Close
              </button>
              
              {primaryAction && (
                <button 
                  onClick={primaryAction} 
                  style={{ 
                    padding: '0.75rem 1.5rem', border: 'none', backgroundColor: '#166534', color: 'white', 
                    borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer', flex: 1,
                    boxShadow: '0 4px 6px -1px rgba(22, 101, 52, 0.3)'
                  }}
                >
                  {primaryText}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
