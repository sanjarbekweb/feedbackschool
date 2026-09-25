'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient, paginatedApiClient } from '@/lib/api';
import { CurrentUser, StaffAccount, StaffRoleItem, UserRole } from '@psychology/types';

const staffSchema = z.object({
  displayName: z.string().trim().min(1, 'Ismni kiriting').max(80),
  staffRoleId: z.string().min(1, 'Lavozimni tanlang'),
  telegramId: z.string().regex(/^\d{1,20}$/, 'Telegram ID faqat raqamlardan iborat'),
  email: z.union([z.literal(''), z.string().email('Pochtani tekshiring')]),
  password: z.string().max(72, 'Parol 72 belgidan oshmasin'),
}).refine(value => (!value.email && !value.password) || (!!value.email && value.password.length >= 12), {
  message: 'Panel uchun pochta va kamida 12 belgili parol kiriting', path: ['password'],
});
type StaffForm = z.infer<typeof staffSchema>;

export default function SettingsPage() {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [roleName, setRoleName] = useState('');
  const [notice, setNotice] = useState('');
  const { data: user, isLoading, isError } = useQuery({ queryKey: ['currentUser'], queryFn: () => apiClient<CurrentUser>('/api/auth/me') });
  const admin = user?.role === UserRole.ADMIN;
  const roles = useQuery({ queryKey: ['staffRoles'], queryFn: () => apiClient<StaffRoleItem[]>('/api/users/roles'), enabled: admin });
  const staff = useQuery({ queryKey: ['staff', page], queryFn: () => paginatedApiClient<StaffAccount>(`/api/users/staff?page=${page}&limit=10`), enabled: admin });
  const form = useForm<StaffForm>({ resolver: zodResolver(staffSchema), defaultValues: { displayName: '', staffRoleId: '', telegramId: '', email: '', password: '' } });
  const createRole = useMutation({
    mutationFn: () => apiClient('/api/users/roles', { method: 'POST', body: JSON.stringify({ name: roleName.trim() }) }),
    onSuccess: () => { setRoleName(''); setNotice('Lavozim qo‘shildi. Endi unga xodim qo‘shing.'); client.invalidateQueries({ queryKey: ['staffRoles'] }); },
  });
  const createStaff = useMutation({
    mutationFn: (value: StaffForm) => apiClient('/api/users/staff', { method: 'POST', body: JSON.stringify({ ...value, email: value.email || undefined, password: value.password || undefined }) }),
    onSuccess: () => { form.reset(); setNotice('Xodim qo‘shildi. U xodimlar botida /start tugmasini bossin.'); client.invalidateQueries({ queryKey: ['staff'] }); },
  });
  const toggleStaff = useMutation({
    mutationFn: (value: StaffAccount) => apiClient(`/api/users/staff/${value.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !value.isActive }) }),
    onSuccess: () => { client.invalidateQueries({ queryKey: ['staff'] }); setNotice('Kirish huquqi yangilandi.'); },
  });
  const error = createRole.error || createStaff.error || toggleStaff.error;
  if (isLoading) return <p role="status">Yuklanmoqda…</p>;
  if (isError) return <p role="alert">Hisob yuklanmadi. Sahifani yangilang.</p>;
  return <div className="max-w-4xl mx-auto space-y-6">
    <header><h1 className="text-xl font-semibold">Sozlamalar</h1><p className="text-sm text-text-muted mt-1">{user?.displayName || user?.email} · {admin ? 'Administrator' : 'Xodim'}</p></header>
    <p className="text-sm text-text-muted">Murojaatlar faqat tanlangan lavozimdagi xodimlar va administratorga ko‘rinadi.</p>
    {admin && <>
      <section className="settings-card">
        <h2 className="text-base font-semibold">Lavozimlar</h2>
        <p className="text-sm text-text-muted">Masalan: Direktor, Psixolog, Sinf rahbari. Shu lavozimdagi xodimlar murojaatlarni birga ko‘radi.</p>
        {roles.isError ? <p role="alert">Lavozimlar yuklanmadi.</p> : <ul className="flex flex-wrap gap-2">{roles.data?.map(role => <li key={role.id} className="rounded-lg bg-accent-soft px-3 py-1 text-sm">{role.name}</li>)}</ul>}
        <form onSubmit={event => { event.preventDefault(); setNotice(''); createRole.mutate(); }} className="flex flex-wrap items-end gap-3">
          <label className="flex-1">Yangi lavozim<input className="form-input" value={roleName} onChange={event => setRoleName(event.target.value)} maxLength={60} required placeholder="Masalan: Direktor o‘rinbosari" /></label>
          <button className="primary-button" disabled={!roleName.trim() || createRole.isPending}>{createRole.isPending ? 'Qo‘shilmoqda…' : 'Lavozim qo‘shish'}</button>
        </form>
      </section>
      <section className="settings-card">
        <h2 className="text-base font-semibold">Xodim qo‘shish</h2>
        <form onSubmit={form.handleSubmit(value => { setNotice(''); createStaff.mutate(value); })} className="grid sm:grid-cols-2 gap-4">
          <label>Ism<input className="form-input" {...form.register('displayName')} autoComplete="name" /></label>
          <label>Lavozim<select className="form-input" {...form.register('staffRoleId')}><option value="">Tanlang</option>{roles.data?.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
          <label className="sm:col-span-2">Telegram ID<input className="form-input" {...form.register('telegramId')} inputMode="numeric" /><span className="text-sm text-text-muted">Xodim botga /id yuborib, raqamni oladi.</span></label>
          <label>Elektron pochta <span className="text-text-muted">(panel uchun)</span><input className="form-input" {...form.register('email')} type="email" autoComplete="off" /></label>
          <label>Parol <span className="text-text-muted">(panel uchun)</span><input className="form-input" {...form.register('password')} type="password" autoComplete="new-password" /></label>
          <div className="sm:col-span-2 text-sm text-state-error" role="alert">{Object.values(form.formState.errors).map((item, index) => <p key={index}>{item.message}</p>)}</div>
          <button className="primary-button justify-self-start" disabled={createStaff.isPending}>{createStaff.isPending ? 'Saqlanmoqda…' : 'Xodim qo‘shish'}</button>
        </form>
      </section>
      <section className="settings-card">
        <h2 className="text-base font-semibold">Xodimlar</h2>
        {staff.isLoading ? <p role="status">Yuklanmoqda…</p> : staff.isError ? <p role="alert">Xodimlar yuklanmadi.</p> : !staff.data?.data.length ? <p>Hali xodim qo‘shilmagan.</p> : <ul className="divide-y divide-border-default">{staff.data.data.map(person => <li key={person.id} className="py-3 flex items-center justify-between gap-4">
          <div><p className="font-medium">{person.displayName || person.email || 'Xodim'}</p><p className="text-sm text-text-muted">{person.staffRole?.name} · {person.isActive ? 'Faol' : 'Kirish yopilgan'}</p></div>
          <button className="secondary-button" disabled={toggleStaff.isPending} onClick={() => toggleStaff.mutate(person)}>{person.isActive ? 'Kirishni yopish' : 'Kirishni ochish'}</button>
        </li>)}</ul>}
        {staff.data && staff.data.meta.totalPages > 1 && <div className="flex items-center gap-3"><button className="secondary-button" disabled={!staff.data.meta.hasPreviousPage} onClick={() => setPage(page - 1)}>Oldingi</button><span>{page} / {staff.data.meta.totalPages}</span><button className="secondary-button" disabled={!staff.data.meta.hasNextPage} onClick={() => setPage(page + 1)}>Keyingi</button></div>}
      </section>
      {error && <p role="alert" className="text-state-error">{error.message}</p>}
      <p role="status" className="text-sm text-accent-primary-dark">{notice}</p>
    </>}
  </div>;
}
