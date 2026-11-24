'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { UI_COPY, type AppLocale } from '@/lib/constants';

export function Navbar() {
  const locale = (useLocale() === 'en' ? 'en' : 'am') as AppLocale;
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const copy = UI_COPY[locale];
  const nextLocale: AppLocale = locale === 'am' ? 'en' : 'am';

  const links = [
    { href: '/', label: copy.nav.home },
    { href: '/contribute', label: copy.nav.contribute },
    { href: '/admin', label: copy.nav.admin },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-sm font-black text-amber-300 shadow-sm">
            LL
          </span>
          <span className="text-lg font-extrabold tracking-tight text-slate-900">
            {copy.brand}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {links.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href={pathname || '/'}
            locale={nextLocale}
            data-testid={`lang-switch-${nextLocale}`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-800 transition hover:border-emerald-600 hover:bg-emerald-50"
          >
            {nextLocale === 'en' ? 'EN' : 'አማ'}
          </Link>

          <Link
            href="/contribute"
            className="hidden rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 sm:inline-flex"
          >
            {copy.hero.ctaPrimary}
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            className="rounded-lg border border-slate-200 p-2 text-slate-700 md:hidden"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-emerald-50"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}