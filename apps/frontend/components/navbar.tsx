'use client';

import React from 'react';
import {
  Menu,
  Search,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTheme } from '@/components/theme-provider';

interface NavbarProps {
  onToggleMobileMenu: () => void;
}

export function Navbar({ onToggleMobileMenu }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () =>
      apiClient<{
        id: string;
        email?: string | null;
        role: string;
        displayName?: string | null;
      }>('/api/auth/me'),
  });

  return (
    <header className="h-16 bg-white dark:bg-[#0B0D13] text-slate-800 dark:text-white px-4 sm:px-8 flex items-center justify-between z-10 sticky top-0 shadow-xs border-b border-slate-200/80 dark:border-white/10 transition-colors duration-150">
      {/* Search Input on the Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-full text-slate-600 dark:text-white/80 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          aria-label="Menyuni ochish"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-56 sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Qidiruv..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-full bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-white/15 transition-all"
          />
        </div>
      </div>

      {/* Right Controls: Theme Toggle + Quick icons + User Avatar Pill */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95"
          title={theme === 'dark' ? 'Yorug‘ rejimga o‘tish' : 'Qorong‘i rejimga o‘tish'}
          aria-label={theme === 'dark' ? 'Yorug‘ rejimga o‘tish' : 'Qorong‘i rejimga o‘tish'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 animate-in fade-in" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600 animate-in fade-in" />
          )}
        </button>

        {/* User Identity Pill */}
        <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200/70 dark:hover:bg-white/15 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-white/15 transition-all cursor-pointer">
          <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider hidden sm:inline">
            {user?.displayName ||
              (user?.email ? user.email.split('@')[0] : 'XODIM')}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-300" />
          <div className="w-7 h-7 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-black text-xs shadow-xs">
            {user?.displayName?.[0]?.toUpperCase() ||
              user?.email?.[0]?.toUpperCase() ||
              'A'}
          </div>
        </div>
      </div>
    </header>
  );
}
