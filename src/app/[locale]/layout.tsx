import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { routing, isValidLocale } from '@/i18n/routing';
import { jakarta, notoEthiopic } from '@/lib/fonts';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import '../globals.css';

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

  // Attach --font-ethiopic ONLY when locale === 'am'
  // On /en, --font-ethiopic is not attached to <html>, ensuring zero webfont download on English pages
  const fontVariables = `${jakarta.variable} ${locale === 'am' ? notoEthiopic.variable : ''}`.trim();

  return (
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground">
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            {/* Top Navigation Bar */}
            <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-30">
              <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <Link
                  href={`/${locale}`}
                  className="text-lg font-bold text-foreground"
                >
                  {locale === 'am' ? 'ለጌታ ማበደር' : 'Lend To Lord'}
                </Link>

                <nav className="flex items-center gap-4 text-sm font-medium">
                  <Link href={`/${locale}`} className="text-muted hover:text-foreground">
                    {tNav('home')}
                  </Link>
                  <Link href={`/${locale}/contribute`} className="text-muted hover:text-foreground">
                    {tNav('contribute')}
                  </Link>
                  <Link href={`/${locale}/join`} className="text-muted hover:text-foreground">
                    {tNav('join')}
                  </Link>
                  <Link href={`/${locale}/me`} className="text-muted hover:text-foreground">
                    {tNav('myHistory')}
                  </Link>
                  <Link href="/admin" className="text-muted hover:text-foreground">
                    {tNav('admin')}
                  </Link>
                </nav>

                <div className="flex items-center gap-2">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
              </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-8">{children}</div>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
