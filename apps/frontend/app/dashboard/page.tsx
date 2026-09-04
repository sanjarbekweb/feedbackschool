'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Inbox,
  Clock,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingUp,
  Activity,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { DashboardStatistics, PaginatedResponse } from '@psychology/types';
import { StatusBadge, CategoryBadge } from '@/components/badges';

export default function DashboardOverviewPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['statistics'],
    queryFn: () => apiClient<DashboardStatistics>('/api/statistics'),
  });

  const { data: recentCases, isLoading: casesLoading } = useQuery({
    queryKey: ['conversations', { limit: 5, sortBy: 'newest' }],
    queryFn: () =>
      apiClient<PaginatedResponse<any>>('/api/conversations?limit=5&sortBy=newest'),
  });

  const cards = [
    {
      title: 'Total Cases',
      value: stats?.totalConversations ?? 0,
      icon: Inbox,
      href: '/dashboard/inbox',
      color: 'text-text-primary',
      bg: 'bg-white',
      border: 'border-border-default',
    },
    {
      title: 'Unanswered',
      value: stats?.unansweredCount ?? 0,
      icon: Clock,
      href: '/dashboard/unanswered',
      color: 'text-amber-700',
      bg: 'bg-amber-50/40',
      border: 'border-amber-200/80',
    },
    {
      title: 'Answered',
      value: stats?.answeredCount ?? 0,
      icon: CheckCircle2,
      href: '/dashboard/answered',
      color: 'text-emerald-700',
      bg: 'bg-emerald-50/40',
      border: 'border-emerald-200/80',
    },
    {
      title: 'Closed',
      value: stats?.closedCount ?? 0,
      icon: Lock,
      href: '/dashboard/inbox?status=CLOSED',
      color: 'text-slate-600',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-accent-primary-dark">
            Triage Overview
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Real-time status of student psychology cases and support inquiries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/unanswered"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-accent-primary hover:bg-accent-primary-dark text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Review Unanswered ({stats?.unansweredCount ?? 0})</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.15 }}
            >
              <Link
                href={card.href}
                className={`block p-5 rounded-xl border ${card.border} ${card.bg} shadow-xs hover:shadow-sm transition-all`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-muted">
                    {card.title}
                  </span>
                  <div className="p-2 rounded-lg bg-white/80 border border-border-default/40">
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className={`text-2xl font-bold ${card.color}`}>
                    {statsLoading ? '—' : card.value}
                  </span>
                  <span className="text-[11px] text-accent-primary font-medium flex items-center gap-1 hover:underline">
                    View list <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Performance & Activity Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-surface border border-border-default shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-accent-soft text-accent-primary-dark flex items-center justify-center border border-accent-secondary/30 shrink-0">
            <TrendingUp className="w-5 h-5 text-accent-primary" />
          </div>
          <div>
            <span className="text-xs text-text-muted block">Avg Turnaround Time</span>
            <span className="text-lg font-bold text-accent-primary-dark">
              {statsLoading ? '...' : `${stats?.averageResponseTimeMinutes || 35} minutes`}
            </span>
            <p className="text-[11px] text-text-muted">
              Estimated staff response turnaround for student inquiries
            </p>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-surface border border-border-default shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-accent-soft text-accent-primary-dark flex items-center justify-center border border-accent-secondary/30 shrink-0">
            <Activity className="w-5 h-5 text-accent-primary" />
          </div>
          <div>
            <span className="text-xs text-text-muted block">Active Cases (Last 24h)</span>
            <span className="text-lg font-bold text-accent-primary-dark">
              {statsLoading ? '...' : stats?.recentActivityCount ?? 0}
            </span>
            <p className="text-[11px] text-text-muted">
              Conversations updated or received today
            </p>
          </div>
        </div>
      </div>

      {/* Recent Cases Section */}
      <div className="bg-surface rounded-xl border border-border-default shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border-default flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text-primary">
              Recent Case Submissions
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-text-muted font-medium">
              Live updates
            </span>
          </div>
          <Link
            href="/dashboard/inbox"
            className="text-xs font-semibold text-accent-primary hover:text-accent-primary-dark flex items-center gap-1"
          >
            <span>All conversations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {casesLoading ? (
          <div className="p-12 flex justify-center items-center text-text-muted gap-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-accent-primary" />
            <span>Loading recent submissions...</span>
          </div>
        ) : recentCases?.data?.length === 0 ? (
          <div className="p-12 text-center text-text-muted text-xs">
            <p>No cases registered yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border-default/60">
            {recentCases?.data?.map((conv: any) => (
              <Link
                key={conv.id}
                href={`/dashboard/conversations/${conv.id}`}
                className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono font-bold text-xs text-accent-primary-dark">
                      {conv.caseId}
                    </span>
                    <span className="text-xs text-text-muted">
                      {conv.student?.studentIdentifier
                        ? `Student #${conv.student.studentIdentifier}`
                        : 'Student'}
                    </span>
                    <CategoryBadge category={conv.category} />
                  </div>
                  <div className="text-[11px] text-text-muted flex items-center gap-3">
                    <span>
                      Received {new Date(conv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on{' '}
                      {new Date(conv.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    <span>•</span>
                    <span>{conv._count?.messages || 1} message(s)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={conv.status} />
                  <ArrowRight className="w-4 h-4 text-text-muted" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
