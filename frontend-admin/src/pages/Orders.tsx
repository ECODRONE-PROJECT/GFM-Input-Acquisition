import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchAdminOrderDetails,
  fetchAdminOrders,
  type AdminOrder,
  type AdminOrderDetailsResponse,
  updateAdminOrderStatus,
} from '../lib/adminOrders';
import { fetchAdminInventory, type InventoryItem } from '../lib/adminInventory';
import { fetchAdminSystemSummary, type AdminSystemSummary } from '../lib/adminSystemSummary';

const PAGE_SIZE = 8;
const ORDER_DEEPLINK_PARAM = 'orderId';
const DEFAULT_ORDER_IMAGE = '/gfm_logo_small.png';
const NUMBER_FORMATTER = new Intl.NumberFormat('en-US');
const MONEY_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type StatusFilter = 'all' | 'ordered' | 'pending' | 'en_route' | 'delivered' | 'cancelled';
type RangeFilter = '7d' | '30d' | 'all';

const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'pending', label: 'Pending' },
  { value: 'en_route', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'all', label: 'All Time' },
];

const CUSTOM_STATUS_OPTIONS = [
  { value: 'ordered', label: 'Ordered', icon: 'shopping_cart' },
  { value: 'pending', label: 'Pending', icon: 'pending' },
  { value: 'en_route', label: 'In Transit', icon: 'local_shipping' },
  { value: 'delivered', label: 'Delivered', icon: 'verified' },
  { value: 'cancelled', label: 'Cancelled', icon: 'cancel' },
];

function asNumber(value: number) {
  return NUMBER_FORMATTER.format(value);
}

function asMoney(value: number) {
  return `GHS ${MONEY_FORMATTER.format(value)}`;
}

function initialsFromUser(userId: string) {
  const cleaned = userId
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  return cleaned || 'NA';
}

