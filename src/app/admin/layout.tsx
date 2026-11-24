import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import '../globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
});

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
    <html lang="en">
      <body
        className={`${jakarta.variable} font-sans antialiased min-h-screen bg-slate-50 text-slate-900`}
      >
        {children}
      </body>
    </html>
  );
}
