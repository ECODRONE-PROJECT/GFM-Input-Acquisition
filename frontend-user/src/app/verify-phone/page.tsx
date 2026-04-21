import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { resendPhoneOtp, verifyPhoneOtp } from '@/lib/authApi';
import { useAuth } from '@/context/AuthContext';

function resolveSafeRedirectTarget(rawRedirect: string | null): string {
  if (!rawRedirect) return '/shop';
  const candidate = rawRedirect.trim();
  return candidate.startsWith('/') ? candidate : '/shop';
}

export default function VerifyPhonePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshPhoneVerification } = useAuth();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const queryUserId = searchParams.get('userId') || '';
  const queryPhone = searchParams.get('phone') || '';
  const queryEmail = searchParams.get('email') || '';
  const redirectTarget = resolveSafeRedirectTarget(searchParams.get('redirect'));

  const metadataPhone = typeof user?.user_metadata?.phone === 'string' ? user.user_metadata.phone : '';
  const userId = queryUserId || user?.id || '';
  const phone = queryPhone || metadataPhone;
  const email = queryEmail || user?.email || '';

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!userId || !phone) {
      setError('Missing verification context. Please register or sign in again.');
      return;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Enter the 6-digit OTP code sent to your phone.');
      return;
    }

    setLoading(true);
    try {
      await verifyPhoneOtp({ userId, phone, otp: otp.trim() });
      await refreshPhoneVerification();
      setInfo('Phone verification complete.');

      if (user) {
        navigate(redirectTarget, { replace: true });
      } else {
        navigate('/login?registered=true&verify=true', { replace: true });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');

    if (!userId || !phone) {
      setError('Cannot resend OTP: missing user or phone details.');
      return;
    }

    setResendLoading(true);
    try {
      await resendPhoneOtp({ userId, phone });
      setInfo('A new OTP has been sent to your phone.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resend OTP.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: 'url(/farmers_bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(12, 45, 28, 0.65)',
          zIndex: 0,
        }}
      />

      <nav
        style={{
          padding: '1.5rem 2rem',
          backgroundColor: 'rgba(16, 60, 31, 0.65)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 50,
          position: 'sticky',
          top: 0,
        }}
      >
        <Logo />
      </nav>

      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '480px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            padding: '3rem 2.5rem',
            borderRadius: '1rem',
            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          }}
        >
          <h1 style={{ fontSize: '2rem', textAlign: 'center', color: '#111827', fontWeight: 700, marginBottom: '0.5rem' }}>
            Verify Phone Number
          </h1>
          <p style={{ textAlign: 'center', color: '#4b5563', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Enter the 6-digit SMS OTP sent to <strong>{phone || 'your phone number'}</strong>. Code expires in 5 minutes.
          </p>
          {email && (
            <p style={{ textAlign: 'center', color: '#4b5563', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Email to confirm: <strong>{email}</strong>
            </p>
          )}

          {error && (
            <div
              style={{
                color: 'var(--error)',
                backgroundColor: '#fef2f2',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                marginBottom: '1rem',
                fontSize: '0.875rem',
                borderLeft: '4px solid var(--error)',
              }}
            >
              {error}
            </div>
          )}
          {info && (
            <div
              style={{
                color: '#065f46',
                backgroundColor: '#ecfdf5',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                marginBottom: '1rem',
                fontSize: '0.875rem',
                borderLeft: '4px solid #10b981',
              }}
            >
              {info}
            </div>
          )}

          <form onSubmit={handleVerify}>
            <Input
              label="SMS OTP Code"
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <div style={{ marginTop: '2rem', display: 'flex', gap: '0.75rem' }}>
              <Button type="submit" isLoading={loading}>
                Verify OTP
              </Button>
            </div>
          </form>

          <div style={{ marginTop: '1rem' }}>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '9999px',
                border: '1px solid #c3d928',
                backgroundColor: 'transparent',
                color: '#0C2D1C',
                fontWeight: 700,
                cursor: resendLoading ? 'not-allowed' : 'pointer',
                opacity: resendLoading ? 0.7 : 1,
              }}
            >
              {resendLoading ? 'Sending...' : 'Resend OTP'}
            </button>
          </div>

          {!user && (
            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: '#4b5563' }}>
              Already verified? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
