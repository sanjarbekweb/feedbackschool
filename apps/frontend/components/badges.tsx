import React from 'react';
import { ConversationCategory, ConversationStatus } from '@psychology/types';
import { Clock, CheckCircle2, Lock, AlertCircle, MessageSquare } from 'lucide-react';

export function StatusBadge({ status }: { status: ConversationStatus | string }) {
  if (status === ConversationStatus.UNANSWERED) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        <span>Javob kutilmoqda</span>
      </span>
    );
  }

  if (status === ConversationStatus.ANSWERED) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>Javob berilgan</span>
      </span>
    );
  }

  if (status === ConversationStatus.CLOSED) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
        <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        <span>Yopilgan</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
      <MessageSquare className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
      <span>{status === ConversationStatus.IN_PROGRESS ? 'Ko‘rib chiqilmoqda' : 'Noma’lum'}</span>
    </span>
  );
}

const CATEGORY_NAMES: Record<string, string> = {
  GENERAL: 'Umumiy savol',
  ACADEMIC: 'O‘qish',
  PERSONAL: 'Shaxsiy masala',
  SOCIAL: 'Munosabatlar',
  URGENT: 'Shoshilinch yordam',
};

export function CategoryBadge({ category }: { category: ConversationCategory | string }) {
  const isUrgent = category === ConversationCategory.URGENT;
  const label = CATEGORY_NAMES[category] || category;

  if (isUrgent) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60">
        <AlertCircle className="w-3 h-3 text-red-500 dark:text-red-400" />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-[#1D4ED8] dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
      {label}
    </span>
  );
}
