import { getAdminSession } from './adminAuth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://gfm-backend.onrender.com/api';

// ─── Types ───────────────────────────────────────────────────────────

export type AdminCustomer = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  credit_status: 'approved' | 'submitted' | 'not_applied' | 'rejected';
  credit_limit: number;
  available_credit: number;
  total_orders: number;
  total_spent: number;
  joined_at: string;
};

export type AdminCustomerListResponse = {
  customers: AdminCustomer[];
  total: number;
  summary: {
    total_users: number;
    active_credit_lines: number;
    total_orders: number;
  };
};

export type ConsignmentRequest = {
  id: string;
  user_id: string;
  farmer_name: string;
  farmer_phone: string | null;
  product_category: string;
  product_name: string | null;
  quantity: number;
  unit: string;
  expected_price: number;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  approved_deal_id: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export type ConsignmentListResponse = {
  consignments: ConsignmentRequest[];
  summary: {
    pending: number;
    approved_this_week: number;
    total: number;
  };
};

// ─── Auth Header ─────────────────────────────────────────────────────

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
    const body = (await response.json()) as { detail?: string };
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

// ─── Fetch Functions ─────────────────────────────────────────────────

export async function fetchAdminCustomers(): Promise<AdminCustomerListResponse> {
  const response = await guardedFetch(`${API_BASE}/admin/operations/customers`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to fetch customers.'));
  }
  return response.json() as Promise<AdminCustomerListResponse>;
}

export async function fetchAdminConsignments(): Promise<ConsignmentListResponse> {
  const response = await guardedFetch(`${API_BASE}/admin/operations/consignments`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to fetch consignments.'));
  }
  return response.json() as Promise<ConsignmentListResponse>;
}

export async function approveConsignment(id: string, approvedDealId?: string): Promise<ConsignmentRequest> {
  const response = await guardedFetch(`${API_BASE}/admin/operations/consignments/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(approvedDealId ? { approved_deal_id: approvedDealId } : {}),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to approve consignment.'));
  }
  const body = (await response.json()) as { consignment: ConsignmentRequest };
  return body.consignment;
}

export async function rejectConsignment(id: string, reason: string): Promise<{ status: string; sms_sent: boolean }> {
  const response = await guardedFetch(`${API_BASE}/admin/operations/consignments/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to reject consignment.'));
  }
  const body = (await response.json()) as {
    status: string;
    user_sms_alert?: { sent?: boolean };
  };
  return { status: body.status, sms_sent: Boolean(body.user_sms_alert?.sent) };
}
