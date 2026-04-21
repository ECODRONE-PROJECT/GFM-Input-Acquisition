import type { AdminSystemSummary } from './adminSystemSummary';
import type { AdminActivityEntry } from './adminActivity';
import { getAdminSession } from './adminAuth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export type NotificationLevel = 'info' | 'warning' | 'error' | 'success';

export interface AdminNotification {
  id: string;
  level: NotificationLevel;
  category: 'CREDIT' | 'ORDER' | 'DEAL' | 'SYSTEM' | 'SECURITY';
  title: string;
  message: string;
  timestamp: string;
  actionUrl?: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  isRead?: boolean;
}

const READ_NOTIFS_KEY = 'gfm_admin_read_notifications';

type ApiErrorBody = {
  detail?: string;
};

type AdminNotificationApiRow = {
  id: string;
  level?: NotificationLevel | string;
  category?: AdminNotification['category'] | string;
  title?: string;
  message?: string;
  timestamp?: string;
  action_url?: string | null;
  entity?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

type AdminNotificationResponse = {
  count: number;
  notifications: AdminNotificationApiRow[];
};

function getReadIds(): Set<string> {
  try {
    const stored = localStorage.getItem(READ_NOTIFS_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
}

export function markAsRead(id: string) {
  const ids = getReadIds();
  ids.add(id);
  localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify([...ids]));
}

export function clearAllNotifications(notifs: AdminNotification[]) {
  const ids = getReadIds();
  notifs.forEach(n => ids.add(n.id));
  localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify([...ids]));
}

export function resolveAdminNotificationActionUrl(notification: AdminNotification): string | undefined {
  const base = notification.actionUrl;
  if (!base) return undefined;
  const isOrderNotification = notification.category === 'ORDER' || notification.entity === 'order';
  if (!isOrderNotification) return base;

  const metadataOrderId = String(notification.metadata?.['order_id'] || '').trim();
  const orderId = String(notification.entityId || metadataOrderId).trim();
  if (!orderId) return base;

  const [path, existingQuery = ''] = base.split('?', 2);
  const params = new URLSearchParams(existingQuery);
  params.set('orderId', orderId);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

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

function normalizeNotificationLevel(value: unknown): NotificationLevel {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'error') return 'error';
  if (raw === 'warning' || raw === 'warn') return 'warning';
  if (raw === 'success') return 'success';
  return 'info';
}

function normalizeNotificationCategory(value: unknown): AdminNotification['category'] {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'CREDIT') return 'CREDIT';
  if (raw === 'ORDER') return 'ORDER';
  if (raw === 'DEAL') return 'DEAL';
  if (raw === 'SECURITY') return 'SECURITY';
  return 'SYSTEM';
}

export async function fetchAdminNotifications(limit = 25, includeInfo = false): Promise<AdminNotification[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const response = await guardedFetch(
    `${API_BASE}/admin/notifications?limit=${safeLimit}&include_info=${includeInfo ? 'true' : 'false'}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to fetch admin notifications.'));
  }
  const body = (await response.json()) as AdminNotificationResponse;
  const readIds = getReadIds();
  return (body.notifications || []).map((row) => ({
    id: String(row.id || ''),
    level: normalizeNotificationLevel(row.level),
    category: normalizeNotificationCategory(row.category),
    title: String(row.title || 'Notification'),
    message: String(row.message || ''),
    timestamp: String(row.timestamp || new Date().toISOString()),
    actionUrl: row.action_url || undefined,
    entity: row.entity || undefined,
    entityId: row.entity_id || undefined,
    metadata: row.metadata || undefined,
    isRead: readIds.has(String(row.id || '')),
  }));
}

/**
 * Synthesizes a list of actionable notifications from existing system data.
 */
export function resolveAdminNotifications(
  summary: AdminSystemSummary | null,
  activity: AdminActivityEntry[]
): AdminNotification[] {
  const notifications: AdminNotification[] = [];
  const readIds = getReadIds();

  // 1. New Credit Applications
  if (summary && summary.summary.credit_applications.submitted > 0) {
    notifications.push({
      id: `credit_pending_${summary.summary.credit_applications.submitted}`, // Semi-static ID for grouped alert
      level: 'warning',
      category: 'CREDIT',
      title: 'Pending Credit Reviews',
      message: `${summary.summary.credit_applications.submitted} applications are awaiting initial review.`,
      timestamp: summary.timestamp,
      actionUrl: '/admin/credit',
    });
  }

  // 2. Activity Logs (Audit Feed)
  // We treat recent 'warning' or 'error' logs as notifications
  // Also 'aggregate_deal' joined events if we can find them.
  activity.forEach((entry) => {
    // Determine level
    let level: NotificationLevel = 'info';
    if (entry.level === 'error' || entry.level === 'critical') level = 'error';
    else if (entry.level === 'warning') level = 'warning';
    
    // Categorize
    const title = entry.title.toLowerCase();
    let category: AdminNotification['category'] = 'SYSTEM';
    
    if (title.includes('credit') || title.includes('application')) category = 'CREDIT';
    else if (title.includes('order') || title.includes('purchased')) category = 'ORDER';
    else if (title.includes('deal') || title.includes('joined')) category = 'DEAL';
    else if (title.includes('security') || title.includes('login')) category = 'SECURITY';
    else if (title.includes('payment') || title.includes('paid')) category = 'SYSTEM'; // Will use custom icon in UI for payments

    // We only promote high-priority logs or specific transactions to the notification center
    if (level === 'error' || level === 'warning' || category !== 'SYSTEM' || title.includes('payment')) {
      const actorInfo = entry.actor ? ` by ${entry.actor}` : '';
      notifications.push({
        id: entry.id,
        level,
        category,
        title: entry.title,
        message: `${entry.description}${actorInfo}`,
        timestamp: entry.timestamp,
        actionUrl: category === 'DEAL' ? '/admin/deals' : (category === 'CREDIT' ? '/admin/credit' : undefined),
      });
    }
  });

  // Apply read status and sort
  return notifications
    .map(n => ({ ...n, isRead: readIds.has(n.id) }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
