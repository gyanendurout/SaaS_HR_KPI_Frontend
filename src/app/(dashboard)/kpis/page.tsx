'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { kpis, users, regions, type Kpi, type User, type Region } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active:    { bg: 'rgba(26,122,74,.1)',  color: '#15633c' },
    draft:     { bg: 'rgba(180,83,9,.1)',   color: '#b45309' },
    completed: { bg: 'rgba(24,84,168,.1)',  color: '#1854a8' },
    cancelled: { bg: 'rgba(185,28,28,.1)',  color: '#b91c1c' },
  };
  const s = map[status] ?? { bg: 'rgba(0,0,0,.05)', color: '#8a8580' };
  return (
    <span
      className="inline-flex items-center py-[2.5px] px-2 rounded text-[11px] font-semibold shrink-0"
      style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

type TabId = 'owned' | 'all' | 'cascaded' | 'draft';

export default function KpisPage() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.is_admin ?? false;

  const [data, setData] = useState<Kpi[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [regionList, setRegionList] = useState<Region[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>(isAdmin ? 'all' : 'owned');
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
        owner_id: isAdmin ? undefined : (currentUser?.id ?? undefined),
      });
      setData(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterRegion, isAdmin, currentUser?.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    users.list({ limit: 100 }).then((r) => setAllUsers(r.data)).catch(() => {});
    regions.list().then((r) => setRegionList(r.data)).catch(() => {});
  }, []);

  const searched = search
    ? data.filter((k) => k.name.toLowerCase().includes(search.toLowerCase()) || k.kpi_number.toLowerCase().includes(search.toLowerCase()))
    : data;

  const ownedKpis    = isAdmin ? searched.filter((k) => k.owner_id === currentUser?.id) : searched;
  const cascadedKpis = searched.filter((k) => k.parent_id !== null);
  const draftKpis    = searched.filter((k) => k.status === 'draft');

  const tabKpis: Record<TabId, Kpi[]> = {
    owned: ownedKpis,
    all: searched,
    cascaded: cascadedKpis,
    draft: draftKpis,
  };

  const tabs: { id: TabId; label: string; count: number }[] = isAdmin
    ? [
        { id: 'all',      label: 'All KPIs',        count: searched.length },
        { id: 'owned',    label: 'Owned by Me',      count: ownedKpis.length },
        { id: 'cascaded', label: 'Cascaded',         count: cascadedKpis.length },
        { id: 'draft',    label: 'Pending Approval', count: draftKpis.length },
      ]
    : [
        { id: 'owned',    label: 'My KPIs',          count: ownedKpis.length },
        { id: 'cascaded', label: 'Cascaded',         count: cascadedKpis.length },
        { id: 'draft',    label: 'Pending Approval', count: draftKpis.length },
      ];

  const displayKpis = tabKpis[activeTab];

  const progress = (k: Kpi) => {
    if (!k.target_value || k.target_value === 0) return null;
    return Math.min(100, Math.round(((k.current_value ?? 0) / k.target_value) * 100));
  };

  return (
    <div>
      {/* Black Hero */}
      <div className="bg-black py-5 px-6.5 relative overflow-hidden">
        <div aria-hidden className="absolute -right-2.5 top-1/2 -translate-y-1/2 text-[80px] font-black text-white/4 tracking-[-3px] pointer-events-none select-none leading-none">
          MY KPIs
        </div>
        <div className="text-[10px] font-bold text-white/35 uppercase tracking-[1.5px] mb-1.25">
          {isAdmin ? 'Admin · All KPIs' : 'My KPI Portfolio'}
        </div>
        <div className="text-[22px] font-black text-white tracking-[-0.4px] mb-0.75">
          {isAdmin ? 'Organisation KPIs' : 'My KPIs'}
        </div>
        <div className="text-[12.5px] text-white/45 mb-4">
          {isAdmin ? 'All KPIs across the organisation — admin view' : 'KPIs you own or are responsible for'}
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { v: data.filter((k) => k.status === 'active').length, l: 'Active' },
            { v: ownedKpis.length,    l: 'Owned'    },
            { v: cascadedKpis.length, l: 'Cascaded' },
            { v: draftKpis.length,    l: 'Pending'  },
          ].map(({ v, l }) => (
            <div key={l} className="bg-white/7 border border-white/10 rounded-[9px] py-3 px-3.5">
              <div className="text-[24px] font-black tracking-[-0.5px] leading-none mb-0.5 text-white">{v}</div>
              <div className="text-[10px] text-white/38 uppercase tracking-[1px]">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs + Content */}
      <div className="px-6.5">
        {/* Tab bar */}
        <div className="flex border-b-2 border-border bg-card">
          {tabs.map((t) => (
            <button type="button"
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="py-2.25 px-4.5 text-[13px] cursor-pointer border-none bg-transparent font-[inherit] flex items-center gap-1.5 transition-all duration-140 -mb-0.5"
              style={{
                fontWeight: activeTab === t.id ? 700 : 500,
                color: activeTab === t.id ? '#000' : '#4a4640',
                borderBottom: `2.5px solid ${activeTab === t.id ? '#000' : 'transparent'}`,
              }}>
              {t.label}
              <span className="text-[10px] font-bold py-[1.5px] px-1.5 rounded-[10px]"
                style={{ background: activeTab === t.id ? '#000' : '#e8e6e1', color: activeTab === t.id ? '#fff' : '#8a8580' }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2.5 py-3.5">
          <input
            placeholder="Search KPIs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-card border-[1.5px] border-border rounded-md py-2 px-3 text-near-black font-[inherit] text-[13px] outline-none w-55 transition-[border-color] focus:border-black"
          />
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="bg-card border-[1.5px] border-border rounded-md py-2 px-3 text-t2 font-[inherit] text-[13px] outline-none">
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={filterRegion}
            onChange={(e) => { setFilterRegion(e.target.value); setPage(1); }}
            className="bg-card border-[1.5px] border-border rounded-md py-2 px-3 text-t2 font-[inherit] text-[13px] outline-none">
            <option value="">All Regions</option>
            {regionList.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <div className="ml-auto">
            <button type="button"
              onClick={() => router.push('/kpis/new')}
              className="inline-flex items-center gap-1.25 py-2 px-3.5 rounded-md text-[12.5px] font-[inherit] font-semibold cursor-pointer bg-black text-white border border-black transition-opacity hover:opacity-85">
              + New KPI
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-card overflow-hidden shadow-card mb-5">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-[1.5px] border-border bg-[#f0efec]">
                {['KPI No', 'Name', 'Type', 'Status', 'Progress', 'Due Date', ''].map((h) => (
                  <th key={h} className="text-left text-[10px] font-bold text-t3 uppercase tracking-[1px] py-2.25 px-3.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="py-8 px-3.5 text-center text-[13px] text-t3">Loading…</td></tr>
              )}
              {!loading && displayKpis.length === 0 && (
                <tr><td colSpan={7} className="py-8 px-3.5 text-center text-[13px] text-t3">No KPIs found.</td></tr>
              )}
              {displayKpis.map((k) => {
                const pct = progress(k);
                const owner = allUsers.find((u) => u.id === k.owner_id);
                return (
                  <tr key={k.id}
                    className="border-b border-border transition-colors duration-100 cursor-pointer"
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#f8f7f5')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                    <td className="py-2.75 px-3.5">
                      <span className="inline-flex py-0.5 px-1.75 rounded-[3px] text-[10px] font-bold tracking-[.3px] bg-bg3 text-t2 font-mono">{k.kpi_number}</span>
                    </td>
                    <td className="py-2.75 px-3.5">
                      <Link href={`/kpis/${k.id}`} className="text-near-black font-semibold no-underline text-[13px]">{k.name}</Link>
                      {owner && <div className="text-[11px] text-t3 mt-px">{owner.full_name}</div>}
                    </td>
                    <td className="py-2.75 px-3.5 text-xs text-t3 capitalize whitespace-nowrap">{k.type}</td>
                    <td className="py-2.75 px-3.5"><StatusBadge status={k.status} /></td>
                    <td className="py-2.75 px-3.5">
                      {pct !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.25 bg-bg3 rounded-xs overflow-hidden max-w-20">
                            <div className="h-full rounded-xs"
                              style={{ width: `${pct}%`, background: pct >= 100 ? '#1a7a4a' : pct >= 50 ? '#1854a8' : '#b45309' }} />
                          </div>
                          <span className="text-[11px] font-semibold text-t3">{pct}%</span>
                        </div>
                      ) : <span className="text-xs text-t4">—</span>}
                    </td>
                    <td className="py-2.75 px-3.5 text-xs text-t3 whitespace-nowrap">
                      {k.next_due_date ? new Date(k.next_due_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2.75 px-3.5">
                      <div className="flex gap-1.5 items-center">
                        <Link href={`/kpis/${k.id}`}
                          className="inline-flex py-1.25 px-3 rounded-[5px] text-xs font-semibold bg-[#f0efec] text-t2 border border-border no-underline">View</Link>
                        {k.status !== 'cancelled' && (currentUser?.is_admin || k.owner_id === currentUser?.id) && (
                          <button type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!confirm(`Cancel KPI "${k.name}"? This cannot be undone.`)) return;
                              try {
                                await kpis.cancel(k.id);
                                load();
                              } catch (err: unknown) {
                                alert(err instanceof Error ? err.message : 'Failed to cancel KPI');
                              }
                            }}
                            className="inline-flex py-1.25 px-3 rounded-[5px] text-xs font-semibold bg-[rgba(185,28,28,.08)] text-brand-red border border-[rgba(185,28,28,.25)] cursor-pointer font-[inherit]">
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-t3">Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="py-1.5 px-3 rounded-md text-xs font-semibold border border-border bg-card cursor-pointer disabled:opacity-40">← Prev</button>
              <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page * LIMIT >= total}
                className="py-1.5 px-3 rounded-md text-xs font-semibold border border-border bg-card cursor-pointer disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateKpiModal
          regions={regionList}
          currentUserId={currentUser?.id}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}

function CreateKpiModal({ regions: regionList, currentUserId, onClose, onSaved }: { regions: Region[]; currentUserId?: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', description: '', type: 'quantitative', period: 'quarterly', update_frequency: 'monthly', target_value: '', unit: '', start_date: '', end_date: '', allocation_pct: '100', region_id: regionList[0]?.id ?? '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.region_id) { setError('Name and region are required'); return; }
    setSaving(true); setError('');
    try {
      await kpis.create({ name: form.name, description: form.description || undefined, type: form.type as 'quantitative' | 'qualitative', period: form.period as 'monthly' | 'quarterly' | 'annual', update_frequency: form.update_frequency as 'weekly' | 'monthly' | 'quarterly', target_value: form.target_value ? Number(form.target_value) : undefined, unit: form.unit || undefined, start_date: form.start_date || undefined, end_date: form.end_date || undefined, allocation_pct: Number(form.allocation_pct), region_id: form.region_id, owner_id: currentUserId });
      onSaved();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to create KPI'); } finally { setSaving(false); }
  };

  const inputCls = 'w-full bg-card border-[1.5px] border-border rounded-md py-2.25 px-3 text-near-black font-[inherit] text-[13px] outline-none box-border transition-[border-color] focus:border-black';
  const labelCls = 'block text-[11px] font-bold text-t2 mb-1.25 uppercase tracking-[.4px]';

  return (
    <div className="fixed inset-0 z-500 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-135 rounded-[18px] overflow-hidden bg-card shadow-[0_20px_60px_rgba(0,0,0,.2)] border border-border">
        <div className="px-6 pt-5 pb-4 border-b border-border flex items-start justify-between">
          <div>
            <div className="text-[18px] font-black tracking-[-0.3px]">New KPI</div>
            <div className="text-xs text-t3 mt-0.5">Fill in the details to create a new KPI</div>
          </div>
          <button type="button" onClick={onClose}
            className="bg-[#f0efec] border border-border w-7 h-7 rounded-md cursor-pointer text-t2 text-sm flex items-center justify-center">✕</button>
        </div>
        <div className="px-6 py-5 overflow-y-auto" style={{ maxHeight: '60vh' }}>
          <div className="mb-3.25">
            <label className={labelCls}>Name *</label>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="KPI name" />
          </div>
          <div className="mb-3.25">
            <label className={labelCls}>Description</label>
            <textarea className={`${inputCls} min-h-15 resize-y`} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional description" />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3.25">
            {[
              { label: 'Type', field: 'type', opts: [['quantitative', 'Quantitative'], ['qualitative', 'Qualitative']] },
              { label: 'Period', field: 'period', opts: [['monthly', 'Monthly'], ['quarterly', 'Quarterly'], ['annual', 'Annual']] },
            ].map(({ label, field, opts }) => (
              <div key={field}>
                <label className={labelCls}>{label}</label>
                <select className={inputCls} value={(form as Record<string, string>)[field]} onChange={(e) => set(field, e.target.value)}>
                  {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3.25">
            <div>
              <label className={labelCls}>Region *</label>
              <select className={inputCls} value={form.region_id} onChange={(e) => set('region_id', e.target.value)}>
                {regionList.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Target Value</label>
              <input className={inputCls} type="number" value={form.target_value} onChange={(e) => set('target_value', e.target.value)} placeholder="e.g. 1000000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3.25">
            <div>
              <label className={labelCls}>Start Date</label>
              <input type="date" className={inputCls} value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>End Date</label>
              <input type="date" className={inputCls} value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </div>
          </div>
          {error && (
            <div className="text-xs py-2.25 px-3 rounded-[7px] bg-[rgba(185,28,28,.08)] text-brand-red border border-[rgba(185,28,28,.2)]">{error}</div>
          )}
        </div>
        <div className="px-6 py-3.25 border-t border-border flex justify-end gap-1.75">
          <button type="button" onClick={onClose}
            className="py-2 px-4 rounded-md text-[13px] font-medium cursor-pointer bg-card border border-border2 text-t2 font-[inherit]">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="py-2 px-4 rounded-md text-[13px] font-semibold bg-black text-white border border-black font-[inherit] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
            {saving ? 'Creating…' : 'Create KPI'}
          </button>
        </div>
      </div>
    </div>
  );
}
