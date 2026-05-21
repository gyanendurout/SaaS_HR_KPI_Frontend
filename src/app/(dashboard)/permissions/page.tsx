'use client';

import { useEffect, useState } from 'react';
import { users, type User } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function PermissionsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    users.list({ limit: 200 }).then((res) => setAllUsers(res.data)).finally(() => setLoading(false));
  }, []);

  const handleToggleAdmin = async (user: User) => {
    if (user.id === currentUser?.id) return;
    setSaving(user.id);
    try {
      const updated = await users.update(user.id, { is_admin: !user.is_admin });
      setAllUsers((prev) => prev.map((u) => u.id === user.id ? updated.data : u));
    } finally { setSaving(null); }
  };

  const filtered = allUsers.filter((u) => {
    const q = search.toLowerCase();
    return !search || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.designation?.toLowerCase().includes(q);
  });

  const adminCount = allUsers.filter((u) => u.is_admin).length;
  const activeCount = allUsers.filter((u) => u.status === 'active').length;

  if (!currentUser?.is_admin) {
    return (
      <div className="py-[22px] px-[26px]">
        <div className="flex flex-col items-center justify-center py-[80px] px-5 text-center">
          <div className="w-14 h-14 rounded-full bg-[rgba(185,28,28,.08)] border border-[rgba(185,28,28,.2)] flex items-center justify-center text-2xl mb-4">🔒</div>
          <div className="text-[15px] font-bold text-[#111110] mb-1.5">Admin Access Required</div>
          <p className="text-[13px] text-[#8a8580] max-w-[320px] leading-relaxed">You need administrator privileges to manage permissions. Contact your system administrator if you believe you should have access.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-[#8a8580] text-[13px]">Loading…</div>;

  return (
    <div className="py-[22px] px-[26px]">
      {/* Header */}
      <div className="mb-5">
        <div className="text-[15px] font-black tracking-[-0.2px] mb-[3px] text-[#111110]">Permissions</div>
        <div className="text-[12px] text-[#8a8580]">Manage admin access and user roles across the organization</div>
      </div>

      {/* Stats */}
      <div className="grid gap-[10px] mb-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {[
          { label: 'Total Users', value: allUsers.length, color: '#111110' },
          { label: 'Active', value: activeCount, color: '#1a7a4a' },
          { label: 'Admins', value: adminCount, color: '#1854a8' },
          { label: 'Inactive', value: allUsers.length - activeCount, color: '#b91c1c' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-border rounded-[10px] px-[14px] py-3">
            <div className="text-[11px] text-[#8a8580] font-semibold uppercase tracking-[0.5px] mb-[5px]">{s.label}</div>
            <div className="text-[22px] font-black tracking-[-0.5px]" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Role legend */}
      <div className="bg-[#f8f7f5] border border-border rounded-[10px] px-4 py-3 mb-[18px] flex gap-6 flex-wrap">
        {[
          { role: 'Admin', color: '#1854a8', desc: 'Full access — manage users, approve KPIs, view all regions, manage permissions' },
          { role: 'Member', color: '#4a4640', desc: 'Standard access — view & update own KPIs, view org chart, submit updates' },
        ].map((r) => (
          <div key={r.role} className="flex items-start gap-2">
            <span
              className="inline-flex py-[2.5px] px-2 rounded text-[11px] font-bold shrink-0 mt-[1px]"
              style={{ background: r.color === '#1854a8' ? 'rgba(24,84,168,.1)' : '#f0efec', color: r.color }}
            >{r.role}</span>
            <span className="text-[12px] text-[#8a8580] leading-[1.5]">{r.desc}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-[14px]">
        <input
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white border-[1.5px] border-border rounded-lg py-2 px-3 text-[13px] text-[#111110] font-[inherit] outline-none w-[280px]"
          onFocus={(e) => (e.target.style.borderColor = '#000')}
          onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')}
        />
      </div>

      {/* Users table */}
      <div className="bg-white border border-border rounded-[14px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,.07)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-[1.5px] border-border bg-[#f0efec]">
                {['User', 'Email', 'Designation', 'Status', 'Role', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-bold text-[#8a8580] uppercase tracking-[1px] py-[9px] px-[14px] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const isSelf = user.id === currentUser?.id;
                const isSaving = saving === user.id;
                return (
                  <tr key={user.id} className="border-b border-border" style={{ opacity: user.status === 'inactive' ? .6 : 1 }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = '#f8f7f5'}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <td className="py-[11px] px-[14px]">
                      <div className="flex items-center gap-[10px]">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px] shrink-0"
                          style={{ background: user.is_admin ? '#1854a8' : '#e4e1db', color: user.is_admin ? '#fff' : '#4a4640' }}
                        >
                          {user.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[13px] font-bold text-[#111110]">
                            {user.full_name}
                            {isSelf && <span className="ml-1.5 text-[10px] font-semibold py-[1px] px-[5px] rounded-[3px] bg-[#f0efec] text-[#8a8580]">You</span>}
                          </div>
                          <div className="text-[11px] text-[#8a8580] font-mono">{user.employee_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-[11px] px-[14px] text-[12px] text-[#4a4640]">{user.email}</td>
                    <td className="py-[11px] px-[14px] text-[12px] text-[#8a8580]">{user.designation ?? '—'}</td>
                    <td className="py-[11px] px-[14px]">
                      <span
                        className="inline-flex py-[2.5px] px-2 rounded text-[11px] font-semibold"
                        style={{ background: user.status === 'active' ? 'rgba(26,122,74,.1)' : 'rgba(185,28,28,.08)', color: user.status === 'active' ? '#15633c' : '#b91c1c' }}
                      >{user.status}</span>
                    </td>
                    <td className="py-[11px] px-[14px]">
                      <span
                        className="inline-flex py-[2.5px] px-2 rounded text-[11px] font-bold"
                        style={{ background: user.is_admin ? 'rgba(24,84,168,.1)' : '#f0efec', color: user.is_admin ? '#1854a8' : '#4a4640' }}
                      >
                        {user.is_admin ? 'Admin' : 'Member'}
                      </span>
                    </td>
                    <td className="py-[11px] px-[14px]">
                      {isSelf ? (
                        <span className="text-[11.5px] text-[#c4c0b8]">Cannot edit self</span>
                      ) : (
                        <button type="button"
                          onClick={() => handleToggleAdmin(user)}
                          disabled={isSaving}
                          className="text-[11.5px] py-[5px] px-3 rounded-[5px] font-semibold font-[inherit] transition-all duration-[130ms]"
                          style={{
                            border: `1px solid ${user.is_admin ? 'rgba(185,28,28,.25)' : 'rgba(24,84,168,.25)'}`,
                            background: user.is_admin ? 'rgba(185,28,28,.06)' : 'rgba(24,84,168,.06)',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            color: user.is_admin ? '#b91c1c' : '#1854a8',
                            opacity: isSaving ? .5 : 1,
                          }}>
                          {isSaving ? '…' : user.is_admin ? 'Revoke Admin' : 'Grant Admin'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-8 px-[14px] text-center text-[13px] text-[#8a8580]">No users match your search</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warning */}
      <div className="mt-[14px] py-3 px-4 bg-[rgba(185,28,28,.04)] border border-[rgba(185,28,28,.15)] rounded-[10px] flex gap-2 items-start">
        <span className="text-[13px] shrink-0">⚠️</span>
        <span className="text-[12px] text-[#8a8580]">Admin role grants full system access. Only grant admin to trusted personnel. All permission changes are logged in the audit trail.</span>
      </div>
    </div>
  );
}
