'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { kpis, users, regions, type Kpi, type User, type Region } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

// ─── Constants ────────────────────────────────────────────────────────────────

const LINE_COLOR = '#d4d0c8';
const CONNECTOR_Y = 46;  // height of h-connector container → centers 2px line at y=23
const H_GAP = 32;        // horizontal connector width
const V_GAP = 24;        // vertical gap between sibling nodes

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:    { bg: 'rgba(26,122,74,.12)',  color: '#15633c' },
  draft:     { bg: 'rgba(180,83,9,.12)',   color: '#b45309' },
  completed: { bg: 'rgba(24,84,168,.12)',  color: '#1854a8' },
  cancelled: { bg: 'rgba(185,28,28,.12)',  color: '#b91c1c' },
};

const AVATAR_COLORS = ['#1a7a4a', '#1854a8', '#6b21a8', '#b45309', '#0e7490', '#be185d', '#111'];

// ─── Data helpers ─────────────────────────────────────────────────────────────

interface KpiNode extends Kpi { children: KpiNode[] }

function buildTree(all: Kpi[]): KpiNode[] {
  const map = new Map<string, KpiNode>();
  all.forEach((k) => map.set(k.id, { ...k, children: [] }));
  const roots: KpiNode[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function countNodes(nodes: KpiNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countNodes(n.children), 0);
}

function avatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ node, userMap }: { node: KpiNode; userMap: Map<string, User> }) {
  const owner = node.owner_id ? userMap.get(node.owner_id) : null;
  const s = STATUS_STYLE[node.status] ?? { bg: 'rgba(0,0,0,.06)', color: '#8a8580' };
  const pct = node.target_value
    ? Math.min(100, Math.round(((node.current_value ?? 0) / node.target_value) * 100))
    : null;
  const progressColor = pct === null ? '' : pct >= 100 ? '#1a7a4a' : pct >= 50 ? '#1854a8' : '#b45309';

  return (
    <Link href={`/kpis/${node.id}`} className="no-underline block">
      <div
        className="bg-card border-[1.5px] border-border rounded-card w-52.5 shadow-[0_2px_8px_rgba(0,0,0,.06)] cursor-pointer transition-[box-shadow,border-color,transform] duration-150 py-2.75 px-3.25"
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.boxShadow = '0 6px 20px rgba(0,0,0,.12)';
          el.style.borderColor = '#bbb8b0';
          el.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.boxShadow = '0 2px 8px rgba(0,0,0,.06)';
          el.style.borderColor = '#e2dfd8';
          el.style.transform = 'none';
        }}
      >
        {/* KPI number + status */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono text-[9px] font-bold py-0.5 px-1.25 rounded-[3px] bg-near-black text-white tracking-[.3px]">
            {node.kpi_number}
          </span>
          <span className="text-[9px] font-bold py-0.5 px-1.5 rounded-[10px] capitalize"
            style={{ background: s.bg, color: s.color }}>
            {node.status}
          </span>
        </div>

        {/* Name */}
        <div
          className="text-xs font-bold text-near-black leading-[1.35] mb-1.75 overflow-hidden min-h-8"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
          {node.name}
        </div>

        {/* Progress bar */}
        {pct !== null && (
          <div className="mb-1.75">
            <div className="flex justify-between text-[9.5px] text-t3 mb-0.75">
              <span>Progress</span>
              <span className="font-bold" style={{ color: progressColor }}>{pct}%</span>
            </div>
            <div className="h-0.75 bg-bg3 rounded-xs overflow-hidden">
              <div className="h-full rounded-xs transition-[width] duration-300"
                style={{ width: `${pct}%`, background: progressColor }} />
            </div>
          </div>
        )}

        {/* Owner */}
        <div className="pt-1.75 border-t border-[#eee]">
          {owner ? (
            <div className="flex items-center gap-1.5">
              <div
                className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-white font-black shrink-0"
                style={{ background: avatarColor(owner.full_name), fontSize: 7.5 }}>
                {owner.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <span className="text-[10.5px] text-t2 font-semibold truncate">
                {owner.full_name}
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-t4 italic">Unassigned</span>
          )}
        </div>

        {/* Allocation badge (children only) */}
        {node.parent_id && node.allocation_pct > 0 && (
          <div className="mt-1.25">
            <span className="text-[9px] text-t3 bg-[#f0ede8] py-px px-1.25 rounded">
              {node.allocation_pct}% allocation
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Tree connector + node ─────────────────────────────────────────────────────

function TreeNode({ node, userMap }: { node: KpiNode; userMap: Map<string, User> }) {
  if (node.children.length === 0) {
    return <KpiCard node={node} userMap={userMap} />;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      <KpiCard node={node} userMap={userMap} />

      <div style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
        {/* H-line: parent card → branch */}
        <div style={{ display: 'flex', alignItems: 'center', height: CONNECTOR_Y, flexShrink: 0 }}>
          <div style={{ width: H_GAP, height: 2, background: LINE_COLOR }} />
        </div>

        {/* Children column — uses marginBottom (not gap) so absolute v-segments can bridge gaps */}
        <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {node.children.map((child, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === node.children.length - 1;
            const isOnly = node.children.length === 1;
            return (
              <div
                key={child.id}
                style={{ display: 'flex', alignItems: 'flex-start', marginBottom: isLast ? 0 : V_GAP }}
              >
                {/*
                  Connector box: stretches to full row height.
                  V-segments use absolute positioning:
                  - "above" segment: top=0 → CONNECTOR_Y/2 (for non-first rows)
                  - "below" segment: CONNECTOR_Y/2 → extends -V_GAP below to bridge the gap (for non-last rows)
                  This ensures v-line is continuous across the marginBottom gap.
                */}
                <div style={{ position: 'relative', width: H_GAP, alignSelf: 'stretch', flexShrink: 0 }}>
                  {/* V-segment above midpoint */}
                  {!isOnly && !isFirst && (
                    <div style={{
                      position: 'absolute', left: 0, top: 0,
                      height: CONNECTOR_Y / 2, width: 2, background: LINE_COLOR,
                    }} />
                  )}
                  {/* V-segment below midpoint — extends into the margin gap to connect to next sibling */}
                  {!isOnly && !isLast && (
                    <div style={{
                      position: 'absolute', left: 0, top: CONNECTOR_Y / 2,
                      bottom: -V_GAP, width: 2, background: LINE_COLOR,
                    }} />
                  )}
                  {/* H-line at midpoint */}
                  <div style={{
                    position: 'absolute', left: 0, top: CONNECTOR_Y / 2 - 1,
                    width: H_GAP, height: 2, background: LINE_COLOR,
                  }} />
                </div>

                <TreeNode node={child} userMap={userMap} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-6.5 py-5.5">
      <div className="mb-5">
        <div className="w-50 h-4.25 bg-bg3 rounded mb-1.75" />
        <div className="w-65 h-3 bg-bg3 rounded" />
      </div>
      <div className="flex gap-2.5 mb-6">
        {[240, 140, 130].map((w, i) => (
          <div key={i} className="h-9 bg-bg3 rounded-[7px]" style={{ width: w }} />
        ))}
      </div>
      <div className="flex gap-12 items-start">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-52.5 h-28.75 bg-bg3 rounded-card" />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KpiOrgPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin     = currentUser?.is_admin ?? false;

  const [tree, setTree]           = useState<KpiNode[]>([]);
  const [userMap, setUserMap]     = useState<Map<string, User>>(new Map());
  const [regionMap, setRegionMap] = useState<Map<string, Region>>(new Map());
  const [regionList, setRegionList] = useState<Region[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [search, setSearch]       = useState('');

  useEffect(() => {
    Promise.all([
      kpis.list({ limit: 500, owner_id: isAdmin ? undefined : (currentUser?.id ?? undefined) }),
      users.list({ limit: 500 }),
      regions.list(),
    ])
      .then(([kRes, uRes, rRes]) => {
        const uMap = new Map<string, User>();
        uRes.data.forEach((u) => uMap.set(u.id, u));
        setUserMap(uMap);

        const rMap = new Map<string, Region>();
        rRes.data.forEach((r) => rMap.set(r.id, r));
        setRegionMap(rMap);
        setRegionList(rRes.data);

        const active = kRes.data.filter((k) => k.status !== 'cancelled');
        setTree(buildTree(active));
      })
      .finally(() => setLoading(false));
  }, [isAdmin, currentUser?.id]);

  const filterTree = (nodes: KpiNode[], q: string, status: string, regionId: string): KpiNode[] =>
    nodes
      .map((n) => ({ ...n, children: filterTree(n.children, q, status, regionId) }))
      .filter((n) => {
        const matchQ  = !q        || n.name.toLowerCase().includes(q.toLowerCase()) || n.kpi_number.toLowerCase().includes(q.toLowerCase());
        const matchS  = !status   || n.status === status;
        const matchR  = !regionId || n.region_id === regionId;
        return (matchQ && matchS && matchR) || n.children.length > 0;
      });

  const displayed   = filterTree(tree, search, filterStatus, filterRegion);
  const totalKpis   = countNodes(tree);
  const rootCount   = tree.length;
  const activeCount = [filterStatus, filterRegion, search].filter(Boolean).length;

  if (loading) return <Skeleton />;

  return (
    <div className="px-6.5 py-5.5 min-h-full">

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[15px] font-black tracking-[-0.2px] text-near-black mb-0.75">
            {isAdmin ? 'KPI Organisation Chart' : 'My KPI Organisation Chart'}
          </div>
          <div className="text-xs text-t3">
            {rootCount} root {rootCount === 1 ? 'tree' : 'trees'} · {totalKpis} {isAdmin ? 'total' : 'my'} KPIs · cascade hierarchy
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2.5 mb-7 flex-wrap items-center">
        <div className="relative">
          <input
            placeholder="Search by name or number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-card border-[1.5px] border-border rounded-[7px] py-2 px-3 pl-8 text-near-black font-[inherit] text-[13px] outline-none cursor-pointer w-57.5 transition-[border-color] focus:border-black"
          />
          <svg
            viewBox="0 0 14 14" fill="none" stroke="#aaa" strokeWidth="1.5"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.25 h-3.25 pointer-events-none">
            <circle cx="6" cy="6" r="4.5" /><line x1="9.5" y1="9.5" x2="13" y2="13" />
          </svg>
        </div>

        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
          className="bg-card border-[1.5px] border-border rounded-[7px] py-2 px-3 text-t2 font-[inherit] text-[13px] outline-none cursor-pointer">
          <option value="">All Regions</option>
          {regionList.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-card border-[1.5px] border-border rounded-[7px] py-2 px-3 text-t2 font-[inherit] text-[13px] outline-none cursor-pointer">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="completed">Completed</option>
        </select>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => { setSearch(''); setFilterRegion(''); setFilterStatus(''); }}
            className="text-[11.5px] text-brand-red bg-[rgba(185,28,28,.06)] border border-[rgba(185,28,28,.18)] rounded-md py-1.25 px-2.5 cursor-pointer font-[inherit] font-semibold">
            Clear {activeCount} filter{activeCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Tree canvas */}
      {displayed.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-modal py-13 px-5 text-center bg-off">
          <div className="text-[28px] mb-2.5 opacity-[.35]">⊹</div>
          <p className="text-[13px] font-semibold text-t2 m-0">No KPIs match your filters</p>
          <p className="text-xs text-[#b4b0a8] mt-1.25">Try broadening your search or clearing filters</p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-10">
          <div className="flex flex-col gap-13 items-start min-w-max pr-10">
            {displayed.map((root) => {
              const region = regionMap.get(root.region_id);
              return (
                <div key={root.id}>
                  {/* Section label: shows region + root indicator */}
                  <div className="flex items-center gap-2 mb-2.5">
                    {region && (
                      <span className="font-mono text-[9px] font-bold py-0.5 px-1.5 rounded bg-near-black text-white tracking-[.5px]">
                        {region.code}
                      </span>
                    )}
                    <span className="text-[9.5px] font-bold text-t3 uppercase tracking-[1px]">
                      {region?.name ?? 'Root KPI'} · Root
                    </span>
                  </div>

                  <TreeNode node={root} userMap={userMap} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
