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
        <h1 className="text-xl font-bold text-accent-primary-dark">
          O‘quvchilar
        </h1>
        <p className="text-xs text-text-muted mt-1">
          Sizga murojaat qilgan o‘quvchilar
        </p>
      </div>

      {/* Privacy Notice Card */}
      <div className="p-4 rounded-xl bg-accent-soft/60 border border-accent-secondary/30 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-accent-primary mt-0.5 shrink-0" />
        <div className="text-xs text-text-primary leading-relaxed">
          <span className="font-semibold text-accent-primary-dark block mb-0.5">
            Shaxsiy ma’lumotlar himoyasi
          </span>
          O‘quvchilar kod bilan ko‘rsatiladi. Telefon raqamlari va Telegram nomlari ko‘rinmaydi.
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-surface rounded-xl border border-border-default shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border-default flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-accent-primary" />
            <span className="text-xs font-semibold text-text-primary">
              O‘quvchilar ({data?.meta?.total ?? 0})
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-16 flex flex-col justify-center items-center gap-2 text-xs text-text-muted">
            <Loader2 className="w-5 h-5 animate-spin text-accent-primary" />
            <span>O‘quvchilar yuklanmoqda…</span>
          </div>
        ) : data?.data?.length === 0 ? (
          <div className="p-16 text-center space-y-2 text-xs text-text-muted">
            <p className="font-medium text-text-primary">Hali o‘quvchi yo‘q</p>
            <p>O‘quvchi sizga murojaat yuborgach, shu yerda ko‘rinadi.</p>
          </div>
        ) : (
          <div className="divide-y divide-border-default/60">
            {data?.data.map((student) => (
              <div
                key={student.id}
                className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 border border-border-default flex items-center justify-center font-mono font-bold text-xs text-accent-primary-dark">
                    #{student.studentIdentifier || 'S-????'}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-text-primary block">
                      O‘quvchi #{student.studentIdentifier || 'S-????'}
                    </span>
                    <span className="text-[11px] text-text-muted flex items-center gap-1.5 mt-0.5">
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
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                    <span>{student._count?.conversations || 0} ta murojaat</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Footer */}
        {data && data.meta.totalPages > 1 && (
          <div className="p-4 border-t border-border-default flex items-center justify-between text-xs text-text-muted">
            <span>
              Sahifa {data.meta.page} / {data.meta.totalPages} ({data.meta.total} ta o‘quvchi)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={!data.meta.hasPreviousPage}
                onClick={() => setPage(page - 1)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md border border-border-default bg-surface hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Oldingi</span>
              </button>
              <button
                disabled={!data.meta.hasNextPage}
                onClick={() => setPage(page + 1)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md border border-border-default bg-surface hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
