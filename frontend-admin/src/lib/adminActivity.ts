import { getAdminSession } from './adminAuth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

type ApiErrorBody = {
  detail?: string;
};

export type AdminActivityEntry = {
  id: string;
  source: string;
  timestamp: string;
  title: string;
  description: string;
  actor: string;
  entity: string;
  entity_id: string;
  level: string;
  metadata?: Record<string, unknown>;
};

type AdminActivityResponse = {
  count: number;
  activity: AdminActivityEntry[];
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

export async function fetchAdminActivity(limit = 12): Promise<AdminActivityEntry[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const response = await guardedFetch(`${API_BASE}/admin/activity?limit=${safeLimit}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to fetch admin activity.'));
  }
  const body = (await response.json()) as AdminActivityResponse;
  return body.activity || [];
}
