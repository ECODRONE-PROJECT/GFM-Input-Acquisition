import { useEffect, useState, type FormEvent } from 'react';
import {
  createAdminAggregateDeal,
  deleteAdminAggregateDeal,
  fetchAdminAggregateDeals,
  type AggregateDeal,
  updateAdminAggregateDeal,
} from '../lib/adminAggregateDeals';
import { AestheticDateTimePicker } from '../components/AestheticDateTimePicker';

type DealForm = {
  title: string;
  description: string;
  item_name: string;
  item_category: string;
  unit: string;
  image_url: string;
  base_price: string;
  discount_percent: string;
  target_quantity: string;
  min_join_quantity: string;
  max_join_quantity: string;
  end_at: string;
  status: 'draft' | 'active' | 'closed' | 'cancelled';
};

const EMPTY_FORM: DealForm = {
  title: '',
  description: '',
  item_name: '',
  item_category: '',
  unit: 'bag',
  image_url: '',
  base_price: '',
  discount_percent: '0',
  target_quantity: '',
  min_join_quantity: '1',
  max_join_quantity: '',
  end_at: '',
  status: 'active',
};

const DEAL_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function toMoney(v: number) {
  return `GHS ${v.toFixed(2)}`;
}

export default function AggregateDeals() {
  const [deals, setDeals] = useState<AggregateDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DealForm>(EMPTY_FORM);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const loadDeals = async () => {
    setLoading(true);
    setError('');
    try {
      setDeals(await fetchAdminAggregateDeals());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load aggregate deals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDeals();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const resetModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(false);
  };

  const onFormChange = (key: keyof DealForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (deal: AggregateDeal) => {
    setEditingId(deal.id);
    setForm({
      title: deal.title || '',
      description: deal.description || '',
      item_name: deal.item_name || '',
      item_category: deal.item_category || '',
      unit: deal.unit || '',
      image_url: deal.image_url || '',
      base_price: String(deal.base_price ?? 0),
      discount_percent: String(deal.discount_percent ?? 0),
      target_quantity: deal.target_quantity ? String(deal.target_quantity) : '',
      min_join_quantity: String(deal.min_join_quantity ?? 1),
      max_join_quantity: deal.max_join_quantity ? String(deal.max_join_quantity) : '',
      end_at: deal.end_at ? deal.end_at.slice(0, 16) : '',
      status: deal.status,
    });
    setModalOpen(true);
  };

  const submitDeal = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const basePrice = Number(form.base_price);
    const discount = Number(form.discount_percent || 0);
    if (!form.title.trim() || !form.item_name.trim()) {
      setError('Title and item name are required.');
      return;
    }
    if (Number.isNaN(basePrice) || basePrice < 0) {
      setError('Base price must be valid.');
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      deal_type: 'bulk' as const,
      item_name: form.item_name.trim(),
      item_category: form.item_category.trim() || null,
      unit: form.unit.trim() || null,
      image_url: form.image_url.trim() || null,
      base_price: basePrice,
      discount_percent: discount,
      target_quantity: form.target_quantity ? Number(form.target_quantity) : null,
      min_join_quantity: Number(form.min_join_quantity || 1),
      max_join_quantity: form.max_join_quantity ? Number(form.max_join_quantity) : null,
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      status: form.status,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateAdminAggregateDeal(editingId, payload);
        setSuccess('Aggregate deal updated.');
      } else {
        await createAdminAggregateDeal(payload);
        setSuccess('Aggregate deal created.');
      }
      resetModal();
      await loadDeals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save aggregate deal.');
    } finally {
      setSaving(false);
    }
  };

  const closeDeal = async (dealId: string) => {
    try {
      await updateAdminAggregateDeal(dealId, { status: 'closed' });
      setSuccess('Deal marked as closed.');
      await loadDeals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not close deal.');
    }
  };

  const removeDeal = async (dealId: string) => {
    if (!window.confirm('Delete this deal permanently?')) {
      return;
    }
    try {
      await deleteAdminAggregateDeal(dealId);
      setSuccess('Deal deleted.');
      await loadDeals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete deal.');
    }
  };

  return (
    <section className="w-full min-h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <span className="text-[#a41034] text-[10px] font-bold tracking-widest uppercase mb-1 block">Collective Commerce</span>
          <h1 className="text-3xl font-headline font-extrabold text-[#1a1c1b] tracking-tight">Aggregate Deals</h1>
          <p className="text-sm text-stone-500 mt-2">Create and manage bulk-buy campaigns users can join in real-time.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#0d631b] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-[#0b5015] transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add_box</span> New Deal
        </button>
      </div>

      {error && <div className="mb-4 bg-[#ffdad6] text-[#93000a] px-4 py-3 rounded-lg font-semibold text-sm">{error}</div>}
      {success && <div className="mb-4 bg-[#d8f8d5] text-[#0c5f14] px-4 py-3 rounded-lg font-semibold text-sm">{success}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-[#f4f4f1] text-[#40493d] text-xs font-bold uppercase tracking-widest border-b border-stone-200/50">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ends</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-stone-500">Loading aggregate deals...</td></tr>
              ) : deals.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-stone-500">No aggregate deals created yet.</td></tr>
              ) : (
                deals.map((deal) => (
                  <tr key={deal.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-bold text-stone-900">{deal.title}</p>
                      <p className="text-xs text-stone-500">{deal.item_name}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-stone-900">{toMoney(deal.current_display_price || deal.deal_price || deal.base_price)}</p>
                      <p className="text-xs text-stone-500">Save {deal.discount_percent}% from {toMoney(deal.base_price)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-stone-700">{deal.current_quantity}/{deal.target_quantity || '-'} ({deal.progress_percent || 0}%)</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest inline-flex items-center gap-1.5 shadow-sm border ${
                        deal.status === 'active' ? 'bg-[#ecfdf5] text-[#065f46] border-[#d1fae5]' :
                        deal.status === 'closed' ? 'bg-[#fef2f2] text-[#991b1b] border-[#fee2e2]' :
                        'bg-[#f9fafb] text-[#374151] border-[#f3f4f6]'
                      }`}>
                        <div className={`w-1 h-1 rounded-full bg-current ${deal.status === 'active' ? 'animate-pulse' : 'opacity-70'}`}></div> {deal.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-stone-600">
                      {deal.end_at ? new Date(deal.end_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(deal)} className="h-9 px-3 rounded-lg bg-stone-200 hover:bg-stone-300 text-xs font-bold text-stone-800">
                          Edit
                        </button>
                        {deal.status === 'active' && (
                          <button onClick={() => closeDeal(deal.id)} className="h-9 px-3 rounded-lg bg-[#fff1cc] hover:bg-[#ffe8ae] text-xs font-bold text-[#7a5a00]">
                            Close
                          </button>
                        )}
                        <button onClick={() => removeDeal(deal.id)} className="h-9 px-3 rounded-lg bg-[#ffdad6] hover:bg-[#ffcfc8] text-xs font-bold text-[#93000a]">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-[6px] z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-stone-200">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-headline font-bold text-xl text-stone-900">{editingId ? 'Edit Aggregate Deal' : 'Create Aggregate Deal'}</h3>
              <button onClick={resetModal} className="text-stone-500 hover:text-stone-800"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={submitDeal}>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700 md:col-span-2">
                Deal Title
                <input value={form.title} onChange={(e) => onFormChange('title', e.target.value)} required className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700 md:col-span-2">
                Description
                <textarea value={form.description} onChange={(e) => onFormChange('description', e.target.value)} rows={3} className="px-3 py-2 rounded-lg bg-stone-100 border border-stone-200 outline-none" />
              </label>
              <div className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Status
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    className="w-full flex items-center justify-between h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 text-sm font-bold text-stone-700 outline-none hover:border-[#0d631b]/30 transition-all active:scale-[0.99]"
                  >
                    {DEAL_STATUS_OPTIONS.find(o => o.value === form.status)?.label || form.status}
                    <span className={`material-symbols-outlined text-[18px] text-stone-400 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>

                  {isStatusDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsStatusDropdownOpen(false)} />
                      <div className="absolute top-1/2 left-0 right-0 mt-6 bg-white rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.15)] border border-stone-100 p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        {DEAL_STATUS_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              onFormChange('status', option.value as any);
                              setIsStatusDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                              form.status === option.value 
                                ? 'bg-[#0d631b]/5 text-[#0d631b]' 
                                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Item Name
                <input value={form.item_name} onChange={(e) => onFormChange('item_name', e.target.value)} required className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Category
                <input value={form.item_category} onChange={(e) => onFormChange('item_category', e.target.value)} className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Unit
                <input value={form.unit} onChange={(e) => onFormChange('unit', e.target.value)} className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Base Price (GHS)
                <input value={form.base_price} onChange={(e) => onFormChange('base_price', e.target.value)} type="number" min="0" step="0.01" required className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Discount %
                <input value={form.discount_percent} onChange={(e) => onFormChange('discount_percent', e.target.value)} type="number" min="0" max="95" step="0.01" className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Target Quantity
                <input value={form.target_quantity} onChange={(e) => onFormChange('target_quantity', e.target.value)} type="number" min="1" step="1" className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Min Join Quantity
                <input value={form.min_join_quantity} onChange={(e) => onFormChange('min_join_quantity', e.target.value)} type="number" min="1" step="1" className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Max Join Quantity
                <input value={form.max_join_quantity} onChange={(e) => onFormChange('max_join_quantity', e.target.value)} type="number" min="1" step="1" className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none" />
              </label>
              <AestheticDateTimePicker
                label="Ends At"
                value={form.end_at}
                onChange={(val) => onFormChange('end_at', val)}
                className="md:col-span-1"
              />
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700 md:col-span-2">
                Image URL
                <input value={form.image_url} onChange={(e) => onFormChange('image_url', e.target.value)} className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none" />
              </label>
              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={resetModal} className="h-11 px-4 rounded-lg bg-stone-200 text-stone-800 font-bold text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="h-11 px-4 rounded-lg bg-[#0d631b] text-white font-bold text-sm disabled:opacity-60">
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
