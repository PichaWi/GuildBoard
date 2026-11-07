/**
 * Shared API client for GuildBoard frontend.
 * - Uses relative URLs (/api/...) so Vite proxy works in dev
 * - Sends session cookie (credentials: "include") for FastAPI session auth
 * - Returns parsed JSON; throws readable errors on non-2xx
 */
export async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `/api${path.startsWith('/') ? path : `/${path}`}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers: defaultHeaders,
    credentials: 'include', // send session cookie
  });

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json().catch(() => ({}));
  } else {
    data = await response.text().catch(() => '');
  }

  if (!response.ok) {
    const message = (data && (data.detail || data.message)) || `HTTP ${response.status} ${response.statusText}`;
    const error = new Error(message);
    error.status = response.status;
    error.response = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (path) => apiFetch(path, { method: 'GET' }),
  post: (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: (path, body) => apiFetch(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => apiFetch(path, { method: 'DELETE' }),
};