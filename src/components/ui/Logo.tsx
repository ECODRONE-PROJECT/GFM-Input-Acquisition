import React from 'react';
import Image from 'next/image';

export const Logo = () => {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      padding: '0.4rem 1rem',
      borderRadius: '0.5rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }}>
      <Image
        src="/gfm_logo.png"
        alt="Grow For Me Logo"
        width={150}
        height={40}
        priority
        style={{
          height: '40px', objectFit: 'contain', width: 'auto'
        }}
      />
    </div>
  );
};
