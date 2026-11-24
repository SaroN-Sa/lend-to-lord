'use client';

import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';

export function LanguageSwitcher() {
  const currentLocale = useLocale();
  const pathname = usePathname();

  return (
    <div
      data-testid="language-switcher"
      className="inline-flex items-center gap-1 rounded-lg border border-stone-300 dark:border-slate-700 p-1 text-xs font-semibold"
      role="group"
      aria-label="Language selection"
    >
      <Link
        href={pathname || '/'}
        locale="en"
        data-testid="lang-switch-en"
        aria-label="Switch to English"
        aria-current={currentLocale === 'en' ? 'true' : undefined}
        className={`rounded px-2.5 py-1 transition ${
          currentLocale === 'en'
            ? 'bg-[#1B4332] text-white shadow-sm'
            : 'text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
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
        className={`rounded px-2.5 py-1 transition ${
          currentLocale === 'am'
            ? 'bg-[#1B4332] text-white shadow-sm'
            : 'text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
        }`}
      >
        አማርኛ
      </Link>
    </div>
  );
}
