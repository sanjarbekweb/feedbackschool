'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Settings,
  ShieldCheck,
  User,
  Key,
  LogOut,
  Lock,
  FileText,
  Loader2,
} from 'lucide-react';
import { apiClient } from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () =>
      apiClient<{ id: string; email: string; role: string; telegramId?: string }>(
        '/api/auth/me',
      ),
  });

  const handleLogout = async () => {
    try {
      await apiClient('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-accent-primary-dark">
          Settings & Privacy Controls
        </h1>
        <p className="text-xs text-text-muted mt-1">
          Staff profile credentials, security protocols, and session management
        </p>
      </div>

      {/* Staff Profile Card */}
      <div className="bg-surface rounded-xl border border-border-default shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border-default flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-accent-primary" />
            <h2 className="text-sm font-semibold text-text-primary">Staff Account</h2>
          </div>
          <span className="text-[11px] font-bold text-accent-primary uppercase tracking-wider bg-accent-soft px-2.5 py-0.5 rounded-full border border-accent-secondary/40">
            {user?.role || 'STAFF'}
          </span>
        </div>

        <div className="p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Loader2 className="w-4 h-4 animate-spin text-accent-primary" />
              <span>Loading staff profile...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-text-muted block mb-1">Email Address</span>
                <span className="font-medium text-text-primary block">
                  {user?.email || 'staff@school.edu'}
                </span>
              </div>
              <div>
                <span className="text-text-muted block mb-1">Assigned Role</span>
                <span className="font-medium text-text-primary block">
                  {user?.role || 'STAFF'}
                </span>
              </div>
              <div>
                <span className="text-text-muted block mb-1">Internal User ID</span>
                <span className="font-mono text-[11px] text-text-muted block">
                  {user?.id || '—'}
                </span>
              </div>
              <div>
                <span className="text-text-muted block mb-1">Authentication Session</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Active (HttpOnly Secure Cookie)</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Privacy Invariants Summary */}
      <div className="bg-surface rounded-xl border border-border-default shadow-xs p-6 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-accent-primary" />
          <h2 className="text-sm font-semibold text-text-primary">
            Security & Privacy Invariants
          </h2>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          The school psychology support system operates under strict data minimization rules:
        </p>
        <ul className="space-y-2 text-xs text-text-muted list-disc list-inside">
          <li>
            <strong className="text-text-primary">Zero Content Leakage:</strong> Message content is never logged in audit trails, console outputs, or external Telegram notifications.
          </li>
          <li>
            <strong className="text-text-primary">Server-Side Authorization:</strong> Role-based access and student case ownership checks are strictly enforced on every backend request.
          </li>
          <li>
            <strong className="text-text-primary">Anonymized Identifiers:</strong> Personal student names and phone numbers are isolated from shared interfaces; cases use collision-resistant identifiers (e.g. #A81F42).
          </li>
        </ul>
      </div>

      {/* Session Termination Card */}
      <div className="bg-surface rounded-xl border border-red-200 shadow-xs p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-semibold text-state-error">Sign Out of Session</h3>
          <p className="text-[11px] text-text-muted mt-0.5">
            Terminate your active staff credentials and return to the login screen.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </motion.div>
  );
}
