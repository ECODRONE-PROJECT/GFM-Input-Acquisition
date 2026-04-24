import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { useCart } from '@/context/CartContext';
import { ShoppingCart, ArrowRight, Trash2, Plus, Minus, ChevronLeft } from 'lucide-react';

export default function CartPage() {
  const { items, removeFromCart, addToCart, total, itemCount } = useCart();
  const navigate = useNavigate();

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

  const headingStyle: React.CSSProperties = {
    fontFamily: "'Newsreader', serif",
    color: '#1a1c1b',
    fontWeight: 800
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation */}
      <nav style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '1.25rem 5%', backgroundColor: 'white',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 1px 0 0 rgba(0,0,0,0.05)',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Logo />
        </div>
        
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', color: '#084c17' }}>
            <ShoppingCart size={24} />
            {itemCount > 0 && (
              <span style={{
                position: 'absolute', top: '-8px', right: '-10px',
                backgroundColor: '#084c17', color: 'white', fontSize: '0.65rem',
                fontWeight: 800, padding: '2px 6px', borderRadius: '9999px'
              }}>
                {itemCount}
              </span>
            )}
          </div>
        </div>
      </nav>

      <main style={{ padding: '4rem 5%', maxWidth: '1400px', margin: '0 auto', width: '100%', flex: 1 }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <Link to="/shop" style={{ color: '#64748b', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.25rem', backgroundColor: '#f1f5f9', padding: '0.45rem 1rem', borderRadius: '99px' }}>
            <ChevronLeft size={16} /> Back to Catalog
          </Link>
          <h1 style={{ 
            color: '#1a1c1b', 
            fontWeight: 800, 
            fontSize: '2.6rem', 
            margin: '0 0 0.4rem 0',
            letterSpacing: '-0.02em',
          }}>
            Your Cart
          </h1>
          <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: 500 }}>
            Fine-tune your agricultural input orders before finalizing financing.
          </p>
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '8rem 2rem', backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)' }}>
            <div style={{ width: '80px', height: '80px', backgroundColor: '#f1f5f9', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', margin: '0 auto 2rem' }}>
              <ShoppingCart size={40} />
            </div>
            <h2 style={{ ...headingStyle, fontSize: '1.75rem', marginBottom: '1rem' }}>Empty cart</h2>
            <p style={{ color: '#64748b', marginBottom: '2.5rem', fontSize: '1.1rem' }}>You haven't added any inputs to your cart yet.</p>
            <Link to="/shop" style={{ 
              backgroundColor: '#084c17', color: 'white', padding: '1rem 2.5rem', 
              borderRadius: '12px', fontWeight: 800, textDecoration: 'none',
              boxShadow: '0 10px 20px -5px rgba(8, 76, 23, 0.2)', fontSize: '1rem'
            }}>Return to Catalog</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '3rem', alignItems: 'start' }}>
            {/* Items Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)' }}>
                {items.map((item, i) => (
                  <div key={item.id} style={{ 
                    display: 'flex', alignItems: 'center', padding: '1.5rem 2rem',
                    borderBottom: i !== items.length - 1 ? '1px solid #f1f5f9' : 'none',
                    gap: '2rem'
                  }}>
                    <div style={{ width: '96px', height: '96px', borderRadius: '16px', backgroundColor: '#f8fafc', overflow: 'hidden', flexShrink: 0 }}>
                      <img 
                        src={item.imageUrl || (item.type === 'SEED' ? '/seed.png' : '/fertilizer.png')} 
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', padding: '0.35rem' }}
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#084c17', letterSpacing: '0.05em', marginBottom: '0.2rem', textTransform: 'uppercase' }}>{item.type}</div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1a1c1b', margin: '0 0 0.2rem 0', lineHeight: 1.3 }}>{item.name}</h3>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1a1c1b' }}>GHS {item.price.toFixed(2)} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>/ {item.unit || 'unit'}</span></div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                      {/* Quantity Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '0.25rem' }}>
                        <button onClick={() => handleDecreaseQuantity(item)} style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', display: 'flex', color: '#64748b' }}>
                          <Minus size={16} />
                        </button>
                        <span style={{ padding: '0 0.5rem', fontWeight: 800, minWidth: '2rem', textAlign: 'center', color: '#1a1c1b', fontSize: '1.05rem' }}>{item.quantity}</span>
                        <button onClick={() => handleIncreaseQuantity(item)} style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', display: 'flex', color: '#64748b' }}>
                          <Plus size={16} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '130px' }}>
                        <div style={{ fontWeight: 900, color: '#1a1c1b', fontSize: '1.3rem' }}>
                          GHS {(item.price * item.quantity).toFixed(2)}
                        </div>
                        <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', color: '#e11d48', fontSize: '0.75rem', fontWeight: 700, marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Column */}
            <div style={{ position: 'sticky', top: '100px' }}>
              <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 20px 450px -10px rgba(0,0,0,0.04)' }}>
                <h2 style={{ ...headingStyle, fontSize: '1.4rem', marginBottom: '2rem' }}>Order Summary</h2>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', color: '#64748b', fontSize: '0.95rem', fontWeight: 600 }}>
                  <span>Items ({itemCount})</span>
                  <span>GHS {total.toFixed(2)}</span>
                </div>
                
                <div style={{ borderTop: '2px solid #f8fafc', paddingTop: '1.5rem', marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#64748b' }}>Total Due</span>
                  <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#084c17' }}>GHS {total.toFixed(2)}</span>
                </div>

                <button 
                  onClick={() => navigate('/checkout')}
                  style={{ 
                    width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                    backgroundColor: '#084c17', color: 'white', padding: '1.1rem', 
                    borderRadius: '16px', fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer', 
                    border: 'none', boxShadow: '0 10px 25px -5px rgba(8, 76, 23, 0.25)',
                    transition: 'transform 0.2s'
                  }}
                >
                  Proceed to Checkout <ArrowRight size={20} />
                </button>
                
                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Secure SSL Checkout
                </p>
              </div>

              <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ color: '#166534' }}><ShoppingCart size={20} /></div>
                <p style={{ margin: 0, color: '#166534', fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.4 }}>
                  Approved farmers are eligible for 0% interest seasonal credit. Use our financing at checkout.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
