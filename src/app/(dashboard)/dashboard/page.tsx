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
    <span
      className="inline-flex py-[2.5px] px-2 rounded text-[11px] font-semibold"
      style={{ background: bg, color }}>
      {status}
    </span>
  );
}

function KpiChip({ num, level }: { num: string; level: number }) {
  return (
    <span
      className="font-mono text-[10px] font-bold py-0.5 px-1.5 rounded-[3px] text-white shrink-0 whitespace-nowrap"
      style={{ background: LEVEL_BG[Math.min(level, 3)] }}>
      {num}
    </span>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.is_admin ?? false;

  const [allKpis,    setAllKpis]    = useState<Kpi[]>([]);
  const [allUsers,   setAllUsers]   = useState<User[]>([]);
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [pending,    setPending]    = useState<Approval[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [regionId,   setRegionId]   = useState<string>('all');

  useEffect(() => {
    if (!user?.id) return;
    Promise.allSettled([
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

  const fKpis   = regionId === 'all' ? allKpis : allKpis.filter((k) => k.region_id === regionId);
  const fUsers  = regionId === 'all' ? allUsers : allUsers.filter((u) => u.region_id === regionId);
  const ownerOf = (id: string | null) => allUsers.find((u) => u.id === id)?.full_name ?? '—';

  if (loading) {
    return (
      <div className="px-6.5 py-5.5">
        <div className="bg-black rounded-modal px-6.5 py-5.5 mb-4.5">
          <div className="h-4.5 w-30 bg-white/10 rounded-md mb-2.5" />
          <div className="h-7 w-60 bg-white/8 rounded-md mb-4.5" />
          <div className="grid grid-cols-4 gap-2.5">
            {[0,1,2,3].map((i) => <div key={i} className="h-18 bg-white/6 rounded-[9px]" />)}
          </div>
        </div>
        <div className="h-75 bg-card rounded-modal border border-border flex items-center justify-center text-t3 text-[13px]">
          Loading…
        </div>
      </div>
    );
  }

  const regionLabel = regionId === 'all' ? 'All' : (allRegions.find((r) => r.id === regionId)?.name ?? '');

  return (
    <div className="px-6.5 py-5.5">

      {/* ══ Region Tabs + Stats + KPI Table ══ */}
      <div className="bg-card border border-border rounded-modal overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,.06)] mb-4.5">

        {/* Region tabs */}
        <div className="flex border-b border-border overflow-x-auto scrollbar-none">
          {[{ id: 'all', name: 'All Regions' }, ...allRegions].map((r) => {
            const on = regionId === r.id;
            return (
              <button type="button" key={r.id} onClick={() => setRegionId(r.id)}
                className="py-2.75 px-4.5 text-[12.5px] cursor-pointer border-none bg-transparent font-[inherit] transition-all duration-140 -mb-px whitespace-nowrap shrink-0"
                style={{
                  fontWeight: on ? 700 : 500,
                  color: on ? '#000' : '#4a4640',
                  borderBottom: `2.5px solid ${on ? '#000' : 'transparent'}`,
                }}>
                {r.name}
              </button>
            );
          })}
        </div>

        {/* 4 mini-stats */}
        <div className="grid grid-cols-4 border-b border-border">
          {([
            ['People',   fUsers.length],
            ['KPIs',     fKpis.length],
            ['Cascaded', fKpis.filter((k) => k.parent_id).length],
            ['Active',   fKpis.filter((k) => k.status === 'active').length],
          ] as [string, number][]).map(([label, value], i) => (
            <div key={label} className="py-3 px-4.5 text-center"
              style={{ borderRight: i < 3 ? '1px solid #e2dfd8' : 'none' }}>
              <div className="text-[20px] font-black tracking-[-0.4px] mb-0.5 text-near-black">{value}</div>
              <div className="text-[10px] text-t3 uppercase tracking-[.8px] font-semibold">{label}</div>
            </div>
          ))}
        </div>

        {/* KPI Table */}
        <div className="py-3.5 px-4.5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-bold text-near-black">
              {isAdmin ? `${regionLabel} KPIs` : 'My KPIs'}
              <span className="font-normal text-t3 text-xs ml-1.5">({fKpis.length})</span>
            </span>
            <Link href="/kpis" className="text-xs text-t3 no-underline font-medium hover:text-near-black transition-colors">
              View all →
            </Link>
          </div>
          {fKpis.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-t3">
              {allKpis.length === 0 ? 'No KPIs yet.' : 'No KPIs in this region.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-135">
                <thead>
                  <tr className="border-b-[1.5px] border-border bg-off">
                    {['KPI No', 'KPI Name', 'Owner', 'Target', 'Current', 'Type', 'Status'].map((h) => (
                      <th key={h} className="text-left text-[10px] font-bold text-t3 uppercase tracking-[1px] py-2 px-3 whitespace-nowrap">{h}</th>
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
            <div className="text-center mt-2.5">
              <Link href="/kpis" className="text-xs text-t3 no-underline font-semibold hover:text-near-black transition-colors">
                View all {fKpis.length} KPIs →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ══ Bottom Two-Column Grid ══ */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>

        {/* Left (2fr) */}
        <div className="flex flex-col gap-3.5">

          {/* Team Members */}
          <div className="bg-card border border-border rounded-modal overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,.06)]">
            <div className="py-3.25 px-4.5 border-b border-border flex items-center justify-between">
              <span className="text-[13.5px] font-bold text-near-black tracking-[-0.1px]">Team Members</span>
              <Link href="/people" className="text-xs text-t3 no-underline font-medium hover:text-near-black transition-colors">
                View all →
              </Link>
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {allUsers.slice(0, 6).map((u, i, arr) => {
                const ini = u.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
                const COLORS = ['#1a7a4a', '#1854a8', '#6b21a8', '#b45309', '#0e7490', '#be185d'];
                const bg = COLORS[u.full_name.charCodeAt(0) % COLORS.length];
                return (
                  <div key={u.id}
                    className="py-2.75 px-4 flex items-center gap-2.5 transition-colors duration-100 hover:bg-off"
                    style={{
                      borderRight: (i % 3 !== 2) ? '1px solid #f0efec' : 'none',
                      borderBottom: i < arr.length - 2 ? '1px solid #f0efec' : 'none',
                    }}>
                    <div
                      className="w-7.5 h-7.5 rounded-full flex items-center justify-center text-white font-black shrink-0 text-[10.5px]"
                      style={{ background: bg }}>
                      {ini}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold text-near-black m-0 truncate">{u.full_name}</p>
                      <p className="text-[11px] text-t3 m-0 truncate">{u.designation ?? u.department ?? '—'}</p>
                    </div>
                  </div>
                );
              })}
              {allUsers.length === 0 && (
                <div className="py-7 text-center text-t3 text-[13px]">No team members yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right (1fr) */}
        <div className="flex flex-col gap-3.5">

          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-modal py-3.5 px-4 shadow-[0_1px_4px_rgba(0,0,0,.06)]">
            <p className="text-[10.5px] font-bold text-t2 uppercase tracking-[.6px] m-0 mb-2.5">Quick Actions</p>
            <div className="flex flex-col gap-1.5">
              {([
                ['/kpis/new',  '+ New KPI'],
                ['/cascade',   'Cascade KPIs'],
                ['/updates',   'Log Progress Update'],
                ['/approvals', 'Approval Inbox'],
              ] as [string, string][]).map(([href, label]) => (
                <Link key={href} href={href}
                  className="block py-2 px-3 rounded-[7px] text-[12.5px] font-semibold text-near-black no-underline border border-border bg-off transition-all duration-140"
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
    <tr className="border-b border-border transition-colors duration-100 cursor-pointer"
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#f8f7f5')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
      <td className="py-2.25 px-3"><KpiChip num={k.kpi_number} level={k.level} /></td>
      <td className="py-2.25 px-3 max-w-45">
        <Link href={`/kpis/${k.id}`} className="text-[13px] font-semibold text-near-black no-underline block truncate">{k.name}</Link>
        {k.parent_id && <span className="text-[10.5px] text-t3">↑ cascade · {k.allocation_pct}%</span>}
      </td>
      <td className="py-2.25 px-3 text-xs text-t2 whitespace-nowrap">{ownerName}</td>
      <td className="py-2.25 px-3 text-xs text-t2 whitespace-nowrap">
        {k.target_value ? `${k.target_value.toLocaleString()}${k.unit ? ' ' + k.unit : ''}` : '—'}
      </td>
      <td className="py-2.25 px-3 whitespace-nowrap">
        {pct !== null ? (
          <div className="flex items-center gap-1.5">
            <div className="w-13 h-1 bg-[#e8e6e1] rounded-xs overflow-hidden">
              <div className="h-full rounded-xs transition-[width] duration-500"
                style={{ width: `${pct}%`, background: pct >= 80 ? '#1a7a4a' : pct >= 40 ? '#1854a8' : '#b91c1c' }} />
            </div>
            <span className="text-[11px] font-semibold"
              style={{ color: pct >= 80 ? '#15633c' : pct >= 40 ? '#1854a8' : '#b91c1c' }}>{pct}%</span>
          </div>
        ) : <span className="text-t4 text-xs">—</span>}
      </td>
      <td className="py-2.25 px-3">
        <span className="text-[11px] text-t3 capitalize">{k.type}</span>
      </td>
      <td className="py-2.25 px-3"><StatusBadge status={k.status} /></td>
    </tr>
  );
}
