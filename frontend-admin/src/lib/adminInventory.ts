import { getAdminSession } from './adminAuth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://gfm-backend.onrender.com/api';

export type InventoryItem = {
  id: string;
  name: string;
  type: string;
  price: number;
  stock: number;
  location?: string | null;
  imageUrl?: string | null;
  size?: string | null;
  weight?: string | null;
  brand?: string | null;
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

export async function fetchAdminInventory(): Promise<InventoryItem[]> {
  const response = await fetch(`${API_BASE}/admin/inventory`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to fetch inventory.'));
  }
  const body = (await response.json()) as { items?: InventoryItem[] };
  return body.items || [];
}

export async function createAdminInventoryItem(
  payload: Omit<InventoryItem, 'id'> & { id?: string }
): Promise<InventoryItem> {
  const response = await fetch(`${API_BASE}/admin/inventory`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to create inventory item.'));
  }
  const body = (await response.json()) as { item: InventoryItem };
  return body.item;
}

export async function updateAdminInventoryItem(
  itemId: string,
  payload: Partial<Omit<InventoryItem, 'id'>>
): Promise<InventoryItem> {
  const response = await fetch(`${API_BASE}/admin/inventory/${encodeURIComponent(itemId)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to update inventory item.'));
  }
  const body = (await response.json()) as { item: InventoryItem };
  return body.item;
}

export async function deleteAdminInventoryItem(itemId: string, password: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/inventory/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to delete inventory item.'));
  }
}
