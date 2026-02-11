/**
 * Random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random delay between min and max milliseconds
 */
export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = randomInt(minMs, maxMs);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Format a sentiment score as a label
 */
export function sentimentLabel(score: number): string {
  if (score >= 0.6) return 'Very Bullish';
  if (score >= 0.2) return 'Bullish';
  if (score > -0.2) return 'Neutral';
  if (score > -0.6) return 'Bearish';
  return 'Very Bearish';
}

/**
 * Format a number as compact (1.2K, 3.4M, etc.)
 */
export function formatCompact(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(2);
}

/**
 * Truncate text to maxLength with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Extract token symbols from text (e.g., $BTC, $ETH)
 */
export function extractTokens(text: string): string[] {
  const matches = text.match(/\$([A-Z]{2,10})/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}
