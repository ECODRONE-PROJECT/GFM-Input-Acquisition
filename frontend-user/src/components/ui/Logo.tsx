import { Link } from 'react-router-dom';

export function Logo() {
  return (
    <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
      <div 
        style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform 0.2s ease'
        }}
      >
        <img
          src="/gfm_logo.png"
          width={145}
          height={38}
          alt="Grow For Me Logo"
          style={{ objectFit: 'contain' }}
        />
      </div>
    </Link>
  );
}
