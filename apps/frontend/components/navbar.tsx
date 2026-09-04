'use client';

import React from 'react';
import { Menu, UserCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

interface NavbarProps {
  onToggleMobileMenu: () => void;
}

export function Navbar({ onToggleMobileMenu }: NavbarProps) {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () =>
      apiClient<{ id: string; email?: string | null; role: string }>('/api/auth/me'),
  });

  return (
    <header className="h-16 bg-surface border-b border-border-default px-4 sm:px-6 flex items-center justify-between z-10 sticky top-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-slate-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <h2 className="text-sm font-semibold text-text-primary">
            Confidential Case Management
          </h2>
          <p className="text-[11px] text-text-muted">
            Authorized student psychology & mental health support
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* User Identity Pill */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-border-default">
          <div className="w-6 h-6 rounded-full bg-accent-soft text-accent-primary-dark flex items-center justify-center font-medium text-xs">
            <UserCheck className="w-3.5 h-3.5 text-accent-primary" />
          </div>
          <div className="text-left hidden sm:block">
            <span className="text-xs font-semibold text-text-primary block leading-none">
              {user?.email || 'Authorized Staff'}
            </span>
            <span className="text-[10px] text-accent-primary uppercase font-bold tracking-wider">
              {user?.role || 'STAFF'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
