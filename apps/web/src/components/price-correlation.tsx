'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '@/lib/api';

interface ChartPoint {
  time: string;
  price: number | null;
  sentiment: number | null;
}

export default function PriceCorrelation() {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [selectedToken, setSelectedToken] = useState('BTC');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getPriceHistory(selectedToken, 24),
      api.getSentimentHistory(selectedToken, 24),
    ])
      .then(([priceHistory, sentimentHistory]) => {
        // Build time→sentiment lookup from actual Opinion data
        const sentimentByHour = new Map<string, number>();
        for (const s of sentimentHistory) {
          const key = new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          sentimentByHour.set(key, s.avgSentiment);
        }

        // Build time→price lookup
        const priceByHour = new Map<string, number>();
        for (const p of priceHistory) {
          const key = new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          priceByHour.set(key, p.price);
        }

        // Merge into a unified timeline
        const allTimes = new Set([...sentimentByHour.keys(), ...priceByHour.keys()]);
        const sorted = Array.from(allTimes).sort((a, b) => {
          // Sort by time string (HH:MM)
          return a.localeCompare(b);
        });

        const merged: ChartPoint[] = sorted.map((time) => ({
          time,
          price: priceByHour.get(time) ?? null,
          sentiment: sentimentByHour.has(time)
            ? Number(sentimentByHour.get(time)!.toFixed(3))
            : null,
        }));

        setData(merged);
      })
      .catch((err) => {
        console.error('Failed to load correlation data:', err);
        setData([]);
      })
      .finally(() => setLoading(false));
  }, [selectedToken]);

  const tokens = ['BTC', 'ETH', 'SOL', 'AVAX', 'ARB'];

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {tokens.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedToken(t)}
            className={`px-2 py-1 text-xs rounded ${
              selectedToken === t
                ? 'bg-hive-accent text-black font-semibold'
                : 'bg-hive-bg border border-hive-border text-gray-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[250px] text-gray-500 text-sm">
          Loading...
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-[250px] text-gray-500 text-sm">
          No data available for {selectedToken}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="price" stroke="#6b7280" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="sentiment" orientation="right" stroke="#6b7280" tick={{ fontSize: 10 }} domain={[-1, 1]} />
            <Tooltip
              contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: '8px' }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Legend />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="price"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              connectNulls
              name="Price ($)"
            />
            <Line
              yAxisId="sentiment"
              type="monotone"
              dataKey="sentiment"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3, fill: '#6366f1' }}
              connectNulls
              name="Agent Sentiment"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
