import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { verifyPaystackPayment } from '@/lib/clientData';
import { useCart } from '@/context/CartContext';

type VerifyState = 'verifying' | 'success' | 'error';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Payment verification failed.';
}

export default function CheckoutVerifyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const didRun = useRef(false);
  const reference = searchParams.get('reference') || searchParams.get('trxref') || '';
  const missingReference = !reference;

  const [state, setState] = useState<VerifyState>('verifying');
  const [message, setMessage] = useState('Verifying your Paystack payment...');
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (didRun.current || missingReference) {
      return;
    }
    didRun.current = true;

    const runVerification = async () => {
      try {
        const response = await verifyPaystackPayment(reference);
        setOrderId(response.orderId);
        setState('success');
        setMessage('Payment confirmed and order recorded.');
        if (clearCart) {
          clearCart();
        }
      } catch (error: unknown) {
        setState('error');
        setMessage(getErrorMessage(error));
      }
    };

    void runVerification();
  }, [reference, missingReference, clearCart]);

  useEffect(() => {
    if (state !== 'success') {
      return;
    }

    const timerId = window.setTimeout(() => {
      navigate('/orders', { replace: true });
    }, 1200);

    return () => window.clearTimeout(timerId);
  }, [state, navigate]);

  const effectiveState: VerifyState = missingReference ? 'error' : state;
  const effectiveMessage = missingReference ? 'Missing payment reference. Please restart checkout.' : message;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '1rem', width: '100%', maxWidth: '540px', padding: '2rem', textAlign: 'center' }}>
        {effectiveState === 'verifying' ? (
          <Loader2 size={44} className="animate-spin" style={{ margin: '0 auto 1rem', color: '#166534' }} />
        ) : effectiveState === 'success' ? (
          <CheckCircle size={44} style={{ margin: '0 auto 1rem', color: '#166534' }} />
        ) : (
          <AlertTriangle size={44} style={{ margin: '0 auto 1rem', color: '#b91c1c' }} />
        )}

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
          {effectiveState === 'verifying' ? 'Finalizing Payment' : effectiveState === 'success' ? 'Payment Successful' : 'Verification Failed'}
        </h1>
        <p style={{ color: '#475569', marginBottom: '1.5rem' }}>{effectiveMessage}</p>

        {orderId && (
          <p style={{ fontSize: '0.9rem', color: '#334155', marginBottom: '1.5rem' }}>
            Order ID: <strong>{orderId}</strong>
          </p>
        )}

        {effectiveState === 'success' ? (
          <button
            type="button"
            onClick={() => navigate('/orders', { replace: true })}
            style={{ backgroundColor: '#166534', color: 'white', border: 'none', borderRadius: '9999px', padding: '0.8rem 1.5rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Track My Order
          </button>
        ) : effectiveState === 'error' ? (
          <button
            type="button"
            onClick={() => navigate('/checkout')}
            style={{ backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '9999px', padding: '0.8rem 1.5rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Return to Checkout
          </button>
        ) : null}
      </div>
    </div>
  );
}
