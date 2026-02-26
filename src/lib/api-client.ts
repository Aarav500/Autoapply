/**
 * Client-side API fetch helper with auth token handling and auto Content-Type
 */

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function tryRefreshToken(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const newToken = data?.data?.accessToken;
    if (newToken) {
      localStorage.setItem('accessToken', newToken);
      if (data?.data?.refreshToken) {
        localStorage.setItem('refreshToken', data.data.refreshToken);
      }
      return newToken;
    }
    return null;
  } catch {
    return null;
  }
}

export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  // Auto-set Content-Type for JSON string bodies
  const extraHeaders: Record<string, string> = {};
  if (typeof options?.body === 'string') {
    extraHeaders['Content-Type'] = 'application/json';
  }

  const headers = {
    ...extraHeaders,
    ...getAuthHeaders(),
    ...options?.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // Try to refresh the token once before redirecting
    if (typeof window !== 'undefined') {
      const newToken = await tryRefreshToken();
      if (newToken) {
        // Retry original request with new token
        const retryHeaders = {
          ...extraHeaders,
          Authorization: `Bearer ${newToken}`,
          ...options?.headers,
        };
        const retryResponse = await fetch(url, { ...options, headers: retryHeaders });
        if (retryResponse.ok) return retryResponse.json();
      }
      // Refresh failed — redirect to login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error?.message || `Request failed: ${response.status}`);
  }

  return response.json();
}
