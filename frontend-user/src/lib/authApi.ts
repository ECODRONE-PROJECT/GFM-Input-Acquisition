const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://gfm-backend.onrender.com/api';

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

export async function registerWithOtp(payload: {
  name: string;
  email: string;
  password: string;
  phone: string;
}): Promise<{
  user_id: string;
  email: string;
  phone: string;
  otp_expires_at: string;
  email_confirmation_required: boolean;
}> {
  const response = await fetch(`${API_BASE}/auth/register/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Registration failed.'));
  }

  return response.json() as Promise<{
    user_id: string;
    email: string;
    phone: string;
    otp_expires_at: string;
    email_confirmation_required: boolean;
  }>;
}

export async function verifyPhoneOtp(payload: {
  userId: string;
  phone: string;
  otp: string;
}): Promise<{ status: string; phone_verified: boolean }> {
  const response = await fetch(`${API_BASE}/auth/phone-otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'OTP verification failed.'));
  }

  return response.json() as Promise<{ status: string; phone_verified: boolean }>;
}

export async function resendPhoneOtp(payload: {
  userId: string;
  phone: string;
}): Promise<{ status: string; otp_expires_at?: string }> {
  const response = await fetch(`${API_BASE}/auth/phone-otp/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to resend OTP.'));
  }

  return response.json() as Promise<{ status: string; otp_expires_at?: string }>;
}

export async function fetchPhoneVerificationStatus(userId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const response = await fetch(`${API_BASE}/auth/phone-otp/status?user_id=${encodeURIComponent(userId)}`);
  if (!response.ok) {
    return false;
  }

  const body = (await response.json()) as { phone_verified?: boolean };
  return Boolean(body.phone_verified);
}
