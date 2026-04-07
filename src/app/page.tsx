import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export default function Home() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundImage: 'url(/farmers_bg.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative'
    }}>
      {/* Dark gradient overlay at top for better navbar contrast */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, height: '150px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
        pointerEvents: 'none'
      }} />

      {/* Navigation Bar */}
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1.5rem 2rem', 
        backgroundColor: 'rgba(16, 60, 31, 0.65)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 10,
        position: 'relative' 
      }}>
        <Logo />
        
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', fontSize: '0.875rem', fontWeight: 500, color: 'white' }}>
          <Link href="#" style={{ color: 'white', transition: 'opacity 0.2s' }}>INVESTMENTS</Link>
          <Link href="#" style={{ color: 'white', transition: 'opacity 0.2s' }}>WHAT WE DO</Link>
          <Link href="#" style={{ color: 'white', transition: 'opacity 0.2s' }}>ABOUT US</Link>
          <Link href="#" style={{ color: 'white', transition: 'opacity 0.2s' }}>HOW IT WORKS</Link>
          <div style={{ display: 'flex', gap: '1rem', marginLeft: '1rem' }}>
            <Link href="/register" style={{
              padding: '0.6rem 1.5rem',
              backgroundColor: 'white',
              color: 'var(--primary)',
              borderRadius: '9999px',
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
              transition: 'background-color 0.2s'
            }}>
              Register
            </Link>
            <Link href="/login" style={{
              padding: '0.6rem 1.5rem',
              border: '2px solid white',
              backgroundColor: 'transparent',
              color: 'white',
              borderRadius: '9999px',
              fontWeight: 600,
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
              transition: 'all 0.2s'
            }}>
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'flex-end', 
        padding: '3rem 5%',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Dark Green Glassmorphic Card Overlay */}
        <div style={{ 
          maxWidth: '850px', 
          backgroundColor: 'rgba(16, 60, 31, 0.70)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '3.5rem', 
          borderRadius: '1.5rem', 
          boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)',
          marginBottom: '5vh' 
        }}>
          <h1 style={{ 
            color: '#ffffff', 
            fontSize: '3.8rem', 
            marginBottom: '1rem', 
            letterSpacing: '-0.025em',
            fontWeight: 800,
            lineHeight: 1.1
          }}>
            Aggregating Demand for Farmers
          </h1>
          <h2 style={{ 
            color: '#d1d5db', 
            fontSize: '1.75rem', 
            marginBottom: '1.5rem', 
            fontWeight: 400 
          }}>
            By connecting input providers and farmers.
          </h2>
          <p style={{ 
            fontSize: '1.05rem', 
            marginBottom: '2.5rem', 
            color: '#f3f4f6',
            maxWidth: '100%',
            lineHeight: 1.7
          }}>
            Combining capital, technology, and robust supply chains, we are enabling farmers to securely register and bulk-order seeds, fertilizers, and other crucial inputs through our centralized application. We give off-takers a platform to source efficiently.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link href="/register" style={{ 
              backgroundColor: 'white', 
              color: 'var(--primary)', 
              padding: '1rem 2rem', 
              borderRadius: '0.375rem', 
              fontWeight: '700',
              transition: 'background-color 0.2s',
            }}>
              Invest in Agriculture
            </Link>
            <Link href="/login" style={{ 
              backgroundColor: '#f5a623', 
              color: '#ffffff', 
              padding: '1rem 2rem', 
              borderRadius: '0.375rem', 
              fontWeight: '600',
              transition: 'opacity 0.2s',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              Order Commodities
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
