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

    const connect = () => {
      setStatus('connecting');
      eventSource = new EventSource(`${API_BASE}/api/events`, {
        withCredentials: true,
      });

      eventSource.onopen = () => {
        reconnectAttempt = 0;
        setStatus('connected');
      };

      const handleEvent = (event: MessageEvent<string>) => {
        try {
          const data: RealtimeEvent = JSON.parse(event.data);
          
          if (
            data.type === 'CONVERSATION_CREATED' ||
            data.type === 'CONVERSATION_UPDATED'
          ) {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.invalidateQueries({ queryKey: ['statistics'] });
            if (data.payload?.conversationId) {
              queryClient.invalidateQueries({
                queryKey: ['conversation', data.payload.conversationId],
              });
            }
          } else if (data.type === 'MESSAGE_CREATED') {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.invalidateQueries({ queryKey: ['statistics'] });
            if (data.payload?.conversationId) {
              queryClient.invalidateQueries({
                queryKey: ['conversation', data.payload.conversationId],
              });
              queryClient.invalidateQueries({
                queryKey: ['messages', data.payload.conversationId],
              });
            }
          }
        } catch {
          // Ignore parse errors on heartbeat or comment events
        }
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
