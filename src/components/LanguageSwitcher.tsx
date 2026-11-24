'use client';

import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';

export function LanguageSwitcher() {
  const currentLocale = useLocale();
  const pathname = usePathname();

  return (
    <div
      data-testid="language-switcher"
      className="inline-flex items-center gap-1 rounded-lg border border-border-strong bg-surface p-1 text-xs font-semibold"
      role="group"
      aria-label="Language selection"
    >
      <Link
        href={pathname || '/'}
        locale="en"
        data-testid="lang-switch-en"
        aria-label="Switch to English"
        aria-current={currentLocale === 'en' ? 'true' : undefined}
        className={`rounded px-2.5 py-1 transition ${currentLocale === 'en'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted hover:text-foreground hover:bg-muted/10'
          }`}
      >
        EN
      </Link>
      <Link
        href={pathname || '/'}
        locale="am"
        data-testid="lang-switch-am"
        aria-label="ወደ አማርኛ ቀይር (Switch to Amharic)"
        aria-current={currentLocale === 'am' ? 'true' : undefined}
        className={`rounded px-2.5 py-1 transition ${currentLocale === 'am'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted hover:text-foreground hover:bg-muted/10'
          }`}
      >
        አማርኛ
      </Link>
    </div>
  );
}
