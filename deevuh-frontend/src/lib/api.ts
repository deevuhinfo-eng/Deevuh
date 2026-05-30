const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const getDefaultHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['X-XSRF-TOKEN'] = csrfToken;
  }
  return headers;
};

async function handleResponse<T>(res: Response, path: string, options: RequestInit): Promise<T> {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/refresh') {
      try {
        // Attempt silent refresh
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: getDefaultHeaders(),
          credentials: 'include',
        });
        
        if (refreshRes.ok) {
          // Retry original request
          const retryRes = await fetch(`${API_BASE}${path}`, options);
          if (retryRes.ok) {
            return retryRes.json();
          }
        }
      } catch (err) {
        // Refresh failed, let the error fall through
      }
    }
    
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  
  return data;
}

export const api = {
  get: async <T = any>(path: string): Promise<T> => {
    const options = {
      headers: getDefaultHeaders(),
      credentials: 'include' as RequestCredentials,
    };
    const res = await fetch(`${API_BASE}${path}`, options);
    return handleResponse<T>(res, path, options);
  },

  post: async <T = any>(path: string, data?: any): Promise<T> => {
    const options = {
      method: 'POST',
      headers: getDefaultHeaders(),
      credentials: 'include' as RequestCredentials,
      body: data ? JSON.stringify(data) : undefined,
    };
    const res = await fetch(`${API_BASE}${path}`, options);
    return handleResponse<T>(res, path, options);
  },

  put: async <T = any>(path: string, data?: any): Promise<T> => {
    const options = {
      method: 'PUT',
      headers: getDefaultHeaders(),
      credentials: 'include' as RequestCredentials,
      body: data ? JSON.stringify(data) : undefined,
    };
    const res = await fetch(`${API_BASE}${path}`, options);
    return handleResponse<T>(res, path, options);
  },

  delete: async <T = any>(path: string, data?: any): Promise<T> => {
    const options = {
      method: 'DELETE',
      headers: getDefaultHeaders(),
      credentials: 'include' as RequestCredentials,
      body: data ? JSON.stringify(data) : undefined,
    };
    const res = await fetch(`${API_BASE}${path}`, options);
    return handleResponse<T>(res, path, options);
  },

  /** Wishlist uses parameterized path */
  wishlist: {
    add: (productId: string) => api.post(`/wishlist/${productId}`),
    remove: (productId: string) => api.delete(`/wishlist/${productId}`),
    list: () => api.get('/wishlist'),
  },
};

export default api;
