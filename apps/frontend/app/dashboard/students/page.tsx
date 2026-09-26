'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Users,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { paginatedApiClient } from '@/lib/api';
import { StudentDirectoryItem } from '@psychology/types';

export default function StudentsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['students', page],
    queryFn: () =>
      paginatedApiClient<StudentDirectoryItem>(
        `/api/users/students?page=${page}&limit=10`,
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
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          O‘quvchilar
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Sizga murojaat qilgan o‘quvchilar ro‘yxati
        </p>
      </div>

      {/* Privacy Notice Card */}
      <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/50 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#1D4ED8] dark:text-blue-400 mt-0.5 shrink-0" />
        <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <span className="font-bold text-[#1D4ED8] dark:text-blue-400 block mb-0.5">
            Shaxsiy ma’lumotlar himoyasi
          </span>
          O‘quvchilar shaxsi sir saqlanadi. Ular maxsus identifikator bilan ko‘rsatiladi.
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-[#111420] rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1D4ED8] dark:text-blue-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              O‘quvchilar ({data?.meta?.total ?? 0})
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-16 flex flex-col justify-center items-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
            <span>O‘quvchilar yuklanmoqda…</span>
          </div>
        ) : data?.data?.length === 0 ? (
          <div className="p-16 text-center space-y-2 text-xs text-slate-400">
            <p className="font-bold text-slate-800 dark:text-slate-200">Hali o‘quvchi yo‘q</p>
            <p>O‘quvchi sizga murojaat yuborgach, shu yerda ko‘rinadi.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data?.data.map((student) => (
              <div
                key={student.id}
                className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/60 flex items-center justify-center font-mono font-bold text-xs text-[#1D4ED8] dark:text-blue-400">
                    #{student.studentIdentifier?.slice(-4) || '????'}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      O‘quvchi #{student.studentIdentifier || 'S-????'}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>
                        Qo‘shilgan{' '}
                        {new Date(student.createdAt).toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>{student._count?.conversations || 0} ta murojaat</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Footer */}
        {data && data.meta.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Sahifa {data.meta.page} / {data.meta.totalPages} ({data.meta.total} ta o‘quvchi)
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
