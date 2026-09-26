'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquare,
  Loader2,
  Inbox,
} from 'lucide-react';
import { paginatedApiClient } from '@/lib/api';
import {
  ConversationCategory,
  ConversationListItem,
  ConversationStatus,
} from '@psychology/types';
import { StatusBadge, CategoryBadge } from '@/components/badges';

interface ConversationListProps {
  initialStatus?: ConversationStatus;
  title: string;
  description: string;
}

export function ConversationList({
  initialStatus,
  title,
  description,
}: ConversationListProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [querySearch, setQuerySearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQuerySearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const [status, setStatus] = useState<ConversationStatus | 'ALL'>(
    initialStatus || 'ALL',
  );
  const [category, setCategory] = useState<ConversationCategory | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Build query params
  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('limit', '10');
  queryParams.set('sortBy', sortBy);

  if (status !== 'ALL') {
    queryParams.set('status', status);
  }
  if (category !== 'ALL') {
    queryParams.set('category', category);
  }
  if (querySearch.trim()) {
    queryParams.set('search', querySearch.trim());
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conversations', queryParams.toString()],
    queryFn: () =>
      paginatedApiClient<ConversationListItem>(
        `/api/conversations?${queryParams.toString()}`,
      ),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-[#111420] rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search by Case ID */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              aria-label="Murojaat raqamini qidirish"
              placeholder="Murojaat raqamini qidirish (#A81F42)…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB] transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            {/* Category Filter */}
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as ConversationCategory | 'ALL');
                setPage(1);
              }}
              aria-label="Mavzu bo‘yicha saralash"
              className="px-3.5 py-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25"
            >
              <option value="ALL">Barcha mavzular</option>
              <option value={ConversationCategory.GENERAL}>Umumiy savol</option>
              <option value={ConversationCategory.ACADEMIC}>O‘qish</option>
              <option value={ConversationCategory.PERSONAL}>Shaxsiy masala</option>
              <option value={ConversationCategory.SOCIAL}>Munosabatlar</option>
              <option value={ConversationCategory.URGENT}>Shoshilinch yordam</option>
            </select>

            {/* Status Filter */}
            {!initialStatus && (
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as ConversationStatus | 'ALL');
                  setPage(1);
                }}
                aria-label="Holat bo‘yicha saralash"
                className="px-3.5 py-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25"
              >
                <option value="ALL">Barcha holatlar</option>
                <option value={ConversationStatus.UNANSWERED}>⏳ Javob kutilmoqda</option>
                <option value={ConversationStatus.IN_PROGRESS}>💬 Ko‘rib chiqilmoqda</option>
                <option value={ConversationStatus.ANSWERED}>✅ Javob berilgan</option>
                <option value={ConversationStatus.CLOSED}>🔒 Yopilgan</option>
              </select>
            )}

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'newest' | 'oldest')
              }
              aria-label="Tartiblash"
              className="px-3.5 py-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25"
            >
              <option value="newest">Avval yangilari</option>
              <option value="oldest">Avval eskilari</option>
            </select>
          </div>
        </div>
      </div>

      {/* Conversations List Table/Cards */}
      <div className="bg-white dark:bg-[#111420] rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex flex-col justify-center items-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
            <span>Murojaatlar yuklanmoqda…</span>
          </div>
        ) : isError ? (
          <div className="p-12 text-center space-y-2" role="alert">
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">
              Murojaatlar yuklanmadi
            </p>
            <p className="text-[11px] text-slate-400">
              Internetni tekshirib, qayta urinib ko‘ring.
            </p>
          </div>
        ) : data?.data.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Murojaat topilmadi</p>
            <p className="text-[11px] text-slate-400">
              Qidiruv yoki filtrni o‘zgartiring.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data?.data.map((conv) => {
              const isUnanswered = conv.status === ConversationStatus.UNANSWERED;
              return (
                <Link
                  key={conv.id}
                  href={`/dashboard/conversations/${conv.id}`}
                  className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                    isUnanswered
                      ? 'bg-blue-50/20 dark:bg-blue-950/20 hover:bg-blue-50/50 dark:hover:bg-blue-950/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-bold text-xs text-[#1D4ED8] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg">
                        {conv.caseId}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {conv.student?.studentIdentifier
                          ? `O‘quvchi #${conv.student.studentIdentifier}`
                          : 'O‘quvchi'}
                      </span>
                      <CategoryBadge category={conv.category} />
                      {isUnanswered && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider bg-blue-100/70 dark:bg-blue-900/50 px-2.5 py-0.5 rounded-full">
                          Javob kutilmoqda
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      <span>
                        Ochilgan{' '}
                        {new Date(conv.createdAt).toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span>•</span>
                      <span>{conv._count?.messages || 1} ta xabar</span>
                      {conv.lastMessageAt && (
                        <>
                          <span>•</span>
                          <span>
                            So‘nggi xabar{' '}
                            {new Date(conv.lastMessageAt).toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <StatusBadge status={conv.status} />
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {data && data.meta.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Ko‘rsatilmoqda {(data.meta.page - 1) * data.meta.limit + 1}–{' '}
              {Math.min(data.meta.page * data.meta.limit, data.meta.total)} /{' '}
              {data.meta.total} ta murojaat
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={!data.meta.hasPreviousPage}
                onClick={() => setPage(page - 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 dark:text-slate-200"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Oldingi</span>
              </button>
              <span className="font-bold text-slate-900 dark:text-white px-1">
                {data.meta.page} / {data.meta.totalPages}
              </span>
              <button
                disabled={!data.meta.hasNextPage}
                onClick={() => setPage(page + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 dark:text-slate-200"
              >
                <span>Keyingi</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
