'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { users, regions, type User, type Region } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const LIMIT = 20;
const AVATAR_COLORS = ['#1a7a4a', '#1854a8', '#6b21a8', '#b45309', '#0e7490', '#be185d'];

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const ini = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const bg  = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-bold shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.35 }}
    >
      {ini}
    </div>
  );
}

export default function PeoplePage() {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin     = currentUser?.is_admin ?? false;
  const userId      = currentUser?.id;

  const [data, setData]               = useState<User[]>([]);
  const [total, setTotal]             = useState(0);
  const [regionList, setRegionList]   = useState<Region[]>([]);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [loading, setLoading]         = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [editUser, setEditUser]       = useState<User | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    if (!isAdmin) {
      setData([currentUser as User]);
      setTotal(1);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await users.list({ page, limit: LIMIT, search: search || undefined, status: filterStatus || undefined });
      setData(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  // currentUser object is only needed for the non-admin branch; depend on userId to avoid
  // refetching whenever the auth store re-renders with an unchanged user.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, userId, page, search, filterStatus]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { regions.list().then((r) => setRegionList(r.data)).catch(() => {}); }, []);

  const handleDeactivate = useCallback(async (u: User) => {
    if (!confirm(`Deactivate ${u.full_name}?`)) return;
    await users.deactivate(u.id);
    load();
  }, [load]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-near-black">
            {isAdmin ? 'People' : 'My Profile'}
          </h1>
          <p className="text-sm mt-0.5 text-t3">
            {isAdmin ? `${total} members` : 'Your account details'}
          </p>
        </div>
        {isAdmin && (
          <button type="button" onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80 bg-black text-white">
            + Add Member
          </button>
        )}
      </div>

      {/* Filters — admins only */}
      {isAdmin && (
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="rounded-lg px-3.5 py-2 text-sm outline-none border-[1.5px] border-border bg-card w-65"
          />
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="rounded-lg px-3.5 py-2 text-sm outline-none border-[1.5px] border-border bg-card text-t2"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40"><p className="text-sm text-t3">Loading…</p></div>
      ) : data.length === 0 ? (
        <div className="rounded-xl p-10 text-center border-2 border-dashed border-border bg-off">
          <p className="text-sm font-semibold text-t2">No members found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((u) => (
            <div key={u.id} className="rounded-xl p-4 bg-card border border-border shadow-[0_1px_3px_rgba(0,0,0,.04)]">
              <div className="flex items-start gap-3">
                <Avatar name={u.full_name} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate text-t1">{u.full_name}</p>
                  <p className="text-xs truncate mt-0.5 text-t3">{u.designation ?? 'No title'}</p>
                  <p className="text-xs truncate mt-0.5 text-t4">{u.email}</p>
                  <p className="text-xs truncate mt-0.5 text-t4">{u.phone}</p>
                </div>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: u.status === 'active' ? 'rgba(26,122,74,.1)' : 'rgba(0,0,0,.05)',
                    color:      u.status === 'active' ? '#1a7a4a' : '#8a8580',
                  }}
                >
                  {u.status}
                </span>
              </div>
              <div className="mt-3 pt-3 flex items-center justify-between border-t border-border">
                <div className="flex gap-3">
                  {u.department && <span className="text-xs text-t3">{u.department}</span>}
                  <span className="text-xs font-mono text-t4">{u.employee_code}</span>
                </div>
                {isAdmin && (
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => setEditUser(u)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-border text-t2">
                      Edit
                    </button>
                    {u.status === 'active' && u.id !== userId && (
                      <button type="button" onClick={() => handleDeactivate(u)}
                        className="text-xs px-2.5 py-1 rounded-lg text-brand-red bg-[rgba(185,28,28,.06)] border border-[rgba(185,28,28,.2)]">
                        Deactivate
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination — admins only */}
      {isAdmin && total > LIMIT && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-t3">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 border border-border bg-card">← Prev</button>
            <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page * LIMIT >= total}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 border border-border bg-card">Next →</button>
          </div>
        </div>
      )}

      {showCreate && (
        <UserModal
          mode="create"
          regions={regionList}
          allUsers={data}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load(); }}
        />
      )}
      {editUser && (
        <UserModal
          mode="edit"
          user={editUser}
          regions={regionList}
          allUsers={data}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); load(); }}
        />
      )}
    </div>
  );
}

