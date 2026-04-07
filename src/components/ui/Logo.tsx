import React from 'react';

export const Logo = ({ light = false }: { light?: boolean }) => {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      padding: '0.4rem 1rem',
      borderRadius: '0.5rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }}>
      <img
        src="/gfm_logo.png"
        alt="Grow For Me Logo"
        style={{
          height: '40px', objectFit: 'contain',
        }}
      />
    </div>
  );
};
