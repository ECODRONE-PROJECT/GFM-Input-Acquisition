import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminInventory, type InventoryItem } from '../lib/adminInventory';
import { fetchAdminAggregateDeals, type AggregateDeal } from '../lib/adminAggregateDeals';
import { fetchAdminSystemSummary, type AdminSystemSummary } from '../lib/adminSystemSummary';
import { fetchAdminActivity, type AdminActivityEntry } from '../lib/adminActivity';
import { fetchAdminNotifications, type AdminNotification } from '../lib/adminNotifications';

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US');
const LOW_STOCK_THRESHOLD = 20;
const CATEGORY_COLOR_CLASSES = [
  'bg-primary',
  'bg-tertiary',
  'bg-secondary',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-sky-500',
];

function asNumber(value: number) {
  return NUMBER_FORMATTER.format(value);
}

function asShorthandMoney(value: number) {
  if (value >= 1_000_000) return `GHS ${(value / 1_000_000).toFixed(3)}M`;
  if (value >= 1_000) return `GHS ${(value / 1_000).toFixed(1)}K`;
  return `GHS ${value.toFixed(2)}`;
}

function formatCategoryLabel(type?: string | null) {
  const raw = (type || 'ITEM').trim().toLowerCase().replace(/_/g, ' ');
  if (!raw) return 'Item';
  return raw.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function timeAgo(value?: string) {
  if (!value) {
    return 'just now';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'just now';
  }
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [deals, setDeals] = useState<AggregateDeal[]>([]);
  const [systemSummary, setSystemSummary] = useState<AdminSystemSummary | null>(null);
  const [activityFeed, setActivityFeed] = useState<AdminActivityEntry[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  const refreshNotifications = async () => {
    try {
      const latest = await fetchAdminNotifications(100, false);
      setNotifications(latest.filter((item) => !item.isRead));
    } catch {
      // Keep existing state on transient fetch failures.
    }
  };

  const loadDashboard = async (quiet = false) => {
    if (!quiet) {
      setLoading(true);
    }
    setError('');

    const [inventoryResult, dealsResult, summaryResult, activityResult, notificationsResult] = await Promise.allSettled([
      fetchAdminInventory(),
      fetchAdminAggregateDeals(),
      fetchAdminSystemSummary(),
      fetchAdminActivity(10),
      fetchAdminNotifications(100, false),
    ]);

    if (inventoryResult.status === 'fulfilled') {
      setInventory(inventoryResult.value);
    }
    if (dealsResult.status === 'fulfilled') {
      setDeals(dealsResult.value);
    }
    if (summaryResult.status === 'fulfilled') {
      setSystemSummary(summaryResult.value);
    }
    if (activityResult.status === 'fulfilled') {
      setActivityFeed(activityResult.value);
    }
    if (notificationsResult.status === 'fulfilled') {
      setNotifications(notificationsResult.value.filter((item) => !item.isRead));
    }

    const errors: string[] = [];
    if (inventoryResult.status === 'rejected') {
      errors.push(inventoryResult.reason instanceof Error ? inventoryResult.reason.message : 'Inventory data failed.');
    }
    if (dealsResult.status === 'rejected') {
      errors.push(dealsResult.reason instanceof Error ? dealsResult.reason.message : 'Deals data failed.');
    }
    if (summaryResult.status === 'rejected') {
      errors.push(summaryResult.reason instanceof Error ? summaryResult.reason.message : 'System summary data failed.');
    }
    if (activityResult.status === 'rejected') {
      errors.push(activityResult.reason instanceof Error ? activityResult.reason.message : 'Activity feed failed.');
    }
    if (notificationsResult.status === 'rejected') {
      errors.push(
        notificationsResult.reason instanceof Error
          ? notificationsResult.reason.message
          : 'Notifications data failed.'
      );
    }
    if (errors.length > 0) {
      setError(errors.join(' '));
    }

    if (!quiet) {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => void refreshNotifications(), 15000);
    const handleFocus = () => void refreshNotifications();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshNotifications();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const totalStockValue = useMemo(
    () => inventory.reduce((sum, item) => sum + item.stock * item.price, 0),
    [inventory],
  );
  const lowStockCount = useMemo(
    () => inventory.filter((item) => item.stock <= LOW_STOCK_THRESHOLD).length,
    [inventory],
  );
  const activeDeals = useMemo(
    () => deals.filter((deal) => deal.status === 'active').length,
    [deals],
  );
  const avgDealProgress = useMemo(() => {
    const active = deals.filter((deal) => deal.status === 'active');
    if (active.length === 0) {
      return 0;
    }
    const total = active.reduce((sum, deal) => sum + (deal.progress_percent || 0), 0);
    return Math.round(total / active.length);
  }, [deals]);
  const categoryMetrics = useMemo(() => {
    const byType = new Map<string, { type: string; units: number; value: number; skus: number }>();
    for (const item of inventory) {
      const type = (item.type || 'ITEM').toUpperCase();
      const current = byType.get(type) || { type, units: 0, value: 0, skus: 0 };
      current.units += item.stock;
      current.value += item.stock * item.price;
      current.skus += 1;
      byType.set(type, current);
    }

    return [...byType.values()]
      .sort((a, b) => b.value - a.value)
      .map((entry, index) => ({
        ...entry,
        share_pct: totalStockValue > 0 ? (entry.value / totalStockValue) * 100 : 0,
        color_class: CATEGORY_COLOR_CLASSES[index % CATEGORY_COLOR_CLASSES.length],
      }));
  }, [inventory, totalStockValue]);
  const ordersSummary = systemSummary?.summary.orders;
  const creditAppsSummary = systemSummary?.summary.credit_applications;
  const creditAccountsSummary = systemSummary?.summary.credit_accounts;
  const paymentsSummary = systemSummary?.summary.payments;
  const logsSummary = systemSummary?.summary.system_logs;
  const purchasesValue = ordersSummary?.gross_value || 0;
  const purchasesCount = ordersSummary?.total || 0;
  const purchasesLast7Days = ordersSummary?.last_7_days || 0;

  const inventoryMovements = useMemo(() => {
    const transactionKeywords = ['ordered', 'delivered', 'purchased', 'joined', 'sold', 'checkout', 'bulk'];
    return activityFeed.filter(entry => {
      const title = entry.title.toLowerCase();
      // Prioritize sales/transactions and exclude administrative 'updated' logs
      return transactionKeywords.some(kw => title.includes(kw)) && !title.includes('updated');
    }).slice(0, 8);
  }, [activityFeed]);

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-2 font-headline">Executive Dashboard</h1>
          <p className="text-on-surface-variant max-w-lg">Live operational metrics from inventory and bulk-deal activity.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => loadDashboard(true)}
            className="flex items-center gap-2 bg-surface-container-low text-on-surface px-5 py-3 rounded-xl font-semibold hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-lg">sync</span>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-[#ffdad6] text-[#93000a] px-4 py-3 rounded-lg font-semibold text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-12">
        {/* 1. Gross Purchases Card */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-white p-8 rounded-xl border border-surface-container relative shadow-sm group">
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex-1">
              <div className="mb-6">
                <p className="text-xs font-bold text-on-surface-variant/70 uppercase tracking-[0.1em]">Gross Purchases</p>
              </div>
              <p className="text-4xl font-black tracking-tighter font-headline mb-6 transition-transform group-hover:translate-x-1 duration-300">
                {loading ? '...' : asShorthandMoney(purchasesValue)}
              </p>
            </div>
            <div className="mt-auto pt-4 border-t border-surface-container-high">
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase">{asNumber(purchasesCount)} DEALS</span>
                  <div className="text-primary font-black text-[10px] uppercase tracking-tighter">
                    {asNumber(purchasesLast7Days)} NEW
                  </div>
               </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 lg:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 2. Total Stock Value Card */}
          <div className="bg-white p-8 rounded-xl border border-surface-container shadow-sm flex flex-col justify-between hover:border-outline/30 transition-all group">
            <div className="flex-1">
              <div className="mb-6">
                <p className="text-xs font-bold text-on-surface-variant/70 uppercase tracking-[0.1em]">Total Stock Value</p>
              </div>
              <h3 className="text-4xl font-black tracking-tighter font-headline text-on-surface mb-6 group-hover:translate-x-1 transition-transform duration-300">
                {loading ? '...' : asShorthandMoney(totalStockValue)}
              </h3>
            </div>
            <div className="mt-auto pt-4 border-t border-surface-container-high">
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase">{inventory.length} SKUS</span>
                  <div className="text-secondary font-black text-[10px] uppercase tracking-tighter">
                    {asNumber(inventory.reduce((s, i) => s + i.stock, 0))} UNITS
                  </div>
               </div>
            </div>
          </div>

          {/* 3. Active Bulk Deals Card */}
          <div className="bg-white p-8 rounded-xl border border-surface-container shadow-sm flex flex-col justify-between hover:border-outline/30 transition-all group">
            <div>
              <div className="mb-6">
                <p className="text-xs font-bold text-on-surface-variant/70 uppercase tracking-[0.1em]">Active Bulk Deals</p>
              </div>
              <h3 className="text-3xl font-black tracking-tighter font-headline text-on-surface">
                {loading ? '...' : asNumber(activeDeals)}
              </h3>
            </div>
            <div className="mt-4">
               <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-bold text-on-surface-variant/60 capitalize">Average Progress</span>
                  <span className="text-xs font-black text-on-surface">{avgDealProgress}%</span>
               </div>
               <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-secondary" style={{ width: `${avgDealProgress}%` }} />
               </div>
            </div>
          </div>

          {/* 4. Low Stock SKUs Card */}
          <div className="bg-white p-8 rounded-xl border border-surface-container shadow-sm transition-all">
            <div className="mb-6">
              <p className={`text-xs font-bold uppercase tracking-[0.1em] ${lowStockCount > 0 ? 'text-error/80' : 'text-on-surface-variant/70'}`}>Low Stock SKUs</p>
            </div>
            
            <h3 className={`text-3xl font-black tracking-tighter font-headline ${lowStockCount > 0 ? 'text-error' : 'text-on-surface'}`}>
              {loading ? '...' : asNumber(lowStockCount)}
            </h3>
            
            {lowStockCount > 0 && (
              <div className="mt-4 space-y-1.5">
                {inventory
                  .filter(i => i.stock <= LOW_STOCK_THRESHOLD)
                  .sort((a,b) => a.stock - b.stock)
                  .slice(0, 2)
                  .map(item => (
                    <div key={item.id} className="flex justify-between items-center px-3 py-1 bg-error/5 rounded-lg border border-error/5">
                      <span className="text-[10px] font-bold text-on-surface truncate pr-2">{item.name}</span>
                      <span className="text-[10px] font-black text-error">{asNumber(item.stock)} UNIT(S)</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>

        <div className="col-span-1 md:col-span-4 lg:col-span-4 space-y-6 flex flex-col">
          {/* Inventory Composition Visual Graph */}
          <div className="bg-white p-10 rounded-2xl border border-stone-200/60 shadow-sm">
             <div className="flex justify-between items-center mb-8">
                <div>
                   <h3 className="text-2xl font-black font-headline text-stone-900 tracking-tight">Inventory Composition</h3>
                   <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Resource Distribution by Value</p>
                </div>
                <div className="text-right">
                   <p className="text-xs font-bold text-stone-900">{categoryMetrics.length} Categories</p>
                   <p className="text-[10px] font-bold text-stone-400 uppercase">Operational</p>
                </div>
             </div>

             <div className="h-6 w-full bg-stone-100 rounded-full overflow-hidden flex mb-8 ring-4 ring-stone-50">
                {categoryMetrics.length === 0 ? (
                  <div className="h-full w-full bg-stone-200 animate-pulse"></div>
                ) : (
                  categoryMetrics.map((entry) => (
                    <div 
                      key={entry.type}
                      className={`${entry.color_class} h-full group relative transition-all hover:brightness-110`}
                      style={{ width: `${entry.share_pct}%` }}
                    >
                       <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <span className="text-[8px] font-black text-white">{Math.round(entry.share_pct)}%</span>
                       </div>
                    </div>
                  ))
                )}
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {categoryMetrics.slice(0, 4).map((entry) => (
                  <div key={entry.type} className="flex items-start gap-3">
                     <div className={`w-3 h-3 rounded-full mt-0.5 ${entry.color_class} shrink-0`}></div>
                     <div>
                        <p className="text-[10px] font-black text-stone-900 uppercase tracking-tight">{formatCategoryLabel(entry.type)}</p>
                        <p className="text-[11px] font-bold text-stone-400 uppercase mt-0.5">{asNumber(entry.units)} Units</p>
                        <p className="text-[10px] font-black text-primary mt-1">{Math.round(entry.share_pct)}% Share</p>
                     </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Recent Inventory Movements (Matches height of Recent Activity) */}
          <div className="bg-white p-10 rounded-2xl border border-stone-200/60 shadow-sm flex-1 flex flex-col">
             <div className="flex items-center justify-between mb-10">
                <div>
                   <h3 className="text-2xl font-black font-headline text-stone-900 tracking-tight">Inventory Movements</h3>
                   <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Real-time Stock Throughput</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center">
                   <span className="material-symbols-outlined text-stone-400 text-[20px]">swap_vert</span>
                </div>
             </div>

             <div className="space-y-6 flex-1">
                {inventoryMovements.length === 0 ? (
                  <div className="h-full flex items-center justify-center border-2 border-dashed border-stone-100 rounded-3xl p-10">
                     <div className="text-center">
                        <span className="material-symbols-outlined text-stone-200 text-5xl mb-4">inventory_2</span>
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">No recent stock movements</p>
                     </div>
                  </div>
                ) : (
                   <table className="w-full text-left">
                      <thead>
                         <tr className="border-b border-stone-100">
                            <th className="pb-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Description</th>
                            <th className="pb-4 text-[10px] font-black text-stone-400 uppercase tracking-widest text-right">Timestamp</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-50">
                         {inventoryMovements.map((entry) => (
                           <tr key={entry.id} className="group hover:bg-stone-50/50 transition-colors">
                              <td className="py-4">
                                 <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                       entry.level === 'error' ? 'bg-red-50 text-red-600' :
                                       entry.title.toLowerCase().includes('payment') ? 'bg-amber-50 text-amber-600' :
                                       entry.title.toLowerCase().includes('ordered') ? 'bg-emerald-50 text-emerald-600' :
                                       'bg-blue-50 text-blue-600'
                                    }`}>
                                       <span className="material-symbols-outlined text-[18px]">
                                          {entry.title.toLowerCase().includes('payment') && entry.title.toLowerCase().includes('success') ? 'credit_score' :
                                           entry.title.toLowerCase().includes('payment') ? 'account_balance_wallet' :
                                           entry.title.toLowerCase().includes('ordered') || entry.title.toLowerCase().includes('placed') ? 'receipt_long' :
                                           entry.title.toLowerCase().includes('stock') ? 'inventory' : 
                                           entry.title.toLowerCase().includes('follow') ? 'assignment_late' : 'history'}
                                       </span>
                                    </div>
                                    <div>
                                       <p className="text-sm font-bold text-stone-900 group-hover:text-black transition-colors">{entry.title}</p>
                                       <p className="text-[10px] font-medium text-stone-400 uppercase mt-0.5">Verified System Log</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="py-4 text-right">
                                 <span className="text-[10px] font-black text-stone-400 uppercase">{timeAgo(entry.timestamp)}</span>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                )}
             </div>

             <div className="mt-10 pt-8 border-t border-stone-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-[10px] font-black text-stone-600 uppercase tracking-widest">Live Audit Trail Active</span>
                </div>
                <Link to="/admin/inventory" className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                   Full Inventory Master <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
             </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-[#fdfdfb] p-10 rounded-2xl border border-stone-200/60 shadow-sm self-start">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-black font-headline text-stone-900 tracking-tight">Recent Activity</h3>
            <div className="w-8 h-[1px] bg-stone-200"></div>
          </div>
          
          <div className="space-y-8">
            {activityFeed.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-stone-100 rounded-2xl">
                 <p className="text-xs font-bold text-stone-400 uppercase tracking-widest italic">Quiet in the fields...</p>
              </div>
            ) : (
              activityFeed.slice(0, 6).map((entry) => {
                // Creative logic for category colors and labels
                const level = entry.level?.toLowerCase() || 'info';
                const isAlert = level === 'error' || level === 'critical' || entry.title.toLowerCase().includes('alert');
                const isUpdate = level === 'success' || entry.title.toLowerCase().includes('updated');
                
                let categoryColor = 'text-stone-400';
                if (isAlert) categoryColor = 'text-[#ba1a1a]';
                else if (isUpdate) categoryColor = 'text-[#0d631b]';

                const categoryLabel = entry.title.split(' ')[0].toUpperCase() + (entry.title.includes(' ') ? ' ' + entry.title.split(' ')[1].toUpperCase() : ' UPDATED');

                return (
                  <div key={entry.id} className="group relative">
                    <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-stone-50 group-hover:bg-primary/20 transition-colors"></div>
                    <div className="pl-2">
                       <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 ${categoryColor}`}>
                         {categoryLabel}
                       </p>
                       <h4 className="text-base font-bold text-stone-800 leading-tight mb-2 group-hover:text-black transition-colors">
                         {entry.title}
                       </h4>
                       <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
                         {timeAgo(entry.timestamp)}
                       </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <div className="mt-6 pt-5 border-t border-stone-100">
             <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl group hover:bg-stone-100 transition-all cursor-pointer">
               <div>
                 <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Attention Center</p>
                 <p className="text-xs font-bold text-stone-900">
                    {notifications.filter(n => !n.isRead).length} Unread Notifications
                 </p>
               </div>
               <Link to="/admin/notifications" className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-stone-400 group-hover:text-primary transition-all">
                  <span className="material-symbols-outlined text-[20px]">notifications</span>
               </Link>
             </div>
          </div>
        </div>
      </div>

      <section className="bg-white p-8 rounded-xl border border-surface-container shadow-sm overflow-hidden mb-20">
        <div className="flex flex-col md:flex-row justify-between mb-10 gap-4 border-b border-surface-container pb-8">
          <div>
            <h2 className="text-3xl font-black font-headline tracking-tighter text-on-surface">System Overview</h2>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-[0.2em] mt-1">Global Operational Snapshot</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin/orders" className="px-5 py-2.5 bg-surface-container-low text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-surface-container-high transition-all">
              Logistics
            </Link>
            <Link to="/admin/credit" className="px-5 py-2.5 bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest rounded-lg hover:opacity-90 transition-all">
              Credit Desk
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* 1. Orders Monitoring */}
          <article className="lg:col-span-1">
            <p className="text-[10px] font-black text-on-surface-variant mb-6 uppercase tracking-[0.2em]">Shipments</p>
            <p className="text-4xl font-black font-headline text-on-surface tracking-tighter mb-4">{asNumber(ordersSummary?.total || 0)}</p>
            <div className="space-y-4">
              <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden flex">
                <div className="h-full bg-primary" style={{ width: `${((ordersSummary?.status_breakdown?.in_transit || 0) / (ordersSummary?.total || 1)) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase">
                <span className="text-on-surface-variant">In Transit</span>
                <span>{asNumber(ordersSummary?.status_breakdown?.in_transit || 0)}</span>
              </div>
            </div>
          </article>

          {/* 2. Credit Lifecycle */}
          <article className="lg:col-span-1">
            <p className="text-[10px] font-black text-on-surface-variant mb-6 uppercase tracking-[0.2em]">Credit Apps</p>
            <p className="text-4xl font-black font-headline text-on-surface tracking-tighter mb-4">{asNumber(creditAppsSummary?.total || 0)}</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px] font-bold text-on-surface">
                 <span className="text-on-surface-variant/60 uppercase tracking-tighter">Submitted</span>
                 <span className="text-sky-600 font-black">{asNumber(creditAppsSummary?.submitted || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] font-bold text-on-surface">
                 <span className="text-on-surface-variant/60 uppercase tracking-tighter">Approved</span>
                 <span className="text-primary font-black">{asNumber(creditAppsSummary?.approved || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] font-bold text-on-surface">
                 <span className="text-on-surface-variant/60 uppercase tracking-tighter">Reviewing</span>
                 <span className="text-amber-600 font-black">{asNumber(creditAppsSummary?.under_review || 0)}</span>
              </div>
            </div>
          </article>

          {/* 3. Approved Pool */}
          <article className="lg:col-span-1">
            <p className="text-[10px] font-black text-on-surface-variant mb-6 uppercase tracking-[0.2em]">Credit Pool</p>
            <p className="text-4xl font-black font-headline text-on-surface tracking-tighter mb-4">{asShorthandMoney(creditAccountsSummary?.assigned_limit_total || 0)}</p>
            <div className="space-y-2">
               <div className="flex justify-between text-[10px] font-black uppercase">
                 <span className="text-on-surface-variant/40">Utilization</span>
                 <span>{Math.round(((creditAccountsSummary?.consumed_credit_total || 0) / (creditAccountsSummary?.assigned_limit_total || 1)) * 100)}%</span>
               </div>
               <div className="h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
                 <div className="h-full bg-on-surface" style={{ width: `${((creditAccountsSummary?.consumed_credit_total || 0) / (creditAccountsSummary?.assigned_limit_total || 1)) * 100}%` }} />
               </div>
            </div>
          </article>

          {/* 4. Payment Context */}
          <article className="lg:col-span-1">
            <p className="text-[10px] font-black text-on-surface-variant mb-6 uppercase tracking-[0.2em]">Revenue Flow</p>
            <p className="text-4xl font-black font-headline text-on-surface tracking-tighter mb-4">{asNumber(paymentsSummary?.total_intents || 0)}</p>
            <div className="space-y-1">
               <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Success Rate: {Math.round(((paymentsSummary?.completed || 0) / (paymentsSummary?.total_intents || 1)) * 100)}%</p>
            </div>
          </article>

          {/* 5. Logs */}
          <article className="lg:col-span-1 border-l border-dashed border-surface-container pl-8">
            <p className="text-[10px] font-black text-on-surface-variant mb-6 uppercase tracking-[0.2em]">Audit Feed</p>
            <p className="text-4xl font-black font-headline text-on-surface tracking-tighter mb-4">{asNumber(logsSummary?.last_24_hours || 0)}</p>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-2">
               Live Logging Active
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
