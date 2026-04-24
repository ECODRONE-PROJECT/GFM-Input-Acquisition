import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { useCart } from '@/context/CartContext';
import {
  fetchAggregateDeals,
  getCatalogInputs,
  joinAggregateDeal,
  verifyAggregateDealPayment,
  fetchCreditApplicationStatus,
  submitConsignmentRequest,
  type AggregateDeal,
  type CatalogInput,
  type CreditApplicationStatusResponse,
} from '@/lib/clientData';
import { useAuth } from '@/context/AuthContext';
import { requireSupabase } from '@/lib/supabase';
import { ShoppingCart, Search, User, ShoppingBag, PackagePlus, AlertCircle, X as CloseIcon } from 'lucide-react';

const CATALOG_CACHE_KEY = 'gfm_catalog_cache_v1';
const CATALOG_CACHE_TTL_MS = 90_000;
const CATALOG_PAGE_SIZE = 12;

const TYPE_ALIASES: Record<string, string> = {
  HYBRID_SEED: 'SEED',
  HYBRID_SEEDS: 'SEED',
  HYBRIDE_SEED: 'SEED',
  HYBRIDE_SEEDS: 'SEED',
  MINERAL_FERTILIZER: 'FERTILIZER',
  MINERAL_FERTILIZERS: 'FERTILIZER',
  ORGANIC_NUTRIENT: 'NUTRIENT',
  ORGANIC_NUTRIENTS: 'NUTRIENT',
  EQUIPMENT_MACHINERY: 'EQUIPMENT',
};

const TYPE_LABELS: Record<string, string> = {
  SEED: 'Seed',
  FERTILIZER: 'Fertilizer',
  NUTRIENT: 'Nutrient',
  CHEMICAL: 'Chemical',
  TOOL: 'Tool',
  EQUIPMENT: 'Equipment',
  PESTICIDE: 'Pesticide',
  LIVESTOCK: 'Livestock',
  FEED: 'Feed',
  VETERINARY: 'Veterinary',
  IRRIGATION: 'Irrigation',
  SERVICE: 'Service',
};

type CatalogDisplayProduct = CatalogInput & {
  normalizedType: string;
  categoryLabel: string;
  manufacturerLabel: string;
  manufacturerKey: string;
};

function normalizeProductType(value: string | null | undefined): string {
  const normalized = String(value || 'ITEM')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .replace(/\s+/g, '_');
  return TYPE_ALIASES[normalized] || normalized || 'ITEM';
}

