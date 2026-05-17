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
      <div style={{ padding: '22px 26px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(185,28,28,.08)', border: '1.5px solid rgba(185,28,28,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111110', marginBottom: 6 }}>Admin Access Required</div>
          <p style={{ fontSize: 13, color: '#8a8580', maxWidth: 320, lineHeight: 1.6 }}>You need administrator privileges to manage permissions. Contact your system administrator if you believe you should have access.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, color: '#8a8580', fontSize: 13 }}>Loading…</div>;

  return (
    <div style={{ padding: '22px 26px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', marginBottom: 3, color: '#111110' }}>Permissions</div>
        <div style={{ fontSize: 12, color: '#8a8580' }}>Manage admin access and user roles across the organization</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total Users', value: allUsers.length, color: '#111110' },
          { label: 'Active', value: activeCount, color: '#1a7a4a' },
          { label: 'Admins', value: adminCount, color: '#1854a8' },
          { label: 'Inactive', value: allUsers.length - activeCount, color: '#b91c1c' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#8a8580', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: '-.5px' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Role legend */}
      <div style={{ background: '#f8f7f5', border: '1px solid #e2dfd8', borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {[
          { role: 'Admin', color: '#1854a8', desc: 'Full access — manage users, approve KPIs, view all regions, manage permissions' },
          { role: 'Member', color: '#4a4640', desc: 'Standard access — view & update own KPIs, view org chart, submit updates' },
        ].map((r) => (
          <div key={r.role} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ display: 'inline-flex', padding: '2.5px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: r.color === '#1854a8' ? 'rgba(24,84,168,.1)' : '#f0efec', color: r.color, flexShrink: 0, marginTop: 1 }}>{r.role}</span>
            <span style={{ fontSize: 12, color: '#8a8580', lineHeight: 1.5 }}>{r.desc}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 14 }}>
        <input
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#111110', fontFamily: 'inherit', outline: 'none', width: 280 }}
          onFocus={(e) => (e.target.style.borderColor = '#000')}
          onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')}
        />
      </div>

      {/* Users table */}
      <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.07)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #e2dfd8', background: '#f0efec' }}>
                {['User', 'Email', 'Designation', 'Status', 'Role', 'Actions'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#8a8580', textTransform: 'uppercase', letterSpacing: 1, padding: '9px 14px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const isSelf = user.id === currentUser?.id;
                const isSaving = saving === user.id;
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid #e2dfd8', opacity: user.status === 'inactive' ? .6 : 1 }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = '#f8f7f5'}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: user.is_admin ? '#1854a8' : '#e4e1db', display: 'flex', alignItems: 'center', justifyContent: 'center', color: user.is_admin ? '#fff' : '#4a4640', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                          {user.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#111110' }}>
                            {user.full_name}
                            {isSelf && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: '#f0efec', color: '#8a8580' }}>You</span>}
                          </div>
                          <div style={{ fontSize: 11, color: '#8a8580', fontFamily: 'monospace' }}>{user.employee_code}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#4a4640' }}>{user.email}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#8a8580' }}>{user.designation ?? '—'}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ display: 'inline-flex', padding: '2.5px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: user.status === 'active' ? 'rgba(26,122,74,.1)' : 'rgba(185,28,28,.08)', color: user.status === 'active' ? '#15633c' : '#b91c1c' }}>{user.status}</span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ display: 'inline-flex', padding: '2.5px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: user.is_admin ? 'rgba(24,84,168,.1)' : '#f0efec', color: user.is_admin ? '#1854a8' : '#4a4640' }}>
                        {user.is_admin ? 'Admin' : 'Member'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {isSelf ? (
                        <span style={{ fontSize: 11.5, color: '#c4c0b8' }}>Cannot edit self</span>
                      ) : (
                        <button type="button"
                          onClick={() => handleToggleAdmin(user)}
                          disabled={isSaving}
                          style={{ fontSize: 11.5, padding: '5px 12px', borderRadius: 5, border: `1px solid ${user.is_admin ? 'rgba(185,28,28,.25)' : 'rgba(24,84,168,.25)'}`, background: user.is_admin ? 'rgba(185,28,28,.06)' : 'rgba(24,84,168,.06)', cursor: isSaving ? 'not-allowed' : 'pointer', color: user.is_admin ? '#b91c1c' : '#1854a8', fontFamily: 'inherit', fontWeight: 600, opacity: isSaving ? .5 : 1, transition: 'all .13s' }}>
                          {isSaving ? '…' : user.is_admin ? 'Revoke Admin' : 'Grant Admin'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '32px 14px', textAlign: 'center', fontSize: 13, color: '#8a8580' }}>No users match your search</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warning */}
      <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(185,28,28,.04)', border: '1px solid rgba(185,28,28,.15)', borderRadius: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 13, flexShrink: 0 }}>⚠️</span>
        <span style={{ fontSize: 12, color: '#8a8580' }}>Admin role grants full system access. Only grant admin to trusted personnel. All permission changes are logged in the audit trail.</span>
      </div>
    </div>
  );
}
