// Tracked tokens
export const TRACKED_TOKENS = [
  'BTC', 'ETH', 'SOL', 'AVAX', 'MATIC',
  'ARB', 'OP', 'LINK', 'UNI', 'AAVE',
] as const;

export type TrackedToken = typeof TRACKED_TOKENS[number];

// CoinGecko ID mapping
export const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  AVAX: 'avalanche-2',
  MATIC: 'matic-network',
  ARB: 'arbitrum',
  OP: 'optimism',
  LINK: 'chainlink',
  UNI: 'uniswap',
  AAVE: 'aave',
};

// Agent personas
export const DEFAULT_PERSONAS = {
  BULL: {
    name: 'Bullish Maximalist',
    description: 'Always bullish, HODL mentality, focuses on adoption metrics and positive catalysts',
  },
  BEAR: {
    name: 'Bear Analyst',
    description: 'Conservative, risk-focused, highlights regulatory risks and overvaluation signals',
  },
  DEGEN: {
    name: 'DeFi Degen',
    description: 'Yield-optimizing, protocol-exploring, embraces high-risk high-reward strategies',
  },
  MACRO: {
    name: 'Macro Strategist',
    description: 'Macroeconomic analysis, correlation with traditional markets, monetary policy focus',
  },
} as const;

// Rate limits
export const AGENT_RATE_LIMITS = {
  MAX_TWEETS_PER_HOUR: 8,
  MIN_INTERVAL_MS: 5 * 60 * 1000,   // 5 minutes
  MAX_INTERVAL_MS: 15 * 60 * 1000,  // 15 minutes
} as const;

// Consensus thresholds
export const CONSENSUS_THRESHOLDS = {
  AGREEMENT_RATIO: 0.7,    // 70% same direction = agreement
  DISAGREEMENT_SPREAD: 1.2, // high spread = disagreement
  SHIFT_DELTA: 0.4,         // avg stance change > 0.4 = shift
  MIN_PARTICIPANTS: 3,       // minimum agents for consensus
  LOOKBACK_HOURS: 6,        // hours to look back
} as const;

// API
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
