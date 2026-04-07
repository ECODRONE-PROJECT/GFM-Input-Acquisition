"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';

export default function NewInput() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', type: 'SEED', price: '', stock: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/admin/inputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-mock': 'true' },
        body: JSON.stringify(formData)
      });
      
      const responseData = await res.json();
      
      if (res.ok) {
        router.push('/admin');
      } else {
        setError(responseData.error || 'Failed to create input');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', backgroundColor: 'white', padding: '3rem', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/admin" style={{ color: '#64748b', textDecoration: 'none', fontWeight: 500, padding: '0.5rem 1rem', background: '#f1f5f9', borderRadius: '0.5rem' }}>
          &larr; Back
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Register New Catalog Input</h1>
      </div>

      {error && (
        <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Input 
          label="Item Name (e.g. Obatanpa Maize Seed)" 
          id="name" 
          required 
          value={formData.name} 
          onChange={e => setFormData({ ...formData, name: e.target.value })} 
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Category Type</label>
          <select 
            value={formData.type} 
            onChange={e => setFormData({ ...formData, type: e.target.value })}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', fontSize: '0.95rem', color: '#0f172a', background: 'white' }}
          >
            <option value="SEED">Planting Seed</option>
            <option value="FERTILIZER">Fertilizer (NPK / Urea)</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <Input 
            label="Unit Price (Ghs)" 
            id="price" 
            type="number" 
            required 
            min="0"
            step="0.01"
            value={formData.price} 
            onChange={e => setFormData({ ...formData, price: e.target.value })} 
          />

          <Input 
            label="Initial Bulk Stock (Bags)" 
            id="stock" 
            type="number" 
            required 
            min="0"
            value={formData.stock} 
            onChange={e => setFormData({ ...formData, stock: e.target.value })} 
          />
        </div>

        <div style={{ marginTop: '1rem' }}>
          <Button type="submit" isLoading={loading}>Save Input Item To Database</Button>
        </div>
      </form>
    </div>
  );
}
