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
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ConnectionStatus } from '@/lib/sse';

interface SidebarProps {
  connectionStatus: ConnectionStatus;
  onCloseMobile?: () => void;
}

const NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Inbox / All', href: '/dashboard/inbox', icon: Inbox },
  { label: 'Unanswered', href: '/dashboard/unanswered', icon: Clock },
  { label: 'Answered', href: '/dashboard/answered', icon: CheckCircle2 },
  { label: 'Students', href: '/dashboard/students', icon: Users },
  { label: 'Statistics', href: '/dashboard/statistics', icon: BarChart3 },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar({ connectionStatus, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await apiClient('/api/auth/logout', { method: 'POST' });
    } catch {
      // Proceed with redirect regardless of network error
    } finally {
      router.push('/login');
    }
  };

  return (
    <aside className="w-64 h-full bg-surface border-r border-border-default flex flex-col justify-between select-none">
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center px-6 border-b border-border-default gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-soft text-accent-primary-dark flex items-center justify-center border border-accent-secondary/30 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-accent-primary" />
          </div>
          <div>
            <span className="font-semibold text-sm text-accent-primary-dark tracking-tight block">
              Psychology Portal
            </span>
            <span className="text-[11px] text-text-muted block leading-none">
              Student Support Triage
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
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
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-accent-primary-dark font-semibold'
                    : 'text-text-muted hover:text-text-primary hover:bg-slate-50'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute inset-0 bg-accent-soft/80 rounded-lg border border-accent-secondary/40 shadow-xs"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-4 h-4 relative z-10 ${
                    isActive ? 'text-accent-primary' : 'text-text-muted'
                  }`}
                />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Status & Logout */}
      <div className="p-4 border-t border-border-default space-y-3">
        {/* Realtime Connection Indicator */}
        <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-slate-50 border border-border-default/60">
          <div className="flex items-center gap-2">
            <Radio
              className={`w-3.5 h-3.5 ${
                connectionStatus === 'connected'
                  ? 'text-state-success animate-pulse'
                  : connectionStatus === 'connecting'
                  ? 'text-state-warning animate-spin'
                  : 'text-state-error'
              }`}
            />
            <span className="text-[11px] font-medium text-text-muted">
              {connectionStatus === 'connected'
                ? 'Realtime Live'
                : connectionStatus === 'connecting'
                ? 'Connecting...'
                : 'Offline'}
            </span>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-state-success'
                : connectionStatus === 'connecting'
                ? 'bg-state-warning'
                : 'bg-state-error'
            }`}
          />
        </div>

        {/* Sign Out Action */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-text-muted hover:text-state-error hover:bg-red-50/60 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
