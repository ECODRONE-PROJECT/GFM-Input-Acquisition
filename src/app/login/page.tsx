"use client";
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Modal } from '@/components/ui/Modal';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  
  const isRegistered = searchParams.get('registered');
  const redirectTarget = searchParams.get('redirect') || '/shop';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      localStorage.setItem('gfm_user', JSON.stringify(data.user));
      setSuccessModal(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal 
        isOpen={successModal}
        onClose={() => router.push(redirectTarget)}
        title="Authentication Successful"
        message="You are now securely signed in to the GrowForMe Network."
        primaryAction={() => router.push(redirectTarget)}
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
        
        {isRegistered && <div style={{ color: 'var(--primary)', backgroundColor: '#ecfdf5', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1.5rem', fontSize: '0.875rem', borderLeft: '4px solid var(--primary)' }}>Registration successful! Please log in.</div>}
        {error && <div style={{ color: 'var(--error)', backgroundColor: '#fef2f2', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1.5rem', fontSize: '0.875rem', borderLeft: '4px solid var(--error)' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <Input label="Email Address" id="email" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          <Input label="Password" id="password" type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
          
          <div style={{ marginTop: '2.5rem' }}>
            <Button type="submit" isLoading={loading}>Sign In</Button>
          </div>
        </form>
        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: '#4b5563' }}>
          New to Grow For Me? <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Create an account</Link>
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

      <nav style={{ padding: '1.5rem 2rem', backgroundColor: 'rgba(16, 60, 31, 0.65)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', zIndex: 10, position: 'relative' }}>
        <Logo />
      </nav>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', zIndex: 10 }}>
        <Suspense fallback={<div>Loading form...</div>}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
