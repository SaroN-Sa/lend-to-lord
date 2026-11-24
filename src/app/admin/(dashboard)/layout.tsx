import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const hasSession = Boolean(
    cookieStore.get('admin_session')?.value ||
      cookieStore.get('sb-access-token')?.value
  );

  if (!hasSession) {
    redirect('/admin/login');
  }

  return <>{children}</>;
}
