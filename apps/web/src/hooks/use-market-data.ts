'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useSocket } from './use-socket';

type MarketPrice = Awaited<ReturnType<typeof api.getPrices>>[number];

export function useMarketData() {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const { subscribe } = useSocket();

  const fetchPrices = useCallback(async () => {
    try {
      const data = await api.getPrices();
      setPrices(data);
    } catch (err) {
      console.error('Failed to fetch prices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60_000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  useEffect(() => {
    return subscribe('market:update', (data) => {
      const entry = data as unknown as MarketPrice;
      setPrices((prev) => {
        const idx = prev.findIndex((p) => p.token === entry.token);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = entry;
          return next;
        }
        return [...prev, entry];
      });
    });
  }, [subscribe]);

  return { prices, loading, refetch: fetchPrices };
}
