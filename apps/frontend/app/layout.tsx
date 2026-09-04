import type { Metadata } from 'next';
import './globals.css';

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
        {children}
      </body>
    </html>
  );
}
