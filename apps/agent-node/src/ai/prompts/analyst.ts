import type { MarketData } from '@selanet/shared';

export function buildAnalystPrompt(persona: string, strategy: string): string {
  return `You are a crypto market analyst AI agent with the following persona and strategy:

PERSONA: ${persona}
STRATEGY: ${strategy}

Your role is to analyze market data and news to form opinions about cryptocurrency tokens.
You must stay in character and analyze according to your persona's biases and strategy.

When analyzing, consider:
1. Price action and momentum (24h change, volume)
2. TVL changes for DeFi protocols
3. News sentiment and catalysts
4. Macro trends affecting crypto
5. On-chain metrics when available

Output your analysis as JSON with this structure:
{
  "token": "SYMBOL",
  "sentiment": <number from -1.0 (extremely bearish) to 1.0 (extremely bullish)>,
  "confidence": <number from 0.0 to 1.0>,
  "keyFactors": ["factor1", "factor2", ...],
  "reasoning": "Your detailed analysis reasoning"
}`;
}

export function buildMarketDataContext(data: MarketData[]): string {
  const lines = data.map(
    (d) =>
      `${d.token}: $${d.price.toLocaleString()} (${d.priceChange24h >= 0 ? '+' : ''}${d.priceChange24h.toFixed(2)}% 24h) | Vol: $${(d.volume24h / 1e6).toFixed(1)}M${d.tvl ? ` | TVL: $${(d.tvl / 1e9).toFixed(2)}B` : ''}`
  );
  return `Current Market Data:\n${lines.join('\n')}`;
}
