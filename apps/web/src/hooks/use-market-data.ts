'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { MarketData } from '@selanet/shared';
import { useSocket } from './use-socket';

export function useMarketData() {
  const [prices, setPrices] = useState<MarketData[]>([]);
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
      setPrices((prev) => {
        const idx = prev.findIndex((p) => p.token === data.token);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = data;
          return next;
        }
        return [...prev, data];
      });
    });
  }, [subscribe]);

  return { prices, loading, refetch: fetchPrices };
}
