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
  const tCommon = await getTranslations('Common');
  const tSkip = await getTranslations('SkipLink');
  const tFooter = await getTranslations('Footer');

  // Attach --font-ethiopic ONLY when locale === 'am'
  // On /en, --font-ethiopic is not attached to <html>, ensuring zero webfont download on English pages
  const fontVariables = `${jakarta.variable} ${locale === 'am' ? notoEthiopic.variable : ''}`.trim();

  return (
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground flex flex-col">
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            {/* Skip to content link */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-surface focus:text-foreground focus:rounded-lg focus:border focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-border-strong shadow-lg text-sm font-semibold"
            >
              {tSkip('skipToContent')}
            </a>

            {/* Sticky Compact Header */}
            <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-md">
              <div className="max-w-5xl mx-auto px-3 py-2 sm:px-4 flex flex-wrap items-center justify-between gap-y-2 gap-x-3">
                <Link
                  href={`/${locale}`}
                  className="text-base sm:text-lg font-bold tracking-tight text-foreground hover:text-primary transition-colors shrink-0"
                >
                  {tCommon('siteTitle')}
                </Link>

                <nav
                  aria-label="Main navigation"
                  className="flex items-center gap-3 text-sm font-medium shrink-0"
                >
                  <Link href={`/${locale}`} className="text-muted hover:text-foreground transition-colors">
                    {tNav('home')}
                  </Link>
                  <Link href={`/${locale}/join`} className="text-muted hover:text-foreground transition-colors">
                    {tNav('join')}
                  </Link>
                </nav>

                <div className="flex items-center gap-1.5 shrink-0">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
              </div>
            </header>

            {/* Main Landmark */}
            <main
              id="main-content"
              tabIndex={-1}
              className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 outline-none scroll-mt-20"
            >
              {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-border bg-surface/50 py-6 text-center text-xs text-muted">
              <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>{tFooter('copyright')}</div>
                <div className="flex items-center gap-4">
                  <Link href={`/${locale}/contribute`} className="hover:text-foreground transition-colors">
                    {tNav('contribute')}
                  </Link>
                </div>
              </div>
            </footer>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
