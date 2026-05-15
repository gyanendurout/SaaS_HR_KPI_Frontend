'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { kpis, type Kpi } from '@/lib/api';

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
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<{ current_value: string; status: string }>({ current_value: '', status: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [kpiRes, childRes] = await Promise.all([
          kpis.getById(id),
          kpis.children(id),
        ]);
        setKpi(kpiRes.data);
        setChildren(childRes.data);
        setEditForm({
          current_value: String(kpiRes.data.current_value ?? ''),
          status: kpiRes.data.status,
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleUpdate = async () => {
    if (!kpi) return;
    setSaving(true);
    try {
      const res = await kpis.update(id, {
        current_value: editForm.current_value ? Number(editForm.current_value) : undefined,
        status: editForm.status as Kpi['status'],
      });
      setKpi(res.data);
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
          <button
            onClick={() => setEditing(!editing)}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold"
            style={{ border: '1px solid var(--border)', background: 'var(--card)' }}
          >
            {editing ? 'Cancel Edit' : 'Update Progress'}
          </button>
          {kpi.status !== 'cancelled' && (
            <button
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
            <button
              onClick={handleUpdate}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: '#000', color: '#fff' }}
            >
              {saving ? 'Saving…' : 'Save Update'}
            </button>
            <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: '1px solid var(--border)' }}>
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
            <span>{kpi.current_value ?? 0} {kpi.unit}</span>
            <span>{kpi.target_value} {kpi.unit} target</span>
          </div>
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
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
