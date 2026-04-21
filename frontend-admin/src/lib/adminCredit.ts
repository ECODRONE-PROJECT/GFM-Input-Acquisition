import { getAdminSession } from './adminAuth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

type ApiErrorBody = {
  detail?: string;
};

export type AdminCreditApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'pending_documents'
  | 'approved'
  | 'rejected';

export type AdminCreditApplication = {
  id: string;
  user_id: string;
  farmer_id?: number | null;
  full_name: string;
  location?: string | null;
  status: AdminCreditApplicationStatus;
  submitted_at?: string | null;
  updated_at?: string | null;
  reviewed_at?: string | null;
  reviewer?: string | null;
  review_note?: string | null;
  final_score: number;
  creditworthiness?: string | null;
  suggested_credit_limit: number;
  approved_credit_limit: number;
  documents_count: number;
  account_status?: string | null;
  account_available_credit: number;
  account_assigned_credit_limit: number;
  application_payload?: Record<string, unknown>;
};

export type AdminCreditSummary = {
  total: number;
  pending_review: number;
  approved_today: number;
  avg_score: number;
  status_breakdown: Record<AdminCreditApplicationStatus, number>;
};

export type AdminCreditApplicationsListResponse = {
  count: number;
  total: number;
  limit: number;
  offset: number;
  applications: AdminCreditApplication[];
  summary: AdminCreditSummary;
};

export type AdminCreditApplicationDocument = {
  id: string;
  application_id: string;
  user_id: string;
  document_type: string;
  original_name: string;
  stored_name: string;
  mime_type?: string | null;
  size_bytes: number;
  uploaded_at: string;
  download_url?: string | null;
};

export type AdminCreditApplicationEvent = {
  id: string;
  application_id: string;
  user_id: string;
  event_type: string;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  event_time?: string | null;
};

export type AdminCreditAccountSnapshot = {
  status: string;
  assigned_credit_limit: number;
  available_credit: number;
  consumed_credit: number;
  last_score: number;
  creditworthiness: string | null;
};

export type AdminCreditApplicationDetailsResponse = {
  application: AdminCreditApplication;
  documents: AdminCreditApplicationDocument[];
  events: AdminCreditApplicationEvent[];
  credit_account: AdminCreditAccountSnapshot;
};

export type AdminCreditDecisionPayload = {
  status: 'approved' | 'rejected' | 'under_review' | 'pending_documents';
  reviewer?: string;
  review_note?: string;
  approved_credit_limit?: number;
};

export type AdminCreditDecisionResponse = {
  status: string;
  application: Record<string, unknown>;
  credit_account: Record<string, unknown>;
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

function buildListQuery(params: {
  status?: string;
  query?: string;
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.query) search.set('query', params.query);
  if (typeof params.limit === 'number') search.set('limit', String(params.limit));
  if (typeof params.offset === 'number') search.set('offset', String(params.offset));
  const serialized = search.toString();
  return serialized ? `?${serialized}` : '';
}

export async function fetchAdminCreditApplications(params: {
  status?: string;
  query?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<AdminCreditApplicationsListResponse> {
  const response = await guardedFetch(`${API_BASE}/admin/credit/applications${buildListQuery(params)}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to fetch credit applications.'));
  }
  return (await response.json()) as AdminCreditApplicationsListResponse;
}

export async function fetchAdminCreditApplicationDetails(
  applicationId: string
): Promise<AdminCreditApplicationDetailsResponse> {
  const response = await guardedFetch(`${API_BASE}/admin/credit/applications/${encodeURIComponent(applicationId)}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to fetch credit application details.'));
  }
  return (await response.json()) as AdminCreditApplicationDetailsResponse;
}

export async function decideAdminCreditApplication(
  applicationId: string,
  payload: AdminCreditDecisionPayload
): Promise<AdminCreditDecisionResponse> {
  const response = await guardedFetch(
    `${API_BASE}/admin/credit/applications/${encodeURIComponent(applicationId)}/decision`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to update credit application.'));
  }
  return (await response.json()) as AdminCreditDecisionResponse;
}

export async function downloadAdminCreditDocument(
  applicationId: string,
  documentId: string,
  fileName: string
): Promise<void> {
  const response = await guardedFetch(
    `${API_BASE}/admin/credit/applications/${encodeURIComponent(applicationId)}/documents/${encodeURIComponent(documentId)}/download`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to download credit document.'));
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `credit_document_${documentId}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
