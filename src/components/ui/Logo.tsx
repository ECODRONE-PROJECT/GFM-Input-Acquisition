import Image from 'next/image';
import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
      <div 
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '0.35rem 1rem',
          borderRadius: '9999px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
      >
        <Image 
          src="/gfm_logo.png" 
          width={130} 
          height={32} 
          alt="Grow For Me Logo" 
          style={{ objectFit: 'contain' }} 
          priority
        />
      </div>
    </Link>
  );
}
