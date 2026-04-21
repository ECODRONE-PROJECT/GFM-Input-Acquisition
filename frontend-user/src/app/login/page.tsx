import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Modal } from '@/components/ui/Modal';
import { fetchPhoneVerificationStatus } from '@/lib/authApi';
import { mapAuthUser, requireSupabase } from '@/lib/supabase';

function resolveSafeRedirectTarget(rawRedirect: string | null): string {
  if (!rawRedirect) {
    return '/shop';
  }

  const candidate = rawRedirect.trim();
  if (candidate.startsWith('/')) {
    return candidate;
  }

  try {
    const parsed = new URL(candidate, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      return '/shop';
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/shop';
  }
}

function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  
  const searchParams = new URLSearchParams(location.search);
  const isRegistered = searchParams.get('registered');
  const requiresVerification = searchParams.get('verify') === 'true';
  const redirectTarget = resolveSafeRedirectTarget(searchParams.get('redirect'));

  const buildVerifyPhonePath = (userId: string, phone?: string | null, email?: string | null) => {
    const params = new URLSearchParams({ userId });
    if (phone) params.set('phone', phone);
    if (email) params.set('email', email);
    if (redirectTarget) params.set('redirect', redirectTarget);
    return `/verify-phone?${params.toString()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const client = requireSupabase();
      const { data, error } = await client.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) throw error;
      if (!data.user) throw new Error('Login failed');

      const phoneVerified = await fetchPhoneVerificationStatus(data.user.id);
      if (!phoneVerified) {
        await client.auth.signOut();
        const phone = typeof data.user.user_metadata?.phone === 'string' ? data.user.user_metadata.phone : '';
        navigate(buildVerifyPhonePath(data.user.id, phone, data.user.email ?? ''), { replace: true });
        return;
      }

      localStorage.setItem('gfm_user', JSON.stringify(mapAuthUser(data.user)));
      setSuccessModal(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal 
        isOpen={successModal}
        onClose={() => navigate(redirectTarget, { replace: true })}
        title="Authentication Successful"
        message="You are now securely signed in to the GrowForMe Network."
        primaryAction={() => navigate(redirectTarget, { replace: true })}
        primaryText="Continue"
      />
      
      <div style={{ 
        width: '100%', 
        maxWidth: '450px', 
        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '3rem 2.5rem', 
        borderRadius: '1rem', 
        boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)' 
      }}>
        <h1 style={{ fontSize: '2rem', textAlign: 'center', color: '#111827', fontWeight: 700, marginBottom: '0.5rem' }}>Welcome Back</h1>
        <p style={{ textAlign: 'center', color: '#4b5563', marginBottom: '2.5rem', fontSize: '1rem' }}>Sign in to manage your input orders</p>
        
        {isRegistered && (
          <div style={{ 
            color: '#065f46', backgroundColor: '#ecfdf5', padding: '1rem', 
            borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.95rem', 
            border: '1px solid #10b981', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' 
          }}>
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem', fontSize: '1rem' }}>Account Created Successfully!</strong>
              {requiresVerification
                ? 'Please check your email inbox to verify your account address, and then log in below to access your dashboard.'
                : 'Your profile has been secured. Please enter your new credentials below to log in.'}
            </div>
          </div>
        )}
        {error && <div style={{ color: 'var(--error)', backgroundColor: '#fef2f2', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1.5rem', fontSize: '0.875rem', borderLeft: '4px solid var(--error)' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <Input label="Email Address" id="email" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          <Input label="Password" id="password" type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
          
          <div style={{ marginTop: '2.5rem' }}>
            <Button type="submit" isLoading={loading}>Sign In</Button>
          </div>
        </form>
        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: '#4b5563' }}>
          New to Grow For Me? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Create an account</Link>
        </div>
      </div>
    </>
  );
}

export default function Login() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundImage: 'url(/farmers_bg.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '150px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)', pointerEvents: 'none' }} />

      <nav style={{ padding: '1.5rem 2rem', backgroundColor: 'rgba(16, 60, 31, 0.65)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', zIndex: 50, position: 'sticky', top: 0 }}>
        <Logo />
      </nav>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', zIndex: 10 }}>
        <LoginForm />
      </main>
    </div>
  );
}
