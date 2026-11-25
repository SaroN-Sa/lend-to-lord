import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

function getSupabaseRemotePatterns(): NonNullable<NextConfig['images']>['remotePatterns'] {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!rawUrl) return [];

  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname === 'placeholder.supabase.co') {
      return [];
    }

    const isLoopback =
      parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    const protocol =
      parsed.protocol === 'http:' && isLoopback
        ? 'http'
        : parsed.protocol === 'https:'
          ? 'https'
          : null;

    if (!protocol) return [];

    return [
      {
        protocol,
        hostname: parsed.hostname,
        ...(parsed.port ? { port: parsed.port } : {}),
        pathname: '/storage/v1/object/public/site-media/**',
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: getSupabaseRemotePatterns(),
  },
};

export default withNextIntl(nextConfig);