'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  BarChart3,
  Clock,
  CheckCircle2,
  Lock,
  Activity,
  TrendingUp,
  Inbox,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { DashboardStatistics } from '@psychology/types';

export default function StatisticsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['statistics'],
    queryFn: () => apiClient<DashboardStatistics>('/api/statistics'),
  });

  const total = stats?.totalConversations || 1;
  const unansweredPct = Math.round(((stats?.unansweredCount || 0) / total) * 100);
  const answeredPct = Math.round(((stats?.answeredCount || 0) / total) * 100);
  const closedPct = Math.round(((stats?.closedCount || 0) / total) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-accent-primary-dark">
          Analytics & Response Statistics
        </h1>
        <p className="text-xs text-text-muted mt-1">
          Support volume, response benchmarks, and triage metrics
        </p>
      </div>

      {isLoading ? (
        <div className="p-16 flex flex-col justify-center items-center gap-2 text-xs text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin text-accent-primary" />
          <span>Calculating metrics...</span>
        </div>
      ) : (
        <>
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-surface border border-border-default shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Total Submissions</span>
                <Inbox className="w-4 h-4 text-accent-primary" />
              </div>
              <span className="text-2xl font-bold text-text-primary mt-2 block">
                {stats?.totalConversations ?? 0}
              </span>
              <span className="text-[11px] text-text-muted mt-1 block">
                Lifetime cases opened
              </span>
            </div>

            <div className="p-5 rounded-xl bg-surface border border-amber-200/80 bg-amber-50/30 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-800 font-medium">Unanswered</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-2xl font-bold text-amber-800 mt-2 block">
                {stats?.unansweredCount ?? 0}
              </span>
              <span className="text-[11px] text-amber-700/80 mt-1 block">
                {unansweredPct}% of active volume
              </span>
            </div>

            <div className="p-5 rounded-xl bg-surface border border-emerald-200/80 bg-emerald-50/30 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-800 font-medium">Answered</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-bold text-emerald-800 mt-2 block">
                {stats?.answeredCount ?? 0}
              </span>
              <span className="text-[11px] text-emerald-700/80 mt-1 block">
                {answeredPct}% resolved or triaged
              </span>
            </div>

            <div className="p-5 rounded-xl bg-surface border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Closed</span>
                <Lock className="w-4 h-4 text-slate-500" />
              </div>
              <span className="text-2xl font-bold text-slate-700 mt-2 block">
                {stats?.closedCount ?? 0}
              </span>
              <span className="text-[11px] text-text-muted mt-1 block">
                {closedPct}% fully archived
              </span>
            </div>
          </div>

          {/* Turnaround & SLA Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Distribution Visual Bar */}
            <div className="p-6 rounded-xl bg-surface border border-border-default shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary">
                  Status Distribution
                </h2>
                <BarChart3 className="w-4 h-4 text-accent-primary" />
              </div>

              {/* Stacked Progress Bar */}
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${unansweredPct}%` }}
                  className="bg-amber-400 h-full transition-all"
                  title={`Unanswered: ${unansweredPct}%`}
                />
                <div
                  style={{ width: `${answeredPct}%` }}
                  className="bg-emerald-500 h-full transition-all"
                  title={`Answered: ${answeredPct}%`}
                />
                <div
                  style={{ width: `${closedPct}%` }}
                  className="bg-slate-400 h-full transition-all"
                  title={`Closed: ${closedPct}%`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs pt-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-text-muted">Unanswered ({unansweredPct}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-text-muted">Answered ({answeredPct}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                  <span className="text-text-muted">Closed ({closedPct}%)</span>
                </div>
              </div>
            </div>

            {/* Performance Benchmarks */}
            <div className="p-6 rounded-xl bg-surface border border-border-default shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary">
                  Turnaround & Activity
                </h2>
                <TrendingUp className="w-4 h-4 text-accent-primary" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border-default/60">
                  <span className="text-xs text-text-muted">Average Staff Turnaround</span>
                  <span className="text-xs font-bold text-accent-primary-dark">
                    {stats?.averageResponseTimeMinutes || 35} minutes
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-border-default/60">
                  <span className="text-xs text-text-muted">Active Cases (Last 24h)</span>
                  <span className="text-xs font-bold text-text-primary">
                    {stats?.recentActivityCount || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">SLA Target</span>
                  <span className="text-xs font-bold text-emerald-600">
                    Within 2 business hours
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
