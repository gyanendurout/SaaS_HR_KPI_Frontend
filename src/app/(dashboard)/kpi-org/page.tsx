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
    <Link href={`/kpis/${node.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          background: '#fff',
          border: '1.5px solid #e2dfd8',
          borderRadius: 12,
          padding: '11px 13px',
          width: 210,
          boxShadow: '0 2px 8px rgba(0,0,0,.06)',
          cursor: 'pointer',
          transition: 'box-shadow .15s, border-color .15s, transform .15s',
        }}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{
            fontFamily: 'monospace', fontSize: 9, fontWeight: 700,
            padding: '2px 5px', borderRadius: 3, background: '#111110', color: '#fff',
            letterSpacing: '.3px',
          }}>
            {node.kpi_number}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10,
            background: s.bg, color: s.color, textTransform: 'capitalize',
          }}>
            {node.status}
          </span>
        </div>

        {/* Name */}
        <div style={{
          fontSize: 12, fontWeight: 700, color: '#111110', lineHeight: 1.35,
          marginBottom: 7, overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
          minHeight: 32,
        }}>
          {node.name}
        </div>

        {/* Progress bar */}
        {pct !== null && (
          <div style={{ marginBottom: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: '#8a8580', marginBottom: 3 }}>
              <span>Progress</span>
              <span style={{ fontWeight: 700, color: progressColor }}>{pct}%</span>
            </div>
            <div style={{ height: 3, background: '#e4e1db', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: progressColor, borderRadius: 2, transition: 'width .3s ease' }} />
            </div>
          </div>
        )}

        {/* Owner */}
        <div style={{ paddingTop: 7, borderTop: '1px solid #eee' }}>
          {owner ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: avatarColor(owner.full_name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 7.5, fontWeight: 800, flexShrink: 0,
              }}>
                {owner.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <span style={{
                fontSize: 10.5, color: '#4a4640', fontWeight: 600,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {owner.full_name}
              </span>
            </div>
          ) : (
            <span style={{ fontSize: 10, color: '#c4c0b8', fontStyle: 'italic' }}>Unassigned</span>
          )}
        </div>

        {/* Allocation badge (children only) */}
        {node.parent_id && node.allocation_pct > 0 && (
          <div style={{ marginTop: 5 }}>
            <span style={{
              fontSize: 9, color: '#8a8580', background: '#f0ede8',
              padding: '1px 5px', borderRadius: 4,
            }}>
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
    <div style={{ padding: '22px 26px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ width: 200, height: 17, background: '#e4e1db', borderRadius: 4, marginBottom: 7 }} />
        <div style={{ width: 260, height: 12, background: '#e4e1db', borderRadius: 4 }} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {[240, 140, 130].map((w, i) => (
          <div key={i} style={{ width: w, height: 36, background: '#e4e1db', borderRadius: 7 }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 210, height: 115, background: '#e4e1db', borderRadius: 12 }} />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SELECT_STYLE = {
  background: '#fff',
  border: '1.5px solid #e2dfd8',
  borderRadius: 7,
  padding: '8px 12px',
  color: '#4a4640',
  fontFamily: 'inherit',
  fontSize: 13,
  outline: 'none',
  cursor: 'pointer',
} as const;

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
    <div style={{ padding: '22px 26px', minHeight: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', color: '#111110', marginBottom: 3 }}>
            {isAdmin ? 'KPI Organisation Chart' : 'My KPI Organisation Chart'}
          </div>
          <div style={{ fontSize: 12, color: '#8a8580' }}>
            {rootCount} root {rootCount === 1 ? 'tree' : 'trees'} · {totalKpis} {isAdmin ? 'total' : 'my'} KPIs · cascade hierarchy
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <input
            placeholder="Search by name or number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              ...SELECT_STYLE,
              color: '#111110',
              width: 230,
              paddingLeft: 32,
            }}
            onFocus={(e) => (e.target.style.borderColor = '#111')}
            onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')}
          />
          <svg
            viewBox="0 0 14 14" fill="none" stroke="#aaa" strokeWidth="1.5"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, pointerEvents: 'none' }}
          >
            <circle cx="6" cy="6" r="4.5" /><line x1="9.5" y1="9.5" x2="13" y2="13" />
          </svg>
        </div>

        <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} style={SELECT_STYLE}>
          <option value="">All Regions</option>
          {regionList.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={SELECT_STYLE}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="completed">Completed</option>
        </select>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => { setSearch(''); setFilterRegion(''); setFilterStatus(''); }}
            style={{
              fontSize: 11.5, color: '#b91c1c', background: 'rgba(185,28,28,.06)',
              border: '1px solid rgba(185,28,28,.18)', borderRadius: 6, padding: '5px 10px',
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
            }}
          >
            Clear {activeCount} filter{activeCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Tree canvas */}
      {displayed.length === 0 ? (
        <div style={{
          border: '2px dashed #e2dfd8', borderRadius: 14,
          padding: '52px 20px', textAlign: 'center', background: '#f8f7f5',
        }}>
          <div style={{ fontSize: 28, marginBottom: 10, opacity: .35 }}>⊹</div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#4a4640', margin: 0 }}>No KPIs match your filters</p>
          <p style={{ fontSize: 12, color: '#b4b0a8', marginTop: 5 }}>Try broadening your search or clearing filters</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', paddingBottom: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 52, alignItems: 'flex-start', minWidth: 'max-content', paddingRight: 40 }}>
            {displayed.map((root) => {
              const region = regionMap.get(root.region_id);
              return (
                <div key={root.id}>
                  {/* Section label: shows region + root indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    {region && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        background: '#111110', color: '#fff', fontFamily: 'monospace', letterSpacing: '.5px',
                      }}>
                        {region.code}
                      </span>
                    )}
                    <span style={{
                      fontSize: 9.5, fontWeight: 700, color: '#8a8580',
                      textTransform: 'uppercase', letterSpacing: '1px',
                    }}>
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
