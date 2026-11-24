// src/proxy.ts
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect legacy localized admin paths (/(en|am)/admin...) to non-localized /admin
  const legacyAdmin = pathname.match(/^\/(en|am)\/admin(\/.*)?$/);
  if (legacyAdmin) {
    const sub = legacyAdmin[2] || '';
    return NextResponse.redirect(new URL(`/admin${sub}`, request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  // Matcher excludes /api, /admin, /_next, /_vercel, and static files containing a dot
  matcher: ['/((?!api|admin|_next|_vercel|.*\\..*).*)'],
};
