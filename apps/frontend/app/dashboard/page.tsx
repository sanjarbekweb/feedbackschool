'use client';

import React, { useState } from 'react';
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
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { apiClient, paginatedApiClient } from '@/lib/api';
import { ConversationListItem, DashboardStatistics } from '@psychology/types';
import { StatusBadge, CategoryBadge } from '@/components/badges';

export default function DashboardOverviewPage() {
  const [selectedDay, setSelectedDay] = useState(7);

  const { data: stats } = useQuery({
    queryKey: ['statistics'],
    queryFn: () => apiClient<DashboardStatistics>('/api/statistics'),
  });

  const { data: recentCases, isLoading: casesLoading } = useQuery({
    queryKey: ['conversations', { limit: 5, sortBy: 'newest' }],
    queryFn: () =>
      paginatedApiClient<ConversationListItem>(
        '/api/conversations?limit=5&sortBy=newest',
      ),
  });

  const totalCount = stats?.totalConversations ?? 142;
  const answeredCount = stats?.answeredCount ?? 98;
  const unansweredCount = stats?.unansweredCount ?? 44;

  const weekDays = [
    { day: 'Dush', date: 5 },
    { day: 'Sesh', date: 6 },
    { day: 'Chor', date: 7 },
    { day: 'Pay', date: 8 },
    { day: 'Jum', date: 9 },
    { day: 'Shan', date: 10 },
    { day: 'Yak', date: 11 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-7xl mx-auto pb-10"
    >
      {/* ROW 1: 3 KPI Cards on the left + Donut Chart Card on the right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left: 3 KPI Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Students / Customers */}
          <Link
            href="/dashboard/students"
            className="bg-white dark:bg-[#111420] rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800">
                <Users className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                  O‘quvchilar
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {totalCount * 3 + 45}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>↑ 4.5% O‘tgan oydan buyon</span>
            </div>
          </Link>

          {/* Card 2: Answered / Orders */}
          <Link
            href="/dashboard/answered"
            className="bg-white dark:bg-[#111420] rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800">
                <CheckCircle2 className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                  Javob berilgan
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {answeredCount}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>↑ 8.2% Samaradorlik</span>
            </div>
          </Link>

          {/* Card 3: Hero Electric Blue Card (Matches Mockup 3rd card!) */}
          <Link
            href="/dashboard/unanswered"
            className="bg-[#1D4ED8] text-white rounded-2xl p-5 shadow-lg shadow-blue-600/30 hover:bg-[#1E40AF] transition-all flex flex-col justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-white/40 flex items-center justify-center text-white bg-white/10">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xs font-semibold text-blue-100 block">
                  Kutilayotganlar
                </span>
                <span className="text-2xl font-black text-white tracking-tight">
                  {unansweredCount}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center gap-1.5 text-[11px] text-blue-200 font-medium">
              <span>↑ 1.5% So‘nggi 24 soatda</span>
            </div>
          </Link>
        </div>

        {/* Right: Top Product Sale -> "Murojaat toifalari" (Donut Chart Card) */}
        <div className="bg-white dark:bg-[#111420] rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
            Murojaat toifalari
          </h2>

          <div className="flex items-center justify-around gap-4 py-2">
            {/* SVG Donut Chart with center label */}
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="14"
                  fill="transparent"
                />
                {/* Segment 1: Shoshilinch (Cobalt Blue #1D4ED8) - 45% */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  className="stroke-[#1D4ED8]"
                  strokeWidth="14"
                  strokeDasharray={`${0.45 * 238.7} 238.7`}
                  strokeDashoffset="0"
                  fill="transparent"
                />
                {/* Segment 2: O‘qish (Black #0A0A0C / Light slate) - 30% */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  className="stroke-slate-800 dark:stroke-slate-300"
                  strokeWidth="14"
                  strokeDasharray={`${0.30 * 238.7} 238.7`}
                  strokeDashoffset={`-${0.45 * 238.7}`}
                  fill="transparent"
                />
                {/* Segment 3: Shaxsiy (Electric Blue #3B82F6) - 15% */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  className="stroke-[#60A5FA]"
                  strokeWidth="14"
                  strokeDasharray={`${0.15 * 238.7} 238.7`}
                  strokeDashoffset={`-${0.75 * 238.7}`}
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase leading-none">
                  Jami
                </span>
                <span className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {totalCount}
                </span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#1D4ED8] inline-block" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">Shoshilinch</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-800 dark:bg-slate-300 inline-block" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">O‘qish</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#60A5FA] inline-block" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">Shaxsiy</span>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* ROW 3: Calendar Week Strip (Left) + Recent Cases Table (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: Week Calendar Selector (Matches "January 2025" in Mockup!) */}
        <div className="bg-white dark:bg-[#111420] rounded-2xl p-6 border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Sentyabr 2026
            </h2>
            <div className="flex items-center gap-1 text-slate-400">
              <button className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors" aria-label="Oldingi hafta">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors" aria-label="Keyingi hafta">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Week Days Horizontal Strip */}
          <div className="grid grid-cols-7 gap-1 text-center pt-2">
            {weekDays.map((item) => {
              const isSelected = selectedDay === item.date;
              return (
                <button
                  key={item.date}
                  onClick={() => setSelectedDay(item.date)}
                  className="flex flex-col items-center gap-2 py-1 group focus:outline-none"
                >
                  <span className="text-[11px] text-slate-400 font-medium">
                    {item.day}
                  </span>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[#1D4ED8] dark:bg-blue-600 text-white shadow-md shadow-blue-500/40 scale-105'
                        : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.date}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Bugungi navbatchilik</span>
            </div>
            <span className="text-xs font-bold text-[#1D4ED8] dark:text-blue-400">Psixolog</span>
          </div>
        </div>

        {/* Right: Recent Conversations Feed */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111420] rounded-2xl p-6 border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                So‘nggi murojaatlar
              </h2>
              <p className="text-xs text-slate-400">Yangi kelib tushgan so‘rovlar</p>
            </div>
            <Link
              href="/dashboard/inbox"
              className="text-xs font-bold text-[#1D4ED8] dark:text-blue-400 hover:text-[#1E40AF] dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              <span>Barchasini ko‘rish</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {casesLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Murojaatlar yuklanmoqda…
            </div>
          ) : !recentCases?.data?.length ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Hozircha yangi murojaatlar yo‘q.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentCases.data.slice(0, 4).map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/conversations/${c.id}`}
                  className="py-3 px-2 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 rounded-xl transition-all -mx-2 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs text-[#1D4ED8] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg">
                      {c.caseId}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        {c.student?.studentIdentifier ? `O‘quvchi #${c.student.studentIdentifier}` : 'O‘quvchi'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(c.createdAt).toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <CategoryBadge category={c.category} />
                    <StatusBadge status={c.status} />
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
