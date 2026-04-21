export type InputType = string;

export type CatalogInput = {
  id: string;
  name: string;
  type: InputType;
  price: number;
  stock: number;
  location?: string | null;
  imageUrl?: string | null;
  size?: string | null;
  weight?: string | null;
  brand?: string | null;
};

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
  end_at?: string | null;
  status: string;
  progress_percent?: number;
  remaining_quantity?: number | null;
  effective_max_join_quantity?: number | null;
  is_full?: boolean;
  current_display_price?: number;
  is_expired?: boolean;
  user_bulk_state?: 'none' | 'pending' | 'paid';
  user_paid_quantity?: number;
  user_pending_reference?: string;
  user_pending_quantity?: number;
  user_pending_expires_at?: string;
  user_pending_authorization_url?: string | null;
};

export type AggregateDealJoinResult = {
  status: 'pending_payment';
  payment_required: true;
  reference: string;
  authorization_url: string;
  expires_at: string;
  quantity: number;
  amount_due?: number;
  message?: string;
  deal?: AggregateDeal;
};

export type LocalOrder = {
  id: string;
  userId: string;
  totalAmount: number;
  createdAt: string;
  items: Array<{ id: string; quantity: number; price: number }>;
};

export type OrderHistoryItem = {
  order_id: string;
  created_at: string;
  total_amount: number;
  item_count: number;
  total_quantity?: number;
  status: string;
  status_label: string;
  payment_status: string;
  payment_provider: string;
  delivery_address?: string | null;
  estimated_delivery_at?: string | null;
  last_update?: string | null;
  last_update_time?: string | null;
};

export type OrderTimelineEvent = {
  id: string;
  order_id: string;
  user_id: string;
  event_type: string;
  status?: string | null;
  note: string;
  event_time: string;
  created_at: string;
};

export type OrderDetailsResponse = {
  order: {
    order_id: string;
    created_at: string;
    total_amount: number;
    items: Array<{ id: string; quantity: number; price: number }>;
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
  };
  timeline: OrderTimelineEvent[];
};

export type CreditApplicationPayload = {
  userId: string;
  consent_credit_assessment: boolean;
  drought_flood_index: number;
  gender: string;
  savings: number;
  payment_frequency: number;
  crop_types: string;
  is_association_member: boolean;
  has_motorbike: boolean;
  acres: number;
  satellite_verified: boolean;
  repayment_rate: number;
  yield_data: string;
  yield_precise: boolean;
  yield_unit?: string;
  endorsements: number;
  has_irrigation: string;
  irrigation_scheme: boolean;
  market_access_index: number;
  training_sessions: number;
  livestock_value: number;
  alternative_income: number;
  has_insurance: string;
  insurance_subscription: boolean;
  digital_score: number;
  soil_health_index: number;
  soil_health_observation?: string;
  farmer_id?: number;
  region?: string;
  district?: string;
  town?: string;
  momo_number?: string;
  momo_provider?: string;
  has_loan_history: boolean;
  loan_referee_name?: string;
  loan_referee_phone?: string;
  referee_1_name?: string;
  referee_1_phone?: string;
  referee_2_name?: string;
  referee_2_phone?: string;
  full_name?: string;
  dob?: string;
};

export type CreditApplicationStatusResponse = {
  user_id: string;
  has_application: boolean;
  application: {
    id: string | null;
    status: string | null;
    final_score: number | null;
    creditworthiness: string | null;
    suggested_credit_limit: number | null;
    review_note: string | null;
    reviewer: string | null;
    submitted_at: string | null;
    reviewed_at: string | null;
    documents_count: number;
  };
  credit_account: {
    status: string;
    available_credit: number;
    assigned_credit_limit: number;
    consumed_credit: number;
    last_score: number;
    creditworthiness: string | null;
  };
};

export type CreditApplicationDetailsResponse = {
  application: {
    id: string;
    user_id: string;
    status: string;
    final_score: number;
    creditworthiness: string;
    suggested_credit_limit: number;
    approved_credit_limit?: number | null;
    review_note?: string | null;
    reviewer?: string | null;
    submitted_at?: string | null;
    reviewed_at?: string | null;
    [key: string]: unknown;
  };
  documents: Array<{
    id: string;
    application_id: string;
    document_type: string;
    original_name: string;
    stored_name: string;
    mime_type?: string | null;
    size_bytes: number;
    uploaded_at: string;
  }>;
  events: Array<{
    id: string;
    application_id: string;
    event_type: string;
    note: string;
    event_time: string;
    metadata?: Record<string, unknown>;
  }>;
};

export type CreditScoreResponse = {
  user_id: string;
  credit_score: number;
  final_score: number;
  creditworthiness: string;
  credit_limit: number;
  available_credit?: number;
  approved_credit_limit?: number;
  consumed_credit?: number;
  status: string;
  score_breakdown?: Record<string, number>;
  weights?: Record<string, number>;
  application_id?: string | null;
  application_tables_ready?: boolean;
};

