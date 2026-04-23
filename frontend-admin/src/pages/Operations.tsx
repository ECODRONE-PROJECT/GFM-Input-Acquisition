import { useEffect, useState, type FormEvent } from 'react';
import {
  fetchAdminCustomers,
  fetchAdminConsignments,
  approveConsignment,
  rejectConsignment,
  type AdminCustomer,
  type ConsignmentRequest,
} from '../lib/adminOperations';
import {
  createAdminAggregateDeal,
} from '../lib/adminAggregateDeals';

type ActiveTab = 'customers' | 'consignments';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function creditStatusPill(status: string) {
  switch (status) {
    case 'approved': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', label: 'Active' };
    case 'submitted': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', label: 'Pending' };
    case 'rejected': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', label: 'Rejected' };
    default: return { bg: 'bg-stone-50', text: 'text-stone-500', border: 'border-stone-100', label: 'None' };
  }
}

function consignmentStatusPill(status: string) {
  switch (status) {
    case 'approved': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', dot: 'bg-emerald-500' };
    case 'rejected': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', dot: 'bg-red-500' };
    default: return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', dot: 'bg-amber-500 animate-pulse' };
  }
}

function categoryIcon(category: string) {
  switch (category.toLowerCase()) {
    case 'maize': return 'grass';
    case 'fertilizer': return 'science';
    case 'tools': return 'construction';
    default: return 'inventory_2';
  }
}

function categoryLabel(category: string) {
  switch (category.toLowerCase()) {
    case 'maize': return 'Maize (Seed/Grain)';
    case 'fertilizer': return 'Excess Fertilizer';
    case 'tools': return 'Light Equipment';
    default: return 'Other Commodities';
  }
}

