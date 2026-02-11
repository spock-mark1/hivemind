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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [sentiments, setSentiments] = useState<any[]>([]);
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
    });
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Real-time AI agent consensus network</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-hive-bull' : 'bg-hive-bear'}`} />
          <span className="text-xs text-gray-400">{connected ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Agents</p>
            <p className="text-2xl font-bold mt-1">{stats.agentCount}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Active</p>
            <p className="text-2xl font-bold text-hive-bull mt-1">{stats.activeAgents}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Tweets</p>
            <p className="text-2xl font-bold mt-1">{stats.tweetCount}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Consensus Events</p>
            <p className="text-2xl font-bold text-hive-accent mt-1">{stats.consensusEvents}</p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Network Graph - Takes 2 columns */}
        <div className="lg:col-span-2 card min-h-[400px]">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Agent Network</h2>
          <NetworkGraph interactions={interactions} />
        </div>

        {/* Tweet Feed */}
        <div className="card max-h-[500px] overflow-hidden flex flex-col">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Live Tweet Feed</h2>
          <TweetFeed />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Price Correlation */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Price vs Sentiment</h2>
          <PriceCorrelation />
        </div>

        {/* Sentiment Heatmap */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Token Sentiment</h2>
          <SentimentHeatmap sentiments={sentiments} />
        </div>
      </div>
    </div>
  );
}
