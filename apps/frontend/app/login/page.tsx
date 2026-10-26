'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Brain, ArrowRight, AlertCircle, Loader2, Sun, Moon, ShieldCheck } from 'lucide-react';
import { apiClient, ApiError, setAuthToken } from '@/lib/api';
import { useTheme } from '@/components/theme-provider';

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState<'principal' | 'psychologist' | null>(null);
  const { theme, toggleTheme } = useTheme();

  const handleRoleLogin = async (roleId: 'principal' | 'psychologist') => {
    setServerError(null);
    setLoadingRole(roleId);

    try {
      const response = await apiClient<{ token?: string }>('/api/auth/role-login', {
        method: 'POST',
        body: JSON.stringify({ roleId }),
      });

      if (response?.token) {
        setAuthToken(response.token);
      }

      window.location.href = '/dashboard';
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('Ulanib bo‘lmadi. Qayta urinib ko‘ring.');
      }
      setLoadingRole(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-3 sm:px-6 bg-[#F1F4F9] dark:bg-[#090B11] text-slate-900 dark:text-slate-100 transition-colors duration-150 relative py-6">
      {/* Top Bar Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Yorug‘ rejimga o‘tish' : 'Qorong‘i rejimga o‘tish'}
          title={theme === 'dark' ? 'Yorug‘ rejim' : 'Qorong‘i rejim'}
          className="p-2 sm:p-2.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111420] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-xs transition-colors cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-sm sm:max-w-md"
      >
        {/* Header Branding */}
        <div className="text-center mb-5 sm:mb-7">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white mb-3 shadow-md">
            <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Maktab boshqaruv paneli
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Murojaatlarni ko‘rish uchun o‘z lavozimingizni tanlang
          </p>
        </div>

        {/* Surface Card with Role Choice */}
        <div className="bg-white dark:bg-[#111420] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg shadow-slate-200/40 dark:shadow-none p-4 sm:p-6 transition-colors space-y-3 sm:space-y-4">
          {serverError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <div className="text-xs text-red-700 dark:text-red-300 font-semibold leading-relaxed">
                {serverError}
              </div>
            </motion.div>
          )}

          {/* Role Button 1: Direktor */}
          <motion.button
            type="button"
            disabled={Boolean(loadingRole)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => handleRoleLogin('principal')}
            className="w-full text-left p-3.5 sm:p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 transition-all flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Direktor
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-900/50 px-2 py-0.5 rounded-full">
                    Kabinet
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  Faqat direktorga yozilgan murojaatlar
                </p>
              </div>
            </div>

            <div className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 pl-2 shrink-0">
              {loadingRole === 'principal' ? (
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              ) : (
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              )}
            </div>
          </motion.button>

          {/* Role Button 2: Psixolog */}
          <motion.button
            type="button"
            disabled={Boolean(loadingRole)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => handleRoleLogin('psychologist')}
            className="w-full text-left p-3.5 sm:p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition-all flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Brain className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Psixolog
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">
                    Kabinet
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  Faqat psixologga yozilgan murojaatlar
                </p>
              </div>
            </div>

            <div className="text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 pl-2 shrink-0">
              {loadingRole === 'psychologist' ? (
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              ) : (
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              )}
            </div>
          </motion.button>

          {/* Privacy Note */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Maxfiy va alohida ajratilgan</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              Direktor psixologning murojaatlarini ko‘rmaydi, psixolog esa direktorning murojaatlarini ko‘ra olmaydi.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
