'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { kpis, users, approvals, regions, type Kpi, type User, type Approval, type Region } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const LEVEL_BG = ['#000', '#333', '#666', '#aaa'];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    active:    ['rgba(26,122,74,.1)',   '#15633c'],
    draft:     ['rgba(180,83,9,.1)',    '#b45309'],
    completed: ['rgba(24,84,168,.1)',   '#1854a8'],
    cancelled: ['rgba(185,28,28,.1)',   '#b91c1c'],
  };
  const [bg, color] = map[status] ?? ['rgba(0,0,0,.05)', '#8a8580'];
  return (
    <span style={{ display: 'inline-flex', padding: '2.5px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: bg, color }}>
      {status}
    </span>
  );
}

function KpiChip({ num, level }: { num: string; level: number }) {
  return (
    <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: LEVEL_BG[Math.min(level, 3)], color: '#fff', flexShrink: 0, whiteSpace: 'nowrap' }}>
      {num}
    </span>
  );
}

const WORKFLOW = [
  { n: 1, title: 'Create Template', desc: 'Admin defines KPI structure & fields', done: true },
  { n: 2, title: 'Add / Upload KPI', desc: 'Via form or Excel import', done: true },
  { n: 3, title: 'Validate',         desc: 'System checks employees & hierarchy', done: true },
  { n: 4, title: 'Manager Approval', desc: 'Review, approve or reject',           done: false, active: true },
  { n: 5, title: 'Assign & Cascade', desc: 'RBAC enforced · Email notification',  done: false },
  { n: 6, title: 'Track Progress',   desc: 'Periodic updates · Flow upward',      done: false },
  { n: 7, title: 'Report & Export',  desc: 'Multi-level exports · Full audit trail', done: false },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.is_admin ?? false;

  const [allKpis, setAllKpis]           = useState<Kpi[]>([]);
  const [allUsers, setAllUsers]         = useState<User[]>([]);
  const [allRegions, setAllRegions]     = useState<Region[]>([]);
  const [pending, setPending]           = useState<Approval[]>([]);
  const [loading, setLoading]           = useState(true);
  const [regionId, setRegionId]         = useState<string>('all');

  useEffect(() => {
    if (!user?.id) return;
    Promise.allSettled([
      // Admins see all KPIs; non-admins see only their own
      kpis.list({ limit: 200, owner_id: isAdmin ? undefined : user.id }),
      users.list({ limit: 100 }),
      approvals.list({ status: 'pending', limit: 6 }),
      regions.list(),
    ]).then(([kr, ur, ar, rr]) => {
      if (kr.status === 'fulfilled') setAllKpis(kr.value.data);
      if (ur.status === 'fulfilled') setAllUsers(ur.value.data);
      if (ar.status === 'fulfilled') setPending(ar.value.data);
      if (rr.status === 'fulfilled') setAllRegions(rr.value.data);
    }).finally(() => setLoading(false));
  }, [isAdmin, user?.id]);

  const fKpis    = regionId === 'all' ? allKpis : allKpis.filter((k) => k.region_id === regionId);
  const fUsers   = regionId === 'all' ? allUsers : allUsers.filter((u) => u.region_id === regionId);
  const ownerOf  = (id: string | null) => allUsers.find((u) => u.id === id)?.full_name ?? '—';

  if (loading) {
    return (
      <div style={{ padding: '22px 26px' }}>
        <div style={{ background: '#000', borderRadius: 14, padding: '22px 26px', marginBottom: 18 }}>
          <div style={{ height: 18, width: 120, background: 'rgba(255,255,255,.1)', borderRadius: 6, marginBottom: 10 }} />
          <div style={{ height: 28, width: 240, background: 'rgba(255,255,255,.08)', borderRadius: 6, marginBottom: 18 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[0,1,2,3].map((i) => <div key={i} style={{ height: 72, background: 'rgba(255,255,255,.06)', borderRadius: 9 }} />)}
          </div>
        </div>
        <div style={{ height: 300, background: '#fff', borderRadius: 14, border: '1px solid #e2dfd8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8580', fontSize: 13 }}>
          Loading…
        </div>
      </div>
    );
  }

  const regionLabel = regionId === 'all' ? 'All' : (allRegions.find((r) => r.id === regionId)?.name ?? '');

  return (
    <div style={{ padding: '22px 26px' }}>

      {/* ══ 1. HERO CARD ══ */}
      {/* <div style={{ background: '#000', color: '#fff', borderRadius: 14, padding: '22px 26px', marginBottom: 18, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)', fontSize: 110, fontWeight: 900, color: 'rgba(255,255,255,.035)', letterSpacing: -4, pointerEvents: 'none', userSelect: 'none', lineHeight: 1 }}>
          JOOLA
        </div>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', letterSpacing: '.8px', textTransform: 'uppercase', margin: '0 0 4px' }}>Welcome back</p>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.4px', margin: 0, lineHeight: 1.2 }}>
            {user?.full_name?.split(' ')[0] ?? 'there'}&apos;s Overview
          </h1>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, position: 'relative' }}>
          {([
            [isAdmin ? 'Total KPIs' : 'My KPIs',  allKpis.length],
            ['Active',                              allKpis.filter((k) => k.status === 'active').length],
            ['Cascaded',                            allKpis.filter((k) => k.parent_id).length],
            ['Pending Approval',                    pending.length],
          ] as [string, number][]).map(([label, value]) => (
            <div key={label}
              style={{ background: 'rgba(255,255,255,.07)', borderTop: '1px solid rgba(255,255,255,.08)', borderRight: '1px solid rgba(255,255,255,.08)', borderBottom: '1px solid rgba(255,255,255,.08)', borderLeft: '1px solid rgba(255,255,255,.08)', borderRadius: 9, padding: '13px 15px', transition: 'background .15s', cursor: 'default' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.1)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.07)')}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.38)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 5px' }}>{label}</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-1px', lineHeight: 1 }}>{value}</p>
            </div>
          ))}
        </div>
      </div> */}

      {/* ══ 2. REGION TABS + STATS + KPI TABLE (all one card) ══ */}
      <div style={{ background: '#fff', borderTop: '1px solid #e2dfd8', borderRight: '1px solid #e2dfd8', borderBottom: '1px solid #e2dfd8', borderLeft: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: 18 }}>

        {/* Region tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2dfd8', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[{ id: 'all', name: 'All Regions' }, ...allRegions].map((r) => {
            const on = regionId === r.id;
            return (
              <button type="button" key={r.id} onClick={() => setRegionId(r.id)} style={{ padding: '11px 18px', fontSize: 12.5, fontWeight: on ? 700 : 500, cursor: 'pointer', border: 'none', background: 'none', color: on ? '#000' : '#4a4640', fontFamily: 'inherit', transition: 'all .14s', borderBottom: `2.5px solid ${on ? '#000' : 'transparent'}`, marginBottom: -1, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {r.name}
              </button>
            );
          })}
        </div>

        {/* 4 mini-stats for selected region */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid #e2dfd8' }}>
          {([
            ['People',      fUsers.length],
            ['KPIs',        fKpis.length],
            ['Cascaded',    fKpis.filter((k) => k.parent_id).length],
            ['Active',      fKpis.filter((k) => k.status === 'active').length],
          ] as [string, number][]).map(([label, value], i) => (
            <div key={label} style={{ padding: '12px 18px', textAlign: 'center', borderRight: i < 3 ? '1px solid #e2dfd8' : 'none' }}>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.4px', marginBottom: 2, color: '#111110' }}>{value}</div>
              <div style={{ fontSize: 10, color: '#8a8580', textTransform: 'uppercase', letterSpacing: '.8px', fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* KPI Table */}
        <div style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111110' }}>
              {isAdmin ? `${regionLabel} KPIs` : 'My KPIs'}
              <span style={{ fontWeight: 400, color: '#8a8580', fontSize: 12, marginLeft: 6 }}>({fKpis.length})</span>
            </span>
            <Link href="/kpis" style={{ fontSize: 12, color: '#8a8580', textDecoration: 'none', fontWeight: 500 }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#111110')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#8a8580')}>
              View all →
            </Link>
          </div>
          {fKpis.length === 0 ? (
            <p style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: '#8a8580' }}>
              {allKpis.length === 0 ? 'No KPIs yet.' : 'No KPIs in this region.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #e2dfd8', background: '#f8f7f5' }}>
                    {['KPI No', 'KPI Name', 'Owner', 'Target', 'Current', 'Type', 'Status'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#8a8580', textTransform: 'uppercase', letterSpacing: 1, padding: '8px 12px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fKpis.slice(0, 6).map((k) => (
                    <KpiRow key={k.id} kpi={k} ownerName={ownerOf(k.owner_id)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {fKpis.length > 6 && (
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <Link href="/kpis" style={{ fontSize: 12, color: '#8a8580', textDecoration: 'none', fontWeight: 600 }}>
                View all {fKpis.length} KPIs →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ══ 3. BOTTOM TWO-COLUMN GRID ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

        {/* ─ Left (2fr) ─ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* KPI Workflow */}
          {/* <div style={{ background: '#fff', borderTop: '1px solid #e2dfd8', borderRight: '1px solid #e2dfd8', borderBottom: '1px solid #e2dfd8', borderLeft: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <div style={{ padding: '13px 18px', borderBottom: '1px solid #e2dfd8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#111110', letterSpacing: '-.1px' }}>KPI Workflow</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2.5px 8px', borderRadius: 4, background: 'rgba(0,0,0,.05)', color: '#4a4640' }}>End-to-end</span>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 0, overflowX: 'auto' }}>
              {WORKFLOW.map((s, i) => (
                <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, maxWidth: 86, textAlign: 'center' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0, background: s.done ? '#000' : s.active ? '#b45309' : '#e8e6e1', color: s.done || s.active ? '#fff' : '#8a8580', border: s.active ? '2px solid #b45309' : 'none' }}>
                      {s.done ? '✓' : s.n}
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: s.done ? '#111110' : s.active ? '#b45309' : '#8a8580', lineHeight: 1.3 }}>{s.title}</div>
                    <div style={{ fontSize: 10.5, color: '#8a8580', lineHeight: 1.4 }}>{s.desc}</div>
                  </div>
                  {i < WORKFLOW.length - 1 && (
                    <div style={{ width: 28, height: 2, background: s.done ? '#000' : '#e8e6e1', marginTop: 15, flexShrink: 0 }} />
                  )}
                </div>
              ))}
            </div>
          </div> */}

          {/* Team Members */}
          <div style={{ background: '#fff', borderTop: '1px solid #e2dfd8', borderRight: '1px solid #e2dfd8', borderBottom: '1px solid #e2dfd8', borderLeft: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <div style={{ padding: '13px 18px', borderBottom: '1px solid #e2dfd8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#111110', letterSpacing: '-.1px' }}>Team Members</span>
              <Link href="/people" style={{ fontSize: 12, color: '#8a8580', textDecoration: 'none', fontWeight: 500 }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#111110')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#8a8580')}>
                View all →
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {allUsers.slice(0, 6).map((u, i, arr) => {
                const ini = u.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
                const COLORS = ['#1a7a4a', '#1854a8', '#6b21a8', '#b45309', '#0e7490', '#be185d'];
                const bg = COLORS[u.full_name.charCodeAt(0) % COLORS.length];
                return (
                  <div key={u.id} style={{ padding: '11px 16px', borderRight: (i % 3 !== 2) ? '1px solid #f0efec' : 'none', borderBottom: i < arr.length - 2 ? '1px solid #f0efec' : 'none', display: 'flex', alignItems: 'center', gap: 10, transition: 'background .1s' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#f8f7f5')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 800, flexShrink: 0 }}>{ini}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: '#111110', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name}</p>
                      <p style={{ fontSize: 11, color: '#8a8580', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.designation ?? u.department ?? '—'}</p>
                    </div>
                  </div>
                );
              })}
              {allUsers.length === 0 && (
                <div style={{ padding: '28px', textAlign: 'center', color: '#8a8580', fontSize: 13 }}>No team members yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* ─ Right (1fr) ─ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Pending Approvals */}
          {/* <div style={{ background: '#fff', borderTop: '1px solid #e2dfd8', borderRight: '1px solid #e2dfd8', borderBottom: '1px solid #e2dfd8', borderLeft: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid #e2dfd8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111110' }}>Pending Approvals</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: pending.length > 0 ? 'rgba(180,83,9,.1)' : 'rgba(0,0,0,.05)', color: pending.length > 0 ? '#b45309' : '#8a8580' }}>
                {pending.length} pending
              </span>
            </div>
            {pending.length === 0 ? (
              <div style={{ padding: '24px 16px', display: 'flex', alignItems: 'center', gap: 8, color: '#8a8580', fontSize: 12.5 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(26,122,74,.1)', color: '#15633c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>✓</span>
                All caught up — no pending approvals
              </div>
            ) : (
              pending.map((a) => (
                <div key={a.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f5f4f1', display: 'flex', alignItems: 'flex-start', gap: 10, transition: 'background .1s', cursor: 'pointer' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#f8f7f5')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', flexShrink: 0, marginTop: 6 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/kpis/${a.kpi_id}`} style={{ fontSize: 12.5, fontWeight: 600, color: '#111110', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.kpis?.name ?? 'KPI'}
                    </Link>
                    <span style={{ fontSize: 11, color: '#8a8580' }}>
                      {a.requester?.full_name ?? '—'} · {new Date(a.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  {user?.is_admin && (
                    <Link href="/approvals" style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, borderTop: '1px solid #e2dfd8', borderRight: '1px solid #e2dfd8', borderBottom: '1px solid #e2dfd8', borderLeft: '1px solid #e2dfd8', color: '#4a4640', textDecoration: 'none', flexShrink: 0, background: '#f8f7f5', transition: 'all .13s' }}
                      onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = '#000'; el.style.color = '#fff'; el.style.borderColor = '#000'; }}
                      onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = '#f8f7f5'; el.style.color = '#4a4640'; el.style.borderColor = '#e2dfd8'; }}>
                      Review
                    </Link>
                  )}
                </div>
              ))
            )}
            {pending.length > 0 && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid #e2dfd8', textAlign: 'center' }}>
                <Link href="/approvals" style={{ fontSize: 12, color: '#8a8580', textDecoration: 'none', fontWeight: 600 }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#111110')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#8a8580')}>
                  View all approvals →
                </Link>
              </div>
            )}
          </div> */}

          {/* Quick Actions */}
          <div style={{ background: '#fff', borderTop: '1px solid #e2dfd8', borderRight: '1px solid #e2dfd8', borderBottom: '1px solid #e2dfd8', borderLeft: '1px solid #e2dfd8', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: '#4a4640', textTransform: 'uppercase', letterSpacing: '.6px', margin: '0 0 10px' }}>Quick Actions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {([
                ['/kpis/new',  '+ New KPI'],
                ['/cascade',   'Cascade KPIs'],
                ['/updates',   'Log Progress Update'],
                ['/approvals', 'Approval Inbox'],
              ] as [string, string][]).map(([href, label]) => (
                <Link key={href} href={href} style={{ display: 'block', padding: '8px 12px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, color: '#111110', textDecoration: 'none', borderTop: '1px solid #e2dfd8', borderRight: '1px solid #e2dfd8', borderBottom: '1px solid #e2dfd8', borderLeft: '1px solid #e2dfd8', background: '#f8f7f5', transition: 'all .14s' }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = '#fff'; el.style.borderColor = '#000'; el.style.transform = 'translateX(2px)'; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = '#f8f7f5'; el.style.borderColor = '#e2dfd8'; el.style.transform = 'none'; }}>
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

function KpiRow({ kpi: k, ownerName }: { kpi: Kpi; ownerName: string }) {
  const pct = k.target_value && k.current_value !== null
    ? Math.min(100, Math.round(((k.current_value ?? 0) / k.target_value) * 100))
    : null;
  return (
    <tr style={{ borderBottom: '1px solid #e2dfd8', transition: 'background .1s', cursor: 'pointer' }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#f8f7f5')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
      <td style={{ padding: '9px 12px' }}><KpiChip num={k.kpi_number} level={k.level} /></td>
      <td style={{ padding: '9px 12px', maxWidth: 180 }}>
        <Link href={`/kpis/${k.id}`} style={{ fontSize: 13, fontWeight: 600, color: '#111110', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.name}</Link>
        {k.parent_id && <span style={{ fontSize: 10.5, color: '#8a8580' }}>↑ cascade · {k.allocation_pct}%</span>}
      </td>
      <td style={{ padding: '9px 12px', fontSize: 12, color: '#4a4640', whiteSpace: 'nowrap' }}>{ownerName}</td>
      <td style={{ padding: '9px 12px', fontSize: 12, color: '#4a4640', whiteSpace: 'nowrap' }}>
        {k.target_value ? `${k.target_value.toLocaleString()}${k.unit ? ' ' + k.unit : ''}` : '—'}
      </td>
      <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
        {pct !== null ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 52, height: 4, background: '#e8e6e1', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? '#1a7a4a' : pct >= 40 ? '#1854a8' : '#b91c1c', borderRadius: 2, transition: 'width .5s' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: pct >= 80 ? '#15633c' : pct >= 40 ? '#1854a8' : '#b91c1c' }}>{pct}%</span>
          </div>
        ) : <span style={{ color: '#c4c0b8', fontSize: 12 }}>—</span>}
      </td>
      <td style={{ padding: '9px 12px' }}>
        <span style={{ fontSize: 11, color: '#8a8580', textTransform: 'capitalize' }}>{k.type}</span>
      </td>
      <td style={{ padding: '9px 12px' }}><StatusBadge status={k.status} /></td>
    </tr>
  );
}
