import { API_BASE_URL } from '@selanet/shared';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('selanet_token');
}

export function setToken(token: string): void {
  localStorage.setItem('selanet_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('selanet_token');
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  register: (email: string, password: string) =>
    fetchAPI<{ token: string; userId: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    fetchAPI<{ token: string; userId: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // Agents
  getAgents: () => fetchAPI<any[]>('/api/agents'),
  getAllAgents: () => fetchAPI<any[]>('/api/agents/all'),
  getAgent: (id: string) => fetchAPI<any>(`/api/agents/${id}`),
  createAgent: (data: any) =>
    fetchAPI<any>('/api/agents', { method: 'POST', body: JSON.stringify(data) }),
  updateAgentStatus: (id: string, status: string) =>
    fetchAPI<any>(`/api/agents/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteAgent: (id: string) =>
    fetchAPI<any>(`/api/agents/${id}`, { method: 'DELETE' }),

  // Twitter session
  uploadSession: (agentId: string, sessionData: string) =>
    fetchAPI<{ success: boolean }>(`/api/agents/${agentId}/session`, {
      method: 'PUT',
      body: JSON.stringify({ sessionData }),
    }),
  deleteSession: (agentId: string) =>
    fetchAPI<{ success: boolean }>(`/api/agents/${agentId}/session`, { method: 'DELETE' }),

  // Market
  getPrices: () => fetchAPI<any[]>('/api/market/prices'),
  getPriceHistory: (token: string, hours = 24) =>
    fetchAPI<any[]>(`/api/market/history/${token}?hours=${hours}`),

  // Dashboard
  getStats: () => fetchAPI<any>('/api/dashboard/stats'),
  getFeed: (limit = 30) => fetchAPI<any[]>(`/api/dashboard/feed?limit=${limit}`),
  getInteractions: () => fetchAPI<any[]>('/api/dashboard/interactions'),
  getConsensus: () => fetchAPI<any[]>('/api/dashboard/consensus'),
  getSentiments: () => fetchAPI<any[]>('/api/dashboard/sentiments'),
  getSentimentHistory: (token: string, hours = 24) =>
    fetchAPI<any[]>(`/api/dashboard/sentiment-history/${token}?hours=${hours}`),
};
