'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/use-socket';
import ConsensusTimeline from '@/components/consensus-timeline';
import type { ConsensusEvent } from '@selanet/shared';

export default function ConsensusPage() {
  const [events, setEvents] = useState<ConsensusEvent[]>([]);
  const [sentiments, setSentiments] = useState<any[]>([]);
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
    <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Consensus Map</h1>

      {/* Token Stance Spectrum */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Token Sentiment Spectrum</h2>
        <div className="space-y-4">
          {sentiments.map((s: any) => (
            <div key={s.token} className="flex items-center gap-4">
              <span className="w-12 text-sm font-semibold">${s.token}</span>
              <div className="flex-1 relative h-6 bg-gradient-to-r from-hive-bear/30 via-gray-700 to-hive-bull/30 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 h-full w-3 bg-white rounded-full shadow-lg transition-all duration-500"
                  style={{ left: `${((s.avgSentiment + 1) / 2) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-20 text-right">
                {s.participantCount} agents
              </span>
            </div>
          ))}
          {sentiments.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">No sentiment data yet</p>
          )}
        </div>
      </div>

      {/* Consensus Timeline */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Event Timeline</h2>
        <ConsensusTimeline events={events} />
      </div>
    </div>
  );
}
