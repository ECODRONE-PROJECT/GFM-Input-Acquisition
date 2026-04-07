"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <aside style={{ 
        width: isMinimized ? '80px' : '260px', 
        backgroundColor: '#1e293b', 
        color: 'white', 
        padding: isMinimized ? '1.5rem 0.5rem' : '2rem',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 10px rgba(0,0,0,0.1)'
      }}>
        {/* Header containing Logo and Minimize Button */}
        <div style={{ 
            display: 'flex', 
            justifyContent: isMinimized ? 'center' : 'space-between', 
            alignItems: 'center', 
            marginBottom: '3rem'
        }}>
          {!isMinimized && (
            <div style={{ transform: 'scale(0.85)', transformOrigin: 'left center' }}>
              <Logo />
            </div>
          )}
          <button 
            onClick={() => setIsMinimized(!isMinimized)} 
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              color: '#f8fafc', 
              cursor: 'pointer', 
              padding: '0.5rem',
              borderRadius: '0.375rem',
              outline: 'none',
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px'
            }}
            title={isMinimized ? "Expand sidebar" : "Minimize sidebar"}
          >
            {isMinimized ? '▶' : '◀'}
          </button>
        </div>
        
        {/* Navigation Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
          <Link href="/admin" style={{ 
            color: 'white', 
            padding: '0.75rem', 
            backgroundColor: 'rgba(255,255,255,0.15)', 
            borderRadius: '0.5rem', 
            fontWeight: 500, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            whiteSpace: 'nowrap',
            textDecoration: 'none'
          }}>
            <div style={{ minWidth: '24px', display: 'flex', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
            </div>
            <span style={{ 
              opacity: isMinimized ? 0 : 1, 
              width: isMinimized ? 0 : 'auto', 
              overflow: 'hidden', 
              transition: 'all 0.3s ease' 
            }}>
              Catalog Data
            </span>
          </Link>

          <Link href="/" style={{ 
            color: '#94a3b8', 
            fontSize: '0.9rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            padding: '0.75rem', 
            whiteSpace: 'nowrap',
            marginTop: 'auto',
            textDecoration: 'none'
          }}>
            <div style={{ minWidth: '24px', display: 'flex', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </div>
            <span style={{ 
              opacity: isMinimized ? 0 : 1, 
              width: isMinimized ? 0 : 'auto', 
              overflow: 'hidden', 
              transition: 'all 0.3s ease' 
            }}>
              Exit to Storefront
            </span>
          </Link>
        </nav>
      </aside>
      
      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '3rem', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
