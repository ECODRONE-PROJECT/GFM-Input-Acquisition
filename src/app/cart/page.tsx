"use client";
import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { useCart } from '@/context/CartContext';
import { ShoppingCart, ArrowRight, Trash2, Plus, Minus } from 'lucide-react';

export default function CartPage() {
  const { items, removeFromCart, addToCart, total, itemCount } = useCart();

  const handleDecreaseQuantity = (item: any) => {
    if (item.quantity === 1) {
      removeFromCart(item.id);
    } else {
      addToCart({ ...item, quantity: -1 });
    }
  };

  const handleIncreaseQuantity = (item: any) => {
    addToCart({ ...item, quantity: 1 });
  };

  return (
    <div style={{ 
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      backgroundImage: 'url(/farmers_bg.png)', backgroundSize: 'cover',
      backgroundPosition: 'center', backgroundAttachment: 'fixed',
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(16, 60, 31, 0.85)', zIndex: 0 }} />

      {/* Navigation */}
      <nav style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '1.25rem 5%', backgroundColor: 'rgba(5, 32, 17, 0.9)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <Logo />
        <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center', color: 'white' }}>
          <Link href="/shop" style={{ color: 'white', textDecoration: 'none', fontWeight: 600 }}>Back to Catalog</Link>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
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
        </div>
      </nav>

      <main style={{ padding: '4rem 5%', maxWidth: '1200px', margin: '0 auto', width: '100%', flex: 1, position: 'relative', zIndex: 10 }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'white', marginBottom: '2.5rem', textShadow: '0 2px 10px rgba(0,0,0,0.3)', letterSpacing: '-0.02em' }}>Your Cart</h1>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 2rem', backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(16px)', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.2)' }}>
            <ShoppingCart size={80} color="#cbd5e1" style={{ margin: '0 auto 1.5rem', opacity: 0.7 }} />
            <h2 style={{ fontSize: '1.75rem', color: 'white', marginBottom: '1rem', fontWeight: 800 }}>Your cart is currently empty</h2>
            <p style={{ color: '#e2e8f0', marginBottom: '2.5rem', fontSize: '1.1rem' }}>Proceed to the catalog to purchase items securely.</p>
            <Link href="/shop" style={{ 
              backgroundColor: '#c3d928', color: '#0C2D1C', padding: '1.25rem 2.5rem', 
              borderRadius: '0.75rem', fontWeight: 800, textDecoration: 'none',
              boxShadow: '0 10px 15px -3px rgba(195, 217, 40, 0.15)', fontSize: '1.1rem'
            }}>Return to Shop</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
            {/* Items Column */}
            <div style={{ flex: '1 1 600px' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.2)', overflow: 'hidden' }}>
                {items.map((item, i) => (
                  <div key={item.id} style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2rem',
                    borderBottom: i !== items.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', margin: '0 0 0.5rem 0' }}>{item.name}</h3>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 0.75rem 0' }}>Type: <span style={{ color: '#e2e8f0' }}>{item.type}</span></p>
                      <div style={{ fontWeight: 800, color: '#fcd34d', fontSize: '1.25rem' }}>GH₵ {item.price.toFixed(2)}</div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                      {/* Quantity Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.75rem' }}>
                        <button onClick={() => handleDecreaseQuantity(item)} style={{ background: 'none', border: 'none', padding: '0.75rem', cursor: 'pointer', display: 'flex', color: 'white' }}>
                          <Minus size={18} />
                        </button>
                        <span style={{ padding: '0 0.5rem', fontWeight: 800, minWidth: '2rem', textAlign: 'center', color: 'white', fontSize: '1.1rem' }}>{item.quantity}</span>
                        <button onClick={() => handleIncreaseQuantity(item)} style={{ background: 'none', border: 'none', padding: '0.75rem', cursor: 'pointer', display: 'flex', color: 'white', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                          <Plus size={18} />
                        </button>
                      </div>

                      <div style={{ fontWeight: 900, width: '120px', textAlign: 'right', color: 'white', fontSize: '1.25rem' }}>
                        GH₵ {(item.price * item.quantity).toFixed(2)}
                      </div>

                      <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.75rem', display: 'flex', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>
                        <Trash2 size={24} color="#fca5a5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Column */}
            <div style={{ flex: '1 1 350px' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', padding: '2.5rem', borderRadius: '1.5rem', border: '1px solid #f5a623', position: 'sticky', top: '100px', boxShadow: '0 20px 40px -5px rgba(0,0,0,0.4)' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginBottom: '2rem' }}>Order Summary</h2>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', color: '#e2e8f0', fontSize: '1.1rem' }}>
                  <span>Subtotal ({itemCount} items)</span>
                  <span style={{ fontWeight: 600 }}>GH₵ {total.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', color: '#e2e8f0', fontSize: '1.1rem' }}>
                  <span>Aggregated Discount</span>
                  <span style={{ color: '#86efac', fontWeight: 600 }}>- GH₵ 0.00</span>
                </div>
                
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '2rem', marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>Total Due</span>
                  <span style={{ fontSize: '2rem', fontWeight: 900, color: '#f5a623' }}>GH₵ {total.toFixed(2)}</span>
                </div>

                <Link href="/checkout" style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                  backgroundColor: '#c3d928', color: '#0C2D1C', padding: '1.25rem', 
                  borderRadius: '0.75rem', fontWeight: 800, fontSize: '1.15rem', cursor: 'pointer', 
                  textDecoration: 'none', transition: 'transform 0.2s', boxShadow: '0 10px 15px -3px rgba(195, 217, 40, 0.15)'
                }}>
                  Proceed to Checkout <ArrowRight size={22} />
                </Link>
                <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#94a3b8', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  Secure Checkout SSL
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
