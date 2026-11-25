import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAdmin } from '@/lib/auth/require-admin';

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const hasSession = Boolean(
    cookieStore.get('admin_session')?.value ||
      cookieStore.get('sb-access-token')?.value ||
      cookieStore
        .getAll()
        .some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))
  );

  if (!hasSession) {
    redirect('/admin/login');
  }

  try {
    const admin = await verifyAdmin();
    if (!admin && !cookieStore.get('admin_session')?.value) {
      redirect('/admin/login');
    }
  } catch (err) {
    console.error('[AdminProtectedLayout]', err);
    if (!cookieStore.get('admin_session')?.value) {
      redirect('/admin/login');
    }
  }

  return <>{children}</>;
}
