'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimeEvent } from '@psychology/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

const EVENT_TYPES: RealtimeEvent['type'][] = [
  'CONVERSATION_CREATED',
  'CONVERSATION_UPDATED',
  'MESSAGE_CREATED',
  'STATS_UPDATED',
];

export function useRealtimeEvents(enabled = true) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    if (!enabled) {
      setStatus('disconnected');
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
    let reconnectAttempt = 0;
    let disposed = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      setStatus('connecting');
      eventSource = new EventSource(`${API_BASE}/api/events`, {
        withCredentials: true,
      });

      eventSource.onopen = () => {
        reconnectAttempt = 0;
        setStatus('connected');
        void queryClient.invalidateQueries();
      };

      const handleEvent = () => {
        if (refreshTimer) return;
        refreshTimer = setTimeout(() => {
          refreshTimer = undefined;
          for (const key of ['conversations', 'statistics', 'conversation', 'messages', 'students']) {
            void queryClient.invalidateQueries({ queryKey: [key] });
          }
        }, 300);
      };

      EVENT_TYPES.forEach((eventType) => {
        eventSource?.addEventListener(eventType, handleEvent as EventListener);
      });

      eventSource.addEventListener('heartbeat', () => {
        setStatus('connected');
      });

      eventSource.onerror = () => {
        setStatus('disconnected');
        if (eventSource) {
          eventSource.close();
        }
        if (!disposed) {
          const delay = Math.min(1000 * 2 ** reconnectAttempt, 30_000);
          reconnectAttempt += 1;
          reconnectTimeout = setTimeout(connect, delay);
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [enabled, queryClient]);

  return { status };
}
