'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_URL } from '@selanet/shared';
import type { WSEvents } from '@selanet/shared';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(WS_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const subscribe = useCallback(
    <K extends keyof WSEvents>(event: K, handler: (data: WSEvents[K]) => void) => {
      socketRef.current?.on(event as string, handler);
      return () => {
        socketRef.current?.off(event as string, handler);
      };
    },
    []
  );

  return { connected, subscribe, socket: socketRef };
}
