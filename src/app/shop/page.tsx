"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Logo } from '@/components/ui/Logo';
import { useCart } from '@/context/CartContext';
import { ShoppingCart, Plus, Minus } from 'lucide-react';

export default function Shop() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, itemCount } = useCart();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Filters
  const [filterType, setFilterType] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('NONE');
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    fetch('/api/admin/inputs')
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleQuantityUpdate = (productId: string, value: number, max: number, isAbsolute = false) => {
    setQuantities(prev => {
      const current = prev[productId] || 1;
      let next = isAbsolute ? value : current + value;
      if (next < 1) next = 1;
      if (next > max) next = max;
      return { ...prev, [productId]: next };
    });
  };

  const displayedProducts = products
    .filter(p => filterType === 'ALL' || p.type === filterType)
    .filter(p => !inStockOnly || p.stock > 0)
    .sort((a, b) => {
      if (sortOrder === 'PRICE_ASC') return a.price - b.price;
      if (sortOrder === 'PRICE_DESC') return b.price - a.price;
      return 0; // Default
    });

  return (
    <div style={{ 
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      backgroundImage: 'url(/farmers_bg.png)', backgroundSize: 'cover',
      backgroundPosition: 'center', backgroundAttachment: 'fixed',
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(16, 60, 31, 0.85)', zIndex: 0 }} />

      <nav style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '1.25rem 5%', backgroundColor: 'rgba(5, 32, 17, 0.9)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <Logo />
        <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center', color: 'white' }}>
          <Link href="/cart" style={{ color: 'white', textDecoration: 'none' }}>
            <div style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ShoppingCart size={28} strokeWidth={2} />
              {itemCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-10px', right: '-12px',
                  backgroundColor: '#ef4444', color: 'white', fontSize: '0.75rem',
                  fontWeight: 800, padding: '3px 7px', borderRadius: '9999px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {itemCount}
                </span>
              )}
            </div>
          </Link>
        </div>
      </nav>

      <main style={{ padding: '4rem 5%', maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 10, width: '100%' }}>
        <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, color: 'white', marginBottom: '1rem', letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
            Agricultural Inputs Catalog
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#e2e8f0', maxWidth: '750px', margin: '0 auto', lineHeight: 1.6 }}>
            Gain exclusive access to secure your bulk seed and fertilizer orders directly from verified supply providers. 
          </p>
        </div>

        <div style={{ 
          display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center', 
          marginBottom: '3rem', padding: '1rem 2rem', backgroundColor: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(10px)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ color: 'white', fontWeight: 600 }}>Category:</span>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', backgroundColor: 'white', fontWeight: 600 }}>
              <option value="ALL">All Items</option>
              <option value="SEED">Seeds</option>
              <option value="FERTILIZER">Fertilizers</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ color: 'white', fontWeight: 600 }}>Sort By:</span>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', backgroundColor: 'white', fontWeight: 600 }}>
              <option value="NONE">Default</option>
              <option value="PRICE_ASC">Price: Low to High</option>
              <option value="PRICE_DESC">Price: High to Low</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              In Stock Only
            </label>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#cbd5e1', fontSize: '1.2rem' }}>Pulling dynamic catalog...</div>
        ) : displayedProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'white', backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(16px)', borderRadius: '1rem', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>No inputs match your exact filter profiles.</div>
            <button onClick={() => { setFilterType('ALL'); setSortOrder('NONE'); setInStockOnly(false); }} style={{ marginTop: '1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: '#166534', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Reset Filter Array</button>
          </div>
        ) : (
          <div className="shop-grid">
            {displayedProducts.map(product => {
              const qty = quantities[product.id] || 1;
              return (
              <div key={product.id} style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)',
                borderRadius: '1.25rem', overflow: 'hidden', boxShadow: '0 20px 40px -5px rgba(0,0,0,0.3)', 
                border: '1px solid rgba(255, 255, 255, 0.25)', display: 'flex', flexDirection: 'column'
              }}>
                <div style={{ position: 'relative', height: '220px', width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <Image 
                    src={product.imageUrl || (product.type === 'SEED' ? '/seed.png' : '/fertilizer.png')} 
                    alt={product.name}
                    fill
                    loading="eager"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 25vw, 25vw"
                    style={{ objectFit: 'cover' }}
                  />
                  {product.stock === 0 && (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 800 }}>OUT OF STOCK</span>
                    </div>
                  )}
                </div>
                
                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.3 }}>{product.name}</h3>
                    <span style={{ 
                      backgroundColor: product.type === 'SEED' ? 'rgba(22, 163, 74, 0.2)' : 'rgba(37, 99, 235, 0.2)', 
                      color: product.type === 'SEED' ? '#bbf7d0' : '#bfdbfe', 
                      padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800,
                      border: `1px solid ${product.type === 'SEED' ? 'rgba(22, 163, 74, 0.4)' : 'rgba(37, 99, 235, 0.4)'}`
                    }}>
                      {product.type}
                    </span>
                  </div>
                  
                  {product.location && (
                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>📍 {product.location}</div>
                  )}
                  
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fcd34d', marginBottom: '0.5rem', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                    GH₵ {product.price.toFixed(2)} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>/ unit</span>
                  </div>
                  <p style={{ color: '#e2e8f0', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                    Bulk Available: <span style={{ fontWeight: 700, color: 'white' }}>{product.stock} units</span>
                  </p>
                  
                  {product.stock > 0 ? (
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                        <button onClick={() => handleQuantityUpdate(product.id, -1, product.stock)} style={{ background: 'none', border: 'none', padding: '0.75rem', color: 'white', cursor: 'pointer' }}><Minus size={16} /></button>
                        <input 
                          type="number"
                          value={qty}
                          onChange={(e) => handleQuantityUpdate(product.id, parseInt(e.target.value) || 1, product.stock, true)}
                          style={{ 
                            width: '45px', textAlign: 'center', backgroundColor: 'transparent', 
                            border: 'none', color: 'white', fontWeight: 800, fontSize: '1.05rem',
                            outline: 'none', padding: 0
                          }}
                        />
                        <button onClick={() => handleQuantityUpdate(product.id, 1, product.stock)} style={{ background: 'none', border: 'none', padding: '0.75rem', color: 'white', cursor: 'pointer' }}><Plus size={16} /></button>
                      </div>
                      <button 
                        onClick={() => addToCart({ ...product, quantity: qty })}
                        style={{ flex: 1, backgroundColor: '#c3d928', color: '#0C2D1C', border: 'none', borderRadius: '0.75rem', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', transition: 'background-color 0.2s', boxShadow: '0 10px 15px -3px rgba(195, 217, 40, 0.15)' }}
                      >
                        Add to Cart
                      </button>
                    </div>
                  ) : (
                    <button disabled style={{ marginTop: 'auto', backgroundColor: '#475569', color: '#94a3b8', border: 'none', padding: '1rem', borderRadius: '0.75rem', fontWeight: 800, fontSize: '1rem', cursor: 'not-allowed' }}>
                      Unavailable
                    </button>
                  )}
                </div>
              </div>
            )})}
          </div>
        )}
      </main>
    </div>
  );
}
