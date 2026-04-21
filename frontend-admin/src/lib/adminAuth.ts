const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const ADMIN_SESSION_STORAGE_KEY = 'gfm_admin_session_v1';

export type AdminSession = {
  token: string;
  expires_at: string;
  admin: {
    name: string;
    email: string;
  };
};

type ApiErrorBody = {
  detail?: string;
};

async function parseApiError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.detail || fallback;
  } catch {
    return fallback;
  }
}

export function getAdminSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed?.token || !parsed?.expires_at || !parsed?.admin?.email) {
      localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      return null;
    }
    const expiresAtMs = Date.parse(parsed.expires_at);
    if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now()) {
      localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    return null;
  }
}

export function saveAdminSession(session: AdminSession) {
  localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
}

export async function initiateAdminLogin(email: string, password: string): Promise<{
  challenge_id: string;
  delivery_mode: string;
  target_hint: string;
  expires_in_minutes: number;
}> {
  const response = await fetch(`${API_BASE}/admin/auth/login/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to start admin login.'));
  }
  return response.json() as Promise<{
    challenge_id: string;
    delivery_mode: string;
    target_hint: string;
    expires_in_minutes: number;
  }>;
}

export async function verifyAdminOtp(email: string, challengeId: string, otp: string): Promise<AdminSession> {
  const response = await fetch(`${API_BASE}/admin/auth/login/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, challenge_id: challengeId, otp }),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to verify admin OTP.'));
  }
  return response.json() as Promise<AdminSession>;
}
