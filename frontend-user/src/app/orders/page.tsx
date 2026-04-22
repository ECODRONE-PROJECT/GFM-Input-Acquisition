import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, ShoppingCart, User, Filter, Download, Plus, MoreVertical, Truck, Search, CheckCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/context/AuthContext';
import {
  fetchOrderHistory,
  fetchOrderDetails,
  getCatalogInputs,
  submitOrderFollowUp,
  type OrderHistoryItem,
  type CatalogInput,
} from '@/lib/clientData';
import { requireSupabase } from '@/lib/supabase';

function formatDate(value?: string | null): string {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatGhs(value: number): string {
  return `GHS ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type EnrichedOrder = OrderHistoryItem & {
  display_name: string;
  display_category: string;
  display_image: string;
  total_units: number;
};

function resolveCatalogImage(item?: CatalogInput | null): string {
  if (item?.imageUrl) return item.imageUrl;
  if (item?.type === 'SEED') return '/seed.png';
  return '/fertilizer.png';
}

function normalizeOrderStatus(status: string): 'ordered' | 'pending' | 'en_route' | 'delivered' | 'cancelled' | 'failed' {
  const s = (status || '').toLowerCase().trim();
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('fail')) return 'failed';
  if (s.includes('deliver') || s.includes('success')) return 'delivered';
  if (s.includes('transit') || s.includes('route') || s === 'in_transit' || s === 'out_for_delivery') return 'en_route';
  if (s.includes('process') || s.includes('pack') || s.includes('approv') || s.includes('pending')) return 'pending';
  return 'ordered';
}

function getProgressState(status: string) {
  const s = normalizeOrderStatus(status);
  if (s === 'delivered') return 4;
  if (s === 'en_route') return 3;
  if (s === 'pending') return 2;
  return 1;
}

function getStatusPill(status: string) {
  const s = normalizeOrderStatus(status);
  if (s === 'failed') {
    return { label: 'FAILED', bg: '#fef2f2', text: '#991b1b', border: '#fee2e2' };
  }
  if (s === 'cancelled') {
    return { label: 'CANCELLED', bg: '#fff1f2', text: '#9f1239', border: '#ffe4e6' };
  }
  if (s === 'delivered') {
    return { label: 'DELIVERED', bg: '#ecfdf5', text: '#065f46', border: '#d1fae5' };
  }
  if (s === 'en_route') {
    return { label: 'IN TRANSIT', bg: '#eff6ff', text: '#1e40af', border: '#dbeafe' };
  }
  if (s === 'pending') {
    return { label: 'PENDING', bg: '#fffbeb', text: '#92400e', border: '#fef3c7' };
  }
  return { label: 'ORDERED', bg: '#f8fafc', text: '#334155', border: '#e2e8f0' };
}

type HistoryFilter = 'all' | 'ordered' | 'pending' | 'en_route' | 'delivered' | 'cancelled' | 'failed';

function normalizeStatusKey(status: string): HistoryFilter {
  return normalizeOrderStatus(status);
}

function csvEscape(value: string | number) {
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

const ORDER_STATUS_SYNC_INTERVAL_MS = 10000;

export default function DashboardOrdersPage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Farmer';
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const client = requireSupabase();
      await client.auth.signOut();
      navigate('/login');
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [isHistoryFilterOpen, setIsHistoryFilterOpen] = useState(false);
  
  // Follow-up Overhaul States
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [followUpOrderId, setFollowUpOrderId] = useState<string | null>(null);
  const [followUpNote, setFollowUpNote] = useState('');
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);
  const [followUpSuccess, setFollowUpSuccess] = useState(false);
  const ordersRef = useRef<EnrichedOrder[]>([]);
  const catalogMapRef = useRef<Map<string, CatalogInput> | null>(null);
  const isRefreshingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleFollowUpTrigger = (orderId: string) => {
    const lastKey = `followup_${orderId}`;
    const lastFollowUp = localStorage.getItem(lastKey);
    if (lastFollowUp) {
      const hoursSince = (Date.now() - parseInt(lastFollowUp, 10)) / (1000 * 60 * 60);
      const minsSince = hoursSince * 60;
      if (minsSince < 5) {
        const minsLeft = Math.ceil(5 - minsSince);
        alert(`You can only follow up once every 5 minutes. Please try again in ${minsLeft} minutes.`);
        return;
      }
    }
    
    setFollowUpOrderId(orderId);
    setFollowUpNote('');
    setFollowUpSuccess(false);
    setIsFollowUpModalOpen(true);
  };

  const submitFollowUp = async () => {
    if (!followUpOrderId || !userId) return;
    
    setIsSubmittingFollowUp(true);
    try {
      await submitOrderFollowUp({ 
        orderId: followUpOrderId, 
        userId, 
        message: followUpNote.trim() || "User priority follow-up request." 
      });
      
      const lastKey = `followup_${followUpOrderId}`;
      localStorage.setItem(lastKey, Date.now().toString());
      
      setFollowUpSuccess(true);
      setTimeout(() => {
        setIsFollowUpModalOpen(false);
        setFollowUpOrderId(null);
      }, 2000);
    } catch (err) {
      console.error('Follow-up error:', err);
      alert("Failed to send follow-up. Please try again.");
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  const getFollowUpStatus = (orderId: string) => {
    const lastKey = `followup_${orderId}`;
    const lastFollowUp = localStorage.getItem(lastKey);
    if (!lastFollowUp) return { disabled: false };
    const hoursSince = (Date.now() - parseInt(lastFollowUp, 10)) / (1000 * 60 * 60);
    const minsSince = hoursSince * 60;
    const minsLeft = Math.ceil(5 - minsSince);
    return { 
      disabled: minsSince < 5, 
      timeLeftLabel: minsLeft > 0 ? `${minsLeft}m` : 'Soon' 
    };
  };

  useEffect(() => {
    if (!userId) return;

    const refreshOrders = async (showLoader = false) => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      if (showLoader) {
        setLoading(true);
      }

      try {
        const historyRes = await fetchOrderHistory(userId).catch(() => []);
        let catalogMap = catalogMapRef.current;
        if (!catalogMap) {
          const catalogRes = await getCatalogInputs().catch(() => []);
          catalogMap = new Map<string, CatalogInput>();
          for (const item of catalogRes) {
            catalogMap.set(item.id, item);
          }
          catalogMapRef.current = catalogMap;
        }

        const existingMap = new Map(ordersRef.current.map((order) => [order.order_id, order]));
        const orderIdsNeedingDetail = historyRes
          .map((order) => order.order_id)
          .filter((orderId) => !existingMap.has(orderId));

        const detailEntries = await Promise.all(
          orderIdsNeedingDetail.map(async (orderId) => {
            const detail = await fetchOrderDetails(userId, orderId).catch(() => null);
            return [orderId, detail] as const;
          })
        );
        const detailsByOrderId = new Map(detailEntries);

        const enrichedOrders: EnrichedOrder[] = historyRes.map((order) => {
          const existing = existingMap.get(order.order_id);
          const detail = detailsByOrderId.get(order.order_id) ?? null;
          const items = detail?.order?.items || [];
          const firstItem = Array.isArray(items) && items.length > 0 ? items[0] : null;
          const firstItemId = String(firstItem?.id || '').trim();
          const computedUnits = Array.isArray(items)
            ? items.reduce((sum, item) => sum + Math.max(Number(item?.quantity || 0), 0), 0)
            : 0;
          const fallbackUnits = Math.max(Number(order.total_quantity || order.item_count || 0), 0);
          const totalUnits = computedUnits > 0 ? computedUnits : fallbackUnits;

          let displayNameValue = existing?.display_name || `Order #${order.order_id.slice(0, 8).toUpperCase()}`;
          let displayCategory = existing?.display_category || 'General';
          let displayImage = existing?.display_image || '/fertilizer.png';

          if (!existing) {
            if (firstItemId.startsWith('bulk:')) {
              displayNameValue = 'Community Bulk Buy';
              displayCategory = 'Group Purchase';
              displayImage = '/fertilizer.png';
            } else if (firstItemId) {
              const matched = catalogMap?.get(firstItemId);
              if (matched) {
                displayNameValue = matched.name;
                displayCategory = matched.type;
                displayImage = resolveCatalogImage(matched);
              } else {
                displayNameValue = firstItemId;
              }
            }
          }

          return {
            ...order,
            display_name: displayNameValue,
            display_category: displayCategory,
            display_image: displayImage,
            total_units: totalUnits,
          };
        });

        if (!mountedRef.current) return;
        setOrders(enrichedOrders);
        setLoadError('');
      } catch (err) {
        console.error(err);
        if (mountedRef.current) {
          setLoadError(err instanceof Error ? err.message : 'Could not load orders dashboard.');
        }
      } finally {
        if (mountedRef.current && showLoader) {
          setLoading(false);
        }
        isRefreshingRef.current = false;
      }
    };

    void refreshOrders(true);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshOrders(false);
      }
    }, ORDER_STATUS_SYNC_INTERVAL_MS);
    const onFocus = () => void refreshOrders(false);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshOrders(false);
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [userId]);

  const activeOrders = orders.filter(o => {
    const s = o.status.toLowerCase();
    return !s.includes('deliver') && !s.includes('cancel') && !s.includes('fail');
  });

  const filteredHistoryOrders = useMemo(() => {
    const needle = historySearch.trim().toLowerCase();
    return orders.filter((order) => {
      const statusKey = normalizeStatusKey(order.status);
      if (historyFilter !== 'all' && statusKey !== historyFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const haystack = [
        order.order_id,
        order.display_name,
        order.display_category,
        order.status_label,
        order.payment_status,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [historyFilter, historySearch, orders]);

  const exportFilteredHistoryCsv = () => {
    if (filteredHistoryOrders.length === 0) {
      return;
    }

    const header = [
      'order_id',
      'product',
      'category',
      'date',
      'units',
      'amount',
      'status',
      'payment_status',
    ];
    const rows = filteredHistoryOrders.map((order) => [
      order.order_id,
      order.display_name,
      order.display_category,
      order.created_at || '',
      order.total_units,
      order.total_amount,
      order.status_label,
      order.payment_status,
    ]);

    const csv = [
      header.map(csvEscape).join(','),
      ...rows.map((row) => row.map(csvEscape).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `purchase_history_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ backgroundColor: '#f9f9f6', minHeight: '100vh', fontFamily: 'Inter, sans-serif', paddingBottom: '4rem' }}>
      {/* Top Navigation */}
      <nav style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '1rem 5%', backgroundColor: 'white', 
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        position: 'sticky', top: 0, zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '20%' }}><Logo /></div>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <Link to="/shop" className="nav-link" style={{ textDecoration: 'none', color: '#64748b', fontWeight: 600, fontSize: '0.9rem' }}>Catalog</Link>
          <Link to="/credit" className="nav-link" style={{ textDecoration: 'none', color: '#64748b', fontWeight: 600, fontSize: '0.9rem' }}>Credit App</Link>
          <Link to="/orders" className="nav-link active" style={{ textDecoration: 'none', color: '#084c17', fontWeight: 700, fontSize: '0.9rem', borderBottom: '2px solid #084c17', paddingBottom: '0.2rem' }}>Orders</Link>
          <Link to="/support" className="nav-link" style={{ textDecoration: 'none', color: '#64748b', fontWeight: 600, fontSize: '0.9rem' }}>Support</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', justifyContent: 'flex-end', whiteSpace: 'nowrap' }}>
          <Link to="/cart" style={{ color: '#4b5563', display: 'flex', alignItems: 'center' }}><ShoppingCart size={22} strokeWidth={2.5} /></Link>
          {user ? (
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '1px solid #e5e7eb', paddingLeft: '1rem', whiteSpace: 'nowrap' }}>
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                 <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a1c1b' }}>{displayName}</span>
                 <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#8c9196', textTransform: 'uppercase' }}>Farmer</span>
               </div>
               <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: '1px solid #e5e7eb', color: '#4b5563', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                 Logout
               </button>
             </div>
          ) : (
             <Link to="/login" style={{ color: '#4b5563', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
               <User size={22} strokeWidth={2.5} />
             </Link>
          )}
        </div>
      </nav>

      <main style={{ width: '100%', maxWidth: '1440px', margin: '0 auto', padding: '3rem 2%', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1a1c1b', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>Welcome back, {displayName}.</h1>
           <p style={{ color: '#4b5563', fontSize: '1.05rem', margin: 0, fontWeight: 500 }}>
             Your fields are flourishing. We have <span style={{ color: '#166534', fontWeight: 800 }}>{activeOrders.length} active shipments</span> arriving this week to support your harvest cycle.
           </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0', color: '#64748b' }}>
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : loadError ? (
          <div style={{ padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#b91c1c', fontWeight: 700 }}>
            {loadError}
          </div>
        ) : (
          <>
            {/* Active Trackers */}
            <div style={{ marginBottom: '4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1c1b', margin: 0 }}>Active Trackers</h2>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1.5rem' }}>
                
                {activeOrders.map((order) => {
                  const step = getProgressState(order.status);
                  const pill = getStatusPill(order.status);
                  const percent = (step / 4) * 100;
                  const fuStatus = getFollowUpStatus(order.order_id);
                  
                  return (
                    <div key={order.order_id} style={{ flexShrink: 0, width: '400px', backgroundColor: 'white', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden', border: '1px solid #f8fafc' }}>
                      <Truck size={120} color="#f8fafc" style={{ position: 'absolute', top: '-10px', right: '-20px', zIndex: 0, opacity: 0.7 }} />
                      
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                          <span style={{ backgroundColor: pill.bg, color: pill.text, fontSize: '0.65rem', fontWeight: 800, padding: '0.35rem 0.75rem', borderRadius: '9999px', letterSpacing: '0.05em' }}>
                            {pill.label}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <button 
                              onClick={() => handleFollowUpTrigger(order.order_id)} 
                              disabled={fuStatus.disabled}
                              style={{ 
                                border: 'none', 
                                backgroundColor: fuStatus.disabled ? '#e2e8f0' : '#e2f5e8', 
                                color: fuStatus.disabled ? '#94a3b8' : '#166534', 
                                fontSize: '0.7rem', 
                                fontWeight: 800, 
                                padding: '0.4rem 0.9rem', 
                                borderRadius: '9999px', 
                                cursor: fuStatus.disabled ? 'not-allowed' : 'pointer', 
                                textTransform: 'uppercase', 
                                letterSpacing: '0.05em',
                                transition: 'all 0.2s ease'
                              }}
                               title={fuStatus.disabled ? `Retry in ${fuStatus.timeLeftLabel}` : 'Request update from team'}
                            >
                              {fuStatus.disabled ? 'Followed Up' : 'Follow Up'}
                            </button>
                            <span style={{ color: '#cbd5e1', fontWeight: 800, fontSize: '0.85rem' }}>
                              #EA-{order.order_id.substring(0, 5).toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div style={{ marginBottom: '2rem', height: '60px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.4rem', marginBottom: '0.25rem', lineHeight: 1.1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: "'Newsreader', serif" }}>
                            {order.display_name}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                            {order.estimated_delivery_at ? `Arriving: ${formatDate(order.estimated_delivery_at)}` : `Ordered: ${formatDate(order.created_at)}`}
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1a1c1b' }}>Progress</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1a1c1b' }}>{percent}%</span>
                          </div>
                          
                          <div style={{ height: '4px', backgroundColor: '#e2e8f0', width: '100%', marginBottom: '0.5rem', position: 'relative', borderRadius: '2px', overflow: 'hidden' }}>
                             <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: '#166534', width: `${percent}%`, transition: 'width 0.5s' }} />
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.55rem', fontWeight: 800, color: step >= 1 ? '#166534' : '#cbd5e1', letterSpacing: '0.05em' }}>ORDERED</span>
                            <span style={{ fontSize: '0.55rem', fontWeight: 800, color: step >= 2 ? '#166534' : '#cbd5e1', letterSpacing: '0.05em' }}>PENDING</span>
                            <span style={{ fontSize: '0.55rem', fontWeight: 800, color: step >= 3 ? '#166534' : '#cbd5e1', letterSpacing: '0.05em' }}>EN ROUTE</span>
                            <span style={{ fontSize: '0.55rem', fontWeight: 800, color: step >= 4 ? '#166534' : '#cbd5e1', letterSpacing: '0.05em' }}>DELIVERED</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Restock Supplies Card */}
                <div style={{ flexShrink: 0, width: '400px', backgroundColor: '#f9f9f6', borderRadius: '20px', padding: '1.5rem', border: '2px dashed #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', backgroundColor: '#e2f5e8', color: '#166534', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <Plus size={24} strokeWidth={3} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1a1c1b', margin: '0 0 0.5rem 0', fontFamily: "'Newsreader', serif" }}>Restock Supplies</h3>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 1.5rem 0', padding: '0 1rem' }}>Need more essentials for your greenhouse?</p>
                  <Link to="/shop" style={{ backgroundColor: '#084c17', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}>
                    Browse Catalog
                  </Link>
                </div>

              </div>
            </div>

            {/* Purchase History */}
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', gap: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1c1b', margin: 0 }}>Purchase History</h2>
                  <p style={{ color: '#8c9196', fontSize: '0.85rem', marginTop: '0.25rem', fontWeight: 600 }}>Review and track all your previous input cycles.</p>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Search Bar */}
                  <div style={{ position: 'relative', minWidth: '320px', height: '48px' }}>
                    <input
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search order ID, product, or status..."
                      style={{ 
                        width: '100%',
                        height: '100%',
                        padding: '0 1rem 0 2.8rem', 
                        borderRadius: '14px', 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #e5e7eb', 
                        color: '#1a1c1b', 
                        fontWeight: 600, 
                        fontSize: '0.85rem', 
                        outline: 'none',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                      <Search size={18} />
                    </div>
                  </div>

                  {/* Filter Toolbar */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#ffffff', padding: '0 0.4rem', borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', height: '48px', boxSizing: 'border-box' }}>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setIsHistoryFilterOpen(!isHistoryFilterOpen)}
                        style={{ 
                          height: '36px',
                          padding: '0 0.75rem', 
                          borderRadius: '10px', 
                          backgroundColor: '#f8fafc', 
                          border: '1px solid #e2e8f0', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem', 
                          color: '#1a1c1b', 
                          fontWeight: 700, 
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          minWidth: '140px',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Filter size={14} />
                          <span>Status: {historyFilter === 'all' ? 'All' : historyFilter.charAt(0).toUpperCase() + historyFilter.slice(1).replace('_', ' ')}</span>
                        </div>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', transform: isHistoryFilterOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>expand_more</span>
                      </button>

                      {isHistoryFilterOpen && (
                        <>
                          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setIsHistoryFilterOpen(false)} />
                          <div style={{ 
                            position: 'absolute', 
                            top: 'calc(100% + 8px)', 
                            left: 0, 
                            backgroundColor: 'white', 
                            borderRadius: '12px', 
                            border: '1px solid #e2e8f0', 
                            boxShadow: '0 10px 30px rgba(0,0,0,0.1)', 
                            padding: '0.4rem', 
                            zIndex: 50, 
                            minWidth: '160px'
                          }}>
                            {(['all', 'ordered', 'pending', 'en_route', 'delivered', 'cancelled', 'failed'] as HistoryFilter[]).map((f) => (
                              <button
                                key={f}
                                onClick={() => {
                                  setHistoryFilter(f);
                                  setIsHistoryFilterOpen(false);
                                }}
                                style={{ 
                                  width: '100%', 
                                  textAlign: 'left', 
                                  padding: '0.6rem 0.85rem', 
                                  border: 'none', 
                                  borderRadius: '8px', 
                                  backgroundColor: historyFilter === f ? '#e2f5e8' : 'transparent',
                                  color: historyFilter === f ? '#166534' : '#64748b',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {f === 'all' ? 'All Statuses' : f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      onClick={exportFilteredHistoryCsv}
                      disabled={filteredHistoryOrders.length === 0}
                      style={{ 
                        padding: '0.5rem 1rem', 
                        borderRadius: '8px', 
                        backgroundColor: filteredHistoryOrders.length === 0 ? '#f8fafc' : '#084c17', 
                        border: 'none', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        color: filteredHistoryOrders.length === 0 ? '#94a3b8' : '#ffffff', 
                        fontWeight: 700, 
                        fontSize: '0.75rem', 
                        cursor: filteredHistoryOrders.length === 0 ? 'not-allowed' : 'pointer',
                        transition: 'opacity 0.2s ease'
                      }}
                    >
                      <Download size={14} /> Export
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f9f9f6' }}>
                    <tr>
                      <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.7rem', fontWeight: 800, color: '#8c9196', letterSpacing: '0.05em', width: '20%' }}>ORDER ID</th>
                      <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.7rem', fontWeight: 800, color: '#8c9196', letterSpacing: '0.05em', width: '35%' }}>PRODUCT</th>
                      <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.7rem', fontWeight: 800, color: '#8c9196', letterSpacing: '0.05em', width: '25%' }}>DATE</th>
                      <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.7rem', fontWeight: 800, color: '#8c9196', letterSpacing: '0.05em', width: '15%' }}>AMOUNT</th>
                      <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.7rem', fontWeight: 800, color: '#8c9196', letterSpacing: '0.05em', width: '5%', textAlign: 'center' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistoryOrders.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No historical purchases found.</td></tr>
                    ) : (
                      filteredHistoryOrders.map((order) => {
                        const pill = getStatusPill(order.status);
                        
                        return (
                          <tr key={order.order_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '1.5rem', color: '#8c9196', fontSize: '0.85rem', fontWeight: 600 }}>
                              {order.order_id}
                            </td>
                            <td style={{ padding: '1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e2f5e8', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '4px' }}>
                                   <img src={order.display_image} alt={order.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div>
                                  <div style={{ fontWeight: 800, color: '#1a1c1b', fontSize: '0.95rem', marginBottom: '0.2rem' }}>{order.display_name}</div>
                                  <div style={{ color: '#8c9196', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{order.display_category} • {order.total_units || 0} UNITS</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '1.5rem', color: '#1a1c1b', fontSize: '0.9rem', fontWeight: 700 }}>
                              {formatDate(order.created_at)}
                            </td>
                            <td style={{ padding: '1.5rem', fontWeight: 800, color: '#1a1c1b', fontSize: '0.95rem' }}>
                              {formatGhs(order.total_amount)}
                            </td>
                            <td style={{ padding: '1.5rem', textAlign: 'center' }}>
                              <span style={{ 
                                backgroundColor: pill.bg, 
                                color: pill.text, 
                                border: `1px solid ${pill.border}`,
                                fontSize: '0.65rem', 
                                fontWeight: 800, 
                                padding: '0.35rem 0.75rem', 
                                borderRadius: '6px', 
                                letterSpacing: '0.05em',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}>
                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'currentColor', opacity: 0.7 }}></div>
                                {pill.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Follow-up Note Modal */}
      <Modal 
        isOpen={isFollowUpModalOpen} 
        onClose={() => !isSubmittingFollowUp && setIsFollowUpModalOpen(false)}
        title={followUpSuccess ? "" : "Send Order Follow-up"}
      >
        <div style={{ padding: '0.5rem' }}>
          {followUpSuccess ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: '64px', height: '64px', backgroundColor: '#e2f5e8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534', animation: 'scaleIn 0.3s ease' }}>
                  <CheckCircle size={36} />
                </div>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1a1c1b', margin: '0 0 0.5rem 0' }}>Request Sent</h2>
              <p style={{ color: '#64748b', fontWeight: 500 }}>Our team has been notified and will update your order status shortly.</p>
              
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes scaleIn {
                  from { transform: scale(0.5); opacity: 0; }
                  to { transform: scale(1); opacity: 1; }
                }
              `}} />
            </div>
          ) : (
            <>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', fontWeight: 500 }}>
                Requesting an update for order <span style={{ color: '#1a1c1b', fontWeight: 700 }}>#{followUpOrderId?.slice(0, 8).toUpperCase()}</span>. You can optionally add a note for the support team below.
              </p>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8c9196', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>
                  Add a note (Optional)
                </label>
                <textarea
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="e.g. Urgent delivery needed for planting cycle..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '12px',
                    backgroundColor: '#f1f1ee',
                    border: '2px solid transparent',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    color: '#1a1c1b',
                    outline: 'none',
                    resize: 'none',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#084c17'}
                  onBlur={(e) => e.target.style.borderColor = 'transparent'}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => setIsFollowUpModalOpen(false)}
                  disabled={isSubmittingFollowUp}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    borderRadius: '12px',
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitFollowUp}
                  disabled={isSubmittingFollowUp}
                  style={{
                    flex: 2,
                    padding: '1rem',
                    borderRadius: '12px',
                    backgroundColor: '#084c17',
                    color: 'white',
                    fontWeight: 700,
                    border: 'none',
                    cursor: isSubmittingFollowUp ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem'
                  }}
                >
                  {isSubmittingFollowUp ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    "Send Request"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

    </div>
  );
}
