"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function AdminDashboard() {
  const [inputs, setInputs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInputs = async () => {
    try {
      const res = await fetch('/api/admin/inputs');
      const data = await res.json();
      setInputs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInputs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to delete this database entry?')) return;
    try {
      await fetch(`/api/admin/inputs/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-mock': 'true' }
      });
      fetchInputs();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#111827' }}>Catalog Data Entry & Input</h1>
          <p style={{ color: '#64748b', marginTop: '0.25rem' }}>Manage aggregated bulk seeds and fertilizers for the storefront.</p>
        </div>
        <Link href="/admin/inputs/new">
          <Button>+ Add New Item</Button>
        </Link>
      </div>

      {loading ? <p style={{ color: '#64748b' }}>Fetching inventory...</p> : (
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontSize: '0.875rem' }}>Sub-Type</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontSize: '0.875rem' }}>Item Name</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontSize: '0.875rem' }}>Price (GHS)</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontSize: '0.875rem' }}>Stock (Bags)</th>
                <th style={{ padding: '1rem', textAlign: 'right', color: '#475569', fontSize: '0.875rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inputs.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    No agricultural inputs found. Start cataloging!
                  </td>
                </tr>
              )}
              {inputs.map(input => (
                <tr key={input.id} style={{ borderBottom: '1px solid #f1f5f9', color: '#1e293b' }}>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      backgroundColor: input.type === 'SEED' ? '#dcfce7' : '#f3e8ff', 
                      color: input.type === 'SEED' ? '#166534' : '#6b21a8', 
                      padding: '0.25rem 0.6rem', 
                      borderRadius: '9999px', 
                      fontSize: '0.75rem', 
                      fontWeight: 700 
                    }}>
                      {input.type}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{input.name}</td>
                  <td style={{ padding: '1rem' }}>₵ {input.price.toFixed(2)}</td>
                  <td style={{ padding: '1rem' }}>{input.stock}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button onClick={() => handleDelete(input.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