const CONFIGURED_API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
const LOCAL_API_BASE = 'http://localhost:8000/api';

function getApiBaseCandidates() {
  const candidates: string[] = [];
  if (CONFIGURED_API_BASE) {
    candidates.push(CONFIGURED_API_BASE);
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, origin } = window.location;
    if (hostname) {
      candidates.push(`${protocol}//${hostname}:8000/api`);
    }
    candidates.push('http://127.0.0.1:8000/api');
    candidates.push('http://localhost:8000/api');
    candidates.push(`${origin}/api`);
  }

  candidates.push(LOCAL_API_BASE, 'http://127.0.0.1:8000/api');

  const normalized = candidates
    .map((value) => value.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return [...new Set(normalized)];
}

const API_BASE = getApiBaseCandidates()[0] || LOCAL_API_BASE;

type ApiErrorBody = {
  detail?: unknown;
};

async function parseApiError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as ApiErrorBody;
    const detail = body.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
    if (Array.isArray(detail)) {
      const first = detail[0] as Record<string, unknown> | undefined;
      if (first && typeof first.msg === 'string' && first.msg.trim()) {
        return first.msg;
      }
      return fallback;
    }
    if (detail && typeof detail === 'object') {
      const maybeMsg = (detail as Record<string, unknown>).message;
      if (typeof maybeMsg === 'string' && maybeMsg.trim()) {
        return maybeMsg;
      }
      return JSON.stringify(detail);
    }
    return fallback;
  } catch {
    return fallback;
  }
}

async function guardedApiFetch(path: string, init?: RequestInit): Promise<Response> {
  const relativePath = path.startsWith('/') ? path : `/${path}`;
  const bases = getApiBaseCandidates();
  let lastError: unknown = null;
  let lastResponse: Response | null = null;

  for (const base of bases) {
    const url = `${base}${relativePath}`;
    try {
      const response = await fetch(url, init);
      if (response.ok) {
        return response;
      }

      const contentType = String(response.headers.get('content-type') || '').toLowerCase();
      const isJsonResponse = contentType.includes('application/json');
      const shouldTryNext =
        (response.status === 404 || response.status === 405 || (!isJsonResponse && response.status >= 400))
        && base !== bases[bases.length - 1];

      if (shouldTryNext) {
        lastResponse = response;
        continue;
      }

      return response;
    } catch (err) {
      lastError = err;
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw new Error(
    lastError instanceof Error
      ? `Could not reach backend API. ${lastError.message}`
      : 'Could not reach backend API.'
  );
}

export async function getCatalogInputs(): Promise<CatalogInput[]> {
  try {
    const res = await fetch(`${API_BASE}/catalog`);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const body = await res.json();
    return body as CatalogInput[];
  } catch (e) {
    console.error("FastAPI connection failed, falling back to empty catalog array ->", e);
    return [];
  }
}

export async function fetchAggregateDeals(userId?: string): Promise<AggregateDeal[]> {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  const response = await fetch(`${API_BASE}/deals/aggregate${query}`);
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to fetch aggregate deals.'));
  }
  const body = (await response.json()) as { deals?: AggregateDeal[] };
  return body.deals || [];
}

export async function joinAggregateDeal(payload: {
  dealId: string;
  userId: string;
  email: string;
  quantity: number;
  callback_url?: string;
}): Promise<AggregateDealJoinResult> {
  const response = await fetch(`${API_BASE}/deals/aggregate/${encodeURIComponent(payload.dealId)}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: payload.userId,
      email: payload.email,
      quantity: payload.quantity,
      callback_url: payload.callback_url || null,
    }),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to join aggregate deal.'));
  }
  return response.json() as Promise<AggregateDealJoinResult>;
}

export async function verifyAggregateDealPayment(reference: string): Promise<{
  status: string;
  orderId: string;
  reference: string;
  already_processed?: boolean;
  deal?: AggregateDeal;
}> {
  if (!reference.trim()) {
    throw new Error('Payment reference is required.');
  }

  const response = await fetch(`${API_BASE}/deals/aggregate/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference }),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to verify bulk payment.'));
  }
  return response.json() as Promise<{
    status: string;
    orderId: string;
    reference: string;
    already_processed?: boolean;
    deal?: AggregateDeal;
  }>;
}

