"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function AdminDashboard() {
  const [inputs, setInputs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sorting and Filtering states
  const [filterType, setFilterType] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('NONE');

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

  // Derive Display Array
  const displayedInputs = [...inputs]
    .filter(input => filterType === 'ALL' || input.type === filterType)
    .sort((a, b) => {
      if (sortOrder === 'PRICE_ASC') return a.price - b.price;
      if (sortOrder === 'PRICE_DESC') return b.price - a.price;
      if (sortOrder === 'STOCK_ASC') return a.stock - b.stock;
      if (sortOrder === 'STOCK_DESC') return b.stock - a.stock;
      return 0;
    });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0C2D1C' }}>Catalog Data Entry & Input</h1>
          <p style={{ color: '#475569', marginTop: '0.25rem' }}>Manage input items for the storefront.</p>
        </div>
        <Link href="/admin/inputs/new">
          <Button>+ Add New Item</Button>
        </Link>
      </div>

      {loading ? <p style={{ color: '#64748b' }}>Fetching inventory...</p> : (
        <>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: '0.35rem', border: '1px solid #cbd5e1', fontWeight: 600, color: '#334155' }}>
              <option value="ALL">All Categories</option>
              <option value="SEED">Seeds Only</option>
              <option value="FERTILIZER">Fertilizers Only</option>
            </select>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: '0.35rem', border: '1px solid #cbd5e1', fontWeight: 600, color: '#334155' }}>
              <option value="NONE">Default Sorting</option>
              <option value="PRICE_ASC">Price: Low to High</option>
              <option value="PRICE_DESC">Price: High to Low</option>
              <option value="STOCK_ASC">Stock: Low to High</option>
              <option value="STOCK_DESC">Stock: High to Low</option>
            </select>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f1f3ee', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#0C2D1C', fontSize: '0.875rem' }}>Category</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#0C2D1C', fontSize: '0.875rem' }}>Item Name</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#0C2D1C', fontSize: '0.875rem' }}>Price (GH₵)</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#0C2D1C', fontSize: '0.875rem' }}>Stock (Bags)</th>
                  <th style={{ padding: '1rem', textAlign: 'right', color: '#0C2D1C', fontSize: '0.875rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedInputs.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                      No agricultural inputs match your current filters.
                    </td>
                  </tr>
                )}
                {displayedInputs.map(input => (
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
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{input.name} {input.brand && <span style={{ color: '#94a3b8', fontSize: '0.8rem', marginLeft: '0.25rem' }}>({input.brand})</span>}</td>
                    <td style={{ padding: '1rem' }}>₵ {input.price.toFixed(2)}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontWeight: 600, color: input.stock === 0 ? '#ef4444' : '#0f172a' }}>{input.stock}</span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <Link href={`/admin/inputs/${input.id}/edit`} style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.875rem', marginRight: '1rem', textDecoration: 'none' }}>
                        Edit
                      </Link>
                      <button onClick={() => handleDelete(input.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
