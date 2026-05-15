'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { auth } from '@/lib/api';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/kpis', label: 'KPIs', icon: '◎' },
  { href: '/cascade', label: 'Cascade', icon: '⌥' },
  { href: '/people', label: 'People', icon: '◻' },
  { href: '/approvals', label: 'Approvals', icon: '✓' },
  { href: '/updates', label: 'Updates', icon: '↑' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try { await auth.logout(); } catch { /* ignore */ }
    clearAuth();
    router.replace('/login');
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <aside
      className="flex flex-col"
      style={{ width: 220, minWidth: 220, background: '#000', borderRight: '1px solid rgba(255,255,255,.06)', height: '100vh', position: 'sticky', top: 0 }}
    >
      {/* Logo */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center font-black text-xs tracking-widest"
            style={{ width: 30, height: 30, background: '#fff', color: '#000', borderRadius: 5 }}
          >
            J
          </div>
          <span className="font-black text-base tracking-tight text-white">
            JOOLA<span className="font-light ml-1 opacity-60">Track</span>
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                color: active ? '#fff' : 'rgba(255,255,255,.5)',
                background: active ? 'rgba(255,255,255,.12)' : 'transparent',
              }}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 12 }}>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,.06)' }}>
          <div
            className="flex items-center justify-center font-bold text-xs rounded-full shrink-0"
            style={{ width: 28, height: 28, background: 'rgba(255,255,255,.2)', color: '#fff' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.full_name ?? '—'}</p>
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,.4)' }}>
              {user?.is_admin ? 'Admin' : 'Member'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs rounded px-1.5 py-1 transition-colors"
            style={{ color: 'rgba(255,255,255,.35)', background: 'transparent' }}
            title="Sign out"
          >
            ⏻
          </button>
        </div>
      </div>
    </aside>
  );
}
