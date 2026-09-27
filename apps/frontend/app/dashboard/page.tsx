'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Clock,
  CheckCircle2,
  TrendingUp,
  Activity,
  Users,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
} from 'lucide-react';
import { apiClient, paginatedApiClient } from '@/lib/api';
import { ConversationListItem, DashboardStatistics } from '@psychology/types';
import { StatusBadge, CategoryBadge } from '@/components/badges';

const UZ_MONTHS = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'Iyun',
  'Iyul',
  'Avgust',
  'Sentyabr',
  'Oktabr',
  'Noyabr',
  'Dekabr',
];

const WEEK_DAY_LABELS = ['Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan', 'Yak'];

function formatIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DashboardOverviewPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 1. Statistics query (with caching)
  const { data: stats } = useQuery({
    queryKey: ['statistics'],
    queryFn: () => apiClient<DashboardStatistics>('/api/statistics'),
  });

  const totalCount = stats?.totalConversations ?? 0;
  const answeredCount = stats?.answeredCount ?? 0;
  const unansweredCount = stats?.unansweredCount ?? 0;
  const studentCount = stats?.totalStudents ?? 0;
  const recentActivity = stats?.recentActivityCount ?? 0;
  const dutyRole = stats?.dutyRole || 'Psixolog';

  const answeredPct =
    totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  // 2. Dynamic Week Calculation
  const { weekDays, monthHeader, currentMonthIso } = useMemo(() => {
    const today = new Date();
    // Shift by weekOffset weeks
    const baseDate = new Date(today);
    baseDate.setDate(today.getDate() + weekOffset * 7);

    // Find Monday of the current week (Uzbek week starts Monday = 1)
    const dayOfWeek = baseDate.getDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() + diffToMonday);

    const days = [];
    const todayIso = formatIsoDate(today);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = formatIsoDate(d);
      days.push({
        label: WEEK_DAY_LABELS[i],
        dateNumber: d.getDate(),
        isoDate: iso,
        isToday: iso === todayIso,
      });
    }

    // Mid-week date determines month header
    const midWeekDate = new Date(monday);
    midWeekDate.setDate(monday.getDate() + 3);
    const monthName = UZ_MONTHS[midWeekDate.getMonth()];
    const year = midWeekDate.getFullYear();
    const currentMonthIso = `${year}-${String(midWeekDate.getMonth() + 1).padStart(2, '0')}`;

    return {
      weekDays: days,
      monthHeader: `${monthName} ${year}`,
      currentMonthIso,
    };
  }, [weekOffset]);

  // 3. Calendar active dates query for indicator dots
  const { data: activeDatesMap } = useQuery({
    queryKey: ['calendar-dates', currentMonthIso],
    queryFn: () =>
      apiClient<Record<string, number>>(
        `/api/conversations/calendar-dates?month=${currentMonthIso}`,
      ),
  });

  // 4. Filtered or recent conversations query
  const conversationQueryParams = useMemo(() => {
    const p = new URLSearchParams({
      limit: '5',
      sortBy: 'newest',
    });
    if (selectedDate) {
      p.set('date', selectedDate);
    }
    return p.toString();
  }, [selectedDate]);

  const { data: recentCases, isLoading: casesLoading } = useQuery({
    queryKey: ['conversations', { limit: 5, sortBy: 'newest', date: selectedDate }],
    queryFn: () =>
      paginatedApiClient<ConversationListItem>(
        `/api/conversations?${conversationQueryParams}`,
      ),
  });

  // 5. Category breakdown for dynamic Donut Chart
  const categoryBreakdown = stats?.categoryBreakdown || {};
  const urgentCount = categoryBreakdown['URGENT'] || 0;
  const academicCount = categoryBreakdown['ACADEMIC'] || 0;
  const socialCount = categoryBreakdown['SOCIAL'] || 0;
  const personalCount = categoryBreakdown['PERSONAL'] || 0;
  const generalCount = categoryBreakdown['GENERAL'] || 0;

  // Circumference of r=38 circle: 2 * PI * 38 ~= 238.76
  const CIRCUMFERENCE = 238.76;
  const donutSlices = useMemo(() => {
    if (totalCount === 0) return [];
    let currentOffset = 0;
    const slices = [
      { key: 'URGENT', label: 'Shoshilinch', count: urgentCount, color: '#DC2626' },
      { key: 'ACADEMIC', label: 'O‘qish', count: academicCount, color: '#1D4ED8' },
      { key: 'SOCIAL', label: 'Munosabatlar', count: socialCount, color: '#10B981' },
      { key: 'PERSONAL', label: 'Shaxsiy', count: personalCount, color: '#F59E0B' },
      { key: 'GENERAL', label: 'Umumiy', count: generalCount, color: '#64748B' },
    ];

    return slices.map((s) => {
      const fraction = s.count / totalCount;
      const strokeLength = fraction * CIRCUMFERENCE;
      const strokeDashoffset = -currentOffset;
      currentOffset += strokeLength;
      return {
        ...s,
        strokeDasharray: `${strokeLength} ${CIRCUMFERENCE}`,
        strokeDashoffset,
        pct: Math.round(fraction * 100),
      };
    });
  }, [totalCount, urgentCount, academicCount, socialCount, personalCount, generalCount]);

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
          {/* Card 1: Total Students (Real DB Data) */}
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
                  {studentCount}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              <Activity className="w-3.5 h-3.5 text-[#1D4ED8]" />
              <span>{totalCount} ta jami murojaat</span>
            </div>
          </Link>

          {/* Card 2: Answered / Orders (Real DB Data) */}
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
              <span>{answeredPct}% Samaradorlik</span>
            </div>
          </Link>

          {/* Card 3: Hero Electric Blue Card - Unanswered (Real DB Data) */}
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
              <span>{recentActivity} ta so‘nggi 24 soatda</span>
            </div>
          </Link>
        </div>

        {/* Right: Real Category Donut Chart from DB */}
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
                {/* Dynamic SVG slices */}
                {donutSlices.map((slice) => (
                  <circle
                    key={slice.key}
                    cx="50"
                    cy="50"
                    r="38"
                    stroke={slice.color}
                    strokeWidth="14"
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    fill="transparent"
                  />
                ))}
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

            {/* Donut Legend with real counts */}
            <div className="space-y-1 text-xs">
              {donutSlices.slice(0, 4).map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {item.label}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {item.count}
                  </span>
                </div>
              ))}
              {donutSlices.length === 0 && (
                <div className="text-xs text-slate-400">Murojaat yo‘q</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: Calendar Week Strip (Left) + Recent Cases Table (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: Week Calendar Selector */}
        <div className="bg-white dark:bg-[#111420] rounded-2xl p-6 border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              {monthHeader}
            </h2>
            <div className="flex items-center gap-1 text-slate-400">
              <button
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors"
                aria-label="Oldingi hafta"
                title="Oldingi hafta"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {weekOffset !== 0 && (
                <button
                  onClick={() => {
                    setWeekOffset(0);
                    setSelectedDate(null);
                  }}
                  className="px-2 py-0.5 text-[10px] font-bold text-[#1D4ED8] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-full transition-colors"
                  title="Joriy haftaga qaytish"
                >
                  Bugun
                </button>
              )}
              <button
                onClick={() => setWeekOffset((prev) => prev + 1)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors"
                aria-label="Keyingi hafta"
                title="Keyingi hafta"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Week Days Horizontal Strip */}
          <div className="grid grid-cols-7 gap-1 text-center pt-2">
            {weekDays.map((item) => {
              const isSelected = selectedDate === item.isoDate;
              const hasCases = Boolean(
                activeDatesMap && (activeDatesMap[item.isoDate] || 0) > 0,
              );
              const count = activeDatesMap?.[item.isoDate] || 0;

              return (
                <button
                  key={item.isoDate}
                  onClick={() => {
                    setSelectedDate((current) =>
                      current === item.isoDate ? null : item.isoDate,
                    );
                  }}
                  className="flex flex-col items-center gap-1.5 py-1 group focus:outline-none relative"
                  title={`${item.isoDate}: ${count} ta murojaat`}
                >
                  <span className="text-[11px] text-slate-400 font-medium">
                    {item.label}
                  </span>
                  <div
                    className={`w-9 h-9 rounded-full flex flex-col items-center justify-center text-xs font-bold transition-all relative ${
                      isSelected
                        ? 'bg-[#1D4ED8] dark:bg-blue-600 text-white shadow-md shadow-blue-500/40 scale-105'
                        : item.isToday
                          ? 'ring-2 ring-blue-500/40 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                          : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{item.dateNumber}</span>
                  </div>
                  {/* Active dot indicator if cases exist on this day */}
                  {hasCases && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected
                          ? 'bg-white'
                          : 'bg-blue-600 dark:bg-blue-400 animate-pulse'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Bugungi navbatchilik
              </span>
            </div>
            <span className="text-xs font-bold text-[#1D4ED8] dark:text-blue-400 truncate max-w-[180px]">
              {dutyRole}
            </span>
          </div>
        </div>

        {/* Right: Recent Conversations Feed (Filtered by Selected Date) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111420] rounded-2xl p-6 border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  {selectedDate
                    ? `Murojaatlar (${selectedDate})`
                    : 'So‘nggi murojaatlar'}
                </h2>
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full transition-colors"
                    title="Filtrni tozalash"
                  >
                    <span>Tozalash</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {selectedDate
                  ? `Tanlangan kunga oid murojaatlar ro‘yxati`
                  : 'Yangi kelib tushgan so‘rovlar'}
              </p>
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
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Murojaatlar yuklanmoqda…</span>
            </div>
          ) : !recentCases?.data?.length ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="font-semibold text-slate-600 dark:text-slate-400">
                {selectedDate
                  ? `${selectedDate} sanasida murojaatlar qayd etilmagan.`
                  : 'Hozircha yangi murojaatlar yo‘q.'}
              </p>
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-xs font-bold text-[#1D4ED8] dark:text-blue-400 hover:underline"
                >
                  Barcha yangi murojaatlarni ko‘rsatish
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentCases.data.slice(0, 5).map((c) => (
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
                        {c.student?.studentIdentifier
                          ? `O‘quvchi #${c.student.studentIdentifier}`
                          : 'O‘quvchi'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(c.createdAt).toLocaleDateString('uz-UZ', {
                          timeZone: 'Asia/Tashkent',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
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
