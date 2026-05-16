'use client';

import { useEffect, useState, useMemo } from 'react';
import { users, type User } from '@/lib/api';

function getAvatarColor(name: string): string {
  const colors = ['#1a7a4a', '#1854a8', '#b45309', '#7c3aed', '#b91c1c', '#0e7490', '#92400e'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const bg = getAvatarColor(name);
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.35, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function OrgNode({ user, allUsers, depth = 0, expanded: defaultExpanded = false }: { user: User; allUsers: User[]; depth?: number; expanded?: boolean }) {
  const [open, setOpen] = useState(defaultExpanded || depth < 2);
  const children = allUsers.filter((u) => u.manager_id === user.id);
  const hasChildren = children.length > 0;

  const borderColors = ['#000', '#1a7a4a', '#1854a8', '#b45309', '#7c3aed'];
  const borderColor = borderColors[Math.min(depth, borderColors.length - 1)];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Node card */}
      <div style={{ position: 'relative', background: '#fff', border: '1.5px solid #e2dfd8', borderTop: `3px solid ${borderColor}`, borderRadius: 10, padding: '12px 16px', minWidth: 180, maxWidth: 220, boxShadow: '0 1px 4px rgba(0,0,0,.07)', cursor: hasChildren ? 'pointer' : 'default' }}
        onClick={() => hasChildren && setOpen((o) => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Avatar name={user.full_name} size={32} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111110', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.full_name}</div>
            {user.designation && <div style={{ fontSize: 11, color: '#8a8580', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.designation}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {user.department && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: '#f0efec', color: '#4a4640' }}>{user.department}</span>
          )}
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: user.status === 'active' ? 'rgba(26,122,74,.1)' : 'rgba(185,28,28,.08)', color: user.status === 'active' ? '#15633c' : '#b91c1c' }}>{user.status}</span>
        </div>
        {hasChildren && (
          <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', width: 20, height: 20, borderRadius: '50%', background: open ? '#000' : '#e2dfd8', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: open ? '#fff' : '#8a8580', fontWeight: 700, zIndex: 1 }}>
            {open ? '−' : `+${children.length}`}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && open && (
        <div style={{ marginTop: 20, position: 'relative' }}>
          {/* Vertical connector from parent */}
          <div style={{ position: 'absolute', top: 0, left: '50%', width: 1, height: 20, background: '#e2dfd8', transform: 'translateX(-50%) translateY(-20px)' }} />
          {/* Horizontal connector */}
          {children.length > 1 && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: '#e2dfd8' }} />
          )}
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            {children.map((child) => (
              <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                {/* Vertical connector to child */}
                <div style={{ width: 1, height: 20, background: '#e2dfd8', marginBottom: 0 }} />
                <OrgNode user={child} allUsers={allUsers} depth={depth + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    users.list({ limit: 200 }).then((res) => setAllUsers(res.data)).finally(() => setLoading(false));
  }, []);

  const roots = useMemo(() => allUsers.filter((u) => !u.manager_id), [allUsers]);

  const filteredUsers = useMemo(() => {
    if (!search) return allUsers;
    const q = search.toLowerCase();
    return allUsers.filter((u) => u.full_name.toLowerCase().includes(q) || u.designation?.toLowerCase().includes(q) || u.department?.toLowerCase().includes(q));
  }, [allUsers, search]);

  const filteredRoots = useMemo(() => {
    if (!search) return roots;
    const getAncestors = (userId: string): Set<string> => {
      const result = new Set<string>();
      const traverse = (id: string) => {
        const user = allUsers.find((u) => u.id === id);
        if (!user) return;
        result.add(id);
        if (user.manager_id) traverse(user.manager_id);
      };
      traverse(userId);
      return result;
    };
    const visibleIds = new Set<string>();
    filteredUsers.forEach((u) => { getAncestors(u.id).forEach((id) => visibleIds.add(id)); });
    const visibleUsers = allUsers.filter((u) => visibleIds.has(u.id));
    return visibleUsers.filter((u) => !u.manager_id || !visibleIds.has(u.manager_id));
  }, [allUsers, roots, filteredUsers, search]);

  const deptStats = useMemo(() => {
    const map: Record<string, number> = {};
    allUsers.forEach((u) => { if (u.department) map[u.department] = (map[u.department] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [allUsers]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, color: '#8a8580', fontSize: 13 }}>Loading…</div>;

  return (
    <div style={{ padding: '22px 26px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', marginBottom: 3, color: '#111110' }}>Organization Chart</div>
          <div style={{ fontSize: 12, color: '#8a8580' }}>{allUsers.length} employees · {roots.length} root nodes · {deptStats.length} departments</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            placeholder="Search employees…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#111110', fontFamily: 'inherit', outline: 'none', width: 220 }}
            onFocus={(e) => (e.target.style.borderColor = '#000')}
            onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')}
          />
        </div>
      </div>

      {/* Dept stats row */}
      {deptStats.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {deptStats.map(([dept, count]) => (
            <div key={dept} style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 8, padding: '7px 13px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#111110' }}>{dept}</span>
              <span style={{ fontSize: 11, color: '#8a8580', fontWeight: 500 }}>{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tree */}
      <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 14, padding: '32px 24px', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,.06)', minHeight: 300 }}>
        {filteredRoots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#4a4640', marginBottom: 4 }}>{search ? 'No employees match your search' : 'No employees found'}</p>
            <p style={{ fontSize: 12, color: '#8a8580' }}>{search ? 'Try a different name, designation, or department.' : 'Add employees to see the org chart.'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
            {filteredRoots.map((root) => (
              <OrgNode key={root.id} user={root} allUsers={search ? filteredUsers : allUsers} depth={0} expanded />
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
        {[['Level 0', '#000'], ['Level 1', '#1a7a4a'], ['Level 2', '#1854a8'], ['Level 3', '#b45309'], ['Level 4+', '#7c3aed']].map(([label, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 3, background: color, borderRadius: 2 }} />
            <span style={{ fontSize: 11, color: '#8a8580' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
