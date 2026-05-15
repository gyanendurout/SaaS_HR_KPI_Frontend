'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { kpis, regions, type Kpi, type Region } from '@/lib/api';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active:    { bg: 'rgba(26,122,74,.1)',  color: '#1a7a4a' },
    draft:     { bg: 'rgba(180,83,9,.1)',   color: '#b45309' },
    completed: { bg: 'rgba(24,84,168,.1)',  color: '#1854a8' },
    cancelled: { bg: 'rgba(185,28,28,.1)',  color: '#b91c1c' },
  };
  const s = map[status] ?? { bg: 'rgba(0,0,0,.05)', color: '#8a8580' };
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

export default function KpisPage() {
  const [data, setData] = useState<Kpi[]>([]);
  const [regionList, setRegionList] = useState<Region[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await kpis.list({
        page,
        limit: LIMIT,
        status: filterStatus || undefined,
        region_id: filterRegion || undefined,
      });
      setData(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterRegion]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    regions.list().then((r) => setRegionList(r.data)).catch(() => {});
  }, []);

  const filtered = search
    ? data.filter(
        (k) =>
          k.name.toLowerCase().includes(search.toLowerCase()) ||
          k.kpi_number.toLowerCase().includes(search.toLowerCase())
      )
    : data;

  const progress = (k: Kpi) => {
    if (!k.target_value || k.target_value === 0) return null;
    return Math.min(100, Math.round(((k.current_value ?? 0) / k.target_value) * 100));
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--near-black)' }}>KPIs</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>{total} total</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: '#000', color: '#fff' }}
        >
          + New KPI
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          placeholder="Search KPIs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg px-3.5 py-2 text-sm outline-none"
          style={{ border: '1.5px solid var(--border)', background: 'var(--card)', width: 220 }}
        />
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="rounded-lg px-3.5 py-2 text-sm outline-none"
          style={{ border: '1.5px solid var(--border)', background: 'var(--card)', color: 'var(--t2)' }}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={filterRegion}
          onChange={(e) => { setFilterRegion(e.target.value); setPage(1); }}
          className="rounded-lg px-3.5 py-2 text-sm outline-none"
          style={{ border: '1.5px solid var(--border)', background: 'var(--card)', color: 'var(--t2)' }}
        >
          <option value="">All Regions</option>
          {regionList.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--off)' }}>
              {['KPI No', 'Name', 'Type', 'Status', 'Progress', 'Due Date', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--t3)' }}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--t3)' }}>
                  No KPIs found.
                </td>
              </tr>
            )}
            {filtered.map((k) => {
              const pct = progress(k);
              return (
                <tr key={k.id} className="hover:bg-[var(--off)] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--t3)' }}>{k.kpi_number}</td>
                  <td className="px-4 py-3">
                    <Link href={`/kpis/${k.id}`} className="font-semibold hover:underline" style={{ color: 'var(--t1)' }}>
                      {k.name}
                    </Link>
                    {k.description && (
                      <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: 'var(--t3)' }}>{k.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs capitalize" style={{ color: 'var(--t3)' }}>{k.type}</td>
                  <td className="px-4 py-3"><StatusBadge status={k.status} /></td>
                  <td className="px-4 py-3">
                    {pct !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-full h-1.5 max-w-[80px]" style={{ background: 'var(--border)' }}>
                          <div
                            className="h-1.5 rounded-full"
                            style={{ width: `${pct}%`, background: pct >= 100 ? '#1a7a4a' : pct >= 50 ? '#1854a8' : '#b45309' }}
                          />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: 'var(--t3)' }}>{pct}%</span>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--t4)' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--t3)' }}>
                    {k.next_due_date ? new Date(k.next_due_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/kpis/${k.id}`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: 'var(--off)', color: 'var(--t2)', border: '1px solid var(--border)' }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs" style={{ color: 'var(--t3)' }}>
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
              style={{ border: '1px solid var(--border)', background: 'var(--card)' }}
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * LIMIT >= total}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
              style={{ border: '1px solid var(--border)', background: 'var(--card)' }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateKpiModal
          regions={regionList}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}

function CreateKpiModal({
  regions: regionList,
  onClose,
  onSaved,
}: {
  regions: Region[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'quantitative',
    period: 'quarterly',
    update_frequency: 'monthly',
    target_value: '',
    unit: '',
    start_date: '',
    end_date: '',
    allocation_pct: '100',
    region_id: regionList[0]?.id ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.region_id) { setError('Name and region are required'); return; }
    setSaving(true);
    setError('');
    try {
      await kpis.create({
        name: form.name,
        description: form.description || undefined,
        type: form.type as 'quantitative' | 'qualitative',
        period: form.period as 'monthly' | 'quarterly' | 'annual',
        update_frequency: form.update_frequency as 'weekly' | 'monthly' | 'quarterly',
        target_value: form.target_value ? Number(form.target_value) : undefined,
        unit: form.unit || undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        allocation_pct: Number(form.allocation_pct),
        region_id: form.region_id,
      });
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create KPI');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: 'var(--card)', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-black text-base" style={{ color: 'var(--near-black)' }}>New KPI</h2>
          <button onClick={onClose} className="text-lg" style={{ color: 'var(--t3)' }}>×</button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <Field label="Name *">
            <input className="fi w-full" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="KPI name" />
          </Field>
          <Field label="Description">
            <textarea className="fi w-full" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional description" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select className="fi w-full" value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="quantitative">Quantitative</option>
                <option value="qualitative">Qualitative</option>
              </select>
            </Field>
            <Field label="Period">
              <select className="fi w-full" value={form.period} onChange={(e) => set('period', e.target.value)}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Update Frequency">
              <select className="fi w-full" value={form.update_frequency} onChange={(e) => set('update_frequency', e.target.value)}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </Field>
            <Field label="Region *">
              <select className="fi w-full" value={form.region_id} onChange={(e) => set('region_id', e.target.value)}>
                {regionList.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Target Value">
              <input className="fi w-full" type="number" value={form.target_value} onChange={(e) => set('target_value', e.target.value)} placeholder="e.g. 1000000" />
            </Field>
            <Field label="Unit">
              <input className="fi w-full" value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="USD, %, etc." />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date">
              <input className="fi w-full" type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </Field>
            <Field label="End Date">
              <input className="fi w-full" type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </Field>
          </div>
          {error && <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: '#000', color: '#fff' }}
          >
            {saving ? 'Saving…' : 'Create KPI'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}
