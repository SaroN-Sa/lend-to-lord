import type { Metadata } from 'next';
import { jakarta } from '@/lib/fonts';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Admin Console | Lend To Lord',
  description: 'Administrator verification console',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body
        className="font-sans antialiased min-h-screen bg-slate-50 text-slate-900"
      >
        {children}
      </body>
    </html>
  );
}
