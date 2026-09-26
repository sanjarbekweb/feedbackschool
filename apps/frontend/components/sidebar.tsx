'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  Inbox,
  Clock,
  CheckCircle2,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Radio,
  X,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ConnectionStatus } from '@/lib/sse';
import { useQueryClient } from '@tanstack/react-query';

interface SidebarProps {
  connectionStatus: ConnectionStatus;
  onCloseMobile?: () => void;
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Murojaatlar', href: '/dashboard/inbox', icon: Inbox },
  { label: 'Kutilayotganlar', href: '/dashboard/unanswered', icon: Clock },
  { label: 'Javob berilgan', href: '/dashboard/answered', icon: CheckCircle2 },
  { label: 'O‘quvchilar', href: '/dashboard/students', icon: Users },
  { label: 'Statistika', href: '/dashboard/statistics', icon: BarChart3 },
  { label: 'Sozlamalar', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar({ connectionStatus, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      await apiClient('/api/auth/logout', { method: 'POST' });
    } catch {
      // Proceed with redirect regardless of network error
    } finally {
      queryClient.clear();
      router.replace('/login');
    }
  };

  return (
    <aside className="w-64 h-full bg-white dark:bg-[#0A0A0C] text-slate-800 dark:text-white flex flex-col justify-between select-none border-r border-slate-200/80 dark:border-[#171821] transition-colors duration-150">
      {/* Brand Header */}
      <div>
        <div className="h-20 flex items-center px-6 justify-between border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#2563EB] flex items-center justify-center font-black text-white text-xs shadow-md shadow-blue-500/40">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-xl text-slate-900 dark:text-white tracking-widest">
              LOGO
            </span>
          </div>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white transition-colors"
              aria-label="Menyuni yopish"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5 mt-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`relative flex items-center gap-3.5 px-4 py-2.5 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-pill"
                    className="absolute inset-0 bg-[#2563EB] rounded-full shadow-md shadow-blue-500/30"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon
                  className={`w-4 h-4 relative z-10 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                  }`}
                />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Status & Logout */}
      <div className="p-5 border-t border-slate-100 dark:border-white/5 space-y-4">
        {/* Realtime Connection Indicator */}
        <div className="flex items-center justify-between px-3 py-2 rounded-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Radio
              className={`w-3.5 h-3.5 ${
                connectionStatus === 'connected'
                  ? 'text-emerald-500 dark:text-emerald-400 animate-pulse'
                  : connectionStatus === 'connecting'
                  ? 'text-amber-500 dark:text-amber-400 animate-spin'
                  : 'text-red-500 dark:text-red-400'
              }`}
            />
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
              {connectionStatus === 'connected'
                ? 'Onlayn tizim'
                : connectionStatus === 'connecting'
                ? 'Ulanmoqda…'
                : 'Oflayn'}
            </span>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-emerald-500 dark:bg-emerald-400 shadow-xs shadow-emerald-400/50'
                : connectionStatus === 'connecting'
                ? 'bg-amber-500 dark:bg-amber-400'
                : 'bg-red-500 dark:bg-red-400'
            }`}
          />
        </div>

        {/* Sign Out Action Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-md shadow-blue-500/25 transition-all uppercase tracking-wider active:scale-95"
        >
          <LogOut className="w-4 h-4" />
          <span>CHIQISH</span>
        </button>
      </div>
    </aside>
  );
}
