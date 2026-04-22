import { getAdminSession } from './adminAuth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://gfm-backend.onrender.com/api';

export type AggregateDeal = {
  id: string;
  title: string;
  description?: string | null;
  deal_type: 'bulk';
  item_name: string;
  item_category?: string | null;
  unit?: string | null;
  image_url?: string | null;
  base_price: number;
  discount_percent: number;
  deal_price: number;
  target_quantity?: number | null;
  current_quantity: number;
  min_join_quantity: number;
  max_join_quantity?: number | null;
  starting_bid?: number | null;
  highest_bid?: number | null;
  highest_bidder?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  status: 'draft' | 'active' | 'closed' | 'cancelled';
  progress_percent?: number;
  current_display_price?: number;
  is_expired?: boolean;
  created_at?: string;
  updated_at?: string;
};

type ApiErrorBody = {
  detail?: string;
};

function getAuthHeaders() {
  const session = getAdminSession();
  if (!session?.token) {
    throw new Error('Admin session expired. Please log in again.');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.token}`,
  };
}

async function parseApiError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.detail || fallback;
  } catch {
    return fallback;
  }
}

async function guardedFetch(input: string, init: RequestInit) {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error(`Could not reach backend API at ${API_BASE}. Confirm backend is running and reachable.`);
  }
}

export async function fetchAdminAggregateDeals(status?: string): Promise<AggregateDeal[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const response = await guardedFetch(`${API_BASE}/admin/aggregate-deals${query}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to fetch aggregate deals.'));
  }
  const body = (await response.json()) as { deals?: AggregateDeal[] };
  return body.deals || [];
}

export async function createAdminAggregateDeal(payload: {
  title: string;
  description?: string | null;
  deal_type: 'bulk';
  item_name: string;
  item_category?: string | null;
  unit?: string | null;
  image_url?: string | null;
  base_price: number;
  discount_percent: number;
  deal_price?: number | null;
  target_quantity?: number | null;
  min_join_quantity: number;
  max_join_quantity?: number | null;
  start_at?: string | null;
  end_at?: string | null;
  status?: 'draft' | 'active' | 'closed' | 'cancelled';
  source_inventory_item_id?: string | null;
  reserve_inventory_quantity?: number | null;
}): Promise<AggregateDeal> {
  const response = await guardedFetch(`${API_BASE}/admin/aggregate-deals`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to create aggregate deal.'));
  }
  const body = (await response.json()) as { deal: AggregateDeal };
  return body.deal;
}

export async function updateAdminAggregateDeal(
  dealId: string,
  payload: Partial<{
    title: string;
    description: string | null;
    item_name: string;
    item_category: string | null;
    unit: string | null;
    image_url: string | null;
    base_price: number;
    discount_percent: number;
    deal_price: number | null;
    target_quantity: number | null;
    min_join_quantity: number;
    max_join_quantity: number | null;
    start_at: string | null;
    end_at: string | null;
    status: 'draft' | 'active' | 'closed' | 'cancelled';
  }>
): Promise<AggregateDeal> {
  const response = await guardedFetch(`${API_BASE}/admin/aggregate-deals/${encodeURIComponent(dealId)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to update aggregate deal.'));
  }
  const body = (await response.json()) as { deal: AggregateDeal };
  return body.deal;
}

export async function deleteAdminAggregateDeal(dealId: string): Promise<void> {
  const response = await guardedFetch(`${API_BASE}/admin/aggregate-deals/${encodeURIComponent(dealId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to delete aggregate deal.'));
  }
}
