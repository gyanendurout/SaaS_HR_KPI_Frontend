'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { kpis, users, regions, type Kpi, type User, type Region } from '@/lib/api';

function UnitTag({ unit }: { unit: string | null }) {
  if (!unit) return null;
  return <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 4, color: 'var(--t4)' }}>{unit}</span>;
}

function Badge({ label, color }: { label: string; color: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    green: { bg: 'rgba(26,122,74,.1)',  fg: '#1a7a4a' },
    blue:  { bg: 'rgba(24,84,168,.1)',  fg: '#1854a8' },
    amber: { bg: 'rgba(180,83,9,.1)',   fg: '#b45309' },
    red:   { bg: 'rgba(185,28,28,.1)',  fg: '#b91c1c' },
    gray:  { bg: 'rgba(0,0,0,.06)',     fg: '#8a8580' },
  };
  const c = map[color] ?? map.gray;
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.fg }}>
      {label}
    </span>
  );
}

const statusColor: Record<string, string> = {
  active: 'green', draft: 'amber', completed: 'blue', cancelled: 'red',
};

export default function KpiDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [children, setChildren] = useState<Kpi[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [owner, setOwner] = useState<User | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<{ current_value: string; status: string }>({ current_value: '', status: '' });
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaForm, setMetaForm] = useState<{
    name: string; description: string; type: string; period: string;
    update_frequency: string; target_value: string; unit: string;
    start_date: string; end_date: string; owner_id: string;
  }>({ name: '', description: '', type: '', period: '', update_frequency: '', target_value: '', unit: '', start_date: '', end_date: '', owner_id: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [kpiRes, childRes, usersRes, regionsRes] = await Promise.all([
        kpis.getById(id),
        kpis.children(id),
        users.list({ limit: 200 }),
        regions.list(),
      ]);
      setKpi(kpiRes.data);
      setChildren(childRes.data);
      setAllUsers(usersRes.data);
      setOwner(usersRes.data.find((u) => u.id === kpiRes.data.owner_id) ?? null);
      setRegion(regionsRes.data.find((r) => r.id === kpiRes.data.region_id) ?? null);
      setEditForm({
        current_value: String(kpiRes.data.current_value ?? ''),
        status: kpiRes.data.status,
      });
      setMetaForm({
        name: kpiRes.data.name ?? '',
        description: kpiRes.data.description ?? '',
        type: kpiRes.data.type ?? '',
        period: kpiRes.data.period ?? '',
        update_frequency: kpiRes.data.update_frequency ?? '',
        target_value: String(kpiRes.data.target_value ?? ''),
        unit: kpiRes.data.unit ?? '',
        start_date: kpiRes.data.start_date ?? '',
        end_date: kpiRes.data.end_date ?? '',
        owner_id: kpiRes.data.owner_id ?? '',
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async () => {
    if (!kpi) return;
    setSaving(true);
    try {
      await kpis.update(id, {
        current_value: editForm.current_value ? Number(editForm.current_value) : undefined,
        status: editForm.status as Kpi['status'],
      });
      await load();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!kpi || !confirm(`Cancel KPI "${kpi.name}"?`)) return;
    await kpis.cancel(id);
    router.push('/kpis');
  };

  const handleMetaUpdate = async () => {
    if (!kpi) return;
    setSaving(true);
    try {
      const { name, description, type, period, update_frequency, target_value, unit, start_date, end_date, owner_id } = metaForm;
      await kpis.update(id, {
        name, description,
        type: type as Kpi['type'],
        period: period as Kpi['period'],
        update_frequency: update_frequency as Kpi['update_frequency'],
        target_value: target_value ? Number(target_value) : undefined,
        unit: unit || undefined,
        start_date: start_date || undefined,
        end_date: end_date || undefined,
        owner_id: owner_id || undefined,
      });
      await load();
      setEditingMeta(false);
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

  if (!kpi) {
    return (
      <div className="p-8">
        <p style={{ color: 'var(--red)' }}>KPI not found.</p>
      </div>
    );
  }

  const pct = kpi.target_value
    ? Math.min(100, Math.round(((kpi.current_value ?? 0) / kpi.target_value) * 100))
    : null;

  return (
    <div className="p-8 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-6" style={{ color: 'var(--t3)' }}>
        <Link href="/kpis" className="hover:underline">KPIs</Link>
        <span>/</span>
        <span style={{ color: 'var(--t1)' }}>{kpi.kpi_number}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono" style={{ color: 'var(--t3)' }}>{kpi.kpi_number}</span>
            <Badge label={kpi.status} color={statusColor[kpi.status] ?? 'gray'} />
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--near-black)' }}>{kpi.name}</h1>
          {kpi.description && <p className="mt-2 text-sm" style={{ color: 'var(--t3)' }}>{kpi.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => setEditing(!editing)}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold"
            style={{ border: '1px solid var(--border)', background: 'var(--card)' }}
          >
            {editing ? 'Cancel Edit' : 'Update Progress'}
          </button>
          <button type="button"
            onClick={() => setEditingMeta(!editingMeta)}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold"
            style={{ border: '1px solid var(--border)', background: 'var(--card)' }}
          >
            {editingMeta ? 'Cancel Edit' : 'Edit KPI'}
          </button>
          {kpi.status !== 'cancelled' && (
            <button type="button"
              onClick={handleCancel}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold"
              style={{ border: '1px solid rgba(185,28,28,.3)', color: 'var(--red)', background: 'rgba(185,28,28,.05)' }}
            >
              Cancel KPI
            </button>
          )}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div
          className="rounded-xl p-5 mb-6 space-y-4"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <h2 className="font-bold text-sm" style={{ color: 'var(--near-black)' }}>Update Progress</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
                Current Value {kpi.unit ? `(${kpi.unit})` : ''}
              </label>
              <input
                className="fi w-full"
                type="number"
                value={editForm.current_value}
                onChange={(e) => setEditForm((f) => ({ ...f, current_value: e.target.value }))}
                placeholder={String(kpi.target_value ?? '')}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
                Status
              </label>
              <select
                className="fi w-full"
                value={editForm.status}
                onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button"
              onClick={handleUpdate}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: '#000', color: '#fff' }}
            >
              {saving ? 'Saving…' : 'Save Update'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: '1px solid var(--border)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Meta edit form */}
      {editingMeta && (
        <div
          className="rounded-xl p-5 mb-6 space-y-4"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <h2 className="font-bold text-sm" style={{ color: 'var(--near-black)' }}>Edit KPI</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Name</label>
              <input className="fi w-full" type="text" value={metaForm.name} onChange={(e) => setMetaForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Description</label>
              <input className="fi w-full" type="text" value={metaForm.description} onChange={(e) => setMetaForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Type</label>
              <select className="fi w-full" value={metaForm.type} onChange={(e) => setMetaForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="quantitative">Quantitative</option>
                <option value="qualitative">Qualitative</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Period</label>
              <select className="fi w-full" value={metaForm.period} onChange={(e) => setMetaForm((f) => ({ ...f, period: e.target.value }))}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Update Frequency</label>
              <select className="fi w-full" value={metaForm.update_frequency} onChange={(e) => setMetaForm((f) => ({ ...f, update_frequency: e.target.value }))}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Target Value</label>
              <input className="fi w-full" type="number" value={metaForm.target_value} onChange={(e) => setMetaForm((f) => ({ ...f, target_value: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Unit</label>
              <input className="fi w-full" type="text" value={metaForm.unit} onChange={(e) => setMetaForm((f) => ({ ...f, unit: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Start Date</label>
              <input className="fi w-full" type="date" value={metaForm.start_date} onChange={(e) => setMetaForm((f) => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>End Date</label>
              <input className="fi w-full" type="date" value={metaForm.end_date} onChange={(e) => setMetaForm((f) => ({ ...f, end_date: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Assign To (Owner)</label>
              <select className="fi w-full" value={metaForm.owner_id} onChange={(e) => setMetaForm((f) => ({ ...f, owner_id: e.target.value }))}>
                <option value="">— No owner —</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name}{u.designation ? ` — ${u.designation}` : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleMetaUpdate} disabled={saving} className="btn btn-black">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => setEditingMeta(false)} className="btn btn-outline">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      {pct !== null && (
        <div
          className="rounded-xl p-5 mb-6"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>Progress</span>
            <span className="text-2xl font-black" style={{ color: pct >= 100 ? '#1a7a4a' : pct >= 50 ? '#1854a8' : '#b45309' }}>
              {pct}%
            </span>
          </div>
          <div className="rounded-full h-2" style={{ background: 'var(--border)' }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${pct}%`, background: pct >= 100 ? '#1a7a4a' : pct >= 50 ? '#1854a8' : '#b45309' }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--t3)' }}>
            <span>{(kpi.current_value ?? 0).toLocaleString()}<UnitTag unit={kpi.unit ?? null} /></span>
            <span>Target: {(kpi.target_value ?? 0).toLocaleString()}<UnitTag unit={kpi.unit ?? null} /></span>
          </div>
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { label: 'Owner', value: owner?.full_name ?? '—' },
          { label: 'Region', value: region?.name ?? '—' },
          { label: 'Type', value: kpi.type },
          { label: 'Period', value: kpi.period },
          { label: 'Update Frequency', value: kpi.update_frequency },
          { label: 'Allocation', value: `${kpi.allocation_pct}%` },
          { label: 'Level', value: `Level ${kpi.level}` },
          { label: 'Start Date', value: kpi.start_date ? new Date(kpi.start_date).toLocaleDateString() : '—' },
          { label: 'End Date', value: kpi.end_date ? new Date(kpi.end_date).toLocaleDateString() : '—' },
          { label: 'Next Due', value: kpi.next_due_date ? new Date(kpi.next_due_date).toLocaleDateString() : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>{label}</p>
            <p className="text-sm font-semibold capitalize" style={{ color: 'var(--t1)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Children */}
      {children.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-bold text-sm" style={{ color: 'var(--near-black)' }}>Child KPIs ({children.length})</h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {children.map((c) => (
              <Link
                key={c.id}
                href={`/kpis/${c.id}`}
                className="flex items-center justify-between px-5 py-3 hover:opacity-80 block"
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>{c.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>{c.kpi_number} · {c.allocation_pct}% allocation</p>
                </div>
                <Badge label={c.status} color={statusColor[c.status] ?? 'gray'} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
