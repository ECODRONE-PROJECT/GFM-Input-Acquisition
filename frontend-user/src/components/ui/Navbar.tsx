import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Menu, X } from 'lucide-react';

export function Navbar() {
  const [activeSection, setActiveSection] = useState('hero');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, { rootMargin: '-50% 0px -50% 0px' });

    const sectionIds = ['hero', 'about-us', 'what-we-do', 'how-it-works', 'invest'];
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Close mobile menu on scroll
  useEffect(() => {
    const handleScroll = () => setMenuOpen(false);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', id: 'hero' },
    { name: 'About Us', id: 'about-us' },
    { name: 'What We Do', id: 'what-we-do' },
    { name: 'How It Works', id: 'how-it-works' },
    { name: 'Invest', id: 'invest' }
  ];

  const linkStyle = (isActive: boolean) => ({
    padding: '0.65rem 1.25rem',
    borderRadius: '9999px',
    color: isActive ? '#052011' : '#cbd5e1',
    backgroundColor: isActive ? '#c3d928' : 'transparent',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    fontWeight: 600 as const,
    fontSize: '0.85rem',
    whiteSpace: 'nowrap' as const,
  });

  return (
    <>
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1rem 5%', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        marginTop: '0.5rem'
      }}>
        <Logo />

        {/* Desktop Center Floating Pill */}
        <div className="nav-desktop-pill" style={{
          display: 'flex', gap: '0.25rem', alignItems: 'center', fontSize: '0.85rem', fontWeight: 600,
          backgroundColor: 'rgba(5, 32, 17, 0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          padding: '0.35rem', borderRadius: '9999px', border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {navLinks.map((link) => (
            <a key={link.id} href={`#${link.id}`} style={linkStyle(activeSection === link.id)}>
              {link.name}
            </a>
          ))}
        </div>

        {/* Desktop Right Actions */}
        <div className="nav-desktop-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link to="/login" style={{
            padding: '0.75rem 1.5rem', color: '#FFFFFF',
            fontWeight: 800, fontSize: '0.9rem', textDecoration: 'none',
            position: 'relative', whiteSpace: 'nowrap'
          }}>
            Sign In
            <span style={{ position: 'absolute', bottom: '6px', left: '50%', transform: 'translateX(-50%)', width: '50%', height: '2.5px', backgroundColor: '#c3d928', borderRadius: '9999px', display: 'block' }} />
          </Link>
          <Link to="/register" style={{
            padding: '0.75rem 1.75rem', backgroundColor: '#c3d928', color: '#0C2D1C',
            borderRadius: '9999px', fontWeight: 800, fontSize: '0.9rem',
            boxShadow: '0 4px 6px rgba(195, 217, 40, 0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            Register
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', backgroundColor: '#0C2D1C', color: '#c3d928', borderRadius: '50%', fontSize: '0.65rem' }}>↗</span>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: 'none', background: 'rgba(5, 32, 17, 0.75)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px', padding: '0.6rem', color: '#ffffff', cursor: 'pointer',
            backdropFilter: 'blur(20px)', alignItems: 'center', justifyContent: 'center'
          }}
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99,
          backgroundColor: 'rgba(2, 18, 8, 0.97)', backdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column', padding: '6rem 2rem 3rem',
          gap: '0.5rem'
        }}>
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '1rem 1.5rem', borderRadius: '12px', fontSize: '1.25rem', fontWeight: 800,
                color: activeSection === link.id ? '#052011' : '#e2e8f0',
                backgroundColor: activeSection === link.id ? '#c3d928' : 'transparent',
                textDecoration: 'none', transition: 'all 0.2s',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}
            >
              {link.name}
            </a>
          ))}
          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Link to="/login" onClick={() => setMenuOpen(false)} style={{
              padding: '1rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '9999px', color: '#ffffff', fontWeight: 700, fontSize: '1rem'
            }}>Sign In</Link>
            <Link to="/register" onClick={() => setMenuOpen(false)} style={{
              padding: '1rem', textAlign: 'center', backgroundColor: '#c3d928',
              borderRadius: '9999px', color: '#0C2D1C', fontWeight: 800, fontSize: '1rem'
            }}>Register</Link>
          </div>
        </div>
      )}

      {/* Responsive styles injected via <style> */}
      <style>{`
        @media (max-width: 768px) {
          .nav-desktop-pill { display: none !important; }
          .nav-desktop-actions { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  );
}
