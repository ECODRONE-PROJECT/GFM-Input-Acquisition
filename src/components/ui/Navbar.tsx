"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export function Navbar() {
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, { rootMargin: '-50% 0px -50% 0px' }); // Tracks element exactly crossing the middle of viewport

    const sectionIds = ['hero', 'about-us', 'what-we-do', 'how-it-works', 'invest'];
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const navLinks = [
    { name: 'Home', id: 'hero' },
    { name: 'About Us', id: 'about-us' },
    { name: 'What We Do', id: 'what-we-do' },
    { name: 'How It Works', id: 'how-it-works' },
    { name: 'Invest', id: 'invest' }
  ];

  return (
    <nav style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '1rem 5%', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      marginTop: '0.5rem'
    }}>
      <Logo />

      {/* Center Floating Pill Array */}
      <div style={{
        display: 'flex', gap: '0.25rem', alignItems: 'center', fontSize: '0.85rem', fontWeight: 600,
        backgroundColor: 'rgba(5, 32, 17, 0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        padding: '0.35rem', borderRadius: '9999px', border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {navLinks.map((link) => {
          const isActive = activeSection === link.id;
          return (
            <Link
              key={link.id}
              href={`#${link.id}`}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '9999px',
                color: isActive ? '#052011' : '#cbd5e1',
                backgroundColor: isActive ? '#c3d928' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
              }}
            >
              {link.name}
            </Link>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <Link href="/login" style={{
          padding: '0.75rem 1.5rem', color: '#FFFFFF',
          fontWeight: 800, fontSize: '0.9rem', textDecoration: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px'
        }}>
          Sign In
          <span style={{ display: 'block', width: '70%', height: '2.5px', backgroundColor: '#c3d928', borderRadius: '9999px' }} />
        </Link>
        <Link href="/register" style={{
          padding: '0.75rem 1.75rem', backgroundColor: '#c3d928', color: '#0C2D1C',
          borderRadius: '9999px', fontWeight: 800, textTransform: 'none', fontSize: '0.9rem',
          boxShadow: '0 4px 6px rgba(195, 217, 40, 0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          Register
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', backgroundColor: '#0C2D1C', color: '#c3d928', borderRadius: '50%', fontSize: '0.65rem' }}>↗</span>
        </Link>
      </div>
    </nav>
  );
}
