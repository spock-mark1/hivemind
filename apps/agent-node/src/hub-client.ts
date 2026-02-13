import axios, { AxiosInstance } from 'axios';
import type { AgentConfig, TweetData, Opinion } from '@selanet/shared';

export interface RegisterPayload {
  name: string;
  persona: string;
  strategy: string;
  twitterHandle: string;
}

export interface RegisterResponse {
  agentId: string;
  success: boolean;
}

export interface HeartbeatPayload {
  agentId: string;
  status: 'RUNNING' | 'IDLE' | 'ERROR';
}

export interface TweetPayload {
  agentId: string;
  tweet: {
    content: string;
    type: 'ORIGINAL' | 'REPLY' | 'QUOTE';
    tweetId?: string;
    replyToTweetId?: string;
    sentiment?: number;
    tokens: string[];
    postedAt: Date;
  };
}

export interface OpinionPayload {
  agentId: string;
  opinion: {
    token: string;
    stance: number;
    confidence: number;
    reasoning: string;
  };
}

export class HubClient {
  private client: AxiosInstance;

  constructor(private hubUrl: string) {
    this.client = axios.create({
      baseURL: hubUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Register agent with the Hub
   */
  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    const response = await this.client.post<RegisterResponse>('/api/registry/register', payload);
    return response.data;
  }

  /**
   * Send heartbeat to Hub
   */
  async heartbeat(payload: HeartbeatPayload): Promise<void> {
    await this.client.post('/api/registry/heartbeat', payload);
  }

  /**
   * Send tweet data to Hub
   */
  async sendTweet(payload: TweetPayload): Promise<void> {
    await this.client.post('/api/registry/tweet', payload);
  }

  /**
   * Send opinion data to Hub
   */
  async sendOpinion(payload: OpinionPayload): Promise<void> {
    await this.client.post('/api/registry/opinion', payload);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/health');
      return response.data.status === 'ok';
    } catch {
      return false;
    }
  }
}