export default function Operations() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('customers');

  // Customer Directory state
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [customerSummary, setCustomerSummary] = useState({ total_users: 0, active_credit_lines: 0, total_orders: 0 });
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);

  // Consignment Queue state
  const [consignments, setConsignments] = useState<ConsignmentRequest[]>([]);
  const [consignmentSummary, setConsignmentSummary] = useState({ pending: 0, approved_this_week: 0, total: 0 });
  const [loadingConsignments, setLoadingConsignments] = useState(true);

  // Action state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  // Reject modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<ConsignmentRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Bulk deal modal
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [dealSource, setDealSource] = useState<ConsignmentRequest | null>(null);
  const [dealForm, setDealForm] = useState({
    title: '', description: '', item_name: '', item_category: '', unit: 'bag',
    base_price: '', discount_percent: '0', target_quantity: '',
    min_join_quantity: '1', max_join_quantity: '', end_at: '',
  });
  const [dealSaving, setDealSaving] = useState(false);

  // ─── Load Data ──────────────────────────────────
  useEffect(() => {
    void loadCustomers();
    void loadConsignments();
  }, []);

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const res = await fetchAdminCustomers();
      setCustomers(res.customers);
      setCustomerSummary(res.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers.');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const loadConsignments = async () => {
    setLoadingConsignments(true);
    try {
      const res = await fetchAdminConsignments();
      setConsignments(res.consignments);
      setConsignmentSummary(res.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load consignments.');
    } finally {
      setLoadingConsignments(false);
    }
  };

  // ─── Filtered Customers ────────────────────────
  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase();
    return !q || c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.phone || '').includes(q);
  });

  // ─── Consignment Actions ───────────────────────
  const handleApprove = (consignment: ConsignmentRequest) => {
    setDealSource(consignment);
    setDealForm({
      title: `Farmer Stock: ${consignment.product_name || categoryLabel(consignment.product_category)}`,
      description: `Consignment from ${consignment.farmer_name}. Originally listed at GHS ${consignment.expected_price} per unit.`,
      item_name: consignment.product_name || categoryLabel(consignment.product_category),
      item_category: consignment.product_category,
      unit: consignment.unit === 'bags' ? 'bag' : consignment.unit === 'tonnes' ? 'tonne' : 'unit',
      base_price: String(consignment.expected_price),
      discount_percent: '5',
      target_quantity: String(consignment.quantity),
      min_join_quantity: '1',
      max_join_quantity: String(Math.min(consignment.quantity, 20)),
      end_at: '',
    });
    setDealModalOpen(true);
  };

  const handleRejectClick = (consignment: ConsignmentRequest) => {
    setRejectTarget(consignment);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const submitReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setProcessing(rejectTarget.id);
    try {
      await rejectConsignment(rejectTarget.id, rejectReason.trim());
      setSuccess(`Consignment rejected. SMS sent to ${rejectTarget.farmer_name}.`);
      setRejectModalOpen(false);
      setRejectTarget(null);
      await loadConsignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject consignment.');
    } finally {
      setProcessing(null);
    }
  };

  const submitDeal = async (e: FormEvent) => {
    e.preventDefault();
    if (!dealSource) return;
    setDealSaving(true);
    setError('');
    try {
      const basePrice = Number(dealForm.base_price);
      const discount = Number(dealForm.discount_percent || 0);
      const deal = await createAdminAggregateDeal({
        title: dealForm.title.trim(),
        description: dealForm.description.trim() || null,
        deal_type: 'bulk',
        item_name: dealForm.item_name.trim(),
        item_category: dealForm.item_category.trim() || null,
        unit: dealForm.unit.trim() || null,
        image_url: null,
        base_price: basePrice,
        discount_percent: discount,
        target_quantity: dealForm.target_quantity ? Number(dealForm.target_quantity) : null,
        min_join_quantity: Number(dealForm.min_join_quantity || 1),
        max_join_quantity: dealForm.max_join_quantity ? Number(dealForm.max_join_quantity) : null,
        end_at: dealForm.end_at ? new Date(dealForm.end_at).toISOString() : null,
        status: 'active',
      });
      await approveConsignment(dealSource.id, deal.id);
      setSuccess(`Consignment approved and Bulk Deal created for ${dealSource.farmer_name}'s listing.`);
      setDealModalOpen(false);
      setDealSource(null);
      await loadConsignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deal.');
    } finally {
      setDealSaving(false);
    }
  };

  // ─── Render ─────────────────────────────────────
  return (
    <div className="w-full max-w-7xl mx-auto">

      {/* Page Header */}
      <header className="mb-8">
        <span className="text-[#084c17] text-[10px] font-bold tracking-widest uppercase mb-1 block">Platform Management</span>
        <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-[#1a1c1b] tracking-tight">Operations</h1>
        <p className="text-sm text-stone-500 mt-2 max-w-2xl">Manage your customer base and review farmer consignment requests. Approved listings are automatically published as Bulk Deals.</p>
      </header>

      {error && <div className="mb-4 bg-[#ffdad6] text-[#93000a] px-4 py-3 rounded-lg font-semibold text-sm">{error}<button onClick={() => setError('')} className="ml-3 font-bold">×</button></div>}
      {success && <div className="mb-4 bg-[#d8f8d5] text-[#0c5f14] px-4 py-3 rounded-lg font-semibold text-sm">{success}<button onClick={() => setSuccess('')} className="ml-3 font-bold">×</button></div>}

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1 mb-8 w-fit">
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'customers'
              ? 'bg-white shadow-sm text-[#084c17]'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">groups</span>
          Customers
        </button>
        <button
          onClick={() => setActiveTab('consignments')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all relative ${
            activeTab === 'consignments'
              ? 'bg-white shadow-sm text-[#084c17]'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">storefront</span>
          Consignment Queue
          {consignmentSummary.pending > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#084c17] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {consignmentSummary.pending}
            </span>
          )}
        </button>
      </div>

      {/* ═══════════════ TAB 1: CUSTOMERS ═══════════════ */}
      {activeTab === 'customers' && (
        <div className="flex flex-col xl:flex-row gap-8 items-start">
          <div className="flex-1 w-full space-y-6">

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-stone-100 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-outline mb-1">Total Users</p>
                <p className="text-3xl font-headline font-extrabold text-[#1a1c1b]">{customerSummary.total_users}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-stone-100 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-outline mb-1">Active Credit Lines</p>
                <p className="text-3xl font-headline font-extrabold text-[#084c17]">{customerSummary.active_credit_lines}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-stone-100 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-outline mb-1">Total Orders</p>
                <p className="text-3xl font-headline font-extrabold text-[#1a1c1b]">{customerSummary.total_orders}</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-xl">search</span>
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-stone-200 rounded-xl text-sm font-medium outline-none focus:border-[#084c17] transition-colors"
              />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.15em] text-stone-500 font-bold border-b border-stone-100">
                      <th className="py-4 px-5">Name</th>
                      <th className="py-4 px-5">Contact</th>
                      <th className="py-4 px-5 text-center">Credit</th>
                      <th className="py-4 px-5 text-center">Orders</th>
                      <th className="py-4 px-5 text-center">Spent</th>
                      <th className="py-4 px-5">Joined</th>
                      <th className="py-4 px-5 text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {loadingCustomers ? (
                      <tr><td className="py-12 px-5 text-center text-stone-400 font-semibold" colSpan={7}>Loading customer directory...</td></tr>
                    ) : filteredCustomers.length === 0 ? (
                      <tr><td className="py-12 px-5 text-center text-stone-400 font-semibold" colSpan={7}>No customers found.</td></tr>
                    ) : filteredCustomers.map((c) => {
                      const pill = creditStatusPill(c.credit_status);
                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedCustomer(c)}
                          className={`border-b border-stone-50 cursor-pointer transition-colors ${selectedCustomer?.id === c.id ? 'bg-[#f0fdf4]' : 'hover:bg-stone-50'}`}
                        >
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 text-xs font-bold uppercase shrink-0">
                                {c.full_name.charAt(0)}
                              </div>
                              <span className="font-bold text-stone-900">{c.full_name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <p className="text-stone-700 text-xs">{c.email}</p>
                            <p className="text-stone-400 text-xs">{c.phone || '—'}</p>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${pill.bg} ${pill.text} ${pill.border}`}>
                              {pill.label}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-center font-bold text-stone-700">{c.total_orders}</td>
                          <td className="py-4 px-5 text-center font-bold text-stone-700">GHS {c.total_spent.toFixed(0)}</td>
                          <td className="py-4 px-5 text-stone-500 text-xs">{formatDate(c.joined_at)}</td>
                          <td className="py-4 px-5 text-right">
                            <span className="material-symbols-outlined text-stone-400 text-lg">chevron_right</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Customer Detail Panel */}
          <aside className="w-full xl:w-[380px] bg-[#f9f9f6] rounded-2xl border border-stone-200 shrink-0 sticky top-4 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
            {!selectedCustomer ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-5xl text-stone-300 mb-3 block">person_search</span>
                <p className="text-sm text-stone-400 font-semibold">Select a customer to view details.</p>
              </div>
            ) : (
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline font-bold text-xl text-on-surface">Customer Profile</h3>
                  <button onClick={() => setSelectedCustomer(null)} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors">
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-stone-200 border-2 border-white shadow-sm flex items-center justify-center">
                    <span className="text-stone-500 font-headline font-bold text-xl uppercase">{selectedCustomer.full_name.charAt(0)}</span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-xl leading-tight">{selectedCustomer.full_name}</h4>
                    <p className="text-xs text-stone-500">{selectedCustomer.email}</p>
                  </div>
                </div>

                {/* Info Rows */}
                <div className="space-y-1">
                  {[
                    { label: 'Phone', value: selectedCustomer.phone || '—', icon: 'call' },
                    { label: 'Member Since', value: formatDate(selectedCustomer.joined_at), icon: 'calendar_month' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-stone-100">
                      <span className="material-symbols-outlined text-stone-400 text-lg">{row.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-stone-400">{row.label}</p>
                        <p className="text-sm font-bold text-stone-800 truncate">{row.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Credit Status Card */}
                <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-stone-400 mb-3">Credit Status</p>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex px-2.5 py-1 rounded text-[10px] font-extrabold uppercase border ${creditStatusPill(selectedCustomer.credit_status).bg} ${creditStatusPill(selectedCustomer.credit_status).text} ${creditStatusPill(selectedCustomer.credit_status).border}`}>
                      {creditStatusPill(selectedCustomer.credit_status).label}
                    </span>
                  </div>
                  {selectedCustomer.credit_status === 'approved' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-stone-500">Credit Limit</span>
                        <span className="font-bold text-stone-800">GHS {selectedCustomer.credit_limit.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-stone-500">Available</span>
                        <span className="font-bold text-[#084c17]">GHS {selectedCustomer.available_credit.toFixed(2)}</span>
                      </div>
                      <div className="w-full h-2 bg-stone-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-[#084c17] rounded-full transition-all" style={{ width: `${Math.round((selectedCustomer.available_credit / Math.max(selectedCustomer.credit_limit, 1)) * 100)}%` }}></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-4 rounded-xl border border-stone-100 text-center">
                    <p className="text-2xl font-headline font-extrabold text-[#1a1c1b]">{selectedCustomer.total_orders}</p>
                    <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-stone-400 mt-1">Orders</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-stone-100 text-center">
                    <p className="text-2xl font-headline font-extrabold text-[#1a1c1b]">GHS {selectedCustomer.total_spent.toFixed(0)}</p>
                    <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-stone-400 mt-1">Total Spent</p>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* ═══════════════ TAB 2: CONSIGNMENTS ═══════════════ */}
      {activeTab === 'consignments' && (
        <div className="space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-stone-100 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-outline mb-1">Pending Review</p>
              <p className="text-3xl font-headline font-extrabold text-amber-600">{consignmentSummary.pending}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-stone-100 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-outline mb-1">Approved This Week</p>
              <p className="text-3xl font-headline font-extrabold text-[#084c17]">{consignmentSummary.approved_this_week}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-stone-100 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-outline mb-1">Total Listings</p>
              <p className="text-3xl font-headline font-extrabold text-[#1a1c1b]">{consignmentSummary.total}</p>
            </div>
          </div>

          {/* Consignment Cards */}
          {loadingConsignments ? (
            <div className="text-center py-16 text-stone-400 font-semibold text-sm">Loading consignment queue...</div>
          ) : consignments.length === 0 ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-5xl text-stone-300 mb-3 block">inventory</span>
              <p className="text-stone-400 font-semibold text-sm">No consignment requests yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {consignments.map((c) => {
                const sPill = consignmentStatusPill(c.status);
                const isPending = c.status === 'pending';
                return (
                  <div key={c.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden hover:border-stone-200 transition-all">
                    {/* Card Header */}
                    <div className="px-6 py-5 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-400 shrink-0">
                        <span className="material-symbols-outlined text-2xl">{categoryIcon(c.product_category)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-headline font-bold text-base text-stone-900 truncate">
                            {c.product_name || categoryLabel(c.product_category)}
                          </h4>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border shrink-0 ${sPill.bg} ${sPill.text} ${sPill.border}`}>
                            <div className={`w-1 h-1 rounded-full ${sPill.dot}`}></div>
                            {c.status}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500">
                          by <span className="font-bold text-stone-700">{c.farmer_name}</span> · {formatDate(c.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Card Details */}
                    <div className="px-6 pb-4 grid grid-cols-3 gap-3">
                      <div className="bg-[#f9f9f6] p-3 rounded-xl text-center">
                        <p className="text-lg font-headline font-extrabold text-[#1a1c1b]">{c.quantity}</p>
                        <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-stone-400">{c.unit}</p>
                      </div>
                      <div className="bg-[#f9f9f6] p-3 rounded-xl text-center">
                        <p className="text-lg font-headline font-extrabold text-[#084c17]">GHS {c.expected_price}</p>
                        <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-stone-400">Ask Price</p>
                      </div>
                      <div className="bg-[#f9f9f6] p-3 rounded-xl text-center">
                        <p className="text-lg font-headline font-extrabold text-stone-700">{categoryLabel(c.product_category).split(' ')[0]}</p>
                        <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-stone-400">Category</p>
                      </div>
                    </div>

                    {/* Rejection Reason */}
                    {c.status === 'rejected' && c.rejection_reason && (
                      <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                        <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-red-400 mb-1">Rejection Reason</p>
                        <p className="text-xs text-red-700 font-medium">{c.rejection_reason}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {isPending && (
                      <div className="px-6 pb-5 flex gap-3">
                        <button
                          onClick={() => handleRejectClick(c)}
                          disabled={processing === c.id}
                          className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-700 text-[10px] font-extrabold uppercase tracking-widest hover:bg-stone-200 transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(c)}
                          disabled={processing === c.id}
                          className="flex-1 py-3 rounded-xl bg-[#084c17] text-white text-[10px] font-extrabold uppercase tracking-widest hover:opacity-90 shadow-lg shadow-emerald-900/10 transition-all disabled:opacity-50"
                        >
                          Approve & Create Deal
                        </button>
                      </div>
                    )}
                    {!isPending && (
                      <div className="px-6 pb-5">
                        <div className="py-3 rounded-xl bg-stone-50 border border-stone-100 text-center text-[10px] font-extrabold uppercase tracking-widest text-stone-400">
                          {c.status === 'approved' ? 'Published as Bulk Deal' : 'Case Closed'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ REJECT MODAL ═══════════════ */}
      {rejectModalOpen && rejectTarget && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-[6px] z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200">
            <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-headline font-bold text-lg text-stone-900">Reject Consignment</h3>
              <button onClick={() => setRejectModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-[#f9f9f6] p-4 rounded-xl">
                <p className="text-xs text-stone-500">Rejecting listing from <span className="font-bold text-stone-800">{rejectTarget.farmer_name}</span> for <span className="font-bold text-stone-800">{rejectTarget.quantity} {rejectTarget.unit}</span> of <span className="font-bold text-stone-800">{rejectTarget.product_name || categoryLabel(rejectTarget.product_category)}</span>.</p>
                <p className="text-xs text-stone-400 mt-2">An SMS will be sent to the farmer upon rejection.</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-[0.15em] text-stone-500 block">Rejection Reason *</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why the listing was rejected..."
                  className="w-full bg-white border border-stone-200 rounded-xl text-sm p-4 outline-none focus:border-red-300 transition-colors min-h-[100px]"
                ></textarea>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setRejectModalOpen(false)} className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-700 text-sm font-bold hover:bg-stone-200 transition-colors">Cancel</button>
                <button
                  onClick={() => void submitReject()}
                  disabled={!rejectReason.trim() || processing === rejectTarget.id}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50 shadow-lg shadow-red-600/20"
                >
                  {processing === rejectTarget.id ? 'Sending SMS...' : 'Reject & Notify'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ BULK DEAL MODAL ═══════════════ */}
      {dealModalOpen && dealSource && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-[6px] z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-stone-200">
            <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="font-headline font-bold text-xl text-stone-900">Create Bulk Deal</h3>
                <p className="text-xs text-stone-500 mt-0.5">Pre-filled from {dealSource.farmer_name}'s consignment request</p>
              </div>
              <button onClick={() => setDealModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={submitDeal}>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700 md:col-span-2">
                Deal Title
                <input value={dealForm.title} onChange={(e) => setDealForm(f => ({ ...f, title: e.target.value }))} required className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none focus:border-[#084c17] transition-colors" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700 md:col-span-2">
                Description
                <textarea value={dealForm.description} onChange={(e) => setDealForm(f => ({ ...f, description: e.target.value }))} rows={2} className="px-3 py-2 rounded-lg bg-stone-100 border border-stone-200 outline-none focus:border-[#084c17] transition-colors" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Item Name
                <input value={dealForm.item_name} onChange={(e) => setDealForm(f => ({ ...f, item_name: e.target.value }))} required className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Category
                <input value={dealForm.item_category} onChange={(e) => setDealForm(f => ({ ...f, item_category: e.target.value }))} className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Base Price (GHS)
                <input value={dealForm.base_price} onChange={(e) => setDealForm(f => ({ ...f, base_price: e.target.value }))} type="number" min="0" step="0.01" required className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Discount %
                <input value={dealForm.discount_percent} onChange={(e) => setDealForm(f => ({ ...f, discount_percent: e.target.value }))} type="number" min="0" max="95" step="0.01" className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Target Quantity
                <input value={dealForm.target_quantity} onChange={(e) => setDealForm(f => ({ ...f, target_quantity: e.target.value }))} type="number" min="1" className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Unit
                <input value={dealForm.unit} onChange={(e) => setDealForm(f => ({ ...f, unit: e.target.value }))} className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Min Join Qty
                <input value={dealForm.min_join_quantity} onChange={(e) => setDealForm(f => ({ ...f, min_join_quantity: e.target.value }))} type="number" min="1" className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Max Join Qty
                <input value={dealForm.max_join_quantity} onChange={(e) => setDealForm(f => ({ ...f, max_join_quantity: e.target.value }))} type="number" min="1" className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none" />
              </label>
              <div className="md:col-span-2 bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-4">
                <p className="text-xs text-[#166534] font-semibold">
                  <span className="material-symbols-outlined text-sm align-text-bottom mr-1">info</span>
                  This deal will be published immediately as an <strong>Active</strong> Bulk Deal. You can manage it from the Deals tab after creation.
                </p>
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setDealModalOpen(false)} className="h-11 px-5 rounded-lg bg-stone-100 text-stone-700 font-bold text-sm hover:bg-stone-200 transition-colors">Cancel</button>
                <button type="submit" disabled={dealSaving} className="h-11 px-5 rounded-lg bg-[#084c17] text-white font-bold text-sm disabled:opacity-60 hover:opacity-90 shadow-lg shadow-emerald-900/10 transition-all">
                  {dealSaving ? 'Creating...' : 'Approve & Publish Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
