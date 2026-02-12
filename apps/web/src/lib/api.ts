import { API_BASE_URL } from '@selanet/shared';
import type { ConsensusEvent } from '@selanet/shared';

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

interface AgentSummary {
  id: string;
  name: string;
  persona: string;
  status: string;
  twitterHandle: string;
}

interface AgentListItem extends AgentSummary {
  strategy: string;
  createdAt: string;
  _count: { tweets: number; opinions: number };
}

interface AgentDetail extends AgentSummary {
  strategy: string;
  sessionData?: boolean | null;
  createdAt: string;
  tweets: { id: string; content: string; type: string; tweetId?: string | null; sentiment?: number | null; postedAt: string }[];
  opinions: { id: string; token: string; stance: number; confidence: number; reasoning: string; createdAt: string }[];
}

interface MarketPrice {
  token: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  tvl?: number;
  timestamp: string;
}

interface DashboardStats {
  agentCount: number;
  activeAgents: number;
  tweetCount: number;
  consensusEvents: number;
}

interface FeedItem {
  id: string;
  agentId: string;
  agentName: string;
  content: string;
  type: string;
  tweetId?: string | null;
  sentiment?: number | null;
  tokens: string[];
  postedAt: string;
}

interface Interaction {
  sourceAgentId: string;
  targetAgentId: string;
  type: string;
  sentiment: number | null;
  postedAt: string;
}

interface TokenSentiment {
  token: string;
  avgSentiment: number;
  participantCount: number;
  agents: string[];
}

interface SentimentHistoryPoint {
  timestamp: string;
  avgSentiment: number;
  count: number;
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
  getAgents: () => fetchAPI<AgentListItem[]>('/api/agents'),
  getAllAgents: () => fetchAPI<AgentSummary[]>('/api/agents/all'),
  getAgent: (id: string) => fetchAPI<AgentDetail>(`/api/agents/${id}`),
  createAgent: (data: { name: string; persona: string; strategy: string; twitterHandle: string }) =>
    fetchAPI<AgentListItem>('/api/agents', { method: 'POST', body: JSON.stringify(data) }),
  updateAgentStatus: (id: string, status: string) =>
    fetchAPI<{ id: string; status: string }>(`/api/agents/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteAgent: (id: string) =>
    fetchAPI<{ success: boolean }>(`/api/agents/${id}`, { method: 'DELETE' }),

  // Twitter session
  uploadSession: (agentId: string, sessionData: string) =>
    fetchAPI<{ success: boolean }>(`/api/agents/${agentId}/session`, {
      method: 'PUT',
      body: JSON.stringify({ sessionData }),
    }),
  deleteSession: (agentId: string) =>
    fetchAPI<{ success: boolean }>(`/api/agents/${agentId}/session`, { method: 'DELETE' }),

  // Market
  getPrices: () => fetchAPI<MarketPrice[]>('/api/market/prices'),
  getPriceHistory: (token: string, hours = 24) =>
    fetchAPI<MarketPrice[]>(`/api/market/history/${token}?hours=${hours}`),

  // Dashboard
  getStats: () => fetchAPI<DashboardStats>('/api/dashboard/stats'),
  getFeed: (limit = 30) => fetchAPI<FeedItem[]>(`/api/dashboard/feed?limit=${limit}`),
  getInteractions: () => fetchAPI<Interaction[]>('/api/dashboard/interactions'),
  getConsensus: () => fetchAPI<ConsensusEvent[]>('/api/dashboard/consensus'),
  getSentiments: () => fetchAPI<TokenSentiment[]>('/api/dashboard/sentiments'),
  getSentimentHistory: (token: string, hours = 24) =>
    fetchAPI<SentimentHistoryPoint[]>(`/api/dashboard/sentiment-history/${token}?hours=${hours}`),
};
