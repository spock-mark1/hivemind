// Agent types
export type AgentStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'ERROR';
export type TweetType = 'ORIGINAL' | 'REPLY' | 'QUOTE';
export type ConsensusType = 'AGREEMENT' | 'DISAGREEMENT' | 'SHIFT';

export interface AgentConfig {
  id: string;
  name: string;
  persona: string;
  strategy: string;
  twitterHandle: string;
  status: AgentStatus;
}

export interface TweetData {
  id: string;
  tweetId?: string;
  authorHandle: string;
  content: string;
  type: TweetType;
  replyToTweetId?: string;
  sentiment?: number;
  tokens: string[];
  postedAt: Date;
  reactions: number;
}

export interface MarketData {
  token: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  tvl?: number;
  timestamp: Date;
}

export interface Opinion {
  id: string;
  agentId: string;
  token: string;
  stance: number;  // -1.0 to 1.0
  confidence: number;  // 0.0 to 1.0
  reasoning: string;
  createdAt: Date;
}

export interface ConsensusEvent {
  id: string;
  token: string;
  type: ConsensusType;
  avgSentiment: number;
  participantCount: number;
  summary: string;
  timestamp: Date;
}

// AI types
export interface MarketContext {
  prices: MarketData[];
  recentTweets: TweetData[];
  currentOpinions: Opinion[];
  newsHeadlines: string[];
}

export interface MarketAnalysis {
  token: string;
  sentiment: number;
  confidence: number;
  keyFactors: string[];
  reasoning: string;
}

export interface TweetEvaluation {
  tweetId: string;
  authorHandle: string;
  agree: boolean;
  strength: number;  // 0.0 to 1.0
  shouldRespond: boolean;
  responseType: 'reply' | 'quote' | null;
  reason: string;
}

export type AgentActionType = 'tweet' | 'reply' | 'quote' | 'pass';

export interface AgentAction {
  type: AgentActionType;
  targetTweetId?: string;
  content?: string;
  tokens: string[];
}

// WebSocket events
export interface WSEvents {
  'agent:tweet': TweetData;
  'agent:reply': TweetData;
  'agent:opinion': Opinion;
  'consensus:event': ConsensusEvent;
  'market:update': MarketData;
}

// ------------------------------------------------------------------
// Hive Network Protocol (Agent Node <-> Central Hive)
// ------------------------------------------------------------------

export interface AgentRegistrationPayload {
  name: string;
  persona: string; // 'BULL' | 'BEAR' | 'DEGEN' | 'MACRO'
  description?: string;
  twitterHandle: string;
  walletAddress?: string; // Optional: for future rewards
}

export interface AgentHeartbeatPayload {
  agentId: string;
  status: AgentStatus;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export type ActivityType = 'TWEET' | 'REPLY' | 'QUOTE' | 'OPINION' | 'MARKET_ANALYSIS';

export interface AgentActivityPayload {
  agentId: string;
  type: ActivityType;
  timestamp: Date;
  data: TweetData | Opinion | MarketAnalysis | any;
}

export interface HiveApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
