'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await auth.login(email, password);
      setAuth(res.data.user, res.data.access_token);
      router.replace('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10 justify-center">
          <div
            className="flex items-center justify-center font-black text-sm tracking-widest"
            style={{ width: 36, height: 36, background: '#000', color: '#fff', borderRadius: 6 }}
          >
            J
          </div>
          <span className="font-black text-xl tracking-tight" style={{ color: 'var(--near-black)' }}>
            JOOLA<span className="font-light ml-1">Track</span>
          </span>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}
        >
          <h1 className="font-black text-2xl tracking-tight mb-1" style={{ color: 'var(--near-black)' }}>
            Sign in
          </h1>
          <p className="text-sm mb-7" style={{ color: 'var(--t3)' }}>
            KPI Lifecycle Management Platform
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@joola.in"
                className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
                style={{
                  border: '1.5px solid var(--border)',
                  background: 'var(--off)',
                  color: 'var(--t1)',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#000')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
                style={{
                  border: '1.5px solid var(--border)',
                  background: 'var(--off)',
                  color: 'var(--t1)',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#000')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            {error && (
              <div
                className="text-xs px-3.5 py-2.5 rounded-lg"
                style={{ background: 'rgba(185,28,28,.08)', color: 'var(--red)', border: '1px solid rgba(185,28,28,.2)' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold text-sm transition-opacity"
              style={{ background: 'var(--black)', color: '#fff', opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--t4)' }}>
          © {new Date().getFullYear()} JOOLA Track · joola.in
        </p>
      </div>
    </div>
  );
}
