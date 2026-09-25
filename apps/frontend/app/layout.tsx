import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/lib/query-provider';

export const metadata: Metadata = {
  title: 'Maktab murojaatlari',
  description: 'Murojaatlar va javoblar',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz">
      <body className="antialiased bg-base text-text-primary min-h-screen">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
