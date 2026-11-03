'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  GraduationCap,
  Brain,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sun,
  Moon,
  ShieldCheck,
  MessageCircle,
  BookOpen,
  Users,
} from 'lucide-react';
import { apiClient, ApiError, setAuthToken } from '@/lib/api';
import { useTheme } from '@/components/theme-provider';

type RoleId = 'principal' | 'psychologist' | 'counselor' | 'mmibdo' | 'otibdo';

interface RoleConfig {
  id: RoleId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  hoverBorder: string;
  hoverBg: string;
  iconBg: string;
  iconText: string;
  arrowHover: string;
  spinnerColor: string;
}

const ROLES: RoleConfig[] = [
  {
    id: 'principal',
    label: 'Direktor',
    description: 'Direktorga yozilgan murojaatlar',
    icon: GraduationCap,
    colorClass: 'text-blue-600 dark:text-blue-400',
    hoverBorder: 'hover:border-blue-500 dark:hover:border-blue-500',
    hoverBg: 'hover:bg-blue-50/40 dark:hover:bg-blue-950/30',
    iconBg: 'bg-blue-100 dark:bg-blue-950/80',
    iconText: 'text-blue-600 dark:text-blue-400',
    arrowHover: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
    spinnerColor: 'text-blue-600',
  },
  {
    id: 'psychologist',
    label: 'Psixolog',
    description: 'Psixologga yozilgan murojaatlar',
    icon: Brain,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    hoverBorder: 'hover:border-emerald-500 dark:hover:border-emerald-500',
    hoverBg: 'hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30',
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/80',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    arrowHover: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
    spinnerColor: 'text-emerald-600',
  },
  {
    id: 'counselor',
    label: 'Maktab maslahatchi',
    description: 'Maslahatchi uchun murojaatlar',
    icon: MessageCircle,
    colorClass: 'text-violet-600 dark:text-violet-400',
    hoverBorder: 'hover:border-violet-500 dark:hover:border-violet-500',
    hoverBg: 'hover:bg-violet-50/40 dark:hover:bg-violet-950/30',
    iconBg: 'bg-violet-100 dark:bg-violet-950/80',
    iconText: 'text-violet-600 dark:text-violet-400',
    arrowHover: 'group-hover:text-violet-600 dark:group-hover:text-violet-400',
    spinnerColor: 'text-violet-600',
  },
  {
    id: 'mmibdo',
    label: "MMIBDO'",
    description: "MMIBDO'ga yozilgan murojaatlar",
    icon: BookOpen,
    colorClass: 'text-amber-600 dark:text-amber-400',
    hoverBorder: 'hover:border-amber-500 dark:hover:border-amber-500',
    hoverBg: 'hover:bg-amber-50/40 dark:hover:bg-amber-950/30',
    iconBg: 'bg-amber-100 dark:bg-amber-950/80',
    iconText: 'text-amber-600 dark:text-amber-400',
    arrowHover: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
    spinnerColor: 'text-amber-600',
  },
  {
    id: 'otibdo',
    label: "O'TIBDO'",
    description: "O'TIBDO'ga yozilgan murojaatlar",
    icon: Users,
    colorClass: 'text-rose-600 dark:text-rose-400',
    hoverBorder: 'hover:border-rose-500 dark:hover:border-rose-500',
    hoverBg: 'hover:bg-rose-50/40 dark:hover:bg-rose-950/30',
    iconBg: 'bg-rose-100 dark:bg-rose-950/80',
    iconText: 'text-rose-600 dark:text-rose-400',
    arrowHover: 'group-hover:text-rose-600 dark:group-hover:text-rose-400',
    spinnerColor: 'text-rose-600',
  },
];

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState<RoleId | null>(null);
  const { theme, toggleTheme } = useTheme();

  const handleRoleLogin = async (roleId: RoleId) => {
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
        setServerError("Ulanib bo\u2018lmadi. Qayta urinib ko\u2018ring.");
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
          aria-label={theme === 'dark' ? "Yorug\u2018 rejimga o\u2018tish" : "Qorong\u2018i rejimga o\u2018tish"}
          title={theme === 'dark' ? "Yorug\u2018 rejim" : "Qorong\u2018i rejim"}
          className="p-2.5 sm:p-3 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111420] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-xs transition-transform active:scale-90 cursor-pointer"
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
            Murojaatlarni ko&apos;rish uchun o&apos;z lavozimingizni tanlang
          </p>
        </div>

        {/* Surface Card with Role Choice */}
        <div className="bg-white dark:bg-[#111420] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg shadow-slate-200/40 dark:shadow-none p-4 sm:p-6 transition-colors space-y-2.5 sm:space-y-3">
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

          {/* Role Buttons */}
          {ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <motion.button
                key={role.id}
                type="button"
                disabled={Boolean(loadingRole)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => handleRoleLogin(role.id)}
                className={`w-full text-left p-3 sm:p-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-800 ${role.hoverBorder} bg-slate-50/60 dark:bg-slate-900/40 ${role.hoverBg} transition-all flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${role.iconBg} ${role.iconText} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-[13px] sm:text-sm font-bold text-slate-900 dark:text-white">
                      {role.label}
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {role.description}
                    </p>
                  </div>
                </div>

                <div className={`text-slate-400 ${role.arrowHover} pl-2 shrink-0`}>
                  {loadingRole === role.id ? (
                    <Loader2 className={`w-4 h-4 sm:w-5 sm:h-5 animate-spin ${role.spinnerColor}`} />
                  ) : (
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                  )}
                </div>
              </motion.button>
            );
          })}

          {/* Privacy Note */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Maxfiy va alohida ajratilgan</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              Har bir lavozim faqat o&apos;ziga tegishli murojaatlarni ko&apos;radi.
              Boshqa lavozimning murojaatlariga kirish imkoni yo&apos;q.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
