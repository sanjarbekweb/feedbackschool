'use client';

import React, { useState } from 'react';
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
import { apiClient } from '@/lib/api';
import { ConversationCategory, ConversationStatus, PaginatedResponse } from '@psychology/types';
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
  const [status, setStatus] = useState<string>(initialStatus || 'ALL');
  const [category, setCategory] = useState<string>('ALL');
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
  if (search.trim()) {
    queryParams.set('search', search.trim());
  }

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', queryParams.toString()],
    queryFn: () =>
      apiClient<PaginatedResponse<any>>(`/api/conversations?${queryParams.toString()}`),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-accent-primary-dark">{title}</h1>
        <p className="text-xs text-text-muted mt-1">{description}</p>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-surface rounded-xl border border-border-default shadow-xs p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search by Case ID */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Case ID (e.g. #A81F42)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border-default bg-surface focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            {/* Category Filter */}
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by category"
              className="px-2.5 py-1.5 rounded-lg border border-border-default bg-surface text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
            >
              <option value="ALL">All Categories</option>
              <option value={ConversationCategory.GENERAL}>General Inquiry</option>
              <option value={ConversationCategory.ACADEMIC}>Academic Stress</option>
              <option value={ConversationCategory.PERSONAL}>Personal / Emotional</option>
              <option value={ConversationCategory.SOCIAL}>Social / Relationships</option>
              <option value={ConversationCategory.URGENT}>Urgent Support</option>
            </select>

            {/* Status Filter (if not locked by initialStatus) */}
            {!initialStatus && (
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by status"
                className="px-2.5 py-1.5 rounded-lg border border-border-default bg-surface text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
              >
                <option value="ALL">All Statuses</option>
                <option value={ConversationStatus.UNANSWERED}>⏳ Unanswered</option>
                <option value={ConversationStatus.ANSWERED}>✅ Answered</option>
                <option value={ConversationStatus.CLOSED}>🔒 Closed</option>
              </select>
            )}

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort conversations"
              className="px-2.5 py-1.5 rounded-lg border border-border-default bg-surface text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Conversations List Table/Cards */}
      <div className="bg-surface rounded-xl border border-border-default shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex flex-col justify-center items-center gap-2 text-xs text-text-muted">
            <Loader2 className="w-5 h-5 animate-spin text-accent-primary" />
            <span>Loading cases...</span>
          </div>
        ) : data?.data?.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-text-muted mx-auto flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-text-primary">No cases found</p>
            <p className="text-[11px] text-text-muted">
              Try adjusting your search criteria or category filter.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-default/60">
            {data?.data?.map((conv: any) => {
              const isUnanswered = conv.status === ConversationStatus.UNANSWERED;
              return (
                <Link
                  key={conv.id}
                  href={`/dashboard/conversations/${conv.id}`}
                  className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isUnanswered ? 'bg-amber-50/20 hover:bg-amber-50/40' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-bold text-xs text-accent-primary-dark">
                        {conv.caseId}
                      </span>
                      <span className="text-xs font-medium text-text-primary">
                        {conv.student?.studentIdentifier
                          ? `Student #${conv.student.studentIdentifier}`
                          : 'Student'}
                      </span>
                      <CategoryBadge category={conv.category} />
                      {isUnanswered && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 uppercase tracking-wider bg-amber-100/70 px-2 py-0.5 rounded-full">
                          Action required
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-text-muted flex items-center gap-3">
                      <span>
                        Created{' '}
                        {new Date(conv.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span>•</span>
                      <span>{conv._count?.messages || 1} message(s)</span>
                      {conv.lastMessageAt && (
                        <>
                          <span>•</span>
                          <span>
                            Last activity{' '}
                            {new Date(conv.lastMessageAt).toLocaleTimeString([], {
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
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {data && data.meta.totalPages > 1 && (
          <div className="p-4 border-t border-border-default flex items-center justify-between text-xs text-text-muted">
            <span>
              Showing {(data.meta.page - 1) * data.meta.limit + 1} to{' '}
              {Math.min(data.meta.page * data.meta.limit, data.meta.total)} of{' '}
              {data.meta.total} cases
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={!data.meta.hasPreviousPage}
                onClick={() => setPage(page - 1)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md border border-border-default bg-surface hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <span className="font-semibold text-text-primary px-1">
                {data.meta.page} / {data.meta.totalPages}
              </span>
              <button
                disabled={!data.meta.hasNextPage}
                onClick={() => setPage(page + 1)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md border border-border-default bg-surface hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