function formatOrderDate(value?: string | null) {
  if (!value) {
    return { date: '-', time: '--:--' };
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { date: '-', time: '--:--' };
  }
  return {
    date: parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    time: parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
}

function statusLabelForDisplay(order: AdminOrder) {
  const normalized = normalizeOrderStatusKey(order.status);
  if (normalized === 'ordered') return 'Ordered';
  if (normalized === 'pending') return 'Pending';
  if (normalized === 'en_route') return 'In Transit';
  if (normalized === 'delivered') return 'Delivered';
  if (normalized === 'cancelled') return 'Cancelled';
  return order.status_label || 'Unknown';
}

function statusPill(status: string) {
  const normalized = normalizeOrderStatusKey(status);
  if (normalized === 'delivered') {
    return 'bg-[#ecfdf5] text-[#065f46] border border-[#d1fae5]';
  }
  if (normalized === 'en_route') {
    return 'bg-[#eff6ff] text-[#1e40af] border border-[#dbeafe]';
  }
  if (normalized === 'pending' || normalized === 'ordered') {
    return 'bg-[#fffbeb] text-[#92400e] border border-[#fef3c7]';
  }
  if (normalized === 'cancelled' || normalized === 'failed') {
    return 'bg-[#fef2f2] text-[#991b1b] border border-[#fee2e2]';
  }
  return 'bg-[#f9fafb] text-[#374151] border border-[#f3f4f6]';
}

function getFromDate(range: RangeFilter) {
  if (range === 'all') return undefined;
  const date = new Date();
  date.setDate(date.getDate() - (range === '7d' ? 7 : 30));
  return date.toISOString();
}

function toCsvValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '';
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

function normalizeOrderStatusKey(status?: string | null): Exclude<StatusFilter, 'all'> {
  const normalized = (status || '').toLowerCase().trim();
  if (normalized === 'delivered') return 'delivered';
  if (normalized === 'cancelled') return 'cancelled';
  if (normalized === 'failed') return 'cancelled';
  if (normalized === 'in_transit' || normalized === 'out_for_delivery' || normalized === 'en_route') return 'en_route';
  if (normalized === 'pending' || normalized === 'processing' || normalized === 'packed') return 'pending';
  return 'ordered';
}

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkedOrderId = searchParams.get(ORDER_DEEPLINK_PARAM)?.trim() || '';
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [summary, setSummary] = useState<AdminSystemSummary | null>(null);
  const [inventoryById, setInventoryById] = useState<Record<string, InventoryItem>>({});
  const [total, setTotal] = useState(0);
  const [effectivePageSize, setEffectivePageSize] = useState(PAGE_SIZE);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('30d');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<AdminOrderDetailsResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [updateStatusValue, setUpdateStatusValue] = useState<string>('');
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isRangeDropdownOpen, setIsRangeDropdownOpen] = useState(false);

  const selectOrder = (order: AdminOrder) => {
    setSelectedOrder(order);
    setUpdateStatusValue(normalizeOrderStatusKey(order.status));
  };

  useEffect(() => {
    let cancelled = false;
    const loadInventory = async () => {
      try {
        const items = await fetchAdminInventory();
        if (cancelled) return;
        const nextMap: Record<string, InventoryItem> = {};
        for (const item of items) {
          nextMap[item.id] = item;
        }
        setInventoryById(nextMap);
      } catch {
        // Keep UI functional even if inventory metadata is unavailable.
      }
    };
    void loadInventory();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim();
      setSearchQuery((current) => {
        if (current === next) return current;
        setOffset(0);
        return next;
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const from_date = getFromDate(rangeFilter);
      const query = searchQuery || undefined;

      const [ordersResult, summaryResult] = await Promise.allSettled([
        fetchAdminOrders({
          status,
          query,
          from_date,
          limit: PAGE_SIZE,
          offset,
        }),
        fetchAdminSystemSummary(),
      ]);

      if (cancelled) {
        return;
      }

      const errors: string[] = [];
      if (ordersResult.status === 'fulfilled') {
        const result = ordersResult.value;
        const serverLimit = Math.max(1, Number(result.limit) || PAGE_SIZE);
        const serverTotal = Math.max(0, Number(result.total) || 0);
        const serverOffset = Math.max(0, Number(result.offset) || 0);
        setEffectivePageSize(serverLimit);
        setTotal(serverTotal);

        if (serverTotal > 0 && serverOffset >= serverTotal) {
          const lastValidOffset = Math.floor((serverTotal - 1) / serverLimit) * serverLimit;
          if (offset !== lastValidOffset) {
            setOffset(lastValidOffset);
            setOrders([]);
            setLoading(false);
            return;
          }
        }

        setOrders(result.orders || []);
        if (serverOffset !== offset) {
          setOffset(serverOffset);
        }
      } else {
        errors.push(ordersResult.reason instanceof Error ? ordersResult.reason.message : 'Could not fetch orders.');
        setOrders([]);
        setTotal(0);
      }

      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value);
      } else {
        errors.push(summaryResult.reason instanceof Error ? summaryResult.reason.message : 'Could not fetch order summary.');
      }

      if (errors.length > 0) {
        setError(errors.join(' '));
      }
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, rangeFilter, searchQuery, offset]);

  useEffect(() => {
    if (!deepLinkedOrderId) return;
    let cancelled = false;

    const clearDeepLinkParam = () => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete(ORDER_DEEPLINK_PARAM);
      setSearchParams(nextParams, { replace: true });
    };

    const openDeepLinkedOrder = async () => {
      if (selectedOrder?.order_id === deepLinkedOrderId) {
        clearDeepLinkParam();
        return;
      }
      try {
        const details = await fetchAdminOrderDetails(deepLinkedOrderId);
        if (cancelled) return;
        selectOrder(details.order);
        setSelectedOrderDetails(details);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not open linked order.');
        }
      } finally {
        if (!cancelled) {
          clearDeepLinkParam();
        }
      }
    };

    void openDeepLinkedOrder();
    return () => {
      cancelled = true;
    };
  }, [deepLinkedOrderId, searchParams, selectedOrder?.order_id, setSearchParams]);

  const ordersSummary = summary?.summary.orders;
  const breakdown = ordersSummary?.status_breakdown;
  const totalOrders = ordersSummary?.total ?? total;
  const pendingProcessing = (breakdown?.ordered || 0) + (breakdown?.pending || 0);
  const inTransitCount = breakdown?.in_transit || 0;
  const deliveredCount = breakdown?.delivered || 0;
  const grossValue = ordersSummary?.gross_value ?? orders.reduce((sum, row) => sum + row.total_amount, 0);
  const fulfillmentRate = totalOrders > 0 ? (deliveredCount / totalOrders) * 100 : 0;

  const pageSizeForPagination = Math.max(1, effectivePageSize || PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / pageSizeForPagination));
  const page = total === 0 ? 1 : Math.min(totalPages, Math.floor(offset / pageSizeForPagination) + 1);
  const showingFrom = total === 0 ? 0 : Math.min(offset + 1, total);
  const showingTo = total === 0 ? 0 : Math.min(offset + orders.length, total);
  const selectedOrderView = useMemo(() => {
    if (!selectedOrder) return null;
    if (selectedOrderDetails?.order?.order_id === selectedOrder.order_id) {
      return selectedOrderDetails.order;
    }
    return selectedOrder;
  }, [selectedOrder, selectedOrderDetails]);
  const selectedItems = selectedOrderView?.items || [];
  const leadItem = selectedItems[0];
  const leadInventoryItem = leadItem ? inventoryById[String(leadItem.id)] : undefined;
  const selectedCardImage = DEFAULT_ORDER_IMAGE;
  const isSelectedArchived =
    normalizeOrderStatusKey(selectedOrderView?.status) === 'delivered' ||
    normalizeOrderStatusKey(selectedOrderView?.status) === 'cancelled';
  const selectedCardTitle =
    leadInventoryItem?.name ||
    leadItem?.name ||
    (selectedOrderView ? `Order #${selectedOrderView.order_id.substring(0, 8)}` : 'Package');
  const selectedCardUnits =
    selectedOrderView?.total_quantity ||
    selectedItems.reduce((sum, item) => sum + Math.max(Number(item.quantity) || 0, 0), 0);
  const selectedCardItemCount = selectedOrderView?.item_count || selectedItems.length;
  const timelineStatusTimes = useMemo(() => {
    const map: Record<string, string> = {};
    const timeline = selectedOrderDetails?.timeline || [];
    for (const event of timeline) {
      const key = normalizeOrderStatusKey(event.status);
      if (!map[key] && event.event_time) {
        const parsed = formatOrderDate(event.event_time);
        map[key] = `${parsed.date}, ${parsed.time}`;
      }
    }
    return map;
  }, [selectedOrderDetails]);

  const handleStatusChange = (next: StatusFilter) => {
    setStatusFilter(next);
    setOffset(0);
  };

  const handleExportCsv = async () => {
    if (total === 0) return;
    setIsExporting(true);
    const header = [
      'order_id',
      'created_at',
      'user_id',
      'status',
      'status_label',
      'payment_status',
      'payment_provider',
      'payment_reference',
      'total_amount',
      'total_quantity',
    ];
    try {
      const rows: AdminOrder[] = [];
      let nextOffset = 0;
      const pageSize = 200;
      let expectedTotal = Number.POSITIVE_INFINITY;
      let guard = 0;
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const from_date = getFromDate(rangeFilter);
      const query = searchQuery || undefined;
      while (nextOffset < expectedTotal && guard < 200) {
        const page = await fetchAdminOrders({
          status,
          query,
          from_date,
          limit: pageSize,
          offset: nextOffset,
        });
        const chunk = page.orders || [];
        rows.push(...chunk);
        expectedTotal = Number.isFinite(page.total) ? page.total : rows.length;
        if (chunk.length === 0) {
          break;
        }
        nextOffset += pageSize;
        guard += 1;
      }
      const serializedRows = rows.map((order) => [
        toCsvValue(order.order_id),
        toCsvValue(order.created_at),
        toCsvValue(order.user_id),
        toCsvValue(normalizeOrderStatusKey(order.status)),
        toCsvValue(statusLabelForDisplay(order)),
        toCsvValue(order.payment_status),
        toCsvValue(order.payment_provider),
        toCsvValue(order.payment_reference || ''),
        toCsvValue(order.total_amount),
        toCsvValue(order.total_quantity),
      ]);
      const csv = [header.join(','), ...serializedRows.map((row) => row.join(','))].join('\n');
      const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `admin_orders_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export orders.');
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (!selectedOrder) {
      setSelectedOrderDetails(null);
      return;
    }
    setUpdateStatusValue(normalizeOrderStatusKey(selectedOrder.status));
    let cancelled = false;
    const loadDetails = async () => {
      setLoadingDetails(true);
      try {
        const details = await fetchAdminOrderDetails(selectedOrder.order_id);
        if (!cancelled) {
          setSelectedOrderDetails(details);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not fetch order details.');
        }
      } finally {
        if (!cancelled) {
          setLoadingDetails(false);
        }
      }
    };
    void loadDetails();
    return () => {
      cancelled = true;
    };
  }, [selectedOrder?.order_id]);

  const handleStatusUpdate = async () => {
    if (!selectedOrderView || !updateStatusValue) return;
    if (isSelectedArchived) return;
    if (normalizeOrderStatusKey(updateStatusValue) === normalizeOrderStatusKey(selectedOrderView.status)) return;
    setIsUpdating(true);
    setError('');
    try {
      const result = await updateAdminOrderStatus(selectedOrderView.order_id, {
        status: normalizeOrderStatusKey(updateStatusValue),
      });
      const updatedOrder = result.order;
      setOrders((current) =>
        current.map((order) => (order.order_id === updatedOrder.order_id ? { ...order, ...updatedOrder } : order))
      );
      setSelectedOrder((current) => {
        if (!current || current.order_id !== updatedOrder.order_id) return current;
        return { ...current, ...updatedOrder };
      });
      try {
        const details = await fetchAdminOrderDetails(updatedOrder.order_id);
        setSelectedOrderDetails(details);
      } catch {
        // Keep main table state even if details refresh fails.
      }
      try {
        const latestSummary = await fetchAdminSystemSummary();
        setSummary(latestSummary);
      } catch {
        // Summary refresh failure should not block status updates.
      }
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update order status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getOrderStatusStep = (status?: string) => {
    const s = normalizeOrderStatusKey(status);
    if (s === 'delivered') return 4;
    if (s === 'en_route') return 3;
    if (s === 'pending') return 2;
    return 1; // Ordered
  };

  return (
    <section className="w-full min-h-full space-y-8 font-body text-stone-600">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-stone-400 mb-2">
            Fleet / <span className="text-[#0d631b]">Field Logic</span>
          </p>
          <h1 className="text-3xl font-headline font-extrabold text-[#1a1c1b] tracking-tight mb-2">
            Order Management
          </h1>
          <p className="text-sm font-medium text-stone-500 max-w-2xl leading-relaxed">
            Live admin view of order lifecycle, shipment progress, and fulfillment outcomes.
          </p>
        </div>
        <div>
          <button
            onClick={() => void handleExportCsv()}
            className="flex items-center gap-2 bg-[#e8e8e5] text-[#1a1c1b] px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-stone-300 transition-colors shadow-sm disabled:opacity-50"
            disabled={total === 0 || isExporting}
          >
            <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[#ffdad6] bg-[#fff3f2] px-4 py-3 text-sm font-semibold text-[#93000a]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 border border-stone-100 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <p className="text-xs text-stone-500 font-bold mb-1 relative z-10">Total Orders</p>
          <div className="relative z-10">
            <p className="text-4xl font-headline font-extrabold text-stone-900 tracking-tighter mb-2">
              {loading ? '...' : asNumber(totalOrders)}
            </p>
            <p className="text-xs font-bold text-[#0d631b] flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">sync</span>
              {loading ? 'Syncing...' : `${asNumber(ordersSummary?.last_7_days || 0)} new in 7 days`}
            </p>
          </div>
          <span className="absolute -right-4 -bottom-4 material-symbols-outlined text-[100px] text-stone-50 pointer-events-none">package_2</span>
        </div>

        <div className="bg-white rounded-xl p-6 border border-stone-100 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <p className="text-xs text-stone-500 font-bold mb-1 relative z-10">Pending Processing</p>
          <div className="relative z-10">
            <p className="text-4xl font-headline font-extrabold text-stone-900 tracking-tighter mb-2">
              {loading ? '...' : asNumber(pendingProcessing)}
            </p>
            <p className="text-xs font-bold text-[#ba1a1a] flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">pending_actions</span>
              {loading ? 'Syncing...' : `${asNumber(breakdown?.pending || 0)} pending, ${asNumber(breakdown?.ordered || 0)} ordered`}
            </p>
          </div>
          <span className="absolute -right-4 -bottom-4 material-symbols-outlined text-[100px] text-stone-50 pointer-events-none">pending_actions</span>
        </div>

        <div className="bg-white rounded-xl p-6 border border-stone-100 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <p className="text-xs text-stone-500 font-bold mb-1 relative z-10">Gross Order Value</p>
          <div className="relative z-10">
            <p className="text-4xl font-headline font-extrabold text-stone-900 tracking-tighter mb-2">
              {loading ? '...' : asMoney(grossValue)}
            </p>
            <p className="text-xs font-bold text-[#0d631b] flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">payments</span>
              {loading ? 'Syncing...' : `${asNumber(inTransitCount)} currently in transit`}
            </p>
          </div>
          <span className="absolute -right-4 -bottom-4 material-symbols-outlined text-[100px] text-stone-50 pointer-events-none">payments</span>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-[#a3f69c] shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <p className="text-xs text-stone-500 font-bold mb-1 relative z-10">Fulfillment Rate</p>
          <div className="relative z-10">
            <p className="text-4xl font-headline font-extrabold text-stone-900 tracking-tighter mb-2">
              {loading ? '...' : `${fulfillmentRate.toFixed(1)}%`}
            </p>
            <p className="text-xs font-bold text-[#0d631b] flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              {loading ? 'Syncing...' : `${asNumber(deliveredCount)} delivered`}
            </p>
          </div>
          <span className="absolute -right-4 -bottom-4 material-symbols-outlined text-[100px] text-stone-50 pointer-events-none">verified</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-8 items-start">
        <div className="min-w-0 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 bg-[#f4f4f1] p-4 rounded-xl border border-stone-200/50 mb-4">
            <div className="flex items-center gap-6 overflow-x-auto px-1 scrollbar-hide">
              <span className="text-[10px] font-bold text-stone-400 tracking-widest uppercase whitespace-nowrap">Filter By Status:</span>
              <div className="flex items-center gap-2">
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleStatusChange(option.value)}
                    className={`${statusFilter === option.value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'} font-bold px-4 py-2.5 rounded-lg text-xs transition-colors whitespace-nowrap`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-4 flex-1 lg:flex-none">
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search ID..."
                className="bg-white border border-stone-200 px-3 py-2.5 rounded-lg text-xs font-bold text-stone-700 w-full lg:w-[150px] shadow-sm hover:border-[#0d631b]/30 focus:outline-none focus:border-[#0d631b]/40"
              />
              {/* Range Filter Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsRangeDropdownOpen(!isRangeDropdownOpen)}
                  className="flex items-center justify-between gap-3 bg-white border border-stone-200 px-4 py-2.5 rounded-lg text-xs font-bold text-stone-700 w-full lg:min-w-[140px] shadow-sm hover:border-[#0d631b]/30 transition-all active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-stone-400">calendar_today</span>
                    {RANGE_OPTIONS.find(o => o.value === rangeFilter)?.label || rangeFilter}
                  </span>
                  <span className={`material-symbols-outlined text-[16px] text-stone-400 transition-transform ${isRangeDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>

                {isRangeDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsRangeDropdownOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.12)] border border-stone-100 p-1.5 z-50 min-w-[180px] animate-in fade-in slide-in-from-top-2 duration-200">
                      {RANGE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setRangeFilter(option.value as any);
                            setOffset(0);
                            setIsRangeDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                            rangeFilter === option.value 
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
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-visible relative">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f9f9f6] text-stone-400 text-[10px] font-bold uppercase tracking-widest border-b border-stone-100">
                    <th className="px-6 py-5 rounded-tl-xl whitespace-nowrap">Order ID</th>
                    <th className="px-6 py-5 whitespace-nowrap">Date</th>
                    <th className="px-6 py-5 whitespace-nowrap">Customer</th>
                    <th className="px-6 py-5 text-center whitespace-nowrap">Status</th>
                    <th className="px-6 py-5 text-right whitespace-nowrap">Total</th>
                    <th className="px-6 py-5 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-stone-500 font-medium">
                        Loading orders...
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-stone-500 font-medium">
                        No orders found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => {
                      const created = formatOrderDate(order.created_at);
                      const normalizedStatus = normalizeOrderStatusKey(order.status);
                      const isArchivedOrder = normalizedStatus === 'delivered' || normalizedStatus === 'cancelled';
                      return (
                        <tr 
                          key={order.order_id} 
                          onClick={() => selectOrder(order)}
                          className={`border-b border-stone-50 hover:bg-stone-50 transition-colors cursor-pointer ${selectedOrder?.order_id === order.order_id ? 'bg-[#f4f4f1] border-[#0d631b]/20 shadow-sm' : ''}`}
                        >
                          <td className="px-6 py-5 min-w-[140px]">
                            <span className={`font-bold block ${selectedOrder?.order_id === order.order_id ? 'text-[#0d631b]' : 'text-stone-900'}`}>#{order.order_id.substring(0, 8)}</span>
                            <span className="text-[10px] text-stone-400 block mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">
                              {order.payment_reference || order.payment_provider || 'No Ref'}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className="font-bold text-stone-900 block">{created.date}</span>
                            <span className="text-[10px] text-stone-400 block mt-0.5">{created.time}</span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-bold text-[10px] flex-shrink-0">
                                {initialsFromUser(order.user_id)}
                              </div>
                              <div className="min-w-0">
                                 <span className="font-bold text-stone-900 block leading-tight truncate max-w-[120px]">{order.user_id}</span>
                                 <span className="text-[10px] text-stone-400 block mt-0.5">{order.payment_provider || 'Customer'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center whitespace-nowrap">
                            <span className={`${statusPill(order.status)} px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest inline-flex items-center gap-1.5 shadow-sm`}>
                              <div className="w-1 h-1 rounded-full bg-current opacity-70"></div> {statusLabelForDisplay(order)}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className="font-bold text-stone-900 block">{asMoney(order.total_amount)}</span>
                            <span className="text-[10px] font-medium text-stone-400 block mt-0.5 whitespace-nowrap">
                              {asNumber(order.total_quantity)} Units
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right whitespace-nowrap">
                            {isArchivedOrder ? (
                              <span className="text-stone-400 font-bold text-xs">Archived</span>
                            ) : (
                              <button 
                                className="text-[#0d631b] font-bold text-xs hover:underline"
                              >
                                Update Status
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between overflow-x-auto bg-[#f9f9f6] rounded-b-xl">
              <p className="text-xs text-stone-500 font-medium whitespace-nowrap tracking-wide">
                Showing {asNumber(showingFrom)} to {asNumber(showingTo)} of {asNumber(total)} entries
              </p>
              <div className="flex items-center gap-1 bg-white border border-stone-200/60 rounded-[14px] p-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)] shrink-0">
                <button
                  onClick={() => setOffset(0)}
                  disabled={offset === 0 || loading}
                  className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-[#0d631b] hover:bg-[#0d631b]/5 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-stone-400 rounded-lg transition-all"
                  title="First Page"
                >
                  <span className="material-symbols-outlined text-[20px]">first_page</span>
                </button>
                <button
                  onClick={() => setOffset((current) => Math.max(0, current - pageSizeForPagination))}
                  disabled={offset === 0 || loading}
                  className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-[#0d631b] hover:bg-[#0d631b]/5 disabled:opacity-20 disabled:hover:bg-transparent rounded-lg transition-all"
                  title="Previous Page"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
                
                <div className="px-5 py-1.5 flex items-center gap-2 border-x border-stone-100 mx-1">
                  <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">Page</span>
                  <span className="text-sm font-headline font-black text-[#1a1c1b]">{page}</span>
                  <span className="text-[11px] font-bold text-stone-300 uppercase tracking-widest">of</span>
                  <span className="text-[11px] font-bold text-stone-500">{totalPages}</span>
                </div>

                <button
                  onClick={() =>
                    setOffset((current) =>
                      Math.min(current + pageSizeForPagination, Math.max(0, (totalPages - 1) * pageSizeForPagination))
                    )
                  }
                  disabled={offset + pageSizeForPagination >= total || loading}
                  className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-[#0d631b] hover:bg-[#0d631b]/5 disabled:opacity-20 disabled:hover:bg-transparent rounded-lg transition-all"
                  title="Next Page"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
                <button
                  onClick={() => setOffset(Math.max(0, (totalPages - 1) * pageSizeForPagination))}
                  disabled={offset + pageSizeForPagination >= total || loading}
                  className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-[#0d631b] hover:bg-[#0d631b]/5 disabled:opacity-20 disabled:hover:bg-transparent rounded-lg transition-all"
                  title="Last Page"
                >
                  <span className="material-symbols-outlined text-[20px]">last_page</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Update Side Panel */}
        <aside className="w-full bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-stone-100 h-fit max-h-[calc(100vh-8rem)] sticky top-32 overflow-y-auto flex flex-col custom-scrollbar">
          {!selectedOrder ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-stone-400">
               <span className="material-symbols-outlined text-6xl mb-4 opacity-20">order_approve</span>
               <p className="text-sm font-bold uppercase tracking-widest opacity-60">No Order Selected</p>
               <p className="text-xs mt-2 font-medium">Select an order from the list to update its delivery status and ETA.</p>
            </div>
          ) : (
            <>
              <div className="p-6 pb-2">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-[10px] font-bold text-stone-300 uppercase tracking-[0.2em] mb-1">Order Review</p>
                    <h3 className="text-base font-headline font-extrabold text-[#1a1c1b] tracking-tight">#{selectedOrderView?.order_id.substring(0, 8)}</h3>
                  </div>
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => {
                        setSelectedOrder(null);
                        setIsStatusDropdownOpen(false);
                      }}
                      className="p-1 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
                      title="Unselect Order"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>
                </div>

                <div className="relative rounded-2xl overflow-hidden h-40 mb-6 group bg-stone-900 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-10"></div>
                  <img 
                    src={selectedCardImage} 
                    alt={selectedCardTitle} 
                    onError={(event) => {
                      const target = event.currentTarget;
                      if (target.dataset.fallbackApplied) return;
                      target.dataset.fallbackApplied = '1';
                      target.src = DEFAULT_ORDER_IMAGE;
                    }}
                    className="w-full h-full object-contain object-center opacity-80 p-3" 
                  />
                  <div className="absolute bottom-5 left-5 z-20 text-white">
                    <p className="font-headline font-extrabold text-xl leading-tight mb-1">{selectedCardTitle}</p>
                    <p className="text-white/60 font-bold text-xs uppercase tracking-widest">{selectedCardUnits} units • {selectedCardItemCount} item(s)</p>
                  </div>
                </div>

                {/* Progress Timeline */}
                <div className="space-y-5 relative ml-2">
                  <div className="absolute left-2.5 top-2 bottom-8 w-[1px] bg-stone-100 -z-10"></div>
                  
                  {[
                    { key: 'ordered', label: 'Ordered', icon: 'check_circle' },
                    { key: 'pending', label: 'Pending', icon: 'check_circle' },
                    { key: 'en_route', label: 'En Route', icon: 'local_shipping' },
                    { key: 'delivered', label: 'Delivered', icon: 'radio_button_unchecked' },
                  ].map((step, idx) => {
                    const currentStep = getOrderStatusStep(selectedOrderView?.status);
                    const stepIndex = idx + 1;
                    const isActive = stepIndex <= currentStep;
                    const isNext = stepIndex === currentStep + 1;
                    const stepTime =
                      timelineStatusTimes[step.key] ||
                      (
                        step.key === 'en_route' && selectedOrderView?.estimated_delivery_at
                          ? `ETA: ${formatOrderDate(selectedOrderView.estimated_delivery_at).date}, ${formatOrderDate(selectedOrderView.estimated_delivery_at).time}`
                          : (loadingDetails ? 'Loading...' : 'Awaiting update')
                      );

                    return (
                      <div key={step.key} className="flex gap-4">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center z-10 mt-1 transition-colors ${
                          isActive ? 'bg-[#0d631b] text-white' : 'bg-white border-2 border-stone-100 text-stone-200'
                        }`}>
                          <span className="material-symbols-outlined text-[12px]">
                            {isActive ? 'check' : step.icon === 'local_shipping' && isNext ? 'local_shipping' : 'radio_button_unchecked'}
                          </span>
                        </div>
                        <div className={`${!isActive && 'opacity-30'}`}>
                          <p className="text-xs font-extrabold text-stone-900 leading-none mb-1">{step.label}</p>
                          <p className="text-[9px] font-bold text-stone-400 tracking-wide">{stepTime}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Update Form */}
              <div className="p-6 bg-[#fdfdfb] border-t border-stone-100/80">

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.1em] block mb-2">Modify delivery state</label>
                    <div className="relative">
                      {/* Custom Select Trigger */}
                      <button 
                        onClick={() => {
                          if (!isSelectedArchived) {
                            setIsStatusDropdownOpen(!isStatusDropdownOpen);
                          }
                        }}
                        disabled={isSelectedArchived}
                        className="w-full relative bg-white border border-stone-200 rounded-xl p-4 pr-12 text-sm font-bold text-stone-700 outline-none flex items-center hover:border-[#0d631b]/30 hover:bg-stone-50/50 transition-all shadow-sm active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <span className="flex items-center gap-3">
                           <span className="material-symbols-outlined text-[#0d631b] text-lg">
                             {CUSTOM_STATUS_OPTIONS.find(o => o.value === updateStatusValue)?.icon || 'settings'}
                           </span>
                           {CUSTOM_STATUS_OPTIONS.find(o => o.value === updateStatusValue)?.label || 'Select Status'}
                        </span>
                        <span className={`absolute right-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-stone-400 transition-transform duration-300 ${isStatusDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                      </button>

                      {/* Custom Select Menu */}
                      {isStatusDropdownOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-[60]" 
                            onClick={() => setIsStatusDropdownOpen(false)}
                          />
                          <div className="absolute bottom-full left-0 right-0 mb-3 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-stone-100 overflow-hidden z-[70] animate-in fade-in slide-in-from-bottom-2 duration-200">
                             <div className="p-2 space-y-1">
                               {CUSTOM_STATUS_OPTIONS.map((option) => (
                                 <button
                                   key={option.value}
                                   onClick={() => {
                                     setUpdateStatusValue(option.value);
                                     setIsStatusDropdownOpen(false);
                                   }}
                                   className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all ${
                                     updateStatusValue === option.value 
                                       ? 'bg-[#0d631b]/5 text-[#0d631b]' 
                                       : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                                   }`}
                                 >
                                   <div className="flex items-center gap-3">
                                      <span className={`material-symbols-outlined text-lg ${updateStatusValue === option.value ? 'text-[#0d631b]' : 'text-stone-400'}`}>
                                        {option.icon}
                                      </span>
                                      <span className="text-sm font-bold">{option.label}</span>
                                   </div>
                                   {updateStatusValue === option.value && (
                                     <span className="material-symbols-outlined text-sm">check</span>
                                   )}
                                 </button>
                               ))}
                             </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    disabled={isSelectedArchived || isUpdating || normalizeOrderStatusKey(updateStatusValue) === normalizeOrderStatusKey(selectedOrderView?.status)}
                    onClick={() => void handleStatusUpdate()}
                    className="w-full bg-[#0d631b] text-white font-extrabold py-3.5 rounded-2xl shadow-[0_12px_24px_rgba(13,99,27,0.25)] hover:shadow-[0_16px_32px_rgba(13,99,27,0.3)] hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none transition-all text-sm tracking-tight active:scale-[0.98]"
                  >
                    {isSelectedArchived ? 'Archived Order' : (isUpdating ? 'Executing Update...' : updateSuccess ? 'Status Verified ✓' : 'Confirm & Update Shipment')}
                  </button>

                  <p className="text-[10px] font-medium text-stone-400 text-center px-4 leading-relaxed">
                    Updating this status will trigger a customer notification and update internal shipment records.
                  </p>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
