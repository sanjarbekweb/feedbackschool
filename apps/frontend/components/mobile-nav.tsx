'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  Inbox,
  Clock,
  Users,
  BarChart3,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { DashboardStatistics } from '@psychology/types';

interface NavTab {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  showBadge?: boolean;
}

const TABS: NavTab[] = [
  { label: 'Asosiy', href: '/dashboard', icon: LayoutDashboard, exact: true },
  { label: 'Murojaatlar', href: '/dashboard/inbox', icon: Inbox },
  { label: 'Kutilmoqda', href: '/dashboard/unanswered', icon: Clock, showBadge: true },
  { label: 'O‘quvchilar', href: '/dashboard/students', icon: Users },
  { label: 'Statistika', href: '/dashboard/statistics', icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();

  // Get statistics for the unanswered notification badge
  const { data: stats } = useQuery({
    queryKey: ['statistics'],
    queryFn: () => apiClient<DashboardStatistics>('/api/statistics'),
    staleTime: 10_000,
  });

  // If viewing a single conversation thread, hide the bottom tab bar to provide full-screen chat experience like iOS Messages / Telegram
  const isConversationDetail = Boolean(pathname?.startsWith('/dashboard/conversations/'));
  if (isConversationDetail) {
    return null;
  }

  const unansweredCount = stats?.unansweredCount ?? 0;

  return (
    <nav
      aria-label="Mobil navigatsiya paneli"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden backdrop-blur-xl bg-white/85 dark:bg-[#0B0D13]/85 border-t border-slate-200/80 dark:border-white/10 shadow-lg shadow-slate-900/5 transition-colors select-none"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around px-1 pt-1.5 h-14">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex-1 flex flex-col items-center justify-center py-1 transition-all active:scale-95 group focus:outline-none`}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active Tab Glow Pill */}
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute inset-x-2.5 top-0.5 bottom-1 rounded-xl bg-blue-500/10 dark:bg-blue-400/15"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}

              {/* Icon Container with Badge */}
              <div className="relative z-10 flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-colors duration-150 ${
                    isActive
                      ? 'text-[#2563EB] dark:text-blue-400'
                      : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`}
                />

                {/* Unanswered Cases Badge */}
                {tab.showBadge && unansweredCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                    {unansweredCount > 9 ? '9+' : unansweredCount}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`relative z-10 text-[10px] mt-0.5 font-bold tracking-tight transition-colors duration-150 ${
                  isActive
                    ? 'text-[#2563EB] dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
