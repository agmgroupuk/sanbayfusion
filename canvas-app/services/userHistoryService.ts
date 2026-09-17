// User History Service — DB-backed per-feature history.
// Replaces localStorage for video / voice / image-to-code panels.
// All data persisted via /api/user-history. Zero local storage.

const API_BASE = '/api/user-history';
const HEADERS = { 'Content-Type': 'application/json' };

export type HistoryKind = 'video' | 'voice' | 'image_to_code';

export interface HistoryEntry<T = unknown> {
  id: string;
  data: T;
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  items?: HistoryEntry<T>[];
  item?: HistoryEntry<T>;
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      headers: HEADERS,
      ...init,
    });
    if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e?.message || 'network error' };
  }
}

export const userHistoryService = {
  list: <T>(kind: HistoryKind, limit = 100) =>
    request<T>(`/${kind}?limit=${limit}`),

  create: <T>(kind: HistoryKind, data: T, id?: string) =>
    request<T>(`/${kind}`, {
      method: 'POST',
      body: JSON.stringify(id ? { id, data } : { data }),
    }),

  patch: <T>(kind: HistoryKind, id: string, data: Partial<T>) =>
    request<T>(`/${kind}/${id}`, { method: 'PATCH', body: JSON.stringify({ data }) }),

  remove: (kind: HistoryKind, id: string) =>
    request<unknown>(`/${kind}/${id}`, { method: 'DELETE' }),

  clear: (kind: HistoryKind) =>
    request<unknown>(`/${kind}`, { method: 'DELETE' }),
};
