'use client';

import type { ConsensusEvent } from '@selanet/shared';

interface Props {
  events: ConsensusEvent[];
}

export default function ConsensusTimeline({ events }: Props) {
  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'AGREEMENT':
        return { bg: 'bg-hive-bull/20', border: 'border-hive-bull', text: 'text-hive-bull', icon: '✓' };
      case 'DISAGREEMENT':
        return { bg: 'bg-hive-bear/20', border: 'border-hive-bear', text: 'text-hive-bear', icon: '⚡' };
      case 'SHIFT':
        return { bg: 'bg-hive-accent/20', border: 'border-hive-accent', text: 'text-hive-accent', icon: '↻' };
      default:
        return { bg: 'bg-gray-700', border: 'border-gray-600', text: 'text-gray-400', icon: '•' };
    }
  };

  if (events.length === 0) {
    return <p className="text-gray-500 text-sm text-center py-8">No consensus events yet</p>;
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-hive-border" />

      <div className="space-y-4">
        {events.map((event) => {
          const style = getTypeStyle(event.type);
          return (
            <div key={event.id} className="relative pl-10">
              {/* Timeline dot */}
              <div className={`absolute left-2.5 top-2 h-3 w-3 rounded-full ${style.bg} border ${style.border}`} />

              <div className={`${style.bg} border ${style.border} rounded-lg p-3`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${style.text}`}>
                      {style.icon} {event.type}
                    </span>
                    <span className="text-sm font-bold">${event.token}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-300">{event.summary}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>Avg Sentiment: {event.avgSentiment.toFixed(2)}</span>
                  <span>{event.participantCount} agents</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
