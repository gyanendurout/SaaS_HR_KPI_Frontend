'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
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
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2.5px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, flexShrink: 0 }}>
      {status}
    </span>
  );
}

type TabId = 'owned' | 'all' | 'cascaded' | 'draft';

export default function KpisPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [data, setData] = useState<Kpi[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [regionList, setRegionList] = useState<Region[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await kpis.list({ page, limit: LIMIT, status: filterStatus || undefined, region_id: filterRegion || undefined });
      setData(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterRegion]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    users.list({ limit: 100 }).then((r) => setAllUsers(r.data)).catch(() => {});
    regions.list().then((r) => setRegionList(r.data)).catch(() => {});
  }, []);

  const searched = search
    ? data.filter((k) => k.name.toLowerCase().includes(search.toLowerCase()) || k.kpi_number.toLowerCase().includes(search.toLowerCase()))
    : data;

  const ownedKpis = searched.filter((k) => k.owner_id === currentUser?.id);
  const cascadedKpis = searched.filter((k) => k.parent_id !== null);
  const draftKpis = searched.filter((k) => k.status === 'draft');

  const tabKpis: Record<TabId, Kpi[]> = {
    owned: ownedKpis,
    all: searched,
    cascaded: cascadedKpis,
    draft: draftKpis,
  };

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'all', label: 'All KPIs', count: searched.length },
    { id: 'owned', label: 'Owned by Me', count: ownedKpis.length },
    { id: 'cascaded', label: 'Cascaded', count: cascadedKpis.length },
    { id: 'draft', label: 'Pending Approval', count: draftKpis.length },
  ];

  const displayKpis = tabKpis[activeTab];

  const progress = (k: Kpi) => {
    if (!k.target_value || k.target_value === 0) return null;
    return Math.min(100, Math.round(((k.current_value ?? 0) / k.target_value) * 100));
  };

  return (
    <div>
      {/* ─── Black Hero ─── */}
      <div style={{ background: '#000', borderRadius: 0, padding: '20px 26px', marginBottom: 0, position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)', fontSize: 80, fontWeight: 900, color: 'rgba(255,255,255,.04)', letterSpacing: -3, pointerEvents: 'none', userSelect: 'none', lineHeight: 1 }}>
          MY KPIs
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 5 }}>
          My KPI Portfolio
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-.4px', marginBottom: 3 }}>
          All KPIs
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.45)', marginBottom: 16 }}>
          KPIs you own, contribute to, or are involved in through cascade or approval
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {[
            { v: data.filter((k) => k.status === 'active').length, l: 'Active' },
            { v: ownedKpis.length, l: 'Owned' },
            { v: cascadedKpis.length, l: 'Cascaded' },
            { v: draftKpis.length, l: 'Pending' },
          ].map(({ v, l }) => (
            <div key={l} style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, padding: '12px 14px' }}>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.5px', lineHeight: 1, marginBottom: 2, color: '#fff' }}>{v}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.38)', textTransform: 'uppercase', letterSpacing: 1 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Tabs + Content ─── */}
      <div style={{ padding: '0 26px' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e2dfd8', marginBottom: 0, background: '#fff', borderTop: 'none' }}>
          {tabs.map((t) => (
            <button type="button"
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '9px 18px', fontSize: 13, fontWeight: activeTab === t.id ? 700 : 500,
                cursor: 'pointer', border: 'none', background: 'none',
                color: activeTab === t.id ? '#000' : '#4a4640', fontFamily: 'inherit',
                borderBottom: `2.5px solid ${activeTab === t.id ? '#000' : 'transparent'}`,
                marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all .14s',
              }}
            >
              {t.label}
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1.5px 6px', borderRadius: 10, background: activeTab === t.id ? '#000' : '#e8e6e1', color: activeTab === t.id ? '#fff' : '#8a8580' }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '14px 0' }}>
          <input
            placeholder="Search KPIs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 6, padding: '8px 12px', color: '#111110', fontFamily: 'inherit', fontSize: 13, outline: 'none', width: 220 }}
            onFocus={(e) => (e.target.style.borderColor = '#000')}
            onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')}
          />
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 6, padding: '8px 12px', color: '#4a4640', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
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
            style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 6, padding: '8px 12px', color: '#4a4640', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
          >
            <option value="">All Regions</option>
            {regionList.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <div style={{ marginLeft: 'auto' }}>
            <button type="button"
              onClick={() => setShowCreate(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 6, fontSize: 12.5, fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', background: '#000', color: '#fff', border: '1px solid #000', transition: 'opacity .15s' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '.85')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
            >
              + New KPI
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #e2dfd8', background: '#f0efec' }}>
                {['KPI No', 'Name', 'Type', 'Status', 'Progress', 'Due Date', ''].map((h) => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#8a8580', textTransform: 'uppercase', letterSpacing: 1, padding: '9px 14px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ padding: '32px 14px', textAlign: 'center', fontSize: 13, color: '#8a8580' }}>Loading…</td></tr>
              )}
              {!loading && displayKpis.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '32px 14px', textAlign: 'center', fontSize: 13, color: '#8a8580' }}>No KPIs found.</td></tr>
              )}
              {displayKpis.map((k) => {
                const pct = progress(k);
                const owner = allUsers.find((u) => u.id === k.owner_id);
                return (
                  <tr key={k.id} style={{ borderBottom: '1px solid #e2dfd8', transition: 'background .1s', cursor: 'pointer' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#f8f7f5')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 3, fontSize: 10, fontWeight: 700, letterSpacing: '.3px', background: '#e4e1db', color: '#4a4640', fontFamily: 'monospace' }}>{k.kpi_number}</span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <Link href={`/kpis/${k.id}`} style={{ color: '#111110', fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>{k.name}</Link>
                      {owner && <div style={{ fontSize: 11, color: '#8a8580', marginTop: 1 }}>{owner.full_name}</div>}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#8a8580', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{k.type}</td>
                    <td style={{ padding: '11px 14px' }}><StatusBadge status={k.status} /></td>
                    <td style={{ padding: '11px 14px' }}>
                      {pct !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 5, background: '#e4e1db', borderRadius: 2, overflow: 'hidden', maxWidth: 80 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#1a7a4a' : pct >= 50 ? '#1854a8' : '#b45309', borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#8a8580' }}>{pct}%</span>
                        </div>
                      ) : <span style={{ fontSize: 12, color: '#c4c0b8' }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#8a8580', whiteSpace: 'nowrap' }}>
                      {k.next_due_date ? new Date(k.next_due_date).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <Link href={`/kpis/${k.id}`} style={{ display: 'inline-flex', padding: '5px 12px', borderRadius: 5, fontSize: 12, fontWeight: 600, background: '#f0efec', color: '#4a4640', border: '1px solid #e2dfd8', textDecoration: 'none' }}>View</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#8a8580' }}>Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid #e2dfd8', background: '#fff', cursor: 'pointer', opacity: page === 1 ? .4 : 1 }}>← Prev</button>
              <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page * LIMIT >= total}
                style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid #e2dfd8', background: '#fff', cursor: 'pointer', opacity: page * LIMIT >= total ? .4 : 1 }}>Next →</button>
            </div>
          </div>
        )}
      </div>

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

function CreateKpiModal({ regions: regionList, onClose, onSaved }: { regions: Region[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', description: '', type: 'quantitative', period: 'quarterly', update_frequency: 'monthly', target_value: '', unit: '', start_date: '', end_date: '', allocation_pct: '100', region_id: regionList[0]?.id ?? '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.region_id) { setError('Name and region are required'); return; }
    setSaving(true); setError('');
    try {
      await kpis.create({ name: form.name, description: form.description || undefined, type: form.type as 'quantitative' | 'qualitative', period: form.period as 'monthly' | 'quarterly' | 'annual', update_frequency: form.update_frequency as 'weekly' | 'monthly' | 'quarterly', target_value: form.target_value ? Number(form.target_value) : undefined, unit: form.unit || undefined, start_date: form.start_date || undefined, end_date: form.end_date || undefined, allocation_pct: Number(form.allocation_pct), region_id: form.region_id });
      onSaved();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to create KPI'); } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(3px)' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: 540, borderRadius: 18, overflow: 'hidden', background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,.2)', border: '1px solid #e2dfd8' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2dfd8', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: '#fff', borderRadius: '18px 18px 0 0' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.3px' }}>New KPI</div>
            <div style={{ fontSize: 12, color: '#8a8580', marginTop: 2 }}>Fill in the details to create a new KPI</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: '#f0efec', border: '1px solid #e2dfd8', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', color: '#4a4640', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
          {[
            { label: 'Name *', child: <input style={{ width: '100%', background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 6, padding: '9px 12px', color: '#111110', fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="KPI name" onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')} /> },
            { label: 'Description', child: <textarea style={{ width: '100%', background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 6, padding: '9px 12px', color: '#111110', fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, minHeight: 60, resize: 'vertical' as const }} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional description" onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')} /> },
          ].map(({ label, child }) => (
            <div key={label} style={{ marginBottom: 13 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4a4640', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</label>
              {child}
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 13 }}>
            {[
              { label: 'Type', field: 'type', opts: [['quantitative', 'Quantitative'], ['qualitative', 'Qualitative']] },
              { label: 'Period', field: 'period', opts: [['monthly', 'Monthly'], ['quarterly', 'Quarterly'], ['annual', 'Annual']] },
            ].map(({ label, field, opts }) => (
              <div key={field}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4a4640', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</label>
                <select style={{ width: '100%', background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 6, padding: '9px 12px', color: '#111110', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} value={(form as Record<string, string>)[field]} onChange={(e) => set(field, e.target.value)}>
                  {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 13 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4a4640', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px' }}>Region *</label>
              <select style={{ width: '100%', background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 6, padding: '9px 12px', color: '#111110', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} value={form.region_id} onChange={(e) => set('region_id', e.target.value)}>
                {regionList.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4a4640', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px' }}>Target Value</label>
              <input style={{ width: '100%', background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 6, padding: '9px 12px', color: '#111110', fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} type="number" value={form.target_value} onChange={(e) => set('target_value', e.target.value)} placeholder="e.g. 1000000" onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 13 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4a4640', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px' }}>Start Date</label>
              <input type="date" style={{ width: '100%', background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 6, padding: '9px 12px', color: '#111110', fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4a4640', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px' }}>End Date</label>
              <input type="date" style={{ width: '100%', background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 6, padding: '9px 12px', color: '#111110', fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </div>
          </div>
          {error && <div style={{ fontSize: 12, padding: '9px 12px', borderRadius: 7, background: 'rgba(185,28,28,.08)', color: '#b91c1c', border: '1px solid rgba(185,28,28,.2)' }}>{error}</div>}
        </div>
        <div style={{ padding: '13px 24px', borderTop: '1px solid #e2dfd8', display: 'flex', justifyContent: 'flex-end', gap: 7, background: '#fff', borderRadius: '0 0 18px 18px' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: '#fff', border: '1px solid #cdc9c1', color: '#4a4640', fontFamily: 'inherit' }}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', background: '#000', color: '#fff', border: '1px solid #000', fontFamily: 'inherit', opacity: saving ? .6 : 1 }}>
            {saving ? 'Creating…' : 'Create KPI'}
          </button>
        </div>
      </div>
    </div>
  );
}
