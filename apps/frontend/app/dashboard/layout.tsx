'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { useRealtimeEvents } from '@/lib/sse';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ApiError, apiClient } from '@/lib/api';
import { CurrentUser } from '@psychology/types';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const {
    data: currentUser,
    error,
    isPending,
    refetch,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient<CurrentUser>('/api/auth/me'),
    retry: false,
  });
  const { status: connectionStatus } = useRealtimeEvents(Boolean(currentUser));

  useEffect(() => {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      router.replace('/login');
    }
  }, [error, router]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    mobilePanelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  if (isPending) {
    return (
      <div className="min-h-screen grid place-items-center bg-base" role="status">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin text-accent-primary" />
          Verifying secure session…
        </div>
      </div>
    );
  }

  if (error) {
    const unauthorized =
      error instanceof ApiError && (error.status === 401 || error.status === 403);

    return (
      <div className="min-h-screen grid place-items-center bg-base px-4">
        <div className="max-w-sm rounded-xl border border-border-default bg-surface p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-6 w-6 text-state-error" />
          <h1 className="mt-3 text-sm font-semibold text-text-primary">
            {unauthorized ? 'Seans tugadi' : 'Panelga ulanib bo‘lmadi'}
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            {unauthorized
              ? 'Kirish sahifasiga o‘tilmoqda…'
              : 'Internetni tekshirib, qayta urinib ko‘ring.'}
          </p>
          {!unauthorized && (
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 rounded-lg bg-accent-primary px-4 py-2 text-xs font-semibold text-white hover:bg-accent-primary-dark"
            >
              Qayta urinish
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-full shrink-0">
        <Sidebar connectionStatus={connectionStatus} />
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <motion.button
              type="button"
              aria-label="Menyuni yopish"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            {/* Slide-over panel */}
            <motion.div
              ref={mobilePanelRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Dashboard navigation"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 w-72 h-full shadow-xl"
            >
              <Sidebar
                connectionStatus={connectionStatus}
                onCloseMobile={() => setMobileMenuOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Navbar onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
