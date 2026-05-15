'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { kpis, users, type Kpi, type User } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function UpdatesPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [myKpis, setMyKpis] = useState<Kpi[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [form, setForm] = useState<{ current_value: string; status: string }>({ current_value: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    Promise.all([
      users.kpis(currentUser.id),
      users.list({ limit: 100 }),
    ]).then(([kpisRes, usersRes]) => {
      setMyKpis(kpisRes.data.filter((k) => k.status !== 'cancelled'));
      setAllUsers(usersRes.data);
    }).finally(() => setLoading(false));
  }, [currentUser]);

  const ownerName = (ownerId: string | null) => {
    if (!ownerId) return '—';
    return allUsers.find((u) => u.id === ownerId)?.full_name ?? '—';
  };

  const dueKpis = myKpis.filter((k) => k.next_due_date && new Date(k.next_due_date) <= new Date(Date.now() + 7 * 86400000));
  const otherKpis = myKpis.filter((k) => !dueKpis.includes(k));

  const handleOpenUpdate = (k: Kpi) => {
    setUpdating(k.id);
    setForm({ current_value: String(k.current_value ?? ''), status: k.status });
  };

  const handleSave = async (kpiId: string) => {
    setSaving(true);
    try {
      await kpis.update(kpiId, {
        current_value: form.current_value ? Number(form.current_value) : undefined,
        status: form.status as Kpi['status'],
      });
      setMyKpis((prev) =>
        prev.map((k) =>
          k.id === kpiId
            ? { ...k, current_value: form.current_value ? Number(form.current_value) : k.current_value, status: form.status as Kpi['status'] }
            : k
        )
      );
      setUpdating(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: 'var(--t3)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--near-black)' }}>My Updates</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>
          {myKpis.length} KPIs · {dueKpis.length} due within 7 days
        </p>
      </div>

      {myKpis.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ border: '2px dashed var(--border)', background: 'var(--off)' }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--t2)' }}>No KPIs assigned</p>
          <p className="text-xs" style={{ color: 'var(--t3)' }}>
            You have no owned or contributing KPIs.{' '}
            <Link href="/kpis" className="underline">Browse KPIs →</Link>
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {dueKpis.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--amber)' }}>
                ⚠ Due Soon
              </h2>
              <KpiList
                kpis={dueKpis}
                updating={updating}
                form={form}
                saving={saving}
                ownerName={ownerName}
                onOpenUpdate={handleOpenUpdate}
                onFormChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))}
                onSave={handleSave}
                onCancel={() => setUpdating(null)}
              />
            </section>
          )}
          {otherKpis.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t3)' }}>
                All My KPIs
              </h2>
              <KpiList
                kpis={otherKpis}
                updating={updating}
                form={form}
                saving={saving}
                ownerName={ownerName}
                onOpenUpdate={handleOpenUpdate}
                onFormChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))}
                onSave={handleSave}
                onCancel={() => setUpdating(null)}
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function KpiList({
  kpis: list,
  updating,
  form,
  saving,
  ownerName,
  onOpenUpdate,
  onFormChange,
  onSave,
  onCancel,
}: {
  kpis: Kpi[];
  updating: string | null;
  form: { current_value: string; status: string };
  saving: boolean;
  ownerName: (id: string | null) => string;
  onOpenUpdate: (k: Kpi) => void;
  onFormChange: (key: string, val: string) => void;
  onSave: (id: string) => void;
  onCancel: () => void;
}) {
  const statusColor: Record<string, { bg: string; color: string }> = {
    active:    { bg: 'rgba(26,122,74,.1)',  color: '#1a7a4a' },
    draft:     { bg: 'rgba(180,83,9,.1)',   color: '#b45309' },
    completed: { bg: 'rgba(24,84,168,.1)',  color: '#1854a8' },
    cancelled: { bg: 'rgba(185,28,28,.1)',  color: '#b91c1c' },
  };

  return (
    <div className="space-y-3">
      {list.map((k) => {
        const pct = k.target_value
          ? Math.min(100, Math.round(((k.current_value ?? 0) / k.target_value) * 100))
          : null;
        const s = statusColor[k.status] ?? { bg: 'rgba(0,0,0,.05)', color: '#8a8580' };
        const isUpdating = updating === k.id;

        return (
          <div
            key={k.id}
            className="rounded-xl"
            style={{ background: 'var(--card)', border: `1px solid ${isUpdating ? '#000' : 'var(--border)'}`, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}
          >
            <div className="flex items-start justify-between gap-4 p-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono" style={{ color: 'var(--t3)' }}>{k.kpi_number}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
                    {k.status}
                  </span>
                </div>
                <Link href={`/kpis/${k.id}`} className="font-semibold text-sm hover:underline" style={{ color: 'var(--t1)' }}>
                  {k.name}
                </Link>
                <div className="flex flex-wrap gap-3 mt-1.5">
                  <span className="text-xs" style={{ color: 'var(--t3)' }}>Owner: {ownerName(k.owner_id)}</span>
                  {k.next_due_date && (
                    <span className="text-xs" style={{ color: new Date(k.next_due_date) < new Date() ? 'var(--red)' : 'var(--t3)' }}>
                      Due: {new Date(k.next_due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {pct !== null && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 max-w-[140px] rounded-full h-1.5" style={{ background: 'var(--border)' }}>
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${pct}%`, background: pct >= 100 ? '#1a7a4a' : pct >= 50 ? '#1854a8' : '#b45309' }}
                      />
                    </div>
                    <span className="text-xs" style={{ color: 'var(--t3)' }}>
                      {k.current_value ?? 0} / {k.target_value} {k.unit} ({pct}%)
                    </span>
                  </div>
                )}
              </div>
              {!isUpdating && (
                <button
                  onClick={() => onOpenUpdate(k)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold shrink-0"
                  style={{ border: '1px solid var(--border)', background: 'var(--off)' }}
                >
                  Log Update
                </button>
              )}
            </div>

            {isUpdating && (
              <div className="px-5 pb-5 pt-0 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex flex-wrap gap-3 mt-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
                      Current Value {k.unit ? `(${k.unit})` : ''}
                    </label>
                    <input
                      className="fi"
                      style={{ width: 160 }}
                      type="number"
                      value={form.current_value}
                      onChange={(e) => onFormChange('current_value', e.target.value)}
                      placeholder={String(k.target_value ?? '')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Status</label>
                    <select
                      className="fi"
                      value={form.status}
                      onChange={(e) => onFormChange('status', e.target.value)}
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => onSave(k.id)}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                      style={{ background: '#000', color: '#fff' }}
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={onCancel}
                      className="px-4 py-2 rounded-lg text-xs font-semibold"
                      style={{ border: '1px solid var(--border)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
