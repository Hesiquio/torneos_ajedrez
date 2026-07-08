const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function getAuthToken() {
  return localStorage.getItem('adminToken');
}

export function setAuthToken(token: string) {
  localStorage.setItem('adminToken', token);
}

export function logout() {
  localStorage.removeItem('adminToken');
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'API Error');
  }
  return res.json();
}
