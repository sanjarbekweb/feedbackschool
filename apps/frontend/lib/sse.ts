'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimeEvent } from '@psychology/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export function useRealtimeEvents() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      setStatus('connecting');
      eventSource = new EventSource(`${API_BASE}/api/events`, {
        withCredentials: true,
      });

      eventSource.onopen = () => {
        setStatus('connected');
      };

      eventSource.onmessage = (event) => {
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

      eventSource.onerror = () => {
        setStatus('disconnected');
        if (eventSource) {
          eventSource.close();
        }
        // Auto reconnect after 5s
        reconnectTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [queryClient]);

  return { status };
}
