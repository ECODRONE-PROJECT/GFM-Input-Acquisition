import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { registerWithOtp } from '@/lib/authApi';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please ensure both fields are exactly identical.');
      return;
    }
    
    setLoading(true);

    try {
      const registration = await registerWithOtp({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
      });

      const params = new URLSearchParams({
        userId: registration.user_id,
        phone: registration.phone,
        email: registration.email,
      });
      navigate(`/verify-phone?${params.toString()}`, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
      {/* Dark gradient overlay at top for better navbar contrast */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, height: '150px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
        pointerEvents: 'none'
      }} />

      {/* Navigation */}
      <nav style={{ 
        padding: '1.5rem 2rem', 
        backgroundColor: 'rgba(16, 60, 31, 0.65)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 50, 
        position: 'sticky',
        top: 0
      }}>
        <Link to="/">
          <Logo />
        </Link>
      </nav>

      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative',
        zIndex: 10
      }}>
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
          <h1 style={{ fontSize: '2rem', textAlign: 'center', color: '#111827', fontWeight: 700, marginBottom: '0.5rem' }}>Create An Account</h1>
          <p style={{ textAlign: 'center', color: '#4b5563', marginBottom: '2.5rem', fontSize: '1rem' }}>Gain access to vital farm inputs</p>

          {error && <div style={{ color: 'var(--error)', backgroundColor: '#fef2f2', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1.5rem', fontSize: '0.875rem', borderLeft: '4px solid var(--error)' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <Input label="Full Name" id="name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            <Input label="Email Address" id="email" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            <Input label="Phone Number (E.164)" id="phone" type="tel" required placeholder="+233XXXXXXXXX" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            <Input label="Password" id="password" type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
            <Input label="Confirm Password" id="confirmPassword" type="password" required value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} />

            <div style={{ marginTop: '2.5rem' }}>
              <Button type="submit" isLoading={loading}>Register</Button>
            </div>
          </form>
          <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: '#4b5563' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
