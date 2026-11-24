'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, locale: 'en' }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
      } else {
        router.push('/admin');
        router.refresh();
      }
    } catch {
      setError('Network error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto py-12 space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-[#1B4332]">Admin Sign In</h1>
        <p className="text-sm text-stone-600">
          Authorized Lend To Lord administrators only
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-100 text-red-900 border border-red-300 text-sm font-medium">
          {error}
        </div>
      )}

      <form
        onSubmit={handleLogin}
        className="rounded-2xl bg-white border border-stone-200 p-6 space-y-4 shadow-sm"
      >
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-transparent px-3.5 py-2.5 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-transparent px-3.5 py-2.5 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[#1B4332] hover:bg-[#143325] disabled:opacity-50 text-white font-semibold transition"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </main>
  );
}
