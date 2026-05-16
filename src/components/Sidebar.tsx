'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { auth, approvals } from '@/lib/api';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '▦' },
    ],
  },
  {
    label: 'KPI Management',
    items: [
      { href: '/kpis',        label: 'My KPIs',    icon: '◎' },
      { href: '/cascade',     label: 'Cascade',    icon: '⌥' },
      { href: '/updates',     label: 'Updates',    icon: '↑' },
      { href: '/assignments', label: 'Assignments', icon: '⊞' },
    ],
  },
  {
    label: 'Organization',
    items: [
      { href: '/people',    label: 'People',    icon: '◻' },
      { href: '/org-chart', label: 'Org Chart', icon: '⋮' },
      { href: '/regions',   label: 'Regions',   icon: '◈' },
    ],
  },
  {
    label: 'Approvals',
    items: [
      { href: '/approvals', label: 'Approvals',    icon: '✓', badge: true },
      { href: '/reports',   label: 'Reports',      icon: '⊡' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    approvals.pendingCount().then((r) => setPendingCount(r.data.count)).catch(() => {});
  }, []);

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
      <nav className="flex-1 px-3 py-3 overflow-y-auto" style={{ overflowX: 'hidden' }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 10px', marginBottom: 4 }}>
              {section.label}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                const badgeCount = item.badge ? pendingCount : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      color: active ? '#fff' : 'rgba(255,255,255,.5)',
                      background: active ? 'rgba(255,255,255,.12)' : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.06)'; }}
                    onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <span className="text-base leading-none">{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {badgeCount > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: '#f59e0b', color: '#000', lineHeight: 1 }}>
                        {badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 12 }}>
        <div className="px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,.06)' }}>
          {confirmLogout ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ margin: 0, fontSize: 11.5, color: 'rgba(255,255,255,.6)', lineHeight: 1.4 }}>
                Sign out of JOOLA Track?
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: 'none', background: '#b91c1c', color: '#fff', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Sign Out
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmLogout(false)}
                  style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: 'none', background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.7)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
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
                type="button"
                onClick={() => setConfirmLogout(true)}
                className="text-xs rounded px-1.5 py-1 transition-colors"
                style={{ color: 'rgba(255,255,255,.35)', background: 'transparent', fontFamily: 'inherit', border: 'none', cursor: 'pointer' }}
                title="Sign out"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
