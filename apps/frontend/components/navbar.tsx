'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  Menu,
  Sun,
  Moon,
  GraduationCap,
  Brain,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, removeAuthToken } from '@/lib/api';
import { useTheme } from '@/components/theme-provider';

interface NavbarProps {
  onToggleMobileMenu: () => void;
}

export function Navbar({ onToggleMobileMenu }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () =>
      apiClient<{
        id: string;
        email?: string | null;
        role: string;
        staffRoleId?: string | null;
        displayName?: string | null;
      }>('/api/auth/me'),
  });

  const handleSwitchRole = async () => {
    try {
      await apiClient('/api/auth/logout', { method: 'POST' });
    } catch {}
    removeAuthToken();
    queryClient.clear();
    router.replace('/login');
  };

  const isPrincipal = user?.staffRoleId === 'principal';
  const roleName = isPrincipal ? 'Direktor' : 'Psixolog';

  return (
    <header className="h-14 sm:h-16 bg-white dark:bg-[#0B0D13] text-slate-800 dark:text-white px-3 sm:px-6 flex items-center justify-between z-10 sticky top-0 shadow-xs border-b border-slate-200/80 dark:border-white/10 transition-colors duration-150">
      {/* Left: Mobile Menu Toggle + Role Indicator */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-white/80 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Menyuni ochish"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Active Role Pill */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold transition-all ${
          isPrincipal
            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300'
            : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300'
        }`}>
          {isPrincipal ? (
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Brain className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="text-[11px] sm:text-xs font-black tracking-tight">{roleName}</span>
          <span className="hidden xs:inline text-[9px] font-semibold opacity-70">kabineti</span>
        </div>
      </div>

      {/* Right Controls: Theme Toggle + Role Switcher */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Switch Role Button */}
        <button
          type="button"
          onClick={handleSwitchRole}
          title="Boshqa lavozimga o‘tish"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3 h-3 text-slate-500 dark:text-slate-400" />
          <span className="hidden sm:inline">Rolni almashtirish</span>
          <span className="sm:hidden">Chiqish</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
          title={theme === 'dark' ? 'Yorug‘ rejimga o‘tish' : 'Qorong‘i rejimga o‘tish'}
          aria-label={theme === 'dark' ? 'Yorug‘ rejim' : 'Qorong‘i rejim'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>
    </header>
  );
}