// ─── UserModal ────────────────────────────────────────────────────────────────

type FormState = {
  full_name: string; email: string; password: string;
  phone: string; designation: string; department: string;
  region_id: string; manager_id: string; is_admin: boolean;
};

function UserModal({
  mode, user, regions: regionList, allUsers, onClose, onSaved,
}: {
  mode: 'create' | 'edit';
  user?: User;
  regions: Region[];
  allUsers: User[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    full_name:   user?.full_name   ?? '',
    email:       user?.email       ?? '',
    password:    '',
    phone:       user?.phone       ?? '',
    designation: user?.designation ?? '',
    department:  user?.department  ?? '',
    region_id:   user?.region_id   ?? regionList[0]?.id ?? '',
    manager_id:  user?.manager_id  ?? '',
    is_admin:    user?.is_admin    ?? false,
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const eligibleManagers = useMemo(
    () => allUsers.filter((u) => u.id !== user?.id),
    [allUsers, user?.id],
  );

  const handleSave = async () => {
    setError('');
    if (mode === 'create' && (!form.full_name || !form.email || !form.password)) {
      setError('Name, email and password are required');
      return;
    }
    setSaving(true);
    try {
      if (mode === 'create') {
        await users.create({
          full_name:   form.full_name,
          email:       form.email,
          password:    form.password,
          phone:       form.phone       || undefined,
          designation: form.designation || undefined,
          department:  form.department  || undefined,
          region_id:   form.region_id   || undefined,
          manager_id:  form.manager_id  || undefined,
          is_admin:    form.is_admin,
        });
      } else if (user) {
        await users.update(user.id, {
          full_name:   form.full_name,
          phone:       form.phone       || undefined,
          designation: form.designation || undefined,
          department:  form.department  || undefined,
          region_id:   form.region_id   || undefined,
          manager_id:  form.manager_id  || null,
          is_admin:    form.is_admin,
        });
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(0,0,0,.5)]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl overflow-hidden bg-card shadow-[0_20px_60px_rgba(0,0,0,.2)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-black text-base text-near-black">{mode === 'create' ? 'Add Member' : 'Edit Member'}</h2>
          <button type="button" onClick={onClose} className="text-lg text-t3 cursor-pointer">×</button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-t3">Full Name *</label>
            <input className="fi w-full" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
          </div>
          {mode === 'create' && (<>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-t3">Email *</label>
              <input className="fi w-full" type="email" autoComplete="off" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-t3">Password *</label>
              <input className="fi w-full" type="password" autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Min 8 chars" />
            </div>
          </>)}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-t3">Designation</label>
              <input className="fi w-full" value={form.designation} onChange={(e) => set('designation', e.target.value)} placeholder="e.g. Manager" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-t3">Department</label>
              <input className="fi w-full" value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="e.g. Sales" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-t3">Region</label>
              <select className="fi w-full" value={form.region_id} onChange={(e) => set('region_id', e.target.value)}>
                <option value="">None</option>
                {regionList.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-t3">Manager</label>
              <select className="fi w-full" value={form.manager_id} onChange={(e) => set('manager_id', e.target.value)}>
                <option value="">None</option>
                {eligibleManagers.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-t3">Phone</label>
            <input className="fi w-full" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_admin} onChange={(e) => set('is_admin', e.target.checked)} className="rounded" />
            <span className="text-sm font-semibold text-t2">Admin access</span>
          </label>
          {error && <p className="text-xs text-brand-red">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold border border-border cursor-pointer">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 bg-black text-white cursor-pointer">
            {saving ? 'Saving…' : mode === 'create' ? 'Add Member' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
