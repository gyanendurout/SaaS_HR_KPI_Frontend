'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { kpis, users, type Kpi, type User } from '@/lib/api';

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:    { bg: 'rgba(26,122,74,.12)',  color: '#15633c' },
  draft:     { bg: 'rgba(180,83,9,.12)',   color: '#b45309' },
  completed: { bg: 'rgba(24,84,168,.12)',  color: '#1854a8' },
  cancelled: { bg: 'rgba(185,28,28,.12)',  color: '#b91c1c' },
};

const AVATAR_COLORS = ['#1a7a4a', '#1854a8', '#6b21a8', '#b45309', '#0e7490', '#be185d', '#000'];

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

interface KpiNode extends Kpi {
  children: KpiNode[];
}

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

function KpiCard({ node, userMap }: { node: KpiNode; userMap: Map<string, User> }) {
  const owner = node.owner_id ? userMap.get(node.owner_id) : null;
  const s = STATUS_STYLE[node.status] ?? { bg: 'rgba(0,0,0,.06)', color: '#8a8580' };
  const pct = node.target_value ? Math.min(100, Math.round(((node.current_value ?? 0) / node.target_value) * 100)) : null;

  return (
    <Link href={`/kpis/${node.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#fff',
        border: '1.5px solid #e2dfd8',
        borderRadius: 12,
        padding: '12px 14px',
        width: 200,
        boxShadow: '0 2px 8px rgba(0,0,0,.07)',
        cursor: 'pointer',
        transition: 'box-shadow .15s, border-color .15s',
      }}
        onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 4px 16px rgba(0,0,0,.14)'; el.style.borderColor = '#cdc9c1'; }}
        onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 2px 8px rgba(0,0,0,.07)'; el.style.borderColor = '#e2dfd8'; }}
      >
        {/* KPI number + status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: '#111110', color: '#fff' }}>
            {node.kpi_number}
          </span>
          <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: s.bg, color: s.color }}>
            {node.status}
          </span>
        </div>

        {/* Name */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111110', lineHeight: 1.3, marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
          {node.name}
        </div>

        {/* Progress bar */}
        {pct !== null && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#8a8580', marginBottom: 3 }}>
              <span>Progress</span>
              <span style={{ fontWeight: 700, color: pct >= 100 ? '#1a7a4a' : pct >= 50 ? '#1854a8' : '#b45309' }}>{pct}%</span>
            </div>
            <div style={{ height: 4, background: '#e4e1db', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#1a7a4a' : pct >= 50 ? '#1854a8' : '#b45309', borderRadius: 2 }} />
            </div>
          </div>
        )}

        {/* Owner */}
        {owner ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 7, borderTop: '1px solid #e2dfd8' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: avatarColor(owner.full_name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8, fontWeight: 800, flexShrink: 0 }}>
              {owner.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <span style={{ fontSize: 11, color: '#4a4640', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{owner.full_name}</span>
          </div>
        ) : (
          <div style={{ paddingTop: 7, borderTop: '1px solid #e2dfd8' }}>
            <span style={{ fontSize: 10.5, color: '#b4b0a8', fontStyle: 'italic' }}>Unassigned</span>
          </div>
        )}

        {/* Allocation */}
        {node.parent_id && (
          <div style={{ marginTop: 5, fontSize: 10, color: '#8a8580' }}>
            {node.allocation_pct}% allocation
          </div>
        )}
      </div>
    </Link>
  );
}

function TreeColumn({ nodes, userMap, depth }: { nodes: KpiNode[]; userMap: Map<string, User>; depth: number }) {
  if (nodes.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start' }}>
      {nodes.map((node) => (
        <div key={node.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
          {/* Connector line from parent */}
          {depth > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', height: 46, marginRight: 0 }}>
              <div style={{ width: 32, height: 2, background: '#d4d0c8', flexShrink: 0 }} />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
            <KpiCard node={node} userMap={userMap} />
          </div>

          {/* Children column */}
          {node.children.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginLeft: 0 }}>
              {/* Horizontal connector */}
              <div style={{ display: 'flex', alignItems: 'center', height: 46 }}>
                <div style={{ width: 32, height: 2, background: '#d4d0c8', flexShrink: 0 }} />
              </div>
              {/* Vertical bracket + children */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                {node.children.length > 1 && (
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 22,
                      width: 2, background: '#d4d0c8',
                      height: `calc(100% - 44px)`,
                    }} />
                  </div>
                )}
                <TreeColumn nodes={node.children} userMap={userMap} depth={depth + 1} />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function KpiOrgPage() {
  const [tree, setTree] = useState<KpiNode[]>([]);
  const [userMap, setUserMap] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([kpis.list({ limit: 500 }), users.list({ limit: 500 })])
      .then(([kRes, uRes]) => {
        const map = new Map<string, User>();
        uRes.data.forEach((u) => map.set(u.id, u));
        setUserMap(map);
        const filtered = kRes.data.filter((k) => k.status !== 'cancelled');
        setTree(buildTree(filtered));
      })
      .finally(() => setLoading(false));
  }, []);

  const filterTree = (nodes: KpiNode[], q: string, status: string): KpiNode[] => {
    return nodes
      .map((n) => ({
        ...n,
        children: filterTree(n.children, q, status),
      }))
      .filter((n) => {
        const matchQ = !q || n.name.toLowerCase().includes(q.toLowerCase()) || n.kpi_number.toLowerCase().includes(q.toLowerCase());
        const matchS = !status || n.status === status;
        return (matchQ && matchS) || n.children.length > 0;
      });
  };

  const displayed = filterTree(tree, search, filterStatus);

  const totalKpis = tree.reduce(function count(sum: number, n: KpiNode): number { return sum + 1 + n.children.reduce(count, 0); }, 0);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, color: '#8a8580', fontSize: 13 }}>Loading…</div>;
  }

  return (
    <div style={{ padding: '22px 26px', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', color: '#111110', marginBottom: 3 }}>KPI Organisation Chart</div>
        <div style={{ fontSize: 12, color: '#8a8580' }}>{totalKpis} KPIs · cascade hierarchy with owner assignments</div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          placeholder="Search KPI name or number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 7, padding: '8px 12px', color: '#111110', fontFamily: 'inherit', fontSize: 13, outline: 'none', width: 240 }}
          onFocus={(e) => (e.target.style.borderColor = '#000')}
          onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 7, padding: '8px 12px', color: '#4a4640', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Tree */}
      {displayed.length === 0 ? (
        <div style={{ border: '2px dashed #e2dfd8', borderRadius: 14, padding: '48px 20px', textAlign: 'center', background: '#f8f7f5' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#4a4640' }}>No KPIs found</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', paddingBottom: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48, alignItems: 'flex-start', minWidth: 'max-content' }}>
            {displayed.map((root) => (
              <div key={root.id}>
                {/* Root label */}
                <div style={{ fontSize: 10, fontWeight: 700, color: '#8a8580', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                  Root KPI
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <KpiCard node={root} userMap={userMap} />
                  {root.children.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                      {/* H-line to branch */}
                      <div style={{ display: 'flex', alignItems: 'center', height: 46 }}>
                        <div style={{ width: 32, height: 2, background: '#d4d0c8' }} />
                      </div>
                      {/* Vertical bracket */}
                      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {root.children.length > 1 && (
                          <div style={{
                            position: 'absolute', left: 0, top: 22,
                            width: 2, background: '#d4d0c8',
                            height: `calc(100% - 44px)`,
                          }} />
                        )}
                        {root.children.map((child) => (
                          <div key={child.id} style={{ display: 'flex', alignItems: 'flex-start' }}>
                            {/* H-line to child */}
                            <div style={{ display: 'flex', alignItems: 'center', height: 46 }}>
                              <div style={{ width: 32, height: 2, background: '#d4d0c8' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                              <KpiCard node={child} userMap={userMap} />
                            </div>
                            {/* Level 2 children */}
                            {child.children.length > 0 && (
                              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', height: 46 }}>
                                  <div style={{ width: 32, height: 2, background: '#d4d0c8' }} />
                                </div>
                                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 24 }}>
                                  {child.children.length > 1 && (
                                    <div style={{
                                      position: 'absolute', left: 0, top: 22,
                                      width: 2, background: '#d4d0c8',
                                      height: `calc(100% - 44px)`,
                                    }} />
                                  )}
                                  {child.children.map((grandchild) => (
                                    <div key={grandchild.id} style={{ display: 'flex', alignItems: 'flex-start' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', height: 46 }}>
                                        <div style={{ width: 32, height: 2, background: '#d4d0c8' }} />
                                      </div>
                                      <KpiCard node={grandchild} userMap={userMap} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
