'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { kpis, users, approvals, type Kpi, type User, type Approval } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const REGIONS = [
  { id: 'all',  label: 'All Regions', color: '#111' },
  { id: 'APAC', label: '🌏 APAC',    color: '#1854a8' },
  { id: 'IND',  label: '🇮🇳 India',  color: '#1a7a4a' },
  { id: 'CHN',  label: '🇨🇳 China',  color: '#b91c1c' },
  { id: 'SEA',  label: '🌴 SEA',     color: '#b45309' },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active:    { bg: 'rgba(26,122,74,.1)',   color: '#15633c' },
    draft:     { bg: 'rgba(180,83,9,.1)',    color: '#b45309' },
    completed: { bg: 'rgba(24,84,168,.1)',   color: '#1854a8' },
    cancelled: { bg: 'rgba(185,28,28,.1)',   color: '#b91c1c' },
  };
  const s = map[status] ?? { bg: 'rgba(0,0,0,.05)', color: '#8a8580' };
  return (
    <span style={{ display: 'inline-flex', padding: '2.5px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

function LevelBadge({ level }: { level: number }) {
  const colors = ['#111110', '#333', '#666', '#aaa'];
  const bg     = ['rgba(0,0,0,.12)', 'rgba(0,0,0,.08)', 'rgba(0,0,0,.05)', 'rgba(0,0,0,.04)'];
  return (
    <span style={{ display: 'inline-flex', padding: '1.5px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700, background: bg[level] ?? bg[3], color: colors[level] ?? colors[3] }}>
      L{level}
    </span>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [allKpis, setAllKpis]       = useState<Kpi[]>([]);
  const [allUsers, setAllUsers]     = useState<User[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Approval[]>([]);
  const [loading, setLoading]       = useState(true);
  const [regionTab, setRegionTab]   = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        const [kpisRes, usersRes, approvalsRes] = await Promise.all([
          kpis.list({ limit: 200 }),
          users.list({ limit: 100 }),
          approvals.list({ status: 'pending', limit: 5 }),
        ]);
        setAllKpis(kpisRes.data);
        setAllUsers(usersRes.data);
        setPendingApprovals(approvalsRes.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = regionTab === 'all'
    ? allKpis
    : allKpis.filter((k) => {
        const region = allUsers.find((u) => u.id === k.owner_id)?.region_id;
        return k.kpi_number.includes(regionTab) || regionTab === 'all';
      });

  const byStatus = (s: string) => allKpis.filter((k) => k.status === s).length;
  const ownerName = (ownerId: string | null) => allUsers.find((u) => u.id === ownerId)?.full_name ?? '—';

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, color: '#8a8580', fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  return (
    <div>
      {/* Hero Banner */}
      <div style={{ background: '#000', color: '#fff', padding: '28px 32px 24px' }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 4 }}>
            Welcome back
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.4px', margin: 0 }}>
            {user?.full_name?.split(' ')[0] ?? 'there'}&apos;s Overview
          </h1>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
          {[
            { label: 'Total KPIs',    value: allKpis.length,              color: '#fff'       },
            { label: 'Active',        value: byStatus('active'),           color: '#4ade80'    },
            { label: 'Draft',         value: byStatus('draft'),            color: '#fbbf24'    },
            { label: 'Completed',     value: byStatus('completed'),        color: '#60a5fa'    },
            { label: 'Total Members', value: allUsers.length,              color: '#fff'       },
            { label: 'Pending Appr.', value: pendingApprovals.length,      color: '#fb923c'    },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,.07)', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(255,255,255,.08)' }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.5px', margin: '0 0 6px' }}>{label}</p>
              <p style={{ fontSize: 26, fontWeight: 900, color, margin: 0, letterSpacing: '-1px' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '22px 28px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 22 }}>
        {/* Left — KPI table with region tabs */}
        <div>
          {/* Region Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {REGIONS.map((r) => (
              <button
                key={r.id}
                onClick={() => setRegionTab(r.id)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all .14s',
                  background: regionTab === r.id ? r.color : '#f0efec',
                  color: regionTab === r.id ? '#fff' : '#4a4640',
                  border: `1.5px solid ${regionTab === r.id ? r.color : '#e2dfd8'}`,
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* KPI Table */}
          <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ padding: '13px 18px', borderBottom: '1px solid #e2dfd8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#111110', letterSpacing: '-.1px' }}>
                KPI Overview
              </span>
              <Link href="/kpis" style={{ fontSize: 12, color: '#8a8580', textDecoration: 'none', fontWeight: 500 }}>
                View all →
              </Link>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #e2dfd8', background: '#f0efec' }}>
                    {['KPI No', 'Name', 'Level', 'Target', 'Current', 'Status'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#8a8580', textTransform: 'uppercase', letterSpacing: 1, padding: '9px 14px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allKpis.slice(0, 12).map((k, i) => {
                    const pct = k.target_value && k.current_value !== null
                      ? Math.min(100, Math.round(((k.current_value ?? 0) / k.target_value) * 100))
                      : null;
                    return (
                      <tr key={k.id} style={{ borderBottom: i < allKpis.slice(0, 12).length - 1 ? '1px solid #e2dfd8' : 'none', transition: 'background .1s' }}
                        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = '#f8f7f5'}
                        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: '#e4e1db', color: '#4a4640' }}>{k.kpi_number}</span>
                        </td>
                        <td style={{ padding: '10px 14px', maxWidth: 200 }}>
                          <Link href={`/kpis/${k.id}`} style={{ fontSize: 13, fontWeight: 600, color: '#111110', textDecoration: 'none', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {k.name}
                          </Link>
                          <span style={{ fontSize: 11, color: '#8a8580' }}>{ownerName(k.owner_id)}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <LevelBadge level={k.level} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#4a4640', whiteSpace: 'nowrap' }}>
                          {k.target_value ? `${k.target_value.toLocaleString()}${k.unit ? ' ' + k.unit : ''}` : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          {pct !== null ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <div style={{ width: 60, height: 5, background: '#e8e6e1', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? '#1a7a4a' : pct >= 40 ? '#1854a8' : '#b91c1c', borderRadius: 3, transition: 'width .3s' }} />
                              </div>
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: pct >= 80 ? '#15633c' : pct >= 40 ? '#1854a8' : '#b91c1c' }}>{pct}%</span>
                            </div>
                          ) : (
                            <span style={{ color: '#c4c0b8', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <StatusBadge status={k.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {allKpis.length === 0 && (
                <p style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: '#8a8580' }}>No KPIs yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Pending Approvals */}
          <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid #e2dfd8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111110' }}>Pending Approvals</span>
              <Link href="/approvals" style={{ fontSize: 11.5, color: '#8a8580', textDecoration: 'none' }}>View all →</Link>
            </div>
            <div>
              {pendingApprovals.length === 0 ? (
                <p style={{ padding: '20px 16px', fontSize: 12.5, color: '#8a8580' }}>All caught up ✓</p>
              ) : (
                pendingApprovals.map((a) => (
                  <div key={a.id} style={{ padding: '11px 16px', borderBottom: '1px solid #f0efec', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0, marginTop: 5 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/kpis/${a.kpi_id}`} style={{ fontSize: 12.5, fontWeight: 600, color: '#111110', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.kpis?.name ?? 'KPI'}
                      </Link>
                      <span style={{ fontSize: 11, color: '#8a8580' }}>by {a.requester?.full_name ?? '—'}</span>
                    </div>
                    {user?.is_admin && (
                      <Link href="/approvals" style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: '1px solid #e2dfd8', color: '#4a4640', textDecoration: 'none', flexShrink: 0 }}>
                        Review
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Team Members */}
          <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid #e2dfd8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111110' }}>Team Members</span>
              <Link href="/people" style={{ fontSize: 11.5, color: '#8a8580', textDecoration: 'none' }}>View all →</Link>
            </div>
            <div>
              {allUsers.slice(0, 5).map((u) => {
                const ini = u.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
                const colors = ['#1a7a4a', '#1854a8', '#6b21a8', '#b45309', '#0e7490', '#be185d'];
                const bg = colors[u.full_name.charCodeAt(0) % colors.length];
                return (
                  <div key={u.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f0efec', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                      {ini}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: '#111110', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name}</p>
                      <p style={{ fontSize: 11, color: '#8a8580', margin: 0 }}>{u.designation ?? u.department ?? u.email}</p>
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: u.status === 'active' ? 'rgba(26,122,74,.1)' : 'rgba(0,0,0,.05)', color: u.status === 'active' ? '#15633c' : '#8a8580', flexShrink: 0 }}>
                      {u.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#4a4640', textTransform: 'uppercase', letterSpacing: '.5px', margin: '0 0 10px' }}>Quick Actions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { href: '/kpis/new',    label: '+ New KPI' },
                { href: '/cascade',     label: '⌥ Cascade KPIs' },
                { href: '/updates',     label: '↑ Log Update' },
                { href: '/people',      label: '◻ Add Member' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: 'block', padding: '8px 12px', borderRadius: 7, fontSize: 12.5, fontWeight: 600,
                    color: '#111110', textDecoration: 'none', border: '1px solid #e2dfd8',
                    background: '#f8f7f5', transition: 'all .13s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = '#000'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#f8f7f5'; (e.currentTarget as HTMLElement).style.borderColor = '#e2dfd8'; }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
