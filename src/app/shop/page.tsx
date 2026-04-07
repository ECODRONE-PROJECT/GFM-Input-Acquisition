"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { useCart } from '@/context/CartContext';

export default function Shop() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, itemCount } = useCart();

  useEffect(() => {
    fetch('/api/admin/inputs')
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Navigation */}
      <nav style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '1.5rem 2rem', backgroundColor: 'rgba(16, 60, 31, 0.95)',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
      }}>
        <Logo />
        <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center', color: 'white' }}>
          <Link href="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 600 }}>Back to App</Link>
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            <span style={{ fontSize: '1.5rem' }}>🛒</span>
            {itemCount > 0 && (
              <span style={{
                position: 'absolute', top: '-8px', right: '-12px',
                backgroundColor: '#ef4444', color: 'white', fontSize: '0.75rem',
                fontWeight: 800, padding: '2px 6px', borderRadius: '9999px'
              }}>
                {itemCount}
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Main Shop Interface */}
      <main style={{ padding: '4rem 5%', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '4rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#166534', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Agricultural Inputs Catalog
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#475569', maxWidth: '700px', margin: '0 auto', lineHeight: 1.6 }}>
            Gain exclusive access to secure your bulk seed and fertilizer orders directly from verified supply providers. 
            All logistics are handled dynamically by the GrowForMe network.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Pulling dynamic catalog from database...</div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b', backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
            No inputs currently available in the catalog.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2.5rem' }}>
            {products.map(product => (
              <div key={product.id} style={{ 
                backgroundColor: 'white', borderRadius: '1.25rem', overflow: 'hidden', 
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0',
                display: 'flex', flexDirection: 'column'
              }}>
                <div style={{ 
                    padding: '2rem', backgroundColor: product.type === 'SEED' ? '#f0fdf4' : '#eff6ff', 
                    borderBottom: '1px solid #e2e8f0', textAlign: 'center', minHeight: '180px', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}>
                  <span style={{ fontSize: '5rem' }}>{product.type === 'SEED' ? '🌱' : '⚙️'}</span>
                </div>
                
                <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>{product.name}</h3>
                    <span style={{ 
                      backgroundColor: product.type === 'SEED' ? '#dcfce7' : '#dbeafe', 
                      color: product.type === 'SEED' ? '#166534' : '#1e40af', 
                      padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800 
                    }}>
                      {product.type}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#166534', marginBottom: '0.5rem' }}>
                    GH₵ {product.price.toFixed(2)} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>/ unit</span>
                  </div>
                  <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '2.5rem' }}>
                    Available Bulk Capacity: <span style={{ fontWeight: 700, color: '#334155' }}>{product.stock} units</span>
                  </p>
                  
                  <button 
                    onClick={() => addToCart({ ...product, quantity: 1 })}
                    style={{ 
                      marginTop: 'auto', backgroundColor: '#166534', color: 'white', 
                      border: 'none', padding: '1rem', borderRadius: '0.5rem', 
                      fontWeight: 800, fontSize: '1rem', cursor: 'pointer', 
                      transition: 'background-color 0.2s, transform 0.1s',
                      boxShadow: '0 4px 6px -1px rgba(22, 101, 52, 0.4)'
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#14532d'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = '#166534'}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    Add to Cart Queue
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
