'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid school email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

      // Successful login - redirect to dashboard (in Phase 4 dashboard views)
      window.location.href = '/dashboard';
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('Unable to connect to the psychology portal. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 bg-base">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-soft text-accent-primary-dark mb-4 shadow-sm border border-accent-secondary/40">
            <ShieldCheck className="w-6 h-6 text-accent-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-accent-primary-dark">
            Psychology Staff Portal
          </h1>
          <p className="text-sm text-text-muted mt-1.5">
            Secure, confidential triage & support management
          </p>
        </div>

        {/* Login Surface Card */}
        <div className="bg-surface rounded-xl border border-border-default shadow-sm p-6 sm:p-8">
          {serverError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 p-3.5 rounded-lg bg-red-50 border border-state-error/20 flex items-start gap-3"
            >
              <AlertCircle className="w-4 h-4 text-state-error mt-0.5 shrink-0" />
              <div className="text-xs text-state-error font-medium leading-relaxed">
                {serverError}
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-text-primary mb-1.5"
              >
                Staff Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="staff@school.edu"
                  {...register('email')}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-surface text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary/20 ${
                    errors.email
                      ? 'border-state-error focus:border-state-error'
                      : 'border-border-default focus:border-accent-primary'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-state-error">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-text-primary mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-surface text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary/20 ${
                    errors.password
                      ? 'border-state-error focus:border-state-error'
                      : 'border-border-default focus:border-accent-primary'
                  }`}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-state-error">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.985 }}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent-primary hover:bg-accent-primary-dark text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Privacy Note */}
          <div className="mt-6 pt-5 border-t border-border-default/60 text-center">
            <p className="text-xs text-text-muted leading-relaxed">
              Protected health and educational communication channel.
              Access is monitored and audited.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
