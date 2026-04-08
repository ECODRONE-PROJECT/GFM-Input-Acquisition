"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import Image from 'next/image';
import Link from 'next/link';

export default function NewInput() {
  const router = useRouter();
  const [formData, setFormData] = useState({ 
    name: '', type: 'SEED', price: '', stock: '', location: '', imageUrl: '', size: '', weight: '', brand: '' 
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'x-admin-mock': 'true' },
        body: uploadData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setFormData(prev => ({ ...prev, imageUrl: data.url }));
      setImagePreview(data.url);
    } catch (err: any) {
      setErrorModal({ isOpen: true, message: err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/inputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-mock': 'true' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to create new input');
      router.push('/admin');
    } catch (err: any) {
      setErrorModal({ isOpen: true, message: err.message });
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '750px' }}>
      <Modal 
        isOpen={errorModal.isOpen} 
        onClose={() => setErrorModal({ isOpen: false, message: '' })} 
        title="Admin Creation Error" 
        message={errorModal.message} 
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0C2D1C' }}>Create New Catalog Item</h1>
          <p style={{ color: '#475569', marginTop: '0.25rem' }}>Add a new agricultural input to the public marketplace.</p>
        </div>
        <Link href="/admin" style={{ color: '#475569', textDecoration: 'none', fontWeight: 600 }}>Cancel</Link>
      </div>

      <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="admin-form-row">
            <div style={{ flex: 2 }}>
              <Input label="Item Name" id="name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Brand (Optional)" id="brand" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem', color: '#374151' }}>Type</label>
            <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}>
              <option value="SEED">Premium Seed</option>
              <option value="FERTILIZER">Fertilizer</option>
            </select>
          </div>

          <div className="admin-form-row">
            <div style={{ flex: 1 }}>
              <Input label="Price (GH₵)" id="price" type="number" step="0.01" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Available Stock" id="stock" type="number" required value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} />
            </div>
          </div>

          <div className="admin-form-row">
            <div style={{ flex: 1 }}>
              <Input label="Weight (Optional)" id="weight" value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })} placeholder="e.g. 50kg" />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Size (Optional)" id="size" value={formData.size} onChange={e => setFormData({ ...formData, size: e.target.value })} placeholder="e.g. Large Sack" />
            </div>
          </div>

          <Input label="Vendor / Seller Location" id="location" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. Accra Logistics Hub" />

          {/* Image Upload */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem', color: '#374151' }}>Product Image</label>
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              style={{
                border: '2px dashed #d1d5db', borderRadius: '0.75rem', padding: '2rem',
                textAlign: 'center', cursor: 'pointer', backgroundColor: '#f9fafb',
                transition: 'border-color 0.2s', position: 'relative'
              }}
            >
              {imagePreview ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ position: 'relative', width: '160px', height: '160px', borderRadius: '0.5rem', overflow: 'hidden' }}>
                    <Image src={imagePreview} alt="Preview" fill style={{ objectFit: 'cover' }} sizes="160px" />
                  </div>
                  <button type="button" onClick={() => { setImagePreview(null); setFormData(prev => ({ ...prev, imageUrl: '' })); }} style={{ color: '#ef4444', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>
                    Remove Image
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📷</div>
                  <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
                    {uploading ? 'Uploading...' : 'Drag & drop an image here, or click to browse'}
                  </p>
                  <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>PNG, JPG, WebP up to 5MB</p>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
              />
            </div>
            {/* Fallback URL input */}
            <div style={{ marginTop: '0.75rem' }}>
              <Input 
                label="Or paste an image URL" 
                id="imageUrl" 
                value={formData.imageUrl} 
                onChange={e => { setFormData({ ...formData, imageUrl: e.target.value }); setImagePreview(e.target.value || null); }}
                placeholder="/seed.png or https://..."
              />
            </div>
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <Button type="submit" isLoading={saving || uploading}>Commit to Storefront</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
