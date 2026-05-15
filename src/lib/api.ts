const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const direct = localStorage.getItem('joola_token');
  if (direct) return direct;
  try {
    const persisted = localStorage.getItem('joola-auth');
    if (persisted) {
      const parsed = JSON.parse(persisted);
      return parsed?.state?.token ?? null;
    }
  } catch { /* ignore */ }
  return null;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const json = await res.json();

  if (!res.ok) {
    throw new ApiError(
      json?.error?.message ?? 'Request failed',
      res.status,
      json?.error?.code ?? 'UNKNOWN'
    );
  }

  return json as T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  is_admin: boolean;
  status: string;
  region_id: string | null;
  manager_id: string | null;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: AuthUser;
}

export const auth = {
  login: (email: string, password: string) =>
    request<{ success: boolean; data: LoginResponse }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () =>
    request<{ success: boolean; data: AuthUser }>('/api/auth/me'),

  logout: () =>
    request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
};

// ─── Regions ─────────────────────────────────────────────────────────────────

export interface Region {
  id: string;
  name: string;
  code: string;
  parent_id: string | null;
}

export const regions = {
  list: () =>
    request<{ success: boolean; data: Region[] }>('/api/regions'),

  getById: (id: string) =>
    request<{ success: boolean; data: Region }>(`/api/regions/${id}`),
};

// ─── Users ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  department: string | null;
  region_id: string | null;
  manager_id: string | null;
  is_admin: boolean;
  status: 'active' | 'inactive';
  joined_at: string | null;
  created_at: string;
}

export interface UsersListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const users = {
  list: (params: UsersListParams = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.search) q.set('search', params.search);
    if (params.status) q.set('status', params.status);
    return request<{ success: boolean; data: User[]; total: number; page: number; limit: number }>(
      `/api/users?${q}`
    );
  },

  getById: (id: string) =>
    request<{ success: boolean; data: User }>(`/api/users/${id}`),

  create: (body: Partial<User> & { password?: string }) =>
    request<{ success: boolean; data: User }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: Partial<User>) =>
    request<{ success: boolean; data: User }>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deactivate: (id: string) =>
    request<{ success: boolean; data: User }>(`/api/users/${id}`, {
      method: 'DELETE',
    }),

  directReports: (id: string) =>
    request<{ success: boolean; data: User[] }>(`/api/users/${id}/reports`),

  kpis: (id: string) =>
    request<{ success: boolean; data: Kpi[] }>(`/api/users/${id}/kpis`),
};

// ─── KPIs ────────────────────────────────────────────────────────────────────

export interface Kpi {
  id: string;
  kpi_number: string;
  name: string;
  description: string | null;
  type: 'quantitative' | 'qualitative';
  period: 'monthly' | 'quarterly' | 'annual';
  update_frequency: 'weekly' | 'monthly' | 'quarterly';
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  start_date: string | null;
  end_date: string | null;
  allocation_pct: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  region_id: string;
  owner_id: string | null;
  parent_id: string | null;
  level: number;
  next_due_date: string | null;
  created_at: string;
}

export interface KpisListParams {
  page?: number;
  limit?: number;
  status?: string;
  owner_id?: string;
  region_id?: string;
}

export const kpis = {
  list: (params: KpisListParams = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.status) q.set('status', params.status);
    if (params.owner_id) q.set('owner_id', params.owner_id);
    if (params.region_id) q.set('region_id', params.region_id);
    return request<{ success: boolean; data: Kpi[]; total: number; page: number; limit: number }>(
      `/api/kpis?${q}`
    );
  },

  getById: (id: string) =>
    request<{ success: boolean; data: Kpi }>(`/api/kpis/${id}`),

  create: (body: Partial<Kpi>) =>
    request<{ success: boolean; data: Kpi }>('/api/kpis', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: Partial<Kpi>) =>
    request<{ success: boolean; data: Kpi }>(`/api/kpis/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  cancel: (id: string) =>
    request<{ success: boolean; data: Kpi }>(`/api/kpis/${id}`, {
      method: 'DELETE',
    }),

  children: (id: string) =>
    request<{ success: boolean; data: Kpi[] }>(`/api/kpis/${id}/children`),

  tree: (id: string) =>
    request<{ success: boolean; data: Kpi }>(`/api/kpis/${id}/tree`),
};

// ─── Cascade ─────────────────────────────────────────────────────────────────

export interface CascadeSummary {
  parent: Kpi;
  children: Kpi[];
  allocated_pct: number;
  remaining_pct: number;
}

export const cascade = {
  summary: (parentId: string) =>
    request<{ success: boolean; data: CascadeSummary }>(`/api/kpis/${parentId}/cascade`),

  create: (parentId: string, body: Partial<Kpi>) =>
    request<{ success: boolean; data: Kpi }>(`/api/kpis/${parentId}/cascade`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  remove: (parentId: string, childId: string) =>
    request<{ success: boolean }>(`/api/kpis/${parentId}/cascade/${childId}`, {
      method: 'DELETE',
    }),
};

// ─── Contributors ─────────────────────────────────────────────────────────────

export interface Contributor {
  user_id: string;
  role: string;
  allocation_pct: number;
}

export const contributors = {
  add: (kpiId: string, body: Contributor) =>
    request<{ success: boolean; data: Contributor }>(`/api/kpis/${kpiId}/contributors`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  remove: (kpiId: string, userId: string) =>
    request<{ success: boolean }>(`/api/kpis/${kpiId}/contributors/${userId}`, {
      method: 'DELETE',
    }),
};
