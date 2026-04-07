import Image from 'next/image';
import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" style={{ textDecoration: 'none' }}>
      <div 
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '0.4rem 1.25rem',
          borderRadius: '9999px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 15px rgba(255,255,255,0.2)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255, 255, 255, 1)',
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
      >
        <Image 
          src="/gfm_logo.png" 
          width={180} 
          height={45} 
          alt="Grow For Me Logo" 
          style={{ objectFit: 'contain' }} 
          priority
        />
      </div>
    </Link>
  );
}
