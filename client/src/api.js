const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function apiFetch(path, { userId, method = 'GET', body, isFormData = false } = {}) {
  const headers = {};
  if (userId) headers['X-User-Id'] = userId;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}