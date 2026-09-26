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
  Zap,
  Loader2,
  Calendar,
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
      className="space-y-6 max-w-7xl mx-auto pb-10"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Statistika va tahlil
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Murojaatlar ko‘rsatkichlari, javob berish tezligi va holat taqsimoti
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Barcha davr
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="p-20 flex flex-col justify-center items-center gap-3 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-[#111420] rounded-2xl border border-slate-200/70 dark:border-slate-800">
          <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
          <span className="font-medium">Ko‘rsatkichlar hisoblanmoqda…</span>
        </div>
      ) : (
        <>
          {/* Top Metric Cards (Matches Design Mockup 3+1 Layout) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Jami murojaatlar */}
            <div className="bg-white dark:bg-[#111420] rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800">
                  <Inbox className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                    Jami murojaatlar
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {stats?.totalConversations ?? 0}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <Activity className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
                <span>Barcha vaqt davomida qayd etilgan</span>
              </div>
            </div>

            {/* Card 2: Javob berilgan */}
            <div className="bg-white dark:bg-[#111420] rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800">
                  <CheckCircle2 className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                    Javob berilgan
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {stats?.answeredCount ?? 0}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{answeredPct}% hal qilingan murojaatlar</span>
              </div>
            </div>

            {/* Card 3: Hero Electric Blue Card - Javob kutilmoqda */}
            <div className="bg-[#1D4ED8] dark:bg-gradient-to-br dark:from-blue-600 dark:to-blue-800 text-white rounded-2xl p-5 shadow-lg shadow-blue-600/30 flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-white/40 flex items-center justify-center text-white bg-white/10">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-blue-100 block">
                    Javob kutilmoqda
                  </span>
                  <span className="text-2xl font-black text-white tracking-tight">
                    {stats?.unansweredCount ?? 0}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/15 flex items-center gap-1.5 text-[11px] text-blue-200 font-medium">
                <span>{unansweredPct}% diqqat talab holatlar</span>
              </div>
            </div>

            {/* Card 4: Yopilgan */}
            <div className="bg-white dark:bg-[#111420] rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800">
                  <Lock className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                    Yopilgan suhbatlar
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {stats?.closedCount ?? 0}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{closedPct}% arxivga olingan</span>
              </div>
            </div>
          </div>

          {/* Middle Row: Progress Breakdown & Speed/SLA Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Breakdown with custom modern progress bars */}
            <div className="bg-white dark:bg-[#111420] rounded-2xl p-6 border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Holatlar bo‘yicha taqsimot
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Murojaatlarning jarayon bosqichlari ulushi
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-[#2563EB] dark:text-blue-400">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>

              {/* Stacked Progress Bar */}
              <div className="space-y-2">
                <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${inProgressPct}%` }}
                    className="bg-[#2563EB] h-full transition-all"
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
              </div>

              {/* Progress Detail Cards */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Kutilmoqda</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{unansweredPct}%</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#2563EB] shrink-0" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Jarayonda</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{inProgressPct}%</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Javob berilgan</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{answeredPct}%</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Yopilgan</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{closedPct}%</span>
                </div>
              </div>
            </div>

            {/* Turnaround & SLA Insights */}
            <div className="bg-white dark:bg-[#111420] rounded-2xl p-6 border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Javob tezligi va faollik
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    O‘quvchilarga xizmat ko‘rsatish sifati ko‘rsatkichlari
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-[#2563EB] dark:text-blue-400">
                  <Zap className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-blue-900 dark:text-blue-200 block">
                      O‘rtacha javob berish vaqti
                    </span>
                    <span className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
                      Murojaat kelgandan javob berilguncha
                    </span>
                  </div>
                  <span className="text-base font-black text-[#1D4ED8] dark:text-blue-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 shadow-xs">
                    {stats?.averageResponseTimeMinutes == null
                      ? 'Ma’lumot yo‘q'
                      : `${stats.averageResponseTimeMinutes} daqiqa`}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      So‘nggi 24 soatdagi faollik
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Yangi murojaatlar va javob xabarlari
                    </span>
                  </div>
                  <span className="text-sm font-black text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                    {stats?.recentActivityCount || 0} ta
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      Hozir ko‘rib chiqilmoqda
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Xodimlar tomonidan olingan suhbatlar
                    </span>
                  </div>
                  <span className="text-sm font-black text-[#2563EB] dark:text-blue-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                    {stats?.inProgressCount ?? 0} ta
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
