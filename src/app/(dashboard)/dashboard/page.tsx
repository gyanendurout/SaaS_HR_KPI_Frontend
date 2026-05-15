'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { kpis, users, type Kpi, type User } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface Stats {
  totalKpis: number;
  activeKpis: number;
  draftKpis: number;
  completedKpis: number;
  totalUsers: number;
  activeUsers: number;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>
        {label}
      </p>
      <p className="text-3xl font-black tracking-tight" style={{ color: color ?? 'var(--near-black)' }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--t4)' }}>{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active:    { bg: 'rgba(26,122,74,.1)',   color: 'var(--green)' },
    draft:     { bg: 'rgba(180,83,9,.1)',    color: 'var(--amber)' },
    completed: { bg: 'rgba(24,84,168,.1)',   color: 'var(--blue)' },
    cancelled: { bg: 'rgba(185,28,28,.1)',   color: 'var(--red)' },
  };
  const s = map[status] ?? { bg: 'rgba(0,0,0,.05)', color: 'var(--t3)' };
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentKpis, setRecentKpis] = useState<Kpi[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [allKpis, allUsers] = await Promise.all([
          kpis.list({ limit: 100 }),
          users.list({ limit: 100 }),
        ]);

        const kpiData = allKpis.data;
        setStats({
          totalKpis: allKpis.total,
          activeKpis: kpiData.filter((k) => k.status === 'active').length,
          draftKpis: kpiData.filter((k) => k.status === 'draft').length,
          completedKpis: kpiData.filter((k) => k.status === 'completed').length,
          totalUsers: allUsers.total,
          activeUsers: allUsers.data.filter((u) => u.status === 'active').length,
        });

        setRecentKpis(kpiData.slice(0, 5));
        setRecentUsers(allUsers.data.slice(0, 5));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: 'var(--t3)' }}>Loading…</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--near-black)' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--t3)' }}>
          Welcome back, {user?.full_name?.split(' ')[0] ?? 'there'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total KPIs" value={stats?.totalKpis ?? 0} />
        <StatCard label="Active" value={stats?.activeKpis ?? 0} color="var(--green)" />
        <StatCard label="Draft" value={stats?.draftKpis ?? 0} color="var(--amber)" />
        <StatCard label="Completed" value={stats?.completedKpis ?? 0} color="var(--blue)" />
        <StatCard label="Total Users" value={stats?.totalUsers ?? 0} />
        <StatCard label="Active Users" value={stats?.activeUsers ?? 0} color="var(--green)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent KPIs */}
        <div
          className="rounded-xl"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-bold text-sm" style={{ color: 'var(--near-black)' }}>Recent KPIs</h2>
            <Link href="/kpis" className="text-xs font-semibold" style={{ color: 'var(--t3)' }}>View all →</Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {recentKpis.length === 0 && (
              <p className="px-5 py-4 text-sm" style={{ color: 'var(--t3)' }}>No KPIs yet.</p>
            )}
            {recentKpis.map((k) => (
              <Link
                key={k.id}
                href={`/kpis/${k.id}`}
                className="flex items-center justify-between px-5 py-3 hover:opacity-80 transition-opacity block"
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>{k.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>{k.kpi_number} · {k.type}</p>
                </div>
                <StatusBadge status={k.status} />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Users */}
        <div
          className="rounded-xl"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-bold text-sm" style={{ color: 'var(--near-black)' }}>Team Members</h2>
            <Link href="/people" className="text-xs font-semibold" style={{ color: 'var(--t3)' }}>View all →</Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {recentUsers.length === 0 && (
              <p className="px-5 py-4 text-sm" style={{ color: 'var(--t3)' }}>No users yet.</p>
            )}
            {recentUsers.map((u) => {
              const ini = u.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
              return (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <div
                    className="flex items-center justify-center rounded-full text-xs font-bold shrink-0"
                    style={{ width: 30, height: 30, background: 'var(--bg2)', color: 'var(--t2)' }}
                  >
                    {ini}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--t1)' }}>{u.full_name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--t3)' }}>{u.designation ?? u.email}</p>
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: u.status === 'active' ? 'rgba(26,122,74,.1)' : 'rgba(0,0,0,.05)',
                      color: u.status === 'active' ? 'var(--green)' : 'var(--t3)',
                    }}
                  >
                    {u.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
