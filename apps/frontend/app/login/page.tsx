'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Loader2, Sun, Moon } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useTheme } from '@/components/theme-provider';

const loginSchema = z.object({
  email: z.string().email('Elektron pochtani to‘g‘ri kiriting'),
  password: z.string().min(6, 'Parol kamida 6 belgidan iborat bo‘lsin'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setIsLoading(true);

    try {
      await apiClient('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      // Successful login - redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('Ulanib bo‘lmadi. Qayta urinib ko‘ring.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 bg-[#F1F4F9] dark:bg-[#090B11] text-slate-900 dark:text-slate-100 transition-colors duration-150 relative">
      {/* Top Bar Theme Toggle */}
      <div className="absolute top-5 right-5 sm:top-8 sm:right-8">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Yorug‘ rejimga o‘tish' : 'Qorong‘i rejimga o‘tish'}
          title={theme === 'dark' ? 'Yorug‘ rejim' : 'Qorong‘i rejim'}
          className="p-2.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111420] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-xs transition-colors cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0A0A0C] text-white mb-4 shadow-md border border-slate-800">
            <span className="text-sm font-black tracking-widest text-[#2563EB]">LOGO</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Xodimlar paneli
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
            Maktab psixologik yordam xizmati boshqaruv tizimi
          </p>
        </div>

        {/* Login Surface Card */}
        <div className="bg-white dark:bg-[#111420] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 sm:p-8 transition-colors">
          {serverError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-3"
            >
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <div className="text-xs text-red-700 dark:text-red-300 font-semibold leading-relaxed">
                {serverError}
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Elektron pochta
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@school.uz"
                  {...register('email')}
                  className={`w-full pl-10 pr-4 py-2.5 text-xs rounded-full border bg-slate-50/50 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    errors.email
                      ? 'border-red-400 dark:border-red-500 focus:border-red-500'
                      : 'border-slate-200 dark:border-slate-800 focus:border-[#2563EB]'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Parol
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  {...register('password')}
                  className={`w-full pl-10 pr-4 py-2.5 text-xs rounded-full border bg-slate-50/50 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    errors.password
                      ? 'border-red-400 dark:border-red-500 focus:border-red-500'
                      : 'border-slate-200 dark:border-slate-800 focus:border-[#2563EB]'
                  }`}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              className="w-full mt-3 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs transition-all shadow-md shadow-blue-600/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Tekshirilmoqda…</span>
                </>
              ) : (
                <>
                  <span>Tizimga kirish</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Privacy Note */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-1">
              <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Xavfsiz va maxfiy</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
              Murojaatlar faqat ruxsat etilgan xodimlarga ko‘rinadi. Barcha harakatlar qayd etiladi.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
