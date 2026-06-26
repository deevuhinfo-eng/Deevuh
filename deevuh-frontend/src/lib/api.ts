const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const getDefaultHeaders = (isFormData = false): Record<string, string> => {
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['X-XSRF-TOKEN'] = csrfToken;
  }
  return headers;
};

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out after 30 seconds.');
    }
    throw error;
  }
}

async function handleResponse<T>(res: Response, path: string, options: RequestInit): Promise<T> {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/refresh') {
      try {
        // Attempt silent refresh
        const refreshRes = await fetchWithTimeout(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: getDefaultHeaders(),
          credentials: 'include',
        });
        
        if (refreshRes.ok) {
          // Retry original request
          const retryRes = await fetchWithTimeout(`${API_BASE}${path}`, options);
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
    const res = await fetchWithTimeout(`${API_BASE}${path}`, options);
    return handleResponse<T>(res, path, options);
  },

  post: async <T = any>(path: string, data?: any): Promise<T> => {
    const isFormData = data instanceof FormData;
    const options = {
      method: 'POST',
      headers: getDefaultHeaders(isFormData),
      credentials: 'include' as RequestCredentials,
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    };
    const res = await fetchWithTimeout(`${API_BASE}${path}`, options);
    return handleResponse<T>(res, path, options);
  },

  put: async <T = any>(path: string, data?: any): Promise<T> => {
    const isFormData = data instanceof FormData;
    const options = {
      method: 'PUT',
      headers: getDefaultHeaders(isFormData),
      credentials: 'include' as RequestCredentials,
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    };
    const res = await fetchWithTimeout(`${API_BASE}${path}`, options);
    return handleResponse<T>(res, path, options);
  },

  delete: async <T = any>(path: string, data?: any): Promise<T> => {
    const isFormData = data instanceof FormData;
    const options = {
      method: 'DELETE',
      headers: getDefaultHeaders(isFormData),
      credentials: 'include' as RequestCredentials,
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    };
    const res = await fetchWithTimeout(`${API_BASE}${path}`, options);
    return handleResponse<T>(res, path, options);
  },

  patch: async <T = any>(path: string, data?: any): Promise<T> => {
    const isFormData = data instanceof FormData;
    const options = {
      method: 'PATCH',
      headers: getDefaultHeaders(isFormData),
      credentials: 'include' as RequestCredentials,
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    };
    const res = await fetchWithTimeout(`${API_BASE}${path}`, options);
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
