'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  Lock,
  Clock,
  Loader2,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import {
  ConversationStatus,
  SenderType,
  PaginatedResponse,
} from '@psychology/types';
import { StatusBadge, CategoryBadge } from '@/components/badges';

const messageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(4000, 'Message cannot exceed 4000 characters'),
});

type MessageFormData = z.infer<typeof messageSchema>;

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const conversationId = params?.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [composerError, setComposerError] = useState<string | null>(null);

  // 1. Fetch Conversation Details
  const { data: conv, isLoading: convLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => apiClient<any>(`/api/conversations/${conversationId}`),
    enabled: Boolean(conversationId),
  });

  // 2. Fetch Messages
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () =>
      apiClient<PaginatedResponse<any>>(
        `/api/conversations/${conversationId}/messages?limit=100`,
      ),
    enabled: Boolean(conversationId),
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.data?.length]);

  // 3. React Hook Form for Composer
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: '' },
  });

  const contentValue = watch('content') || '';

  // 4. Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: MessageFormData) =>
      apiClient(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      reset();
      setComposerError(null);
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
    onError: (err: any) => {
      setComposerError(
        err instanceof ApiError ? err.message : 'Failed to send response',
      );
    },
  });

  // 5. Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: (status: ConversationStatus) =>
      apiClient(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
  });

  const onSendMessage = (data: MessageFormData) => {
    sendMessageMutation.mutate(data);
  };

  if (convLoading || messagesLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-xs text-text-muted">
        <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
        <span>Loading case details...</span>
      </div>
    );
  }

  if (!conv) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-xs">
        <ShieldAlert className="w-8 h-8 text-state-error" />
        <p className="font-semibold text-text-primary">Case Not Found</p>
        <button
          onClick={() => router.push('/dashboard/inbox')}
          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-text-primary"
        >
          Return to Inbox
        </button>
      </div>
    );
  }

  const isClosed = conv.status === ConversationStatus.CLOSED;
  const studentAnon = conv.student?.studentIdentifier
    ? `Student #${conv.student.studentIdentifier}`
    : 'Student';

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col h-[calc(100vh-7.5rem)] max-w-5xl mx-auto bg-surface rounded-xl border border-border-default shadow-xs overflow-hidden"
    >
      {/* 1. Case Header */}
      <div className="p-4 sm:px-6 border-b border-border-default flex flex-wrap items-center justify-between gap-4 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-sm text-accent-primary-dark">
                {conv.caseId}
              </span>
              <span className="text-xs font-semibold text-text-primary">
                {studentAnon}
              </span>
              <CategoryBadge category={conv.category} />
              <StatusBadge status={conv.status} />
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">
              Opened on {new Date(conv.createdAt).toLocaleString('en-US')}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {!isClosed && conv.status !== ConversationStatus.ANSWERED && (
            <button
              onClick={() =>
                updateStatusMutation.mutate(ConversationStatus.ANSWERED)
              }
              disabled={updateStatusMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default bg-surface hover:bg-slate-50 text-xs font-medium text-text-primary transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mark Answered</span>
            </button>
          )}

          {!isClosed ? (
            <button
              onClick={() =>
                updateStatusMutation.mutate(ConversationStatus.CLOSED)
              }
              disabled={updateStatusMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default bg-surface hover:bg-slate-50 text-xs font-medium text-text-muted hover:text-slate-700 transition-colors disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Close Case</span>
            </button>
          ) : (
            <button
              onClick={() =>
                updateStatusMutation.mutate(ConversationStatus.ANSWERED)
              }
              disabled={updateStatusMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default bg-surface hover:bg-slate-50 text-xs font-medium text-text-muted transition-colors disabled:opacity-50"
            >
              <span>Reopen Case</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Message History Timeline */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
        {messagesData?.data?.map((msg: any) => {
          const isStaff = msg.senderType === SenderType.STAFF;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-4 shadow-xs ${
                  isStaff
                    ? 'bg-accent-primary text-white rounded-br-xs'
                    : 'bg-surface text-text-primary border border-border-default rounded-bl-xs'
                }`}
              >
                {/* Message Header */}
                <div
                  className={`flex items-center gap-2 mb-1.5 text-[11px] ${
                    isStaff ? 'text-white/80' : 'text-text-muted'
                  }`}
                >
                  <span className="font-semibold">
                    {isStaff ? 'Psychology Staff' : studentAnon}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Message Body */}
                <p className="text-xs leading-relaxed whitespace-pre-wrap select-text">
                  {msg.content}
                </p>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Fixed Response Composer at Bottom */}
      <div className="p-4 border-t border-border-default bg-white shrink-0">
        {isClosed ? (
          <div className="p-3.5 rounded-lg bg-slate-100/80 text-center text-xs text-text-muted flex items-center justify-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" />
            <span>This conversation is closed. Reopen the case to submit responses.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSendMessage)} className="space-y-2">
            {composerError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-state-error/20 flex items-center gap-2 text-xs text-state-error">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{composerError}</span>
              </div>
            )}

            <div className="relative">
              <textarea
                placeholder="Write a calm, confidential response to the student..."
                rows={3}
                {...register('content')}
                className="w-full p-3 text-xs rounded-lg border border-border-default bg-surface focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary resize-none placeholder:text-text-muted/70"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span
                className={`text-[11px] ${
                  contentValue.length > 4000
                    ? 'text-state-error font-semibold'
                    : 'text-text-muted'
                }`}
              >
                {contentValue.length} / 4000 characters
              </span>

              <button
                type="submit"
                disabled={isSubmitting || !contentValue.trim() || contentValue.length > 4000}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary hover:bg-accent-primary-dark text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send Response</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </motion.div>
  );
}
