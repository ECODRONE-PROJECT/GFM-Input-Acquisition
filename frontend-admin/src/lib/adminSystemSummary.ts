import { getAdminSession } from './adminAuth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

type ApiErrorBody = {
  detail?: string;
};

export type AdminSystemSummary = {
  timestamp: string;
  summary: {
    inventory: {
      items: number;
      total_units: number;
      total_value: number;
      low_stock_items: number;
      seed_units: number;
      fertilizer_units: number;
      low_stock_threshold: number;
    };
    deals: {
      total: number;
      active: number;
      draft: number;
      closed: number;
      cancelled: number;
      avg_active_progress: number;
      total_joined_quantity: number;
    };
    orders: {
      total: number;
      last_7_days: number;
      gross_value: number;
      status_breakdown: {
        ordered: number;
        pending: number;
        in_transit: number;
        delivered: number;
        cancelled: number;
        other: number;
      };
    };
    credit_applications: {
      total: number;
      submitted: number;
      under_review: number;
      pending_documents: number;
      approved: number;
      rejected: number;
    };
    credit_accounts: {
      total: number;
      approved: number;
      assigned_limit_total: number;
      available_credit_total: number;
      consumed_credit_total: number;
    };
    payments: {
      total_intents: number;
      pending: number;
      completed: number;
      failed: number;
      cash_component_total: number;
    };
    system_logs: {
      total: number;
      last_24_hours: number;
    };
    modules: {
      aggregate_deals_ready: boolean;
      credit_ready: boolean;
      orders_ready: boolean;
      payments_ready: boolean;
      logs_ready: boolean;
    };
  };
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

export async function fetchAdminSystemSummary(): Promise<AdminSystemSummary> {
  const response = await guardedFetch(`${API_BASE}/admin/system-summary`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to fetch system summary.'));
  }
  return (await response.json()) as AdminSystemSummary;
}
