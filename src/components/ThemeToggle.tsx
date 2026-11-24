'use client';

import * as React from 'react';
import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { Moon, Sun } from 'lucide-react';

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ThemeToggle() {
  const mounted = useMounted();
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations('Theme');

  const isDark = resolvedTheme === 'dark';
  const label = mounted
    ? isDark
      ? t('switchToLight')
      : t('switchToDark')
    : t('toggle');

  const handleToggle = () => {
    try {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    } catch (error) {
      console.error('[theme:toggle]', error);
    }
  };

  return (
    <button
      type="button"
      data-testid="theme-toggle"
      data-mounted={mounted ? 'true' : 'false'}
      aria-label={label}
      onClick={handleToggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-strong bg-surface text-foreground transition-colors hover:bg-muted/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Moon className="h-4 w-4" aria-hidden="true" />
        )
      ) : (
        <span className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
