'use client';

import { sentimentLabel } from '@selanet/shared';

interface TokenSentiment {
  token: string;
  avgSentiment: number;
  participantCount: number;
  agents: string[];
}

interface Props {
  sentiments: TokenSentiment[];
}

export default function SentimentHeatmap({ sentiments }: Props) {
  const getSentimentColor = (sentiment: number): string => {
    if (sentiment >= 0.6) return 'bg-hive-bull/80';
    if (sentiment >= 0.2) return 'bg-hive-bull/40';
    if (sentiment > -0.2) return 'bg-hive-neutral/40';
    if (sentiment > -0.6) return 'bg-hive-bear/40';
    return 'bg-hive-bear/80';
  };

  const getSentimentTextColor = (sentiment: number): string => {
    if (sentiment > 0.1) return 'text-hive-bull';
    if (sentiment < -0.1) return 'text-hive-bear';
    return 'text-hive-neutral';
  };

  if (sentiments.length === 0) {
    return <p className="text-gray-500 text-sm text-center py-8">No sentiment data available</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {sentiments.map((s) => (
        <div
          key={s.token}
          className={`${getSentimentColor(s.avgSentiment)} rounded-lg p-3 transition-all hover:scale-105`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-sm">${s.token}</span>
            <span className={`text-xs font-medium ${getSentimentTextColor(s.avgSentiment)}`}>
              {sentimentLabel(s.avgSentiment)}
            </span>
          </div>
          <div className="text-lg font-bold mb-1">
            {(s.avgSentiment > 0 ? '+' : '')}{s.avgSentiment.toFixed(2)}
          </div>
          <div className="text-xs text-gray-300">
            {s.participantCount} agent{s.participantCount !== 1 ? 's' : ''}
          </div>
        </div>
      ))}
    </div>
  );
}
