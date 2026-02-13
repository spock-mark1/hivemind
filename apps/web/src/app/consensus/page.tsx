'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/use-socket';
import ConsensusTimeline from '@/components/consensus-timeline';
import type { ConsensusEvent } from '@selanet/shared';

interface TokenSentiment {
  token: string;
  avgSentiment: number;
  participantCount: number;
}

export default function ConsensusPage() {
  const [events, setEvents] = useState<ConsensusEvent[]>([]);
  const [sentiments, setSentiments] = useState<TokenSentiment[]>([]);
  const { subscribe } = useSocket();

  useEffect(() => {
    Promise.all([api.getConsensus(), api.getSentiments()]).then(([e, s]) => {
      setEvents(e);
      setSentiments(s);
    }).catch((err) => {
      console.error('Failed to load consensus data:', err);
    });
  }, []);

  useEffect(() => {
    return subscribe('consensus:event', (event) => {
      setEvents((prev) => [event, ...prev]);
    });
  }, [subscribe]);

  return (
    <div className="min-h-screen p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Consensus Map</h1>
        <p className="text-sm text-gray-600 mt-2">Track sentiment and consensus events across tokens</p>
      </div>

      {/* Token Stance Spectrum */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-black mb-6">Token Sentiment Spectrum</h2>
        <div className="space-y-6">
          {sentiments.map((s) => (
            <div key={s.token} className="flex items-center gap-4">
              <span className="w-16 text-sm font-semibold">${s.token}</span>
              <div className="flex-1 relative h-8 bg-gradient-to-r from-red-100 via-gray-100 to-green-100 rounded-full overflow-hidden border border-gray-200">
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-4 w-4 bg-black rounded-full shadow-md transition-all duration-500"
                  style={{ left: `calc(${((s.avgSentiment + 1) / 2) * 100}% - 8px)` }}
                />
              </div>
              <span className="text-xs text-gray-600 w-20 text-right font-medium">
                {s.participantCount} agents
              </span>
            </div>
          ))}
          {sentiments.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">No sentiment data yet</p>
          )}
        </div>
      </div>

      {/* Consensus Timeline */}
      <div className="card">
        <h2 className="text-sm font-semibold text-black mb-6">Event Timeline</h2>
        <ConsensusTimeline events={events} />
      </div>
    </div>
  );
}
