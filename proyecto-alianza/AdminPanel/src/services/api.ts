const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('admin_token', token);
    } else {
      localStorage.removeItem('admin_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('admin_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { token, ...fetchOptions } = options;
    const authToken = token || this.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    if (authToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(error.message || `HTTP error ${response.status}`);
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiService();

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ user: any; token: string }>('/auth/login', { email, password }),

  register: (email: string, password: string, displayName?: string) =>
    api.post<{ user: any; token: string }>('/auth/register', { email, password, displayName }),

  googleAuth: (idToken: string) =>
    api.post<{ user: any; token: string }>('/auth/google', { idToken }),

  verifyToken: () =>
    api.post<{ uid: string; email: string; role: string }>('/auth/verify'),

  getProfile: () =>
    api.get<any>('/users/me'),
};

export const usersApi = {
  getAll: (page = 1, limit = 20) =>
    api.get<any>(`/users?page=${page}&limit=${limit}`),

  getById: (uid: string) =>
    api.get<any>(`/users/${uid}`),

  updateProfile: (uid: string, data: any) =>
    api.put<any>(`/users/${uid}`, data),

  enrollUser: (email: string, role: string) =>
    api.post<any>('/users/enroll', { email, role }),
};

export const productsApi = {
  getAll: (filters?: Record<string, string>) => {
    const query = filters ? '?' + new URLSearchParams(filters).toString() : '';
    return api.get<any[]>(`/products${query}`);
  },

  getById: (id: string) =>
    api.get<any>(`/products/${id}`),

  create: (data: any) =>
    api.post<any>('/products', data),

  update: (id: string, data: any) =>
    api.put<any>(`/products/${id}`, data),

  delete: (id: string) =>
    api.delete<any>(`/products/${id}`),

  updateStock: (id: string, variantId: string, country: string, quantity: number) =>
    api.put<any>(`/products/${id}/stock`, { variantId, country, quantity }),
};

export const ordersApi = {
  getAll: (status?: string, page = 1) => {
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.append('status', status);
    return api.get<any>(`/orders?${params.toString()}`);
  },

  getById: (id: string) =>
    api.get<any>(`/orders/${id}`),

  getMyOrders: () =>
    api.get<any[]>('/orders/my-orders'),

  updateStatus: (id: string, status: string, trackingNumber?: string) =>
    api.put<any>(`/orders/${id}/status`, { status, trackingNumber }),

  getStats: () =>
    api.get<any>('/orders/stats'),

  getRevenue: (period: string) =>
    api.get<any>(`/orders/revenue?period=${period}`),
};

export const newsApi = {
  getAll: (projectId?: string) => {
    const params = projectId ? `?projectId=${projectId}` : '';
    return api.get<any[]>(`/news${params}`);
  },

  getById: (id: string) =>
    api.get<any>(`/news/${id}`),

  create: (data: any) =>
    api.post<any>('/news', data),

  update: (id: string, data: any) =>
    api.put<any>(`/news/${id}`, data),

  delete: (id: string) =>
    api.delete<any>(`/news/${id}`),
};

export const wikiApi = {
  getAll: (projectId?: string) => {
    const params = projectId ? `?projectId=${projectId}` : '';
    return api.get<any[]>(`/wiki${params}`);
  },

  getById: (id: string) =>
    api.get<any>(`/wiki/${id}`),

  create: (data: any) =>
    api.post<any>('/wiki', data),

  update: (id: string, data: any) =>
    api.put<any>(`/wiki/${id}`, data),

  assignStaff: (id: string, staffIds: string[]) =>
    api.put<any>(`/wiki/${id}/assign`, { staffIds }),

  delete: (id: string) =>
    api.delete<any>(`/wiki/${id}`),
};

export const projectsApi = {
  getAll: () =>
    api.get<any[]>('/projects'),

  getById: (id: string) =>
    api.get<any>(`/projects/${id}`),

  create: (data: any) =>
    api.post<any>('/projects', data),

  update: (id: string, data: any) =>
    api.put<any>(`/projects/${id}`, data),

  assignJefe: (id: string, userId: string) =>
    api.put<any>(`/projects/${id}/jefe`, { userId }),

  delete: (id: string) =>
    api.delete<any>(`/projects/${id}`),
};

export const paymentsApi = {
  createCheckout: (items: any[], currency: string) =>
    api.post<{ sessionId: string; url: string }>('/payments/create-checkout', { items, currency }),

  getSessionStatus: (sessionId: string) =>
    api.get<any>(`/payments/session/${sessionId}`),
};
