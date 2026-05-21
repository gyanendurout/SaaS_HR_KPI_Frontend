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
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.35 }}>
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
    <div className="flex flex-col items-center">
      {/* Node card */}
      <div
        className="relative bg-card border-[1.5px] border-border rounded-[10px] py-3 px-4 min-w-45 max-w-55 shadow-[0_1px_4px_rgba(0,0,0,.07)]"
        style={{ borderTop: `3px solid ${borderColor}`, cursor: hasChildren ? 'pointer' : 'default' }}
        onClick={() => hasChildren && setOpen((o) => !o)}>
        <div className="flex items-center gap-2.5 mb-1.5">
          <Avatar name={user.full_name} size={32} />
          <div className="min-w-0">
            <div className="text-[12.5px] font-bold text-near-black whitespace-nowrap overflow-hidden text-ellipsis">{user.full_name}</div>
            {user.designation && <div className="text-[11px] text-t3 whitespace-nowrap overflow-hidden text-ellipsis">{user.designation}</div>}
          </div>
        </div>
        <div className="flex gap-1.25 flex-wrap">
          {user.department && (
            <span className="text-[10px] font-semibold py-0.5 px-1.5 rounded-[3px] bg-[#f0efec] text-t2">{user.department}</span>
          )}
          <span
            className="text-[10px] font-semibold py-0.5 px-1.5 rounded-[3px]"
            style={{
              background: user.status === 'active' ? 'rgba(26,122,74,.1)' : 'rgba(185,28,28,.08)',
              color: user.status === 'active' ? '#15633c' : '#b91c1c',
            }}>{user.status}</span>
        </div>
        {hasChildren && (
          <div
            className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold z-1"
            style={{ background: open ? '#000' : '#e2dfd8', color: open ? '#fff' : '#8a8580' }}>
            {open ? '−' : `+${children.length}`}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && open && (
        <div className="mt-5 relative">
          {/* Vertical connector from parent */}
          <div className="absolute top-0 left-1/2 w-px h-5 bg-border -translate-x-1/2 -translate-y-5" />
          {/* Horizontal connector */}
          {children.length > 1 && (
            <div className="absolute top-0 left-0 right-0 h-px bg-border" />
          )}
          <div className="flex gap-6 items-start">
            {children.map((child) => (
              <div key={child.id} className="flex flex-col items-center relative">
                {/* Vertical connector to child */}
                <div className="w-px h-5 bg-border" />
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

  if (loading) return <div className="flex items-center justify-center h-64 text-t3 text-[13px]">Loading…</div>;

  return (
    <div className="px-6.5 py-5.5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4.5 flex-wrap gap-3">
        <div>
          <div className="text-[15px] font-black tracking-[-0.2px] mb-0.75 text-near-black">Organization Chart</div>
          <div className="text-xs text-t3">{allUsers.length} employees · {roots.length} root nodes · {deptStats.length} departments</div>
        </div>
        <div className="flex gap-2 items-center">
          <input
            placeholder="Search employees…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-card border-[1.5px] border-border rounded-lg py-2 px-3 text-[13px] text-near-black font-[inherit] outline-none w-55 transition-[border-color] duration-180 focus:border-black"
          />
        </div>
      </div>

      {/* Dept stats row */}
      {deptStats.length > 0 && (
        <div className="flex gap-2 mb-4.5 flex-wrap">
          {deptStats.map(([dept, count]) => (
            <div key={dept} className="bg-card border border-border rounded-lg py-1.75 px-3.25 flex items-center gap-1.75">
              <span className="text-xs font-semibold text-near-black">{dept}</span>
              <span className="text-[11px] text-t3 font-medium">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tree */}
      <div className="bg-card border border-border rounded-modal py-8 px-6 overflow-x-auto shadow-[0_1px_3px_rgba(0,0,0,.06)] min-h-75">
        {filteredRoots.length === 0 ? (
          <div className="text-center py-12 px-5">
            <p className="text-sm font-semibold text-t2 mb-1">
              {search ? 'No employees match your search' : 'No employees found'}
            </p>
            <p className="text-xs text-t3">
              {search ? 'Try a different name, designation, or department.' : 'Add employees to see the org chart.'}
            </p>
          </div>
        ) : (
          <div className="flex gap-10 flex-wrap justify-center">
            {filteredRoots.map((root) => (
              <OrgNode key={root.id} user={root} allUsers={search ? filteredUsers : allUsers} depth={0} expanded />
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3.5 flex-wrap">
        {[['Level 0', '#000'], ['Level 1', '#1a7a4a'], ['Level 2', '#1854a8'], ['Level 3', '#b45309'], ['Level 4+', '#7c3aed']].map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-0.75 rounded-xs" style={{ background: color }} />
            <span className="text-[11px] text-t3">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
