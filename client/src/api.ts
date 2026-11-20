const BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export function createApi(token: string | null, onUnauthorized?: () => void) {
  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && token) onUnauthorized?.();
    if (!res.ok) throw new ApiError(data.error || `Napaka ${res.status}`, res.status);
    return data as T;
  }
  return {
    get: <T>(p: string) => call<T>('GET', p),
    post: <T>(p: string, b?: unknown) => call<T>('POST', p, b ?? {}),
    put: <T>(p: string, b: unknown) => call<T>('PUT', p, b),
    del: <T>(p: string, b?: unknown) => call<T>('DELETE', p, b)
  };
}
export type Api = ReturnType<typeof createApi>;
