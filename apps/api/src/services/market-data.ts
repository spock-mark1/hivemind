import axios from 'axios';
import { prisma } from '@selanet/db';
import { COINGECKO_IDS, TRACKED_TOKENS, type MarketData } from '@selanet/shared';
import { getConfig } from '../config.js';
import { realtime } from './realtime.js';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const DEFILLAMA_BASE = 'https://api.llama.fi';

export class MarketDataService {
  private config = getConfig();

  /**
   * Fetch latest prices from CoinGecko for all tracked tokens
   */
  async fetchPrices(): Promise<MarketData[]> {
    const ids = TRACKED_TOKENS.map((t) => COINGECKO_IDS[t]).join(',');

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
    });

    const results: MarketData[] = [];
    const idToSymbol = Object.fromEntries(
      Object.entries(COINGECKO_IDS).map(([symbol, id]) => [id, symbol])
    );

    for (const [coinId, values] of Object.entries(data) as [string, any][]) {
      const token = idToSymbol[coinId];
      if (!token) continue;

      const marketData: MarketData = {
        token,
        price: values.usd ?? 0,
        priceChange24h: values.usd_24h_change ?? 0,
        volume24h: values.usd_24h_vol ?? 0,
        timestamp: new Date(),
      };
      results.push(marketData);
    }

    return results;
  }

  /**
   * Fetch TVL data from DeFiLlama
   */
  async fetchTVL(): Promise<Record<string, number>> {
    try {
      const { data } = await axios.get(`${DEFILLAMA_BASE}/protocols`);
      const tvlMap: Record<string, number> = {};

      const protocolMapping: Record<string, string> = {
        aave: 'AAVE',
        uniswap: 'UNI',
        lido: 'ETH',
      };

      for (const protocol of data) {
        const name = protocol.name?.toLowerCase();
        if (name && protocolMapping[name]) {
          tvlMap[protocolMapping[name]] = protocol.tvl ?? 0;
        }
      }

      return tvlMap;
    } catch (error) {
      console.error('Failed to fetch TVL data:', error);
      return {};
    }
  }

  /**
   * Poll, store, and emit market snapshots
   */
  async pollAndStore(): Promise<void> {
    const [prices, tvlData] = await Promise.all([
      this.fetchPrices(),
      this.fetchTVL(),
    ]);

    for (const price of prices) {
      const snapshot = await prisma.marketSnapshot.create({
        data: {
          token: price.token,
          price: price.price,
          priceChange24h: price.priceChange24h,
          volume24h: price.volume24h,
          tvl: tvlData[price.token] ?? null,
          timestamp: price.timestamp,
        },
      });

      realtime.emitMarketUpdate({
        ...price,
        tvl: tvlData[price.token] ?? undefined,
      });
    }
  }
}

export const marketDataService = new MarketDataService();
