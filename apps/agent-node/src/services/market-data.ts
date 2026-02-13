import axios from 'axios';
import { COINGECKO_IDS, TRACKED_TOKENS, type MarketData } from '@selanet/shared';
import { getConfig } from '../config.js';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

export class MarketDataService {
  private config = getConfig();

  /**
   * Fetch latest prices from CoinGecko for all tracked tokens
   *
   * NOTE: Agent Node only fetches market data for analysis.
   * It does NOT save to database (Hub server handles that).
   */
  async fetchPrices(): Promise<MarketData[]> {
    const ids = TRACKED_TOKENS.map((t) => COINGECKO_IDS[t]).join(',');

    try {
      const { data } = await axios.get(`${COINGECKO_BASE}/simple/price`, {
        params: {
          ids,
          vs_currencies: 'usd',
          include_24hr_change: true,
          include_24hr_vol: true,
        },
        headers: this.config.COINGECKO_API_KEY
          ? { 'x-cg-demo-api-key': this.config.COINGECKO_API_KEY }
          : {},
        timeout: 10000,
      });

      const results: MarketData[] = [];
      const timestamp = new Date();

      for (const token of TRACKED_TOKENS) {
        const geckoId = COINGECKO_IDS[token];
        const priceData = data[geckoId];

        if (!priceData) continue;

        results.push({
          token,
          price: priceData.usd || 0,
          priceChange24h: priceData.usd_24h_change || 0,
          volume24h: priceData.usd_24h_vol || 0,
          timestamp,
        });
      }

      return results;
    } catch (error) {
      console.error('[MarketData] Failed to fetch prices:', error);
      return [];
    }
  }
}

export const marketDataService = new MarketDataService();
