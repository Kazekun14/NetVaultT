export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({
    success: false,
    message: `Server returned invalid response (${res.status}).`,
  }));

  if (!res.ok && !data.reauthRequired) {
    throw new Error(data.message || `HTTP ${res.status} error.`);
  }

  return data;
}

