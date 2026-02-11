'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_URL } from '@selanet/shared';
import type { WSEvents } from '@selanet/shared';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const pendingRef = useRef<{ event: string; handler: (...args: any[]) => void }[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(WS_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      setConnected(true);
      // Flush any subscriptions that were queued before connection
      for (const { event, handler } of pendingRef.current) {
        socket.on(event, handler);
      }
      pendingRef.current = [];
    });
    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      pendingRef.current = [];
    };
  }, []);

  const subscribe = useCallback(
    <K extends keyof WSEvents>(event: K, handler: (data: WSEvents[K]) => void) => {
      const socket = socketRef.current;
      if (socket?.connected) {
        socket.on(event as string, handler);
      } else {
        // Queue subscription for when socket connects
        pendingRef.current.push({ event: event as string, handler });
      }
      return () => {
        socketRef.current?.off(event as string, handler);
        pendingRef.current = pendingRef.current.filter(
          (p) => !(p.event === event && p.handler === handler)
        );
      };
    },
    []
  );

  return { connected, subscribe, socket: socketRef };
}
