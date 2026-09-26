'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, useReducedMotion } from 'motion/react';
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
import { apiClient, ApiError, paginatedApiClient } from '@/lib/api';
import {
  ConversationDetail,
  ConversationMessage,
  ConversationStatus,
  SenderType,
} from '@psychology/types';
import { StatusBadge, CategoryBadge } from '@/components/badges';

const messageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Xabaringizni yozing')
    .max(4000, 'Xabar 4000 belgidan oshmasin'),
});

type MessageFormData = z.infer<typeof messageSchema>;

export default function ConversationDetailPage() {
  const params = useParams();
  const [messagePage, setMessagePage] = useState(1);
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const queryClient = useQueryClient();
  const conversationId = params?.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [composerError, setComposerError] = useState<string | null>(null);

  // 1. Fetch Conversation Details
  const { data: conv, isLoading: convLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () =>
      apiClient<ConversationDetail>(`/api/conversations/${conversationId}`),
    enabled: Boolean(conversationId),
  });

  // 2. Fetch Messages
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', conversationId, messagePage],
    queryFn: () =>
      paginatedApiClient<ConversationMessage>(
        `/api/conversations/${conversationId}/messages?limit=20&page=${messagePage}`,
      ),
    enabled: Boolean(conversationId),
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth' });
  }, [messagesData?.data?.length, reduceMotion]);

  // 3. React Hook Form for Composer
  const {
    register,
    handleSubmit,
    reset,
    watch,
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
    onMutate: () => { setComposerError(null); },
    onSuccess: () => {
      reset();
      setMessagePage(1);
      setComposerError(null);
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
    onError: (err: unknown) => {
      setComposerError(
        err instanceof ApiError ? err.message : 'Javob yuborilmadi',
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
    onMutate: async (status: ConversationStatus) => {
      await queryClient.cancelQueries({ queryKey: ['conversation', conversationId] });
      const previousConversation = queryClient.getQueryData<ConversationDetail>([
        'conversation',
        conversationId,
      ]);
      queryClient.setQueryData<ConversationDetail>(
        ['conversation', conversationId],
        (current) => (current ? { ...current, status, updatedAt: new Date().toISOString() } : current),
      );
      return { previousConversation };
    },
    onError: (_err, _status, context) => {
      setComposerError("Holat o‘zgarmadi. Qayta urinib ko‘ring.");
      if (context?.previousConversation) {
        queryClient.setQueryData(['conversation', conversationId], context.previousConversation);
      }
    },
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
        <span>Murojaat yuklanmoqda…</span>
      </div>
    );
  }

  if (!conv) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-xs">
        <ShieldAlert className="w-8 h-8 text-state-error" />
        <p className="font-semibold text-text-primary">Murojaat topilmadi</p>
        <button
          onClick={() => router.push('/dashboard/inbox')}
          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-text-primary"
        >
          Murojaatlarga qaytish
        </button>
      </div>
    );
  }

  const isClosed = conv.status === ConversationStatus.CLOSED;
  const studentAnon = conv.student?.studentIdentifier
    ? `O‘quvchi #${conv.student.studentIdentifier}`
    : 'O‘quvchi';

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-[calc(100vh-7.5rem)] max-w-5xl mx-auto bg-white dark:bg-[#111420] rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs overflow-hidden"
    >
      {/* 1. Case Header */}
      <div className="p-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#111420] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
            aria-label="Orqaga"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-sm text-[#1D4ED8] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg">
                {conv.caseId}
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {studentAnon}
              </span>
              <CategoryBadge category={conv.category} />
              <StatusBadge status={conv.status} />
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Ochilgan {new Date(conv.createdAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Javob berilgan</span>
            </button>
          )}

          {!isClosed ? (
            <button
              onClick={() =>
                updateStatusMutation.mutate(ConversationStatus.CLOSED)
              }
              disabled={updateStatusMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Yopish</span>
            </button>
          ) : (
            <button
              onClick={() =>
                updateStatusMutation.mutate(ConversationStatus.ANSWERED)
              }
              disabled={updateStatusMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50"
            >
              <span>Qayta ochish</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Message History Timeline */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/60 dark:bg-[#0C0E17]">
        {messagesData && messagesData.meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 text-xs">
            <button
              className="px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40"
              disabled={!messagesData.meta.hasPreviousPage}
              onClick={() => setMessagePage(messagePage - 1)}
            >
              Yangiroq
            </button>
            <span className="text-slate-400">{messagePage} / {messagesData.meta.totalPages}</span>
            <button
              className="px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40"
              disabled={!messagesData.meta.hasNextPage}
              onClick={() => setMessagePage(messagePage + 1)}
            >
              Oldinroq
            </button>
          </div>
        )}
        {messagesData?.data.map((msg) => {
          const isStaff = msg.senderType === SenderType.STAFF;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-4 ${
                  isStaff
                    ? 'bg-[#2563EB] text-white rounded-br-xs shadow-md shadow-blue-600/25'
                    : 'bg-white dark:bg-[#161A29] text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-bl-xs shadow-xs'
                }`}
              >
                {/* Message Header */}
                <div
                  className={`flex items-center gap-2 mb-1.5 text-[11px] ${
                    isStaff ? 'text-white/80' : 'text-slate-400'
                  }`}
                >
                  <span className="font-bold">
                    {isStaff ? 'Xodim' : studentAnon}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent',
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
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111420] shrink-0">
        {isClosed ? (
          <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Murojaat yopilgan. Javob yozish uchun qayta oching.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSendMessage)} className="space-y-2">
            {composerError && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{composerError}</span>
              </div>
            )}

            <div className="relative">
              <textarea
                placeholder="Javobingizni yozing…"
                rows={3}
                aria-label="Javobingiz"
                disabled={sendMessageMutation.isPending}
                {...register('content')}
                className="w-full p-3.5 text-xs rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB] resize-none placeholder:text-slate-400 transition-all"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span
                className={`text-[11px] ${
                  contentValue.length > 4000
                    ? 'text-red-500 font-bold'
                    : 'text-slate-400'
                }`}
              >
                {contentValue.length} / 4000 belgi
              </span>

              <button
                type="submit"
                disabled={sendMessageMutation.isPending || !contentValue.trim() || contentValue.length > 4000}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendMessageMutation.isPending ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Yuborilmoqda…</span>
                  </>
                ) : (
                  <>
                    <span>Yuborish</span>
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
