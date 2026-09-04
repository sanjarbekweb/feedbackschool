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
import { apiClient } from '@/lib/api';
import { PaginatedResponse } from '@psychology/types';

export default function StudentsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['students', page],
    queryFn: () =>
      apiClient<PaginatedResponse<any>>(`/api/users/students?page=${page}&limit=10`),
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
          Student Directory
        </h1>
        <p className="text-xs text-text-muted mt-1">
          Confidential student profiles and case engagement history
        </p>
      </div>

      {/* Privacy Notice Card */}
      <div className="p-4 rounded-xl bg-accent-soft/60 border border-accent-secondary/30 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-accent-primary mt-0.5 shrink-0" />
        <div className="text-xs text-text-primary leading-relaxed">
          <span className="font-semibold text-accent-primary-dark block mb-0.5">
            Student Privacy & Anonymization Invariant
          </span>
          To protect student emotional safety and maintain confidentiality, individual Telegram handles and phone numbers are excluded from this directory. Students are referenced by their persistent anonymized identification codes.
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-surface rounded-xl border border-border-default shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border-default flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-accent-primary" />
            <span className="text-xs font-semibold text-text-primary">
              Enrolled Students ({data?.meta?.total ?? 0})
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-16 flex flex-col justify-center items-center gap-2 text-xs text-text-muted">
            <Loader2 className="w-5 h-5 animate-spin text-accent-primary" />
            <span>Loading student directory...</span>
          </div>
        ) : data?.data?.length === 0 ? (
          <div className="p-16 text-center space-y-2 text-xs text-text-muted">
            <p className="font-medium text-text-primary">No students registered yet</p>
            <p>Students appear automatically once they start a conversation with the student bot.</p>
          </div>
        ) : (
          <div className="divide-y divide-border-default/60">
            {data?.data?.map((student: any) => (
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
                      Student #{student.studentIdentifier || 'S-????'}
                    </span>
                    <span className="text-[11px] text-text-muted flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>
                        Registered{' '}
                        {new Date(student.createdAt).toLocaleDateString([], {
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
                    <span>{student._count?.conversations || 0} Case(s)</span>
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
              Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} students)
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
