'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/use-socket';
import NetworkGraph from '@/components/network-graph';
import TweetFeed from '@/components/tweet-feed';
import PriceCorrelation from '@/components/price-correlation';
import SentimentHeatmap from '@/components/sentiment-heatmap';

interface DashboardStats {
  agentCount: number;
  activeAgents: number;
  tweetCount: number;
  consensusEvents: number;
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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [sentiments, setSentiments] = useState<TokenSentiment[]>([]);
  const { connected } = useSocket();

  useEffect(() => {
    Promise.all([
      api.getStats(),
      api.getInteractions(),
      api.getSentiments(),
    ]).then(([s, i, sent]) => {
      setStats(s);
      setInteractions(i);
      setSentiments(sent);
    }).catch((err) => {
      console.error('Failed to load dashboard data:', err);
    });
  }, []);

  return (
    <div className="min-h-screen p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-2">Real-time AI agent consensus network</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs font-medium text-gray-700">{connected ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Total Agents</p>
            <p className="text-3xl font-bold">{stats.agentCount}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Active</p>
            <p className="text-3xl font-bold text-green-600">{stats.activeAgents}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Tweets</p>
            <p className="text-3xl font-bold">{stats.tweetCount}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Consensus Events</p>
            <p className="text-3xl font-bold text-black">{stats.consensusEvents}</p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Graph - Takes 2 columns */}
        <div className="lg:col-span-2 card min-h-[400px]">
          <h2 className="text-sm font-semibold text-black mb-4">Agent Network</h2>
          <NetworkGraph interactions={interactions} />
        </div>

        {/* Tweet Feed */}
        <div className="card max-h-[500px] overflow-hidden flex flex-col">
          <h2 className="text-sm font-semibold text-black mb-4">Live Tweet Feed</h2>
          <TweetFeed />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Price Correlation */}
        <div className="card">
          <h2 className="text-sm font-semibold text-black mb-4">Price vs Sentiment</h2>
          <PriceCorrelation />
        </div>

        {/* Sentiment Heatmap */}
        <div className="card">
          <h2 className="text-sm font-semibold text-black mb-4">Token Sentiment</h2>
          <SentimentHeatmap sentiments={sentiments} />
        </div>
      </div>
    </div>
  );
}
