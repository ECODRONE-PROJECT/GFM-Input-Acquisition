import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Modal } from '@/components/ui/Modal';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, CheckCircle, ShieldCheck, CreditCard, Banknote, MapPin, Lock, ChevronLeft, Smartphone } from 'lucide-react';
import { fetchCreditScore, initializePaystackPayment } from '@/lib/clientData';
import { mapAuthUser } from '@/lib/supabase';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Checkout failed.';
}

export default function CheckoutPage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { items, total, itemCount, clearCart } = useCart();
  const user = authUser ? mapAuthUser(authUser) : null;
  const userId = user?.id ?? '';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<{
    orderId: string;
    total: number;
    creditApplied: number;
    cashDue: number;
  } | null>(null);

  // Structured Address
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');

  const [availableCredit, setAvailableCredit] = useState<number | null>(null);
  const [creditScore, setCreditScore] = useState<number | null>(null);
  const [creditworthiness, setCreditworthiness] = useState<string | null>(null);
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditError, setCreditError] = useState(false);
  
  // Payment Logic
  const [paymentMode, setPaymentMode] = useState<'cash' | 'credit' | 'mixed'>('cash');
  const [creditApplied, setCreditApplied] = useState(0);

  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });

  const maxApplicableCredit = Math.min(availableCredit ?? 0, total);
  const cashDue = Math.max(0, total - creditApplied);
  const creditUtilPct = availableCredit ? Math.round((creditApplied / availableCredit) * 100) : 0;

  useEffect(() => {
    if (authLoading || !userId) return;

    const loadCredit = async () => {
      setCreditLoading(true);
      try {
        const scoreData = await fetchCreditScore(userId);
        const creditLimit = Number(
          scoreData.credit_limit ??
          scoreData.available_credit ??
          scoreData.approved_credit_limit ??
          0
        );
        setAvailableCredit(creditLimit);
        setCreditScore(Number(scoreData.credit_score || 0));
        setCreditworthiness(scoreData.creditworthiness || null);
        
        // Default to credit if available and enough to cover some
        if (creditLimit > 0) {
          setPaymentMode('credit');
          setCreditApplied(Math.min(creditLimit, total));
        }
      } catch {
        setCreditError(true);
      } finally {
        setCreditLoading(false);
      }
    };
    void loadCredit();
  }, [authLoading, userId, total]);

  // Handle Payment Mode Switches
  useEffect(() => {
    if (paymentMode === 'cash') {
      setCreditApplied(0);
    } else if (paymentMode === 'credit') {
      setCreditApplied(maxApplicableCredit);
    }
    // 'mixed' maintains the current creditApplied (slider value)
  }, [paymentMode, maxApplicableCredit]);

  const handleProcessOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullAddress = `${street}, ${city} ${zip}`.trim();
    if (!street || !city) {
      return setErrorModal({ isOpen: true, title: 'Action Required', message: 'Please specify a delivery address.' });
    }
    if (!user?.email) {
      return setErrorModal({ isOpen: true, title: 'Missing Email', message: 'Account email required for payment.' });
    }

    setLoading(true);
    try {
      const response = await initializePaystackPayment({
        userId: user.id,
        email: user.email,
        address: fullAddress,
        items: items.map(i => ({ id: i.id, quantity: i.quantity, price: i.price })),
        totalAmount: total,
        credit_applied: creditApplied,
        callback_url: `${window.location.origin}/checkout/verify`,
      });

      if (response.payment_required) {
        window.location.assign(response.authorization_url);
        return;
      }

      setCompletedOrder({
        orderId: response.orderId,
        total: total,
        creditApplied: creditApplied,
        cashDue: cashDue,
      });
      if (clearCart) clearCart();
      setSuccess(true);
    } catch (error: unknown) {
      setErrorModal({ isOpen: true, title: 'Checkout Failed', message: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const headingStyle: React.CSSProperties = {
    fontFamily: "'Newsreader', serif",
    color: '#1a1c1b',
    fontWeight: 800
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0fdf4' }}>
        <CheckCircle size={80} color="#166534" style={{ marginBottom: '2rem' }} />
        <h1 style={{ ...headingStyle, fontSize: '3rem', color: '#166534', marginBottom: '1rem' }}>Order Confirmed!</h1>
        <div style={{ backgroundColor: 'white', padding: '2rem 3rem', borderRadius: '24px', border: '1px solid #bbf7d0', marginBottom: '2rem', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: '1rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>Payment Summary</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ color: '#166534', fontWeight: 700, margin: 0 }}>Credit Used: GHS {(completedOrder?.creditApplied ?? 0).toFixed(2)}</p>
            <p style={{ color: '#1d4ed8', fontWeight: 700, margin: 0 }}>Cash Paid: GHS {(completedOrder?.cashDue ?? 0).toFixed(2)}</p>
            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '1rem', paddingTop: '1rem' }}>
              <p style={{ color: '#0f172a', fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>
                Total: GHS {(completedOrder?.total ?? 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => navigate('/orders')} style={{ backgroundColor: '#166534', color: 'white', padding: '1rem 2rem', borderRadius: '12px', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
            Track Order
          </button>
          <button onClick={() => navigate('/shop')} style={{ backgroundColor: 'white', color: '#166534', padding: '1rem 2rem', borderRadius: '12px', fontWeight: 800, border: '1px solid #166534', cursor: 'pointer' }}>
            Return to Store
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <Modal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        title={errorModal.title}
        message={errorModal.message}
      />

      <nav style={{ padding: '1.25rem 5%', backgroundColor: 'white', position: 'sticky', top: 0, zIndex: 50, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
        <Logo />
      </nav>

      <main style={{ padding: '4rem 5%', maxWidth: '1400px', margin: '0 auto', width: '100%', flex: 1 }}>
        <div style={{ marginBottom: '3rem' }}>
          <Link to="/cart" style={{ color: '#64748b', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', backgroundColor: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '99px' }}>
            <ChevronLeft size={16} /> Back to Cart
          </Link>
          <h1 style={{ color: '#1a1c1b', fontWeight: 800, fontSize: '3.5rem', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Finalize Your Order</h1>
          <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: 500 }}>
            Review your agricultural inputs and select a payment method to cultivate your next season.
          </p>
        </div>

        {!user ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b', backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1.5rem' }} />
            <p style={{ fontWeight: 600 }}>Syncing your agronomy profile...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '3rem', alignItems: 'start' }}>
            
            {/* Left Column: Summary & Address */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              
              {/* Order Summary */}
              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1a1c1b' }}>Order Summary</h2>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#084c17', backgroundColor: '#f0fdf4', padding: '0.25rem 0.75rem', borderRadius: '99px' }}>{itemCount} Items</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {items.map(item => (
                    <div key={item.id} style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', gap: '1.5rem', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '12px', backgroundColor: '#f8fafc', flexShrink: 0, overflow: 'hidden' }}>
                        <img src={item.imageUrl || (item.type === 'SEED' ? '/seed.png' : '/fertilizer.png')} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1a1c1b', margin: 0 }}>{item.name}</h3>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, margin: '0.25rem 0 0' }}>{item.type} | {item.quantity} {item.unit || 'Units'}</p>
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1a1c1b' }}>GHS {(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Delivery Address */}
              <section>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1a1c1b', marginBottom: '1.5rem' }}>Delivery Address</h2>
                <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>STREET ADDRESS</label>
                    <input 
                      type="text" 
                      value={street} 
                      onChange={e => setStreet(e.target.value)}
                      placeholder="Highland Valley Farm, 442 Seedling Road"
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.95rem', fontWeight: 500 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>CITY</label>
                    <input 
                      type="text" 
                      value={city} 
                      onChange={e => setCity(e.target.value)}
                      placeholder="Lexington"
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.95rem', fontWeight: 500 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>POSTAL CODE</label>
                    <input 
                      type="text" 
                      value={zip} 
                      onChange={e => setZip(e.target.value)}
                      placeholder="KY 40502"
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.95rem', fontWeight: 500 }}
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Payment & Total */}
            <aside style={{ position: 'sticky', top: '100px' }}>
              <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.08)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1a1c1b', marginBottom: '2rem' }}>Payment Method</h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
                  {/* Cash on Delivery */}
                  <label style={{ 
                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', minHeight: '88px',
                    borderRadius: '16px', border: `2px solid ${paymentMode === 'cash' ? '#084c17' : '#f1f5f9'}`,
                    backgroundColor: paymentMode === 'cash' ? '#f0fdf4' : 'transparent', cursor: 'pointer', transition: 'all 0.2s'
                  }}>
                    <input type="radio" checked={paymentMode === 'cash'} onChange={() => setPaymentMode('cash')} style={{ width: '18px', height: '18px', accentColor: '#084c17' }} />
                    <div style={{ width: '44px', height: '44px', backgroundColor: '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0 }}>
                      <Smartphone size={22} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#1a1c1b', fontSize: '0.95rem' }}>Mobile Money / Card</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400 }}>Secure payment via Paystack</div>
                    </div>
                  </label>
                  
                  {(() => {
                    const hasNoCredit = (availableCredit || 0) <= 0;
                    return (
                      <>
                        {/* Grow-Credit Line */}
                        <label style={{ 
                          display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', minHeight: '88px',
                          borderRadius: '16px', border: `2px solid ${paymentMode === 'credit' ? '#084c17' : '#f1f5f9'}`,
                          backgroundColor: paymentMode === 'credit' ? '#f0fdf4' : 'transparent', 
                          cursor: hasNoCredit ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                          opacity: hasNoCredit ? 0.5 : 1
                        }}>
                          <input 
                            type="radio" 
                            name="payment"
                            disabled={hasNoCredit}
                            checked={paymentMode === 'credit'} 
                            onChange={() => !hasNoCredit && setPaymentMode('credit')} 
                            style={{ width: '18px', height: '18px', accentColor: '#084c17' }} 
                          />
                          <div style={{ width: '44px', height: '44px', backgroundColor: '#e2f5ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1', flexShrink: 0 }}>
                            <CreditCard size={22} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, color: '#1a1c1b', fontSize: '0.95rem' }}>Grow-Credit Line</div>
                            {hasNoCredit ? (
                              <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>Credit Application Required</div>
                            ) : (
                              <div style={{ fontSize: '1rem', color: '#15803d', fontWeight: 800, marginTop: '0.1rem' }}>
                                Limit: GHS {(availableCredit ?? 0).toFixed(2)}
                              </div>
                            )}
                          </div>
                          {hasNoCredit && <Lock size={16} color="#94a3b8" />}
                        </label>

                        {/* Mixed */}
                        <label style={{ 
                          display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', minHeight: '88px',
                          borderRadius: '16px', border: `2px solid ${paymentMode === 'mixed' ? '#084c17' : '#f1f5f9'}`,
                          backgroundColor: paymentMode === 'mixed' ? '#f0fdf4' : 'transparent', 
                          cursor: hasNoCredit ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                          opacity: hasNoCredit ? 0.5 : 1
                        }}>
                          <input 
                            type="radio" 
                            name="payment"
                            disabled={hasNoCredit}
                            checked={paymentMode === 'mixed'} 
                            onChange={() => !hasNoCredit && setPaymentMode('mixed')} 
                            style={{ width: '18px', height: '18px', accentColor: '#084c17' }} 
                          />
                          <div style={{ width: '44px', height: '44px', backgroundColor: '#fff7ed', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c2410c', flexShrink: 0 }}>
                            <ShieldCheck size={22} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, color: '#1a1c1b', fontSize: '0.95rem' }}>Mixed Payment</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400 }}>{hasNoCredit ? 'Locked for non-credit accounts' : 'Split Cash + Credit'}</div>
                          </div>
                          {hasNoCredit && <Lock size={16} color="#94a3b8" />}
                        </label>
                      </>
                    );
                  })()}
                </div>

                {/* Mixed Mode Controls */}
                {paymentMode === 'mixed' && (
                  <div style={{ marginBottom: '2.5rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <label style={{ fontWeight: 800, color: '#64748b', fontSize: '0.7rem' }}>CREDIT ALLOCATION</label>
                      <span style={{ fontWeight: 900, color: '#084c17' }}>GHS {creditApplied.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" 
                      min={0} 
                      max={maxApplicableCredit} 
                      value={creditApplied} 
                      onChange={e => setCreditApplied(Number(e.target.value))} 
                      style={{ width: '100%', accentColor: '#084c17', height: '6px' }} 
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
                      <span>CASH ONLY</span>
                      <span>MAX CREDIT</span>
                    </div>
                  </div>
                )}

                {/* Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', fontSize: '1rem', color: '#64748b', fontWeight: 600 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal</span>
                    <span>GHS {total.toFixed(2)}</span>
                  </div>
                  {creditApplied > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#084c17' }}>
                      <span>Credit Applied</span>
                      <span>- GHS {creditApplied.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #f8fafc', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                    <span style={{ color: '#1a1c1b', fontWeight: 800 }}>Order Total</span>
                    <span style={{ color: '#084c17', fontWeight: 900, fontSize: '1.5rem' }}>GHS {total.toFixed(2)}</span>
                  </div>
                  {creditApplied > 0 && (
                    <div style={{ textAlign: 'right', fontSize: '1rem', color: '#64748b', marginTop: '1rem', borderTop: '1px dashed #e2e8f0', paddingTop: '1rem' }}>
                      Cash Due: <span style={{ color: '#1d4ed8', fontWeight: 900, fontSize: '1.5rem' }}>GHS {cashDue.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleProcessOrder}
                  disabled={loading}
                  style={{ 
                    width: '100%', backgroundColor: loading ? '#64748b' : '#084c17', color: 'white', padding: '1.25rem', 
                    borderRadius: '16px', fontWeight: 800, fontSize: '1.1rem', cursor: loading ? 'not-allowed' : 'pointer',
                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                    boxShadow: '0 10px 25px -5px rgba(8, 76, 23, 0.3)'
                  }}
                >
                  {loading ? <Loader2 size={24} className="animate-spin" /> : <ShieldCheck size={24} />}
                  {loading ? 'Securing Transaction...' : 'Place Secure Order'}
                </button>

                <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: 0.5 }}>
                  <Lock size={12} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em' }}>ENCRYPTED AGRI-DATA PIPELINE</span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
