"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Modal } from '@/components/ui/Modal';
import { useCart } from '@/context/CartContext';
import { Loader2, CheckCircle, ShieldCheck } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, itemCount, clearCart } = useCart();
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [address, setAddress] = useState('');

  // Modal states
  const [authModal, setAuthModal] = useState(false);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    const savedUser = localStorage.getItem('gfm_user');
    if (!savedUser) {
      setAuthModal(true);
    } else {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleProcessOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      return setErrorModal({ isOpen: true, title: 'Action Required', message: 'Please specify a precise delivery location endpoint.' });
    }
    
    setLoading(true);
    try {
      const payload = {
        userId: user.id,
        items: items.map(i => ({ id: i.id, quantity: i.quantity, price: i.price })),
        totalAmount: total
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      if (clearCart) clearCart();
      setSuccess(true);
    } catch (err: any) {
      setErrorModal({ isOpen: true, title: 'Checkout Sequence Failure', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0fdf4' }}>
        <CheckCircle size={80} color="#166534" style={{ marginBottom: '2rem' }} />
        <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#166534', marginBottom: '1rem' }}>Order Confirmed!</h1>
        <p style={{ color: '#475569', fontSize: '1.25rem', marginBottom: '3rem' }}>Your bulk capacities are natively locked for delivery.</p>
        <Link href="/shop" style={{ backgroundColor: '#c3d928', color: '#0C2D1C', padding: '1rem 2rem', borderRadius: '9999px', fontWeight: 800, textDecoration: 'none' }}>
          Back to Storefront
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      
      <Modal 
        isOpen={authModal} 
        onClose={() => router.push('/shop')} 
        title="Authentication Required" 
        message="Please securely sign in to finalize your bulk purchase order."
        primaryAction={() => router.push('/login?redirect=/checkout')}
        primaryText="Proceed to Sign In"
      />

      <Modal 
        isOpen={errorModal.isOpen} 
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })} 
        title={errorModal.title} 
        message={errorModal.message}
      />

      <nav style={{ padding: '1.5rem 2rem', backgroundColor: 'rgba(16, 60, 31, 0.95)', position: 'sticky', top: 0, zIndex: 50, display: 'flex', justifyContent: 'center' }}>
        <Logo />
      </nav>

      <main style={{ padding: '4rem 5%', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '2rem' }}>Secure Checkout Funnel</h1>
        
        {user ? (
        <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#475569', marginBottom: '0.5rem' }}>Authorized Context</h2>
              <div style={{ fontWeight: 800, fontSize: '1.5rem', color: '#166534' }}>{user.name} ({user.email})</div>
            </div>
            <ShieldCheck size={48} color="#166534" />
          </div>

          <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', color: '#475569', marginBottom: '1rem' }}>Order Aggregation Summary</h2>
            <p style={{ fontSize: '1.1rem', color: '#334155', fontWeight: 600 }}>Total Items: {itemCount}</p>
            <p style={{ fontSize: '1.75rem', color: '#0C2D1C', fontWeight: 900 }}>Total Due: GH₵ {total.toFixed(2)}</p>
          </div>

          <form onSubmit={handleProcessOrder}>
            <h2 style={{ fontSize: '1.25rem', color: '#475569', marginBottom: '1.5rem' }}>Shipping Logistics</h2>
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Geographic Coordinate or Physical Address</label>
              <textarea 
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{ width: '100%', padding: '1rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', minHeight: '100px', fontSize: '1rem' }}
                placeholder="Enter exact drop-off coordinates or farm settlement..."
              />
            </div>

            <button 
              type="submit" disabled={loading}
              style={{ 
                width: '100%', backgroundColor: '#166534', color: 'white', padding: '1.25rem', 
                borderRadius: '0.75rem', fontWeight: 800, fontSize: '1.25rem', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? <Loader2 size={24} className="animate-spin" /> : "Confirm Order Tranche"}
            </button>
          </form>
        </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#475569', fontSize: '1.2rem', backgroundColor: 'white', borderRadius: '1rem' }}>
            Waiting for Authentication Context...
          </div>
        )}
      </main>
    </div>
  );
}
