import type { Metadata } from 'next';
import { Noto_Sans_Ethiopic, Plus_Jakarta_Sans } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { routing, isValidLocale } from '@/i18n/routing';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import '../globals.css';

const notoEthiopic = Noto_Sans_Ethiopic({
  subsets: ['ethiopic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ethiopic',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const metadataBase = new URL(siteUrl);

  return {
    metadataBase,
    title: locale === 'am' ? 'ለጌታ ማበደር | Lend To Lord' : 'Lend To Lord | ለጌታ ማበደር',
    description:
      locale === 'am'
        ? 'ወርሃዊ የአጋሮች እና የስፖንሰሮች አስተዋጽኦ'
        : 'Monthly partner and sponsor contributions',
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: '/en',
        am: '/am',
        'x-default': '/en',
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const tNav = await getTranslations('Nav');

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${jakarta.variable} ${notoEthiopic.variable} antialiased min-h-screen bg-[#FAF8F5] text-[#0F172A] dark:bg-[#090D16] dark:text-[#F7F5F0] ${
          locale === 'am' ? 'leading-relaxed' : 'leading-normal'
        }`}
      >
        <NextIntlClientProvider messages={messages}>
          {/* Top Navigation Bar */}
          <header className="border-b border-stone-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-30">
            <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <Link
                href={`/${locale}`}
                className="text-lg font-bold text-[#1B4332] dark:text-emerald-400"
              >
                {locale === 'am' ? 'ለጌታ ማበደር' : 'Lend To Lord'}
              </Link>

              <nav className="flex items-center gap-4 text-sm font-medium">
                <Link href={`/${locale}`} className="hover:text-[#1B4332] dark:hover:text-emerald-400">
                  {tNav('home')}
                </Link>
                <Link href={`/${locale}/contribute`} className="hover:text-[#1B4332] dark:hover:text-emerald-400">
                  {tNav('contribute')}
                </Link>
                <Link href={`/${locale}/join`} className="hover:text-[#1B4332] dark:hover:text-emerald-400">
                  {tNav('join')}
                </Link>
                <Link href={`/${locale}/me`} className="hover:text-[#1B4332] dark:hover:text-emerald-400">
                  {tNav('myHistory')}
                </Link>
                <Link href="/admin" className="hover:text-[#1B4332] dark:hover:text-emerald-400">
                  {tNav('admin')}
                </Link>
              </nav>

              <LanguageSwitcher />
            </div>
          </header>

          <div className="max-w-4xl mx-auto px-4 py-8">{children}</div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
