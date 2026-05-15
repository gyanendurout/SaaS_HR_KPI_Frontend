'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { kpis, cascade, regions, type Kpi, type Region, type CascadeSummary } from '@/lib/api';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active:    { bg: 'rgba(26,122,74,.1)',  color: '#1a7a4a' },
    draft:     { bg: 'rgba(180,83,9,.1)',   color: '#b45309' },
    completed: { bg: 'rgba(24,84,168,.1)',  color: '#1854a8' },
    cancelled: { bg: 'rgba(185,28,28,.1)',  color: '#b91c1c' },
  };
  const s = map[status] ?? { bg: 'rgba(0,0,0,.05)', color: '#8a8580' };
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

export default function CascadePage() {
  const [rootKpis, setRootKpis] = useState<Kpi[]>([]);
  const [selectedParent, setSelectedParent] = useState<string>('');
  const [summary, setSummary] = useState<CascadeSummary | null>(null);
  const [regionList, setRegionList] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    Promise.all([
      kpis.list({ limit: 100, status: 'active' }),
      regions.list(),
    ]).then(([kRes, rRes]) => {
      const topLevel = kRes.data.filter((k) => !k.parent_id);
      setRootKpis(topLevel);
      if (topLevel.length > 0) setSelectedParent(topLevel[0].id);
      setRegionList(rRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const loadSummary = useCallback(async (parentId: string) => {
    if (!parentId) return;
    setLoadingSummary(true);
    try {
      const res = await cascade.summary(parentId);
      setSummary(res.data);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    if (selectedParent) loadSummary(selectedParent);
  }, [selectedParent, loadSummary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: 'var(--t3)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--near-black)' }}>KPI Cascade</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>Break parent KPIs into child KPIs with allocation %</p>
        </div>
        {selectedParent && summary && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80"
            style={{ background: '#000', color: '#fff' }}
            disabled={summary.remaining_pct <= 0}
          >
            + Add Child KPI
          </button>
        )}
      </div>

      {/* Parent selector */}
      <div className="mb-6">
        <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
          Select Parent KPI
        </label>
        {rootKpis.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--t3)' }}>
            No active root KPIs found.{' '}
            <Link href="/kpis" className="underline">Create one first.</Link>
          </p>
        ) : (
          <select
            className="fi"
            style={{ minWidth: 320 }}
            value={selectedParent}
            onChange={(e) => setSelectedParent(e.target.value)}
          >
            {rootKpis.map((k) => (
              <option key={k.id} value={k.id}>{k.kpi_number} — {k.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Summary */}
      {loadingSummary && (
        <div className="text-sm" style={{ color: 'var(--t3)' }}>Loading cascade…</div>
      )}
      {!loadingSummary && summary && (
        <>
          {/* Allocation bar */}
          <div
            className="rounded-xl p-5 mb-6"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--near-black)' }}>{summary.parent.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>{summary.parent.kpi_number}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold" style={{ color: 'var(--t3)' }}>Allocation</p>
                <p className="text-lg font-black" style={{ color: summary.remaining_pct > 0 ? 'var(--near-black)' : 'var(--red)' }}>
                  {summary.allocated_pct}% / 100%
                </p>
              </div>
            </div>
            <div className="rounded-full h-3" style={{ background: 'var(--border)' }}>
              <div
                className="h-3 rounded-full transition-all"
                style={{
                  width: `${summary.allocated_pct}%`,
                  background: summary.allocated_pct >= 100 ? '#b91c1c' : '#1a7a4a',
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--t3)' }}>
              <span>{summary.allocated_pct}% allocated</span>
              <span style={{ color: summary.remaining_pct <= 0 ? 'var(--red)' : 'var(--green)' }}>
                {summary.remaining_pct}% remaining
              </span>
            </div>
          </div>

          {/* Children table */}
          {summary.children.length === 0 ? (
            <div
              className="rounded-xl p-8 text-center"
              style={{ border: '2px dashed var(--border)', background: 'var(--off)' }}
            >
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--t2)' }}>No child KPIs yet</p>
              <p className="text-xs" style={{ color: 'var(--t3)' }}>Click &quot;Add Child KPI&quot; to cascade this KPI</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--off)' }}>
                    {['KPI No', 'Name', 'Allocation', 'Status', 'Progress', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {summary.children.map((child) => {
                    const pct = child.target_value
                      ? Math.min(100, Math.round(((child.current_value ?? 0) / child.target_value) * 100))
                      : null;
                    return (
                      <tr key={child.id} className="hover:bg-[var(--off)] transition-colors">
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--t3)' }}>{child.kpi_number}</td>
                        <td className="px-4 py-3">
                          <Link href={`/kpis/${child.id}`} className="font-semibold hover:underline" style={{ color: 'var(--t1)' }}>
                            {child.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{child.allocation_pct}%</span>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={child.status} /></td>
                        <td className="px-4 py-3">
                          {pct !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 rounded-full h-1.5 max-w-[80px]" style={{ background: 'var(--border)' }}>
                                <div
                                  className="h-1.5 rounded-full"
                                  style={{ width: `${pct}%`, background: pct >= 100 ? '#1a7a4a' : '#1854a8' }}
                                />
                              </div>
                              <span className="text-xs" style={{ color: 'var(--t3)' }}>{pct}%</span>
                            </div>
                          ) : <span className="text-xs" style={{ color: 'var(--t4)' }}>—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={async () => {
                              if (!confirm(`Remove "${child.name}" from cascade?`)) return;
                              await cascade.remove(selectedParent, child.id);
                              loadSummary(selectedParent);
                            }}
                            className="text-xs px-2 py-1 rounded"
                            style={{ color: 'var(--red)', background: 'rgba(185,28,28,.08)' }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showCreate && summary && (
        <AddChildModal
          parent={summary.parent}
          remainingPct={summary.remaining_pct}
          regions={regionList}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); loadSummary(selectedParent); }}
        />
      )}
    </div>
  );
}

function AddChildModal({
  parent,
  remainingPct,
  regions: regionList,
  onClose,
  onSaved,
}: {
  parent: Kpi;
  remainingPct: number;
  regions: Region[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    type: 'quantitative',
    period: 'quarterly',
    update_frequency: 'monthly',
    target_value: '',
    unit: parent.unit ?? '',
    allocation_pct: String(Math.min(remainingPct, 50)),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name) { setError('Name is required'); return; }
    const alloc = Number(form.allocation_pct);
    if (alloc <= 0 || alloc > remainingPct) { setError(`Allocation must be between 1–${remainingPct}%`); return; }
    setSaving(true);
    setError('');
    try {
      await cascade.create(parent.id, {
        name: form.name,
        type: form.type as 'quantitative' | 'qualitative',
        period: form.period as 'monthly' | 'quarterly' | 'annual',
        update_frequency: form.update_frequency as 'weekly' | 'monthly' | 'quarterly',
        target_value: form.target_value ? Number(form.target_value) : undefined,
        unit: form.unit || undefined,
        allocation_pct: alloc,
        region_id: parent.region_id,
      });
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create child KPI');
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
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'var(--card)', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-black text-base" style={{ color: 'var(--near-black)' }}>Add Child KPI</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>
              Under: {parent.kpi_number} · {remainingPct}% available
            </p>
          </div>
          <button onClick={onClose} className="text-lg" style={{ color: 'var(--t3)' }}>×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Name *</label>
            <input className="fi w-full" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Child KPI name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Allocation % *</label>
              <input className="fi w-full" type="number" min="1" max={remainingPct} value={form.allocation_pct} onChange={(e) => set('allocation_pct', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Target Value</label>
              <input className="fi w-full" type="number" value={form.target_value} onChange={(e) => set('target_value', e.target.value)} placeholder="e.g. 300000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Type</label>
              <select className="fi w-full" value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="quantitative">Quantitative</option>
                <option value="qualitative">Qualitative</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Period</label>
              <select className="fi w-full" value={form.period} onChange={(e) => set('period', e.target.value)}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>
          {error && <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ border: '1px solid var(--border)' }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: '#000', color: '#fff' }}
          >
            {saving ? 'Saving…' : 'Add Child KPI'}
          </button>
        </div>
      </div>
    </div>
  );
}