function asCategoryLabel(type: string): string {
  const normalized = normalizeProductType(type);
  if (TYPE_LABELS[normalized]) {
    return TYPE_LABELS[normalized];
  }
  return normalized
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeManufacturerKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export default function Shop() {
  const [products, setProducts] = useState<CatalogInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [aggregateDeals, setAggregateDeals] = useState<AggregateDeal[]>([]);
  const [dealNotice, setDealNotice] = useState('');
  const [dealActionLoadingId, setDealActionLoadingId] = useState<string | null>(null);
  const [quantityModalDeal, setQuantityModalDeal] = useState<AggregateDeal | null>(null);
  const [quantityModalQty, setQuantityModalQty] = useState(1);
  const { addToCart, itemCount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Consignment UI State
  const [isConsignmentModalOpen, setIsConsignmentModalOpen] = useState(false);
  const [creditStatus, setCreditStatus] = useState<CreditApplicationStatusResponse | null>(null);
  const [consignLoading, setConsignLoading] = useState(false);
  const [consignSuccess, setConsignSuccess] = useState(false);
  const [consignError, setConsignError] = useState('');
  const [consignCategory, setConsignCategory] = useState('');
  const [consignProductName, setConsignProductName] = useState('');
  const [consignQuantity, setConsignQuantity] = useState('');
  const [consignUnit, setConsignUnit] = useState('tonnes');
  const [consignExpectedPrice, setConsignExpectedPrice] = useState('');
  const canConsign = !!(creditStatus?.has_application || (creditStatus?.credit_account?.status === 'active'));

  // Filters State
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedMfrs, setSelectedMfrs] = useState<Set<string>>(new Set());
  const [priceRange, setPriceRange] = useState<number>(5000);
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogPage, setCatalogPage] = useState<number>(1);
  
  // UI State
  const [showDeals, setShowDeals] = useState<boolean>(false);

  const getJoinBounds = (deal: AggregateDeal) => {
    const min = Math.max(deal.min_join_quantity || 1, 1);
    const rawMax = deal.effective_max_join_quantity ?? deal.max_join_quantity ?? deal.remaining_quantity ?? null;
    const max = rawMax !== null ? Math.max(Number(rawMax), min) : min;
    const remaining = deal.remaining_quantity ?? null;

    if (deal.status !== 'active' || deal.is_expired || deal.is_full) {
      return { min, max, canJoin: false, reason: 'This bulk buy is no longer active.' };
    }
    if (remaining !== null && remaining < min) {
      return { min, max, canJoin: false, reason: `Only ${remaining} slot(s) left, below minimum join quantity.` };
    }

    return { min, max, canJoin: true, reason: '' };
  };

  const getDealActionState = (deal: AggregateDeal) => deal.user_bulk_state || 'none';
  const getDealActionLabel = (deal: AggregateDeal) => {
    if (dealActionLoadingId === deal.id) {
      return 'Processing...';
    }
    const bounds = getJoinBounds(deal);
    const state = getDealActionState(deal);
    if (!bounds.canJoin) {
      return 'Full';
    }
    if (state === 'pending') {
      return 'Payment Pending';
    }
    if (state === 'paid') {
      return 'Spot Secured';
    }
    return 'Join & Pay';
  };
  const isDealActionDisabled = (deal: AggregateDeal) => {
    if (dealActionLoadingId === deal.id) {
      return true;
    }
    if (!getJoinBounds(deal).canJoin) {
      return true;
    }
    const state = getDealActionState(deal);
    return state === 'pending' || state === 'paid';
  };

  const dealSavings = (deal: AggregateDeal) => {
    const effectiveDealPrice =
      typeof deal.deal_price === 'number'
        ? deal.deal_price
        : typeof deal.current_display_price === 'number'
          ? deal.current_display_price
          : deal.base_price;
    const savingsAmount = Math.max(deal.base_price - effectiveDealPrice, 0);
    const savingsPercent = deal.base_price > 0
      ? (savingsAmount / deal.base_price) * 100
      : Math.max(deal.discount_percent || 0, 0);

    return {
      effectiveDealPrice,
      savingsAmount,
      savingsPercent,
    };
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const toggleMfr = (mfr: string) => {
    setSelectedMfrs(prev => {
      const next = new Set(prev);
      if (next.has(mfr)) next.delete(mfr);
      else next.add(mfr);
      return next;
    });
  };

  const resetFilters = () => {
    setSelectedTypes(new Set());
    setSelectedMfrs(new Set());
    setPriceRange(5000);
    setSearchQuery('');
  };

  useEffect(() => {
    let isMounted = true;

    const syncCatalog = async (initialLoad: boolean) => {
      let hasValidCachedCatalog = false;
      if (initialLoad) {
        try {
          const raw = localStorage.getItem(CATALOG_CACHE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as { timestamp?: number; products?: CatalogInput[] };
            const ageMs = Date.now() - Number(parsed.timestamp || 0);
            if (Array.isArray(parsed.products) && ageMs >= 0 && ageMs < CATALOG_CACHE_TTL_MS) {
              hasValidCachedCatalog = true;
              if (isMounted) {
                setProducts(parsed.products);
                setLoading(false);
              }
            }
          }
        } catch {
          hasValidCachedCatalog = false;
        }
      }

      try {
        const data = await getCatalogInputs();
        if (!isMounted) {
          return;
        }
        if (data.length > 0 || initialLoad || !hasValidCachedCatalog) {
          setProducts(data);
        }
        localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), products: data }));
      } finally {
        if (isMounted && initialLoad) {
          setLoading(false);
        }
      }
    };

    const syncDeals = async (initialLoad: boolean) => {
      try {
        const deals = await fetchAggregateDeals(user?.id);
        if (isMounted) {
          setAggregateDeals(deals);
        }
      } catch (err) {
        if (isMounted && initialLoad) {
          setDealNotice(err instanceof Error ? err.message : 'Could not load aggregate deals.');
        }
      } finally {
        if (isMounted && initialLoad) {
          setDealsLoading(false);
        }
      }
    };

    void syncCatalog(true);
    void syncDeals(true);

    const intervalId = window.setInterval(() => {
      void syncCatalog(false);
      void syncDeals(false);
    }, 8000);

    const onFocus = () => {
      void syncCatalog(false);
      void syncDeals(false);
    };
    window.addEventListener('focus', onFocus);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const loadCredit = async () => {
      try {
        const status = await fetchCreditApplicationStatus(user.id);
        setCreditStatus(status);
      } catch (e) {
        console.error('Failed to load credit status for consignment eligibility', e);
      }
    };
    void loadCredit();
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search); const shouldVerify = params.get('bulk_verify') === '1'; const reference = params.get('reference') || params.get('trxref');
    if (!shouldVerify || !reference) {
      return;
    }

    const runVerification = async () => {
      setDealNotice('Verifying bulk payment...');
      try {
        await verifyAggregateDealPayment(reference);
        if (cancelled) {
          return;
        }
        setDealNotice('Payment confirmed. Your bulk-buy spot is secured.');
        setAggregateDeals(await fetchAggregateDeals(user?.id));
      } catch (err) {
        if (!cancelled) {
          setDealNotice(err instanceof Error ? err.message : 'Could not verify bulk payment.');
        }
      } finally {
        if (!cancelled) {
          params.delete('bulk_verify');
          params.delete('reference');
          params.delete('trxref');
          const next = params.toString();
          navigate(next ? `/shop?${next}` : '/shop', { replace: true });
        }
      }
    };

    void runVerification();
    return () => {
      cancelled = true;
    };
  }, [navigate, user?.id]);

  useEffect(() => {
    setCatalogPage(1);
  }, [selectedTypes, selectedMfrs, priceRange, searchQuery]);

  const beginBulkPayment = async (deal: AggregateDeal, quantity: number) => {
    if (!user) {
      navigate('/login?redirect=%2Fshop');
      return;
    }

    setDealNotice('');
    setDealActionLoadingId(deal.id);
    try {
      const currentState = getDealActionState(deal);
      if (currentState === 'paid') {
        setDealNotice('You already secured this bulk-buy slot.');
        return;
      }
      if (currentState === 'pending') {
        if (deal.user_pending_authorization_url) {
          window.location.href = deal.user_pending_authorization_url;
          return;
        }
        throw new Error('Payment is pending. Reopen the pending payment link from this deal.');
      }

      if (!user.email) {
        throw new Error('Your account email is missing. Please re-login and try again.');
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('Quantity must be a positive whole number.');
      }
      const joinResult = await joinAggregateDeal({
        dealId: deal.id,
        userId: user.id,
        email: user.email,
        quantity,
        callback_url: `${window.location.origin}/shop?bulk_verify=1`,
      });
      setDealNotice(joinResult.message || 'Payment pending. Complete payment within 1 hour.');
      setAggregateDeals(await fetchAggregateDeals(user.id));
      setQuantityModalDeal(null);
      if (joinResult.authorization_url) {
        window.location.href = joinResult.authorization_url;
      }
    } catch (err) {
      setDealNotice(err instanceof Error ? err.message : 'Could not complete deal action.');
    } finally {
      setDealActionLoadingId(null);
    }
  };

  const handleDealAction = async (deal: AggregateDeal) => {
    if (!user) {
      navigate('/login?redirect=%2Fshop');
      return;
    }

    const bounds = getJoinBounds(deal);
    if (!bounds.canJoin) {
      setDealNotice(bounds.reason || 'This bulk buy is no longer available.');
      return;
    }

    const currentState = getDealActionState(deal);
    if (currentState === 'paid') {
      setDealNotice('You already secured this bulk-buy slot.');
      return;
    }
    if (currentState === 'pending') {
      if (deal.user_pending_authorization_url) {
        window.location.href = deal.user_pending_authorization_url;
        return;
      }
      setDealNotice('Payment is pending. Reopen the pending payment link from this deal.');
      return;
    }

    const initialQty = Math.max(bounds.min, 1);
    setQuantityModalQty(initialQty);
    setQuantityModalDeal(deal);
    setDealNotice('');
  };

  const handleLogout = async () => {
    try {
      const client = requireSupabase();
      await client.auth.signOut();
      navigate('/login');
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  const resetConsignmentForm = () => {
    setConsignCategory('');
    setConsignProductName('');
    setConsignQuantity('');
    setConsignUnit('tonnes');
    setConsignExpectedPrice('');
    setConsignError('');
    setConsignSuccess(false);
    setConsignLoading(false);
  };

  const closeConsignmentModal = () => {
    setIsConsignmentModalOpen(false);
    resetConsignmentForm();
  };

  const handleConsignmentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.id) {
      navigate('/login?redirect=%2Fshop');
      return;
    }

    const quantity = Number(consignQuantity);
    const expectedPrice = Number(consignExpectedPrice);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setConsignError('Quantity must be greater than 0.');
      return;
    }
    if (!Number.isFinite(expectedPrice) || expectedPrice < 0) {
      setConsignError('Expected price must be 0 or higher.');
      return;
    }

    setConsignLoading(true);
    setConsignError('');
    try {
      await submitConsignmentRequest({
        userId: user.id,
        product_category: consignCategory,
        product_name: consignProductName.trim() || null,
        quantity,
        unit: consignUnit,
        expected_price: expectedPrice,
      });
      setConsignSuccess(true);
      setConsignCategory('');
      setConsignProductName('');
      setConsignQuantity('');
      setConsignUnit('tonnes');
      setConsignExpectedPrice('');
    } catch (err) {
      setConsignError(err instanceof Error ? err.message : 'Could not submit consignment request.');
    } finally {
      setConsignLoading(false);
    }
  };

  const normalizedProducts: CatalogDisplayProduct[] = products.map((product) => {
    const normalizedType = normalizeProductType(product.type);
    const manufacturerLabel = String(product.brand || 'Grow For Me').trim() || 'Grow For Me';
    return {
      ...product,
      normalizedType,
      categoryLabel: asCategoryLabel(normalizedType),
      manufacturerLabel,
      manufacturerKey: normalizeManufacturerKey(manufacturerLabel),
    };
  });

  const availableTypeOptions = Array.from(new Set(normalizedProducts.map((product) => product.normalizedType)))
    .sort((a, b) => asCategoryLabel(a).localeCompare(asCategoryLabel(b)));

  const manufacturerMap = new Map<string, string>();
  normalizedProducts.forEach((product) => {
    if (!manufacturerMap.has(product.manufacturerKey)) {
      manufacturerMap.set(product.manufacturerKey, product.manufacturerLabel);
    }
  });
  const manufacturerOptions = Array.from(manufacturerMap.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const searchTerm = searchQuery.trim().toLowerCase();
  const displayedProducts = normalizedProducts
    .filter((product) => selectedTypes.size === 0 || selectedTypes.has(product.normalizedType))
    .filter((product) => selectedMfrs.size === 0 || selectedMfrs.has(product.manufacturerKey))
    .filter((product) => product.price <= priceRange)
    .filter((product) => {
      if (!searchTerm) {
        return true;
      }
      return [
        product.name,
        product.id,
        product.categoryLabel,
        product.manufacturerLabel,
        product.location || '',
        product.size || '',
        product.weight || '',
      ].some((value) => String(value).toLowerCase().includes(searchTerm));
    });
  const totalCatalogPages = Math.ceil(displayedProducts.length / CATALOG_PAGE_SIZE);
  const safeCatalogPage = totalCatalogPages === 0 ? 1 : Math.min(Math.max(catalogPage, 1), totalCatalogPages);
  const catalogStartIndex = displayedProducts.length === 0 ? 0 : (safeCatalogPage - 1) * CATALOG_PAGE_SIZE;
  const catalogEndIndex = displayedProducts.length === 0 ? 0 : Math.min(catalogStartIndex + CATALOG_PAGE_SIZE, displayedProducts.length);
  const paginatedProducts = displayedProducts.slice(catalogStartIndex, catalogEndIndex);

  useEffect(() => {
    setCatalogPage(prev => {
      if (totalCatalogPages === 0) return 1;
      return Math.min(Math.max(prev, 1), totalCatalogPages);
    });
  }, [totalCatalogPages]);

  const visibleStartPage = Math.max(1, safeCatalogPage - 2);
  const visibleEndPage = Math.min(totalCatalogPages, visibleStartPage + 4);
  const visibleStartAdjusted = Math.max(1, visibleEndPage - 4);
  const visiblePages: number[] = [];
  for (let page = visibleStartAdjusted; page <= visibleEndPage; page += 1) {
    visiblePages.push(page);
  }
  const liveDeals = aggregateDeals.filter(
    (deal) => deal.deal_type === 'bulk' && deal.status === 'active' && !deal.is_expired
  );
  const featuredDeal = liveDeals[0] || null;
  const sideDeals = liveDeals.slice(1, 8);

  return (
    <div style={{ backgroundColor: '#f9f9f6', minHeight: '100vh', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navigation */}
      <nav style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '1rem 5%', backgroundColor: 'white',
        borderBottom: '1px solid rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '20%' }}>
          <Logo />
        </div>
        
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '500px', position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#8c9196' }} size={18} />
            <input 
              type="text" 
              placeholder="Search inventory..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', 
                borderRadius: '8px', border: 'none', backgroundColor: '#f4f4f1',
                fontSize: '0.9rem', outline: 'none', color: '#1a1c1b'
              }} 
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexShrink: 0, justifyContent: 'flex-end' }}>
          <Link to="/shop" className="nav-link active">Catalog</Link>
          <Link to="/credit" className="nav-link">Credit App</Link>
          <Link to="/orders" className="nav-link">Orders</Link>
          <Link to="/support" className="nav-link">Support</Link>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginLeft: '1rem' }}>
            <Link to="/cart" style={{ color: '#4b5563', position: 'relative', display: 'flex' }}>
              <ShoppingCart size={22} strokeWidth={2.5} />
              {itemCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-8px',
                  backgroundColor: '#084c17', color: 'white', fontSize: '0.65rem',
                  fontWeight: 800, minWidth: '16px', height: '16px', 
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {itemCount}
                </span>
              )}
            </Link>
            
            {user ? (
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '1px solid #e5e7eb', paddingLeft: '1rem', whiteSpace: 'nowrap' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                   <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a1c1b' }}>{user.user_metadata?.name || user.email?.split('@')[0]}</span>
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
        </div>
      </nav>

      {/* Main Content Layout */}
      <div className="catalog-layout">
        
        {/* Left Sidebar */}
        <aside className="filter-sidebar" style={{ position: 'relative' }}>
          {/* Sticky Consignment Trigger */}
          <div style={{ 
            position: 'sticky', 
            top: '0', 
            zIndex: 10, 
            backgroundColor: '#f4f4f1', 
            paddingBottom: '1.5rem', 
            marginBottom: '1rem',
            marginTop: '-0.5rem' // Adjust for sidebar internal padding
          }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8c9196', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem', display: 'block' }}>Farmer Marketplace</span>
            
            {user ? (
                <button 
                  onClick={() => setIsConsignmentModalOpen(true)}
                  disabled={!canConsign}
                  style={{ 
                    width: '100%', 
                    padding: '0.85rem', 
                    borderRadius: '12px', 
                    backgroundColor: 'transparent',
                    color: canConsign ? '#4b5563' : '#a1a1aa',
                    border: canConsign ? '1.5px solid #d1d5db' : '1.5px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: canConsign ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}
                >
                  <PackagePlus size={18} />
                  Sell Excess Stock
                </button>
            ) : (
              <button 
                onClick={() => navigate('/login?redirect=/shop')}
                style={{ 
                  width: '100%', 
                  padding: '0.85rem', 
                  borderRadius: '12px', 
                  backgroundColor: 'transparent',
                  color: '#4b5563',
                  border: '1.5px solid #d1d5db',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                <User size={18} />
                Login to Sell
              </button>
            )}

            {!creditStatus?.has_application && user && (
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'start', padding: '0.65rem', backgroundColor: '#fff8f1', borderRadius: '8px', border: '1px solid #ffd8b1' }}>
                <AlertCircle size={12} color="#9a3412" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <p style={{ fontSize: '0.6rem', color: '#9a3412', margin: 0, lineHeight: 1.3, fontWeight: 600 }}>
                  Credit app required. <Link to="/credit" style={{ color: '#c2410c', textDecoration: 'underline' }}>Apply</Link>
                </p>
              </div>
            )}
            
            <div style={{ height: '1px', backgroundColor: '#eeeeeb', marginTop: '1.5rem', width: '100%' }}></div>
          </div>

          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '2rem', color: '#1a1c1b' }}>Filter Library</h2>
          
          <div style={{ marginBottom: '2rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8c9196', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', marginBottom: '1rem', display: 'block' }}>Community Power</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#4b5563', cursor: 'pointer', fontWeight: 600 }}>
                <input type="checkbox" className="gfm-checkbox" checked={showDeals} onChange={e => setShowDeals(e.target.checked)} /> Show Aggregated Deals
              </label>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8c9196', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', marginBottom: '1rem', display: 'block' }}>Product Type</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {availableTypeOptions.map((type) => (
                <label
                  key={type}
                  style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#4b5563', cursor: 'pointer', fontWeight: 600 }}
                >
                  <input type="checkbox" className="gfm-checkbox" checked={selectedTypes.has(type)} onChange={() => toggleType(type)} /> {asCategoryLabel(type)}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8c9196', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', marginBottom: '1rem', display: 'block' }}>Manufacturer</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {manufacturerOptions.map((manufacturer) => (
                <label
                  key={manufacturer.key}
                  style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#4b5563', cursor: 'pointer', fontWeight: 600 }}
                >
                  <input
                    type="checkbox"
                    className="gfm-checkbox"
                    checked={selectedMfrs.has(manufacturer.key)}
                    onChange={() => toggleMfr(manufacturer.key)}
                  /> {manufacturer.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8c9196', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', marginBottom: '1rem', display: 'block' }}>Price Per Bulk Unit</span>
            <input type="range" className="gfm-range" min="100" max="10000" step="100" value={priceRange} onChange={e => setPriceRange(Number(e.target.value))} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.7rem', color: '#8c9196', fontWeight: 700 }}>
              <span>GHS 100</span>
              <span>GHS {priceRange >= 10000 ? '10,000+' : priceRange.toLocaleString()}</span>
            </div>
          </div>

          <button className="btn-reset-filters" onClick={resetFilters}>Reset All Filters</button>
        </aside>

        {/* Main Area */}
        <main className="catalog-main" style={{ overflow: 'hidden' }}>
          
          {/* Dynamic Aggregated Deals Row */}
          {showDeals && (
            <div style={{ marginBottom: '4rem' }}>
              <h2 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#084c17', letterSpacing: '0.15em', textTransform: 'uppercase', whiteSpace: 'nowrap', marginBottom: '0.75rem' }}>Community Power</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1a1c1b', letterSpacing: '-0.02em', marginTop: '-0.25rem' }}>
                  Aggregated Deals
                </h1>
              </div>

              {dealNotice && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', backgroundColor: '#ecfdf3', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#065f46', fontSize: '0.85rem', fontWeight: 700 }}>
                  {dealNotice}
                </div>
              )}
              
              <div className="deals-row">
                {dealsLoading ? (
                  <div style={{ color: '#6b7280', fontWeight: 700, padding: '2rem 0' }}>Loading aggregate deals...</div>
                ) : !featuredDeal ? (
                  <div style={{ color: '#6b7280', fontWeight: 700, padding: '2rem 0' }}>No active aggregate deals at the moment.</div>
                ) : (
                  <>
                    <div className="deal-card" style={{ backgroundColor: '#063d1e', color: 'white', padding: '2.2rem', minWidth: '450px', scrollSnapAlign: 'start' }}>
                      {(() => {
                        const savings = dealSavings(featuredDeal);
                        return (
                      <div style={{ backgroundColor: '#a3f69c', color: '#005312', fontSize: '0.75rem', fontWeight: 800, padding: '0.4rem 0.8rem', borderRadius: '9999px', width: 'fit-content', marginBottom: '1.25rem', letterSpacing: '0.05em' }}>
                        SAVE {savings.savingsPercent.toFixed(0)}% NOW
                      </div>
                        );
                      })()}
                      <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.8rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                        {featuredDeal.title}
                      </h2>
                      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', marginBottom: '1.2rem', maxWidth: '90%', lineHeight: 1.5, fontWeight: 500 }}>
                        {featuredDeal.description || `${featuredDeal.item_name} — join this limited-time community deal.`}
                      </p>
                      {(() => {
                        const savings = dealSavings(featuredDeal);
                        const oldPrice = savings.effectiveDealPrice + savings.savingsAmount;
                        return (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.8rem', lineHeight: 1 }}>
                            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white' }}>
                              GHS {savings.effectiveDealPrice.toFixed(2)}
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textDecoration: 'line-through' }}>
                              GHS {oldPrice.toFixed(2)}
                            </span>
                          </div>
                        );
                      })()}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', marginTop: 'auto' }}>
                        <button
                          className="deal-btn"
                          onClick={() => handleDealAction(featuredDeal)}
                          disabled={isDealActionDisabled(featuredDeal)}
                          style={{
                            padding: '0.75rem 1.25rem',
                            fontSize: '0.95rem',
                            backgroundColor: 'white',
                            color: '#063d1e',
                            opacity: isDealActionDisabled(featuredDeal) ? 0.7 : 1,
                          }}
                        >
                          {getDealActionLabel(featuredDeal)}
                        </button>
                        <div style={{ flex: 1, maxWidth: '280px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>
                            <span>PROGRESS</span>
                            <span>{(featuredDeal.progress_percent || 0).toFixed(0)}% Full</span>
                          </div>
                          <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(featuredDeal.progress_percent || 0, 100)}%`, height: '100%', backgroundColor: '#a3f69c' }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {sideDeals.map((deal) => (
                      <div key={deal.id} className="deal-card" style={{ backgroundColor: 'white', border: '1px solid rgba(0,0,0,0.05)', padding: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', minWidth: '340px', scrollSnapAlign: 'start' }}>
                        <div style={{ display: 'flex', justifyItems: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                          <div style={{ width: '56px', height: '56px', backgroundColor: '#f4f4f1', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#084c17', fontSize: '1.5rem', fontWeight: 900 }}>
                              🌱
                            </span>
                          </div>
                          <div style={{ backgroundColor: '#e8e8e5', color: '#4b5563', fontSize: '0.65rem', fontWeight: 800, padding: '0.3rem 0.6rem', borderRadius: '9999px', marginLeft: 'auto', letterSpacing: '0.05em' }}>
                            LIVE DEAL
                          </div>
                        </div>
                        <h2 style={{ fontSize: '1.25rem', color: '#1a1c1b', fontWeight: 800, marginBottom: '0.75rem', lineHeight: 1.2 }}>
                          {deal.title}
                        </h2>
                        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                          {deal.description || deal.item_name}
                        </p>
                        {(() => {
                          const savings = dealSavings(deal);
                          return (
                            <p style={{ color: '#166534', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.9rem' }}>
                              Save GHS {savings.savingsAmount.toFixed(2)} ({savings.savingsPercent.toFixed(0)}%)
                            </p>
                          );
                        })()}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginTop: 'auto' }}>
                          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1a1c1b' }}>
                            GHS {(dealSavings(deal).effectiveDealPrice).toFixed(2)}
                            <span style={{ fontSize: '0.75rem', color: '#8c9196', fontWeight: 700 }}> / {deal.unit || 'unit'}</span>
                          </div>
                          <button
                            onClick={() => handleDealAction(deal)}
                            disabled={isDealActionDisabled(deal)}
                            style={{
                              height: '40px',
                              borderRadius: '999px',
                              backgroundColor: '#084c17',
                              color: 'white',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: isDealActionDisabled(deal) ? 'default' : 'pointer',
                              opacity: isDealActionDisabled(deal) ? 0.7 : 1,
                              padding: '0 0.9rem',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase', whiteSpace: 'nowrap',
                            }}
                          >
                            {getDealActionState(deal) === 'none' ? 'Pay' : getDealActionLabel(deal)}
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Catalog Operations Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1a1c1b', marginBottom: '0.25rem', letterSpacing: '-0.02em', marginTop: '-0.25rem' }}>Available Inputs</h1>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: 500 }}>{displayedProducts.length} Premium Agricultural Commodities</p>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#8c9196', fontSize: '1.2rem', fontWeight: 600 }}>Pulling dynamic catalog...</div>
          ) : displayedProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4b5563' }}>No inventory matches your active filters.</div>
              <button onClick={resetFilters} style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', borderRadius: '8px', backgroundColor: '#084c17', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Clear Filters</button>
            </div>
          ) : (
            <div className="shop-grid-new">
              {paginatedProducts.map(product => {
                const isSeed = product.normalizedType === 'SEED';
                const outOfStock = product.stock === 0;
                const limitedStock = product.stock < 50 && product.stock > 0;
                const unitLabel = (product.weight || product.size || 'unit').toUpperCase();
                const tag = isSeed 
                    ? <span style={{ color: '#005312', backgroundColor: '#a3f69c', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800 }}>IN SEASON</span>
                    : (limitedStock ? <span style={{ color: '#92400e', backgroundColor: '#fef3c7', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800 }}>LIMITED STOCK</span> : null);
                
                return (
                  <div key={product.id} className="product-card">
                    <div
                      style={{
                        position: 'relative',
                        height: '180px',
                        width: '100%',
                        backgroundColor: '#ffffff',
                        borderBottom: '1px solid rgba(8, 76, 23, 0.08)',
                      }}
                    >
                      <img
                        src={product.imageUrl || (isSeed ? '/seed.png' : '/fertilizer.png')} 
                        alt={product.name}
                        loading="eager"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          objectPosition: 'center',
                          padding: '0.55rem',
                          filter: 'drop-shadow(0 1px 2px rgba(8, 76, 23, 0.10))',
                        }}
                      />
                      {tag && <div style={{ position: 'absolute', top: '1rem', left: '1rem' }}>{tag}</div>}
                    </div>
                    
                    <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ color: isSeed ? '#084c17' : '#4b5563', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                          {product.categoryLabel.toUpperCase()}
                        </span>
                        <ShoppingBag size={14} color="#8c9196" />
                      </div>
                      
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1a1c1b', margin: 0, lineHeight: 1.3, marginBottom: '0.35rem' }}>
                        {product.name}
                      </h3>
                      <p style={{ color: '#6b7280', fontSize: '0.8rem', fontWeight: 500, marginBottom: '1.5rem' }}>
                        Manufacturer: {product.manufacturerLabel}
                      </p>
                      
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1a1c1b', marginBottom: '1.25rem', marginTop: 'auto' }}>
                        GHS {product.price.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8c9196', textTransform: 'uppercase' }}>/ {unitLabel}</span>
                      </div>
                      
                      <div>
                        {outOfStock ? (
                          <button disabled style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', fontWeight: 700, backgroundColor: '#f4f4f1', color: '#8c9196', cursor: 'not-allowed' }}>
                            Out of Stock
                          </button>
                        ) : (
                          <button
                            className="btn-add-cart"
                            style={{ width: '100%', backgroundColor: '#f4f4f1', color: '#1a1c1b' }}
                            onClick={() => addToCart({ ...product, imageUrl: product.imageUrl ?? undefined, quantity: 1 })}
                          >
                            <ShoppingCart size={16} strokeWidth={2.5} color="#1a1c1b" /> Add to Cart
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination Component */}
          {!loading && totalCatalogPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '3rem', flexWrap: 'wrap' }}>
              <div style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: 700 }}>
                Showing {catalogStartIndex + 1} to {catalogEndIndex} of {displayedProducts.length}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setCatalogPage(prev => Math.max(prev - 1, 1))}
                  disabled={safeCatalogPage === 1}
                  style={{
                    height: '32px',
                    minWidth: '32px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'white',
                    color: '#4b5563',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: safeCatalogPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: safeCatalogPage === 1 ? 0.45 : 1,
                  }}
                >
                  {'<'}
                </button>
                {visiblePages.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCatalogPage(page)}
                    style={{
                      height: '32px',
                      minWidth: '32px',
                      borderRadius: '6px',
                      border: page === safeCatalogPage ? '1px solid #084c17' : '1px solid #d1d5db',
                      backgroundColor: page === safeCatalogPage ? '#084c17' : 'white',
                      color: page === safeCatalogPage ? 'white' : '#4b5563',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCatalogPage(prev => Math.min(prev + 1, totalCatalogPages))}
                  disabled={safeCatalogPage === totalCatalogPages}
                  style={{
                    height: '32px',
                    minWidth: '32px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'white',
                    color: '#4b5563',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: safeCatalogPage === totalCatalogPages ? 'not-allowed' : 'pointer',
                    opacity: safeCatalogPage === totalCatalogPages ? 0.45 : 1,
                  }}
                >
                  {'>'}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {quantityModalDeal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(3, 7, 18, 0.55)', backdropFilter: 'blur(4px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '520px', backgroundColor: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 20px 60px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.2rem', borderBottom: '1px solid #f0f2f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#111827', fontWeight: 800 }}>Choose Quantity</h3>
              <button onClick={() => setQuantityModalDeal(null)} style={{ border: 'none', background: 'transparent', color: '#6b7280', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}>
                Close
              </button>
            </div>
            {(() => {
              const bounds = getJoinBounds(quantityModalDeal);
              const savings = dealSavings(quantityModalDeal);
              const unitPrice = savings.effectiveDealPrice;
              const qty = Math.min(Math.max(quantityModalQty, bounds.min), bounds.max);
              const total = unitPrice * qty;
              const min = bounds.min;
              const max = bounds.max;
              return (
                <div style={{ padding: '1.1rem 1.2rem 1.2rem' }}>
                  <p style={{ margin: '0 0 0.3rem', color: '#111827', fontWeight: 700, fontSize: '0.95rem' }}>{quantityModalDeal.title}</p>
                  <p style={{ margin: '0 0 1rem', color: '#6b7280', fontSize: '0.85rem' }}>
                    Min: {min} | Max: {max}
                  </p>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={1}
                    value={qty}
                    onChange={(e) => setQuantityModalQty(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#0d631b' }}
                  />
                  <div style={{ marginTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: '#374151', fontSize: '0.9rem', fontWeight: 700 }}>Quantity: {qty}</div>
                    <div style={{ color: '#111827', fontSize: '1rem', fontWeight: 800 }}>Total: GHS {total.toFixed(2)}</div>
                  </div>
                  <div style={{ marginTop: '1.1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                    <button
                      onClick={() => setQuantityModalDeal(null)}
                      style={{ height: '40px', padding: '0 0.95rem', borderRadius: '10px', border: '1px solid #d1d5db', backgroundColor: 'white', color: '#374151', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (qty < min || qty > max) {
                          setDealNotice(`Quantity must be between ${min} and ${max}.`);
                          return;
                        }
                        void beginBulkPayment(quantityModalDeal, qty);
                      }}
                      disabled={dealActionLoadingId === quantityModalDeal.id}
                      style={{ height: '40px', padding: '0 0.95rem', borderRadius: '10px', border: 'none', backgroundColor: '#0d631b', color: 'white', fontWeight: 800, cursor: 'pointer', opacity: dealActionLoadingId === quantityModalDeal.id ? 0.7 : 1 }}
                    >
                      {dealActionLoadingId === quantityModalDeal.id ? 'Processing...' : 'Continue to Payment'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Consignment Modal */}
      {isConsignmentModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(3, 7, 18, 0.55)', backdropFilter: 'blur(4px)', zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '560px', backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e5e7eb', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '2rem 2.5rem', borderBottom: '1px solid #f0f2f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9f9f6' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#111827', fontWeight: 800, letterSpacing: '-0.02em' }}>Sell Excess Inventory</h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>List your products on the GrowForMe marketplace</p>
              </div>
              <button
                onClick={closeConsignmentModal}
                style={{ border: 'none', background: '#eeeeeb', color: '#4b5563', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <CloseIcon size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '2.5rem' }}>
              {consignSuccess ? (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <div style={{ width: '64px', height: '64px', backgroundColor: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                    <PackagePlus size={32} color="#166534" />
                  </div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>Listing Submitted</h4>
                  <p style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: 1.6, marginBottom: '2rem' }}>
                    We've received your request to consign your excess items. An agent will contact you shortly to verify weights and arrange collection.
                  </p>
                  <button
                    onClick={closeConsignmentModal}
                    style={{ width: '100%', padding: '1rem', backgroundColor: '#084c17', color: 'white', borderRadius: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                  >
                    Back to Catalog
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleConsignmentSubmit}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#4b5563', letterSpacing: '0.05em' }}>PRODUCT CATEGORY</label>
                    <select
                      required
                      value={consignCategory}
                      onChange={(e) => setConsignCategory(e.target.value)}
                      style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#f9f9f6', fontSize: '0.9rem', fontWeight: 600, outline: 'none' }}
                    >
                      <option value="">Select Category</option>
                      <option value="maize">Maize (Seed/Grain)</option>
                      <option value="fertilizer">Excess Fertilizer</option>
                      <option value="tools">Light Equipment</option>
                      <option value="other">Other Commodities</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#4b5563', letterSpacing: '0.05em' }}>PRODUCT NAME (OPTIONAL)</label>
                    <input
                      type="text"
                      maxLength={180}
                      placeholder="e.g. Pioneer Hybrid Seed"
                      value={consignProductName}
                      onChange={(e) => setConsignProductName(e.target.value)}
                      style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#f9f9f6', fontSize: '0.9rem', fontWeight: 600, outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#4b5563', letterSpacing: '0.05em' }}>QUANTITY & UNIT</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <input
                        required
                        min={0.01}
                        step="0.01"
                        type="number"
                        placeholder="0.00"
                        value={consignQuantity}
                        onChange={(e) => setConsignQuantity(e.target.value)}
                        style={{ flex: 2, padding: '1rem', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#f9f9f6', fontSize: '0.9rem', fontWeight: 600, outline: 'none' }}
                      />
                      <select
                        required
                        value={consignUnit}
                        onChange={(e) => setConsignUnit(e.target.value)}
                        style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#f9f9f6', fontSize: '0.9rem', fontWeight: 600, outline: 'none' }}
                      >
                        <option value="tonnes">Tonnes</option>
                        <option value="bags">Bags (50kg)</option>
                        <option value="units">Units</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#4b5563', letterSpacing: '0.05em' }}>EXPECTED PRICE (GHS)</label>
                    <input
                      required
                      min={0}
                      step="0.01"
                      type="number"
                      placeholder="Enter your ask price"
                      value={consignExpectedPrice}
                      onChange={(e) => setConsignExpectedPrice(e.target.value)}
                      style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#f9f9f6', fontSize: '0.9rem', fontWeight: 600, outline: 'none' }}
                    />
                  </div>

                  <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #dcfce7' }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#166534', fontWeight: 600, lineHeight: 1.5 }}>
                      GrowForMe takes a 5% commission on successful sales. Your listing will be used to offset any outstanding credit balances first.
                    </p>
                  </div>

                  {consignError && (
                    <div style={{ padding: '0.9rem 1rem', borderRadius: '12px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#991b1b', fontSize: '0.82rem', fontWeight: 600 }}>
                      {consignError}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={consignLoading}
                    style={{ 
                      marginTop: '1rem',
                      width: '100%', padding: '1.1rem', backgroundColor: '#084c17', color: 'white', 
                      borderRadius: '12px', fontWeight: 700, border: 'none', cursor: consignLoading ? 'not-allowed' : 'pointer',
                      opacity: consignLoading ? 0.7 : 1, transition: 'all 0.2s',
                      boxShadow: '0 4px 6px -1px rgba(8, 76, 23, 0.2)'
                    }}
                  >
                    {consignLoading ? 'Submitting...' : 'Post for Commission Sale'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
