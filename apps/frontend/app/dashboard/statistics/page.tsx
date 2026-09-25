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
  const inProgressPct = Math.round(((stats?.inProgressCount || 0) / total) * 100);
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
          Statistika
        </h1>
        <p className="text-xs text-text-muted mt-1">
          Murojaatlar soni va javob vaqti
        </p>
      </div>

      {isLoading ? (
        <div className="p-16 flex flex-col justify-center items-center gap-2 text-xs text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin text-accent-primary" />
          <span>Hisoblanmoqda…</span>
        </div>
      ) : (
        <>
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-surface border border-border-default shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Jami murojaatlar</span>
                <Inbox className="w-4 h-4 text-accent-primary" />
              </div>
              <span className="text-2xl font-bold text-text-primary mt-2 block">
                {stats?.totalConversations ?? 0}
              </span>
              <span className="text-[11px] text-text-muted mt-1 block">
                Barcha vaqt davomida
              </span>
            </div>

            <div className="p-5 rounded-xl bg-surface border border-amber-200/80 bg-amber-50/30 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-800 font-medium">Javob kutilmoqda</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-2xl font-bold text-amber-800 mt-2 block">
                {stats?.unansweredCount ?? 0}
              </span>
              <span className="text-[11px] text-amber-700/80 mt-1 block">
                {unansweredPct}% jami murojaatlardan
              </span>
            </div>

            <div className="p-5 rounded-xl bg-surface border border-emerald-200/80 bg-emerald-50/30 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-800 font-medium">Javob berilgan</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-bold text-emerald-800 mt-2 block">
                {stats?.answeredCount ?? 0}
              </span>
              <span className="text-[11px] text-emerald-700/80 mt-1 block">
                {answeredPct}% javob berilgan
              </span>
            </div>

            <div className="p-5 rounded-xl bg-surface border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Yopilgan</span>
                <Lock className="w-4 h-4 text-slate-500" />
              </div>
              <span className="text-2xl font-bold text-slate-700 mt-2 block">
                {stats?.closedCount ?? 0}
              </span>
              <span className="text-[11px] text-text-muted mt-1 block">
                {closedPct}% yopilgan
              </span>
            </div>
          </div>

          {/* Turnaround & SLA Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Distribution Visual Bar */}
            <div className="p-6 rounded-xl bg-surface border border-border-default shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary">
                  Holatlar bo‘yicha
                </h2>
                <BarChart3 className="w-4 h-4 text-accent-primary" />
              </div>

              {/* Stacked Progress Bar */}
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${inProgressPct}%` }}
                  className="bg-accent-primary h-full transition-all"
                  title={`Ko‘rib chiqilmoqda: ${inProgressPct}%`}
                />
                <div
                  style={{ width: `${unansweredPct}%` }}
                  className="bg-amber-400 h-full transition-all"
                  title={`Javob kutilmoqda: ${unansweredPct}%`}
                />
                <div
                  style={{ width: `${answeredPct}%` }}
                  className="bg-emerald-500 h-full transition-all"
                  title={`Javob berilgan: ${answeredPct}%`}
                />
                <div
                  style={{ width: `${closedPct}%` }}
                  className="bg-slate-400 h-full transition-all"
                  title={`Yopilgan: ${closedPct}%`}
                />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs pt-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-text-muted">Javob kutilmoqda ({unansweredPct}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-primary shrink-0" />
                  <span className="text-text-muted">Ko‘rib chiqilmoqda ({inProgressPct}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-text-muted">Javob berilgan ({answeredPct}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                  <span className="text-text-muted">Yopilgan ({closedPct}%)</span>
                </div>
              </div>
            </div>

            {/* Performance Benchmarks */}
            <div className="p-6 rounded-xl bg-surface border border-border-default shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary">
                  Javob vaqti va faollik
                </h2>
                <TrendingUp className="w-4 h-4 text-accent-primary" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border-default/60">
                  <span className="text-xs text-text-muted">O‘rtacha javob vaqti</span>
                  <span className="text-xs font-bold text-accent-primary-dark">
                    {stats?.averageResponseTimeMinutes == null
                      ? 'Hali ma’lumot yo‘q'
                      : `${stats.averageResponseTimeMinutes} daqiqa`}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-border-default/60">
                  <span className="text-xs text-text-muted">So‘nggi 24 soatda</span>
                  <span className="text-xs font-bold text-text-primary">
                    {stats?.recentActivityCount || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Ko‘rib chiqilmoqda</span>
                  <span className="text-xs font-bold text-accent-primary-dark">
                    {stats?.inProgressCount ?? 0} ta murojaat
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