export async function submitOrder(payload: {
  userId: string;
  totalAmount: number;
  credit_applied: number;
  items: Array<{ id: string; quantity: number; price: number }>;
}): Promise<{ orderId: string }> {
  if (!payload.userId || payload.items.length === 0) {
    throw new Error('Missing required order details');
  }

  const response = await fetch(`${API_BASE}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.detail || 'Checkout process rejected by upstream API schema.');
  }

  return { orderId: body.orderId };
}

export async function initializePaystackPayment(payload: {
  userId: string;
  email: string;
  address: string;
  totalAmount: number;
  credit_applied: number;
  items: Array<{ id: string; quantity: number; price: number }>;
  callback_url?: string;
}): Promise<
  | {
      status: 'pending_payment';
      payment_required: true;
      reference: string;
      authorization_url: string;
      cash_due: number;
      credit_applied: number;
    }
  | {
      status: 'success';
      payment_required: false;
      orderId: string;
      cash_due: number;
      credit_applied: number;
    }
> {
  const response = await fetch(`${API_BASE}/payments/paystack/initialize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to initialize payment.'));
  }

  return response.json() as Promise<
    | {
        status: 'pending_payment';
        payment_required: true;
        reference: string;
        authorization_url: string;
        cash_due: number;
        credit_applied: number;
      }
    | {
        status: 'success';
        payment_required: false;
        orderId: string;
        cash_due: number;
        credit_applied: number;
      }
  >;
}

export async function verifyPaystackPayment(reference: string): Promise<{
  status: string;
  orderId: string;
  reference: string;
  already_processed?: boolean;
}> {
  if (!reference.trim()) {
    throw new Error('Payment reference is required.');
  }

  const response = await fetch(`${API_BASE}/payments/paystack/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to verify payment.'));
  }

  return response.json() as Promise<{
    status: string;
    orderId: string;
    reference: string;
    already_processed?: boolean;
  }>;
}

export async function fetchOrderHistory(userId: string): Promise<OrderHistoryItem[]> {
  if (!userId) {
    return [];
  }

  const response = await fetch(`${API_BASE}/orders/history?user_id=${encodeURIComponent(userId)}`);
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to fetch order history.'));
  }

  const body = (await response.json()) as { orders?: OrderHistoryItem[] };
  return body.orders || [];
}

export async function fetchCreditScore(userId: string): Promise<CreditScoreResponse> {
  if (!userId.trim()) {
    throw new Error('Missing user id.');
  }
  const response = await guardedApiFetch(`/credit-score?user_id=${encodeURIComponent(userId)}`);
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to fetch credit score.'));
  }
  return response.json() as Promise<CreditScoreResponse>;
}

export async function fetchOrderDetails(userId: string, orderId: string): Promise<OrderDetailsResponse> {
  if (!userId || !orderId) {
    throw new Error('Missing order details query parameters.');
  }

  const response = await fetch(
    `${API_BASE}/orders/${encodeURIComponent(orderId)}?user_id=${encodeURIComponent(userId)}`
  );
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to fetch order details.'));
  }

  return response.json() as Promise<OrderDetailsResponse>;
}

export async function submitOrderFollowUp(payload: {
  orderId: string;
  userId: string;
  message: string;
}): Promise<{ status: string; order_id: string }> {
  const response = await fetch(`${API_BASE}/orders/${encodeURIComponent(payload.orderId)}/follow-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: payload.userId, message: payload.message }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to submit order follow-up.'));
  }

  return response.json() as Promise<{ status: string; order_id: string }>;
}

export async function submitCreditApplication(payload: CreditApplicationPayload): Promise<{
  status: string;
  application_id: string;
  final_score: number;
  creditworthiness: string;
  suggested_credit_limit: number;
  next_step: string;
}> {
  const response = await guardedApiFetch('/credit/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to submit credit application.'));
  }
  return response.json() as Promise<{
    status: string;
    application_id: string;
    final_score: number;
    creditworthiness: string;
    suggested_credit_limit: number;
    next_step: string;
  }>;
}

export async function fetchCreditApplicationStatus(userId: string): Promise<CreditApplicationStatusResponse> {
  const response = await guardedApiFetch(
    `/credit/applications/status?user_id=${encodeURIComponent(userId)}`
  );
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to fetch credit application status.'));
  }
  return response.json() as Promise<CreditApplicationStatusResponse>;
}

export async function fetchCreditApplicationDetails(
  userId: string,
  applicationId: string
): Promise<CreditApplicationDetailsResponse> {
  const response = await guardedApiFetch(
    `/credit/applications/${encodeURIComponent(applicationId)}?user_id=${encodeURIComponent(userId)}`
  );
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to fetch credit application details.'));
  }
  return response.json() as Promise<CreditApplicationDetailsResponse>;
}

export async function uploadCreditApplicationDocument(payload: {
  userId: string;
  applicationId: string;
  documentType: string;
  file: File;
}): Promise<{ status: string; application_id: string }> {
  const formData = new FormData();
  formData.set('user_id', payload.userId);
  formData.set('document_type', payload.documentType);
  formData.set('file', payload.file);

  const response = await guardedApiFetch(
    `/credit/applications/${encodeURIComponent(payload.applicationId)}/documents`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to upload document.'));
  }
  return response.json() as Promise<{ status: string; application_id: string }>;
}
