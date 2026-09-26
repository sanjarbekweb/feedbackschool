'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  UserPlus,
  Briefcase,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { apiClient, paginatedApiClient } from '@/lib/api';
import { CurrentUser, StaffAccount, StaffRoleItem, UserRole } from '@psychology/types';

const staffSchema = z
  .object({
    displayName: z.string().trim().min(1, 'Ismni kiriting').max(80),
    staffRoleId: z.string().min(1, 'Lavozimni tanlang'),
    telegramId: z.string().regex(/^\d{1,20}$/, 'Telegram ID faqat raqamlardan iborat'),
    email: z.union([z.literal(''), z.string().email('Pochtani tekshiring')]),
    password: z.string().max(72, 'Parol 72 belgidan oshmasin'),
  })
  .refine(
    (value) =>
      (!value.email && !value.password) ||
      (!!value.email && value.password.length >= 12),
    {
      message: 'Panel uchun pochta va kamida 12 belgili parol kiriting',
      path: ['password'],
    },
  );

type StaffForm = z.infer<typeof staffSchema>;

export default function SettingsPage() {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [roleName, setRoleName] = useState('');
  const [notice, setNotice] = useState('');

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient<CurrentUser>('/api/auth/me'),
  });

  const admin = user?.role === UserRole.ADMIN;

  const roles = useQuery({
    queryKey: ['staffRoles'],
    queryFn: () => apiClient<StaffRoleItem[]>('/api/users/roles'),
    enabled: admin,
  });

  const staff = useQuery({
    queryKey: ['staff', page],
    queryFn: () =>
      paginatedApiClient<StaffAccount>(`/api/users/staff?page=${page}&limit=10`),
    enabled: admin,
  });

  const form = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      displayName: '',
      staffRoleId: '',
      telegramId: '',
      email: '',
      password: '',
    },
  });

  const createRole = useMutation({
    mutationFn: () =>
      apiClient('/api/users/roles', {
        method: 'POST',
        body: JSON.stringify({ name: roleName.trim() }),
      }),
    onSuccess: () => {
      setRoleName('');
      setNotice('Lavozim qo‘shildi. Endi unga xodim qo‘shing.');
      client.invalidateQueries({ queryKey: ['staffRoles'] });
    },
  });

  const createStaff = useMutation({
    mutationFn: (value: StaffForm) =>
      apiClient('/api/users/staff', {
        method: 'POST',
        body: JSON.stringify({
          ...value,
          email: value.email || undefined,
          password: value.password || undefined,
        }),
      }),
    onSuccess: () => {
      form.reset();
      setNotice('Xodim qo‘shildi. U xodimlar botida /start tugmasini bossin.');
      client.invalidateQueries({ queryKey: ['staff'] });
    },
  });

  const toggleStaff = useMutation({
    mutationFn: (value: StaffAccount) =>
      apiClient(`/api/users/staff/${value.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !value.isActive }),
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['staff'] });
      setNotice('Kirish huquqi yangilandi.');
    },
  });

  const error = createRole.error || createStaff.error || toggleStaff.error;

  if (isLoading) {
    return (
      <div className="p-20 flex flex-col justify-center items-center gap-3 text-xs text-slate-500 bg-white rounded-2xl border border-slate-200/70">
        <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
        <span>Sozlamalar yuklanmoqda…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
        Hisob ma’lumotlari yuklanmadi. Sahifani qayta yangilang.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto space-y-6 pb-12"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Tizim sozlamalari
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {user?.displayName || user?.email} ·{' '}
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-[#1D4ED8] dark:text-blue-300">
              {admin ? 'Administrator' : 'Xodim'}
            </span>
          </p>
        </div>
      </div>

      {/* Info notice banner */}
      <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#2563EB] dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed font-medium">
          Murojaatlar maxfiyligi ta’minlangan: har bir murojaat faqat unga biriktirilgan
          lavozimdagi xodimlar va administratorga ko‘rinadi. O‘quvchilar shaxsi
          himoyalangan.
        </p>
      </div>

      {notice && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span>{error.message}</span>
        </motion.div>
      )}

      {admin && (
        <div className="space-y-6">
          {/* Card 1: Lavozimlar */}
          <section className="bg-white dark:bg-[#111420] rounded-2xl border border-slate-200/70 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-[#2563EB] dark:text-blue-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Lavozimlar</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Masalan: Maktab psixologi, Direktor, Sinf rahbari. Shu lavozimdagi xodimlar murojaatlarni birgalikda ko‘radi.
                </p>
              </div>
            </div>

            {roles.isError ? (
              <p className="text-xs text-red-600 dark:text-red-400">Lavozimlar ro‘yxati yuklanmadi.</p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {roles.data?.map((role) => (
                  <span
                    key={role.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                    {role.name}
                  </span>
                ))}
              </div>
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                setNotice('');
                createRole.mutate();
              }}
              className="flex flex-wrap items-end gap-3 pt-2"
            >
              <div className="flex-1 min-w-[240px]">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Yangi lavozim nomi
                </label>
                <input
                  className="w-full rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all"
                  value={roleName}
                  onChange={(event) => setRoleName(event.target.value)}
                  maxLength={60}
                  required
                  placeholder="Masalan: Direktor o‘rinbosari"
                />
              </div>
              <button
                type="submit"
                disabled={!roleName.trim() || createRole.isPending}
                className="rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs px-5 py-2.5 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createRole.isPending ? 'Qo‘shilmoqda…' : '+ Lavozim qo‘shish'}
              </button>
            </form>
          </section>

          {/* Card 2: Xodim qo‘shish */}
          <section className="bg-white dark:bg-[#111420] rounded-2xl border border-slate-200/70 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-[#2563EB] dark:text-blue-400">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Xodim biriktirish</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Yangi xodimni Telegram orqali yoki veb-panelga kirish uchun ro‘yxatga olish
                </p>
              </div>
            </div>

            <form
              onSubmit={form.handleSubmit((value) => {
                setNotice('');
                createStaff.mutate(value);
              })}
              className="grid sm:grid-cols-2 gap-4 pt-2"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Xodim ismi
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                  placeholder="Masalan: Dilnoza Karimova"
                  {...form.register('displayName')}
                  autoComplete="name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Lavozimi
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                  {...form.register('staffRoleId')}
                >
                  <option value="">Tanlang</option>
                  {roles.data?.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Telegram ID
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                  placeholder="Masalan: 123456789"
                  {...form.register('telegramId')}
                  inputMode="numeric"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Xodim xodimlar botida <code>/id</code> buyrug‘ini yuborib ID raqamini olishi mumkin.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Elektron pochta{' '}
                  <span className="text-slate-400 font-normal">(veb-panel uchun)</span>
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                  placeholder="xodim@maktab.uz"
                  {...form.register('email')}
                  type="email"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Parol{' '}
                  <span className="text-slate-400 font-normal">(veb-panel uchun)</span>
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                  placeholder="Kamida 12 belgi"
                  {...form.register('password')}
                  type="password"
                  autoComplete="new-password"
                />
              </div>

              <div className="sm:col-span-2 text-xs text-red-600 dark:text-red-400 font-medium">
                {Object.values(form.formState.errors).map((item, index) => (
                  <p key={index}>{item.message}</p>
                ))}
              </div>

              <div className="sm:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={createStaff.isPending}
                  className="rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs px-6 py-2.5 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createStaff.isPending ? 'Saqlanmoqda…' : 'Xodim qo‘shish'}
                </button>
              </div>
            </form>
          </section>

          {/* Card 3: Xodimlar ro‘yxati */}
          <section className="bg-white dark:bg-[#111420] rounded-2xl border border-slate-200/70 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-[#2563EB] dark:text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Mavjud xodimlar ro‘yxati
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tizimga ulangan mas’ul shaxslar va ularning holati
                  </p>
                </div>
              </div>
            </div>

            {staff.isLoading ? (
              <div className="p-8 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-[#2563EB] mr-2" />
                Xodimlar ro‘yxati yuklanmoqda…
              </div>
            ) : staff.isError ? (
              <p className="text-xs text-red-600 dark:text-red-400">Xodimlar ro‘yxati yuklanmadi.</p>
            ) : !staff.data?.data.length ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-4">Hozircha xodimlar qo‘shilmagan.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {staff.data.data.map((person) => {
                  const initial = (person.displayName || person.email || 'X')[0]?.toUpperCase();
                  return (
                    <div
                      key={person.id}
                      className="py-3.5 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xs shrink-0">
                          {initial}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {person.displayName || person.email || 'Xodim'}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {person.staffRole?.name || 'Lavozimsiz'} ·{' '}
                            <span
                              className={`font-semibold ${
                                person.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                              }`}
                            >
                              {person.isActive ? 'Faol' : 'Kirish yopilgan'}
                            </span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={toggleStaff.isPending}
                        onClick={() => toggleStaff.mutate(person)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all ${
                          person.isActive
                            ? 'border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                            : 'border-blue-200 dark:border-blue-900/50 text-[#2563EB] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                        }`}
                      >
                        {person.isActive ? 'Kirishni to‘xtatish' : 'Kirishni ochish'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {staff.data && staff.data.meta.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                  disabled={!staff.data.meta.hasPreviousPage}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Oldingi
                </button>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {page} / {staff.data.meta.totalPages}
                </span>
                <button
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                  disabled={!staff.data.meta.hasNextPage}
                  onClick={() => setPage(page + 1)}
                >
                  Keyingi
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </motion.div>
  );
}
