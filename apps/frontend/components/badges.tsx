import React from 'react';
import { ConversationCategory, ConversationStatus } from '@psychology/types';
import { Clock, CheckCircle2, Lock, AlertCircle, MessageSquare } from 'lucide-react';

export function StatusBadge({ status }: { status: ConversationStatus | string }) {
  if (status === ConversationStatus.UNANSWERED) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        <span>Unanswered</span>
      </span>
    );
  }

  if (status === ConversationStatus.ANSWERED) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>Answered</span>
      </span>
    );
  }

  if (status === ConversationStatus.CLOSED) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
        <Lock className="w-3.5 h-3.5 text-slate-500" />
        <span>Closed</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
      <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
      <span>{status}</span>
    </span>
  );
}

const CATEGORY_NAMES: Record<string, string> = {
  GENERAL: 'General Inquiry',
  ACADEMIC: 'Academic Stress',
  PERSONAL: 'Personal / Emotional',
  SOCIAL: 'Social / Relationships',
  URGENT: 'Urgent Support',
};

export function CategoryBadge({ category }: { category: ConversationCategory | string }) {
  const isUrgent = category === ConversationCategory.URGENT;
  const label = CATEGORY_NAMES[category] || category;

  if (isUrgent) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
        <AlertCircle className="w-3 h-3 text-red-500" />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-accent-soft text-accent-primary-dark border border-accent-secondary/30">
      {label}
    </span>
  );
}
