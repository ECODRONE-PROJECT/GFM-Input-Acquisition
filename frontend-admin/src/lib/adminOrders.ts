import { getAdminSession } from './adminAuth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://gfm-backend.onrender.com/api';

type ApiErrorBody = {
  detail?: string;
};

export type AdminOrder = {
  order_id: string;
  user_id: string;
  created_at?: string | null;
  total_amount: number;
  item_count: number;
  total_quantity: number;
  items?: AdminOrderItem[];
  status: string;
  status_label: string;
  payment_status: string;
  payment_provider: string;
  payment_reference?: string | null;
  credit_applied: number;
  cash_component: number;
  delivery_address?: string | null;
  estimated_delivery_at?: string | null;
  updated_at?: string | null;
  last_update?: string | null;
  last_update_time?: string | null;
  last_event_type?: string | null;
};

export type AdminOrderItem = {
  id: string;
  quantity: number;
  price: number;
  name?: string | null;
  imageUrl?: string | null;
};

export type AdminOrderTimelineEvent = {
  order_id: string;
  user_id: string;
  event_type: string;
  status: string;
  note?: string | null;
  event_time?: string | null;
};

export type AdminOrdersListResponse = {
  count: number;
  total: number;
  limit: number;
  offset: number;
  orders: AdminOrder[];
};

export type AdminOrderDetailsResponse = {
  order: AdminOrder;
  timeline: AdminOrderTimelineEvent[];
};

export type UpdateAdminOrderStatusPayload = {
  status: string;
  note?: string;
  status_label?: string;
  estimated_delivery_at?: string | null;
  delivery_address?: string | null;
  payment_status?: string | null;
};

export type UpdateAdminOrderStatusResponse = {
  status: string;
  order: AdminOrder;
  event: AdminOrderTimelineEvent;
};

export type FetchAdminOrdersParams = {
  status?: string;
  payment_status?: string;
  query?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
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

function buildQuery(params: FetchAdminOrdersParams) {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.payment_status) search.set('payment_status', params.payment_status);
  if (params.query) search.set('query', params.query);
  if (params.from_date) search.set('from_date', params.from_date);
  if (params.to_date) search.set('to_date', params.to_date);
  if (typeof params.limit === 'number') search.set('limit', String(params.limit));
  if (typeof params.offset === 'number') search.set('offset', String(params.offset));
  const serialized = search.toString();
  return serialized ? `?${serialized}` : '';
}

export async function fetchAdminOrders(params: FetchAdminOrdersParams = {}): Promise<AdminOrdersListResponse> {
  const response = await guardedFetch(`${API_BASE}/admin/orders${buildQuery(params)}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to fetch admin orders.'));
  }
  return (await response.json()) as AdminOrdersListResponse;
}

export async function fetchAdminOrderDetails(orderId: string): Promise<AdminOrderDetailsResponse> {
  const response = await guardedFetch(`${API_BASE}/admin/orders/${encodeURIComponent(orderId)}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to fetch admin order details.'));
  }
  return (await response.json()) as AdminOrderDetailsResponse;
}

export async function updateAdminOrderStatus(
  orderId: string,
  payload: UpdateAdminOrderStatusPayload
): Promise<UpdateAdminOrderStatusResponse> {
  const response = await guardedFetch(`${API_BASE}/admin/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to update admin order status.'));
  }
  return (await response.json()) as UpdateAdminOrderStatusResponse;
}
