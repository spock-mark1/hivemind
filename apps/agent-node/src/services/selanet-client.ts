import axios, { AxiosInstance } from 'axios';
import { getConfig } from '../config.js';

export interface SelaNetNewsItem {
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment?: number;
  tokens?: string[];
}

export interface SelaNetSocialData {
  platform: string;
  content: string;
  author: string;
  engagement: number;
  sentiment?: number;
  timestamp: string;
}

export class SelaNetClient {
  private client: AxiosInstance;

  constructor() {
    const config = getConfig();
    this.client = axios.create({
      baseURL: config.SELANET_API_URL,
      headers: {
        'Authorization': `Bearer ${config.SELANET_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
  }

  /**
   * Fetch recent crypto news from SelaNet
   */
  async getNews(tokens?: string[]): Promise<SelaNetNewsItem[]> {
    try {
      const { data } = await this.client.get('/v1/news', {
        params: { tokens: tokens?.join(','), limit: 20 },
      });
      return data.items ?? [];
    } catch (error) {
      console.error('SelaNet news fetch failed:', error);
      return [];
    }
  }

  /**
   * Fetch social media data/trends from SelaNet
   */
  async getSocialTrends(tokens?: string[]): Promise<SelaNetSocialData[]> {
    try {
      const { data } = await this.client.get('/v1/social/trends', {
        params: { tokens: tokens?.join(','), limit: 50 },
      });
      return data.items ?? [];
    } catch (error) {
      console.error('SelaNet social trends fetch failed:', error);
      return [];
    }
  }

  /**
   * Fetch web search results for a query from SelaNet
   */
  async search(query: string): Promise<SelaNetNewsItem[]> {
    try {
      const { data } = await this.client.get('/v1/search', {
        params: { q: query, limit: 10 },
      });
      return data.items ?? [];
    } catch (error) {
      console.error('SelaNet search failed:', error);
      return [];
    }
  }
}

export const selanetClient = new SelaNetClient();
