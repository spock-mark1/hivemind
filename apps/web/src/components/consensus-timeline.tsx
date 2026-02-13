'use client';

import type { ConsensusEvent } from '@selanet/shared';

interface Props {
  events: ConsensusEvent[];
}

export default function ConsensusTimeline({ events }: Props) {
  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'AGREEMENT':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-700',
          dot: 'bg-green-500'
        };
      case 'DISAGREEMENT':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          dot: 'bg-red-500'
        };
      case 'SHIFT':
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700',
          dot: 'bg-gray-500'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-600',
          dot: 'bg-gray-400'
        };
    }
  };

  if (events.length === 0) {
    return <p className="text-gray-500 text-sm text-center py-8">No consensus events yet</p>;
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

      <div className="space-y-6">
        {events.map((event) => {
          const style = getTypeStyle(event.type);
          return (
            <div key={event.id} className="relative pl-12">
              {/* Timeline dot */}
              <div className={`absolute left-3 top-3 h-2.5 w-2.5 rounded-full ${style.dot}`} />

              <div className={`${style.bg} border ${style.border} rounded-lg p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${style.text}`}>
                      {event.type}
                    </span>
                    <span className="text-sm font-bold">${event.token}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{event.summary}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
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
