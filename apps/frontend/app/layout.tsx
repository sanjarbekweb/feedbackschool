import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/lib/query-provider';

export const metadata: Metadata = {
  title: 'School Psychology Support System',
  description: 'Private student communication & staff triage dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-base text-text-primary min-h-screen">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
