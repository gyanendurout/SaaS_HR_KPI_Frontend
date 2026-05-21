'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { kpis, users, regions, approvals, type Kpi, type User, type Region } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

// ─── Avatar chip ──────────────────────────────────────────────────────────────

function Avatar({ name, size = 26 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const colors = ['#1854a8', '#15633c', '#b45309', '#7c3aed', '#b91c1c', '#0e7490'];
  const color  = colors[name.charCodeAt(0) % colors.length];
  return (
    <div title={name}
      className="rounded-full text-white flex items-center justify-center font-black shrink-0 border-2 border-white box-border"
      style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
}

// ─── KPI number badge ─────────────────────────────────────────────────────────

function KpiNumBadge({ num, level }: { num: string; level: number }) {
  const bg =
    level === 0 ? '#111110' :
    level === 1 ? '#3a3832' :
    level === 2 ? '#6b6760' : '#9a9690';
  return (
    <span
      className="font-mono text-[10px] font-bold py-0.75 px-1.75 rounded text-white whitespace-nowrap"
      style={{ background: bg, letterSpacing: '.3px' }}>
      {num}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    active:     ['rgba(26,122,74,.1)',   '#15633c'],
    completed:  ['rgba(24,84,168,.1)',   '#1854a8'],
    draft:      ['rgba(180,83,9,.1)',    '#b45309'],
    pending:    ['rgba(180,83,9,.1)',    '#b45309'],
    cancelled:  ['rgba(185,28,28,.08)', '#b91c1c'],
  };
  const [bg, color] = map[status] ?? ['#f0efec', '#4a4640'];
  return (
    <span
      className="inline-flex py-[2.5px] px-2 rounded text-[11px] font-semibold capitalize whitespace-nowrap"
      style={{ background: bg, color }}>
      {status === 'active' ? 'In Progress' : status === 'draft' ? 'Not Started' : status}
    </span>
  );
}

// ─── Assign KPI Modal ─────────────────────────────────────────────────────────

type AssignMethod = 'self' | 'delegate';

const PERIODS = ['FY2024', 'FY2025', 'FY2026', 'FY2027', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];
const FREQS   = ['Monthly', 'Every 2 Weeks', 'Quarterly', 'Annual'];

function AssignModal({
  kpiList, userList, currentUser, preKpiId,
  onClose, onSubmit,
}: {
  kpiList: Kpi[];
  userList: User[];
  currentUser: User | null;
  preKpiId: string;
  onClose: () => void;
  onSubmit: (kpiId: string, ownerId: string, note: string, freq: string, period: string) => Promise<void>;
}) {
  const [method,     setMethod]     = useState<AssignMethod>('self');
  const [kpiId,      setKpiId]      = useState(preKpiId);
  const [assignToId, setAssignToId] = useState('');
  const [period,     setPeriod]     = useState('FY2025');
  const [freq,       setFreq]       = useState('Monthly');
  const [note,       setNote]       = useState('');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const handleSubmit = async () => {
    if (!kpiId) { setError('Please select a KPI.'); return; }
    if (method === 'delegate' && !assignToId) { setError('Please select who to assign to.'); return; }
    const ownerId = method === 'self' ? (currentUser?.id ?? '') : assignToId;
    setSaving(true);
    setError('');
    try {
      await onSubmit(kpiId, ownerId, note, freq, period);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit. Please try again.');
    } finally { setSaving(false); }
  };

  return createPortal(
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-140 rounded-modal overflow-hidden">

        {/* Header */}
        <div className="px-5.5 py-4 border-b border-border flex items-start justify-between">
          <div>
            <div className="text-[15px] font-black text-near-black tracking-[-0.2px]">Assign KPI</div>
            <div className="text-xs text-t3 mt-0.5">Self-assign or delegate — RBAC enforced</div>
          </div>
          <button type="button" onClick={onClose}
            className="w-7 h-7 rounded-full border border-border bg-[#f5f4f0] flex items-center justify-center cursor-pointer text-[#6b6760] text-[15px] shrink-0">×</button>
        </div>

        <div className="px-5.5 py-5 overflow-y-auto" style={{ maxHeight: '75vh' }}>

          {/* Method cards */}
          <div className="grid grid-cols-2 gap-2.5 mb-4.5">
            {/* Self-Assign */}
            <div onClick={() => setMethod('self')}
              className="border-2 rounded-[10px] py-3.5 px-4 cursor-pointer transition-all duration-130"
              style={{ borderColor: method === 'self' ? '#111110' : '#e2dfd8', background: method === 'self' ? '#f8f7f5' : '#fff' }}>
              <div className="w-8 h-8 rounded-lg bg-[#e8e6e1] flex items-center justify-center mb-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#4a4640" strokeWidth="1.4" strokeLinecap="round">
                  <circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
                </svg>
              </div>
              <div className="text-[13px] font-black text-near-black mb-0.75">Self-Assign</div>
              <div className="text-[11.5px] text-t3 leading-relaxed">Assign to yourself. Requires immediate manager approval before becoming active.</div>
            </div>

            {/* Assign to Someone */}
            <div onClick={() => setMethod('delegate')}
              className="border-2 rounded-[10px] py-3.5 px-4 cursor-pointer transition-all duration-130"
              style={{ borderColor: method === 'delegate' ? '#111110' : '#e2dfd8', background: method === 'delegate' ? '#f8f7f5' : '#fff' }}>
              <div className="w-8 h-8 rounded-lg bg-[#e8e6e1] flex items-center justify-center mb-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#4a4640" strokeWidth="1.4" strokeLinecap="round">
                  <circle cx="5.5" cy="5" r="2.5"/><path d="M1 14c0-2.5 2-4.5 4.5-4.5"/><circle cx="11" cy="5" r="2.5"/><path d="M8 14c0-2.5 2-4.5 4.5-4.5 0 0 0 0 .5 0"/>
                </svg>
              </div>
              <div className="text-[13px] font-black text-near-black mb-0.75">Assign to Someone</div>
              <div className="text-[11.5px] text-t3 leading-relaxed">Delegate to someone in your hierarchy. RBAC enforced. They get an email on activation.</div>
            </div>
          </div>

          {/* KPI selector */}
          <div className="mb-3.5">
            <label className="flabel">KPI *</label>
            <select className="fi" value={kpiId} onChange={(e) => setKpiId(e.target.value)}>
              <option value="">— select KPI —</option>
              {kpiList.filter((k) => k.status !== 'cancelled').map((k) => (
                <option key={k.id} value={k.id}>{k.kpi_number} — {k.name}</option>
              ))}
            </select>
          </div>

          {/* Assign To (delegate only) */}
          {method === 'delegate' && (
            <div className="mb-3.5">
              <label className="flabel">Assign To *</label>
              <select className="fi" value={assignToId} onChange={(e) => setAssignToId(e.target.value)}>
                <option value="">— select person —</option>
                {userList.filter((u) => u.status === 'active' && u.id !== currentUser?.id).map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name} — {u.designation ?? u.email}</option>
                ))}
              </select>
            </div>
          )}

          {/* Period + Frequency */}
          <div className="grid grid-cols-2 gap-3 mb-3.5">
            <div>
              <label className="flabel">Period</label>
              <select className="fi" value={period} onChange={(e) => setPeriod(e.target.value)}>
                {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="flabel">Update Frequency</label>
              <select className="fi" value={freq} onChange={(e) => setFreq(e.target.value)}>
                {FREQS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          {/* Note to approver */}
          <div className="mb-4">
            <label className="flabel">Note to Approver</label>
            <textarea className="fi resize-vertical min-h-18" rows={3}
              placeholder="Add context for the approval request…"
              value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {/* Approval flow info */}
          <div className="py-2.5 px-3.25 bg-[#f0efec] border border-border rounded-lg flex gap-2 items-start">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-px">
              <circle cx="7" cy="7" r="6" stroke="#4a4640" strokeWidth="1.3"/>
              <path d="M7 6v4M7 4.5h.01" stroke="#4a4640" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <span className="text-[11.5px] text-t2 leading-relaxed">
              <strong>Approval flow:</strong> Self-assign → manager approves → activated. Assign to someone → RBAC check → approval email sent to assignee&apos;s manager.
            </span>
          </div>

          {error && (
            <div className="mt-3 py-2.25 px-3.25 bg-[rgba(185,28,28,.07)] border border-[rgba(185,28,28,.2)] rounded-[7px] text-[12.5px] text-brand-red">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5.5 py-3.5 border-t border-border flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn btn-outline btn-sm">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="btn btn-black btn-sm">
            {saving ? 'Submitting…' : 'Submit for Approval'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssignmentsPage() {
  const currentUser = useAuthStore((s) => s.user) as User | null;
  const isAdmin = currentUser?.is_admin ?? false;

  const [allKpis,    setAllKpis]    = useState<Kpi[]>([]);
  const [allUsers,   setAllUsers]   = useState<User[]>([]);
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRegion, setFilterRegion] = useState('');

  // Modal state
  const [modalOpen,  setModalOpen]  = useState(false);
  const [preKpiId,   setPreKpiId]   = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      kpis.list({ limit: 200 }),
      users.list({ limit: 200 }),
      regions.list(),
    ]).then(([kRes, uRes, rRes]) => {
      if (kRes.status === 'fulfilled') setAllKpis(kRes.value.data);
      if (uRes.status === 'fulfilled') setAllUsers(uRes.value.data);
      if (rRes.status === 'fulfilled') setAllRegions(rRes.value.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const userName   = (id: string | null) => allUsers.find((u) => u.id === id)?.full_name ?? '';
  const userRole   = (id: string | null) => allUsers.find((u) => u.id === id)?.designation ?? '';
  const regionName = (id: string | null | undefined) => allRegions.find((r) => r.id === id)?.name ?? '—';

  const filtered = allKpis.filter((k) => {
    const q = search.toLowerCase();
    const matchSearch = !search || k.name.toLowerCase().includes(q) || k.kpi_number.toLowerCase().includes(q);
    const matchStatus = !filterStatus || k.status === filterStatus;
    const matchRegion = !filterRegion || k.region_id === filterRegion;
    const matchUser   = isAdmin || k.owner_id === currentUser?.id;
    return matchSearch && matchStatus && matchRegion && matchUser;
  });

  const openModal = (kpiId = '') => { setPreKpiId(kpiId); setModalOpen(true); };

  const handleAssignSubmit = async (kpiId: string, ownerId: string, note: string, _freq: string, _period: string) => {
    await kpis.update(kpiId, { owner_id: ownerId });
    if (note.trim()) {
      try { await approvals.request(kpiId, note.trim()); } catch { /* non-fatal */ }
    }
    load();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-t3 text-[13px]">Loading…</div>
  );

  return (
    <div className="px-6.5 py-5.5">

      {/* Header */}
      <div className="flex items-start justify-between mb-4.5 flex-wrap gap-3">
        <div>
          <div className="text-[15px] font-black tracking-[-0.2px] mb-0.75 text-near-black">KPI Assignment</div>
          <div className="text-xs text-t3">Self-assign or delegate · RBAC enforced · Email on activation</div>
        </div>
        <div className="flex gap-2 items-center">
          <button type="button" className="btn btn-black btn-sm" onClick={() => openModal()}>+ Assign KPI</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-3.5 flex-wrap items-center">
        <input
          placeholder="Search KPI name or number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-card border-[1.5px] border-border rounded-lg py-2 px-3 text-[13px] text-near-black font-[inherit] outline-none w-65 transition-[border-color] duration-180 focus:border-black"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-card border-[1.5px] border-border rounded-lg py-2 px-3 text-[13px] text-near-black font-[inherit] outline-none">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
          className="bg-card border-[1.5px] border-border rounded-lg py-2 px-3 text-[13px] text-near-black font-[inherit] outline-none">
          <option value="">All Regions</option>
          {allRegions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {(search || filterStatus || filterRegion) && (
          <button type="button"
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterRegion(''); }}
            className="py-2 px-3 rounded-[7px] text-xs cursor-pointer bg-card border border-border text-t3 font-[inherit]">
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-t3">{filtered.length} KPI{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-modal overflow-hidden shadow-card">
        {filtered.length === 0 ? (
          <div className="py-12 px-5 text-center">
            <p className="text-[13px] font-semibold text-t2 mb-1">No KPIs found</p>
            <p className="text-xs text-t3">Adjust your filters or <Link href="/kpis/new" className="text-black underline">create a new KPI</Link>.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-[1.5px] border-border bg-[#f0efec]">
                  {['KPI No', 'KPI Name', 'Type', 'Target / Current', 'Owner', 'Region', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-[10px] font-bold text-t3 uppercase tracking-[1px] py-2.25 px-3.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((k) => {
                  const owner    = allUsers.find((u) => u.id === k.owner_id);
                  const ownerName = owner?.full_name ?? '';
                  return (
                    <tr key={k.id}
                      className="border-b border-border transition-colors duration-100"
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#f8f7f5')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>

                      {/* KPI No */}
                      <td className="py-2.75 px-3.5">
                        <KpiNumBadge num={k.kpi_number} level={k.level ?? 0} />
                      </td>

                      {/* KPI Name */}
                      <td className="py-2.75 px-3.5 max-w-55">
                        <Link href={`/kpis/${k.id}`} className="text-[13px] font-bold text-near-black no-underline tracking-[-0.1px] block">{k.name}</Link>
                        {k.parent_id && <div className="text-[11px] text-t3 mt-px">↑ Cascaded</div>}
                      </td>

                      {/* Type */}
                      <td className="py-2.75 px-3.5">
                        <span className="text-[10.5px] font-bold py-0.5 px-1.75 rounded"
                          style={{
                            background: k.type === 'quantitative' ? 'rgba(24,84,168,.1)' : 'rgba(124,58,237,.1)',
                            color: k.type === 'quantitative' ? '#1854a8' : '#7c3aed',
                          }}>
                          {k.type === 'quantitative' ? 'Quant' : 'Qual'}
                        </span>
                      </td>

                      {/* Target / Current */}
                      <td className="py-2.75 px-3.5 whitespace-nowrap">
                        {k.target_value != null ? (
                          <>
                            <div className="text-[13px] font-bold text-near-black">
                              {k.unit ? `${k.unit}${k.target_value}` : k.target_value}
                            </div>
                            {k.current_value != null && (
                              <div className="text-[11px] text-t3 mt-px">
                                Current: {k.unit ? `${k.unit}${k.current_value}` : k.current_value}
                              </div>
                            )}
                          </>
                        ) : <span className="text-t4">—</span>}
                      </td>

                      {/* Owner */}
                      <td className="py-2.75 px-3.5">
                        {ownerName ? (
                          <div className="flex items-center gap-1.75">
                            <Avatar name={ownerName} size={26} />
                            <div>
                              <div className="text-[12.5px] font-semibold text-near-black whitespace-nowrap">{ownerName}</div>
                              {owner?.designation && <div className="text-[11px] text-t3">{owner.designation}</div>}
                            </div>
                          </div>
                        ) : (
                          <button type="button" onClick={() => openModal(k.id)}
                            className="text-[11.5px] py-1 px-2.5 rounded-[5px] border border-[rgba(185,28,28,.3)] bg-[rgba(185,28,28,.06)] cursor-pointer text-brand-red font-[inherit] font-semibold">
                            Unassigned
                          </button>
                        )}
                      </td>

                      {/* Region */}
                      <td className="py-2.75 px-3.5 text-xs text-t3 whitespace-nowrap">
                        {regionName(k.region_id)}
                      </td>

                      {/* Status */}
                      <td className="py-2.75 px-3.5">
                        <StatusBadge status={k.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-2.75 px-3.5">
                        <div className="flex gap-1.5 items-center">
                          <button type="button" onClick={() => openModal(k.id)}
                            className="text-[11.5px] py-1.25 px-2.75 rounded-[5px] border border-border bg-off cursor-pointer text-t2 font-[inherit] font-semibold whitespace-nowrap">
                            {k.owner_id ? 'Reassign' : 'Assign'}
                          </button>
                          <Link href={`/kpis/${k.id}`}
                            className="w-7 h-7 rounded-[5px] border border-border bg-off flex items-center justify-center text-t2 no-underline shrink-0">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 6h8M7 3l3 3-3 3"/>
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {modalOpen && (
        <AssignModal
          kpiList={allKpis}
          userList={allUsers}
          currentUser={currentUser}
          preKpiId={preKpiId}
          onClose={() => setModalOpen(false)}
          onSubmit={handleAssignSubmit}
        />
      )}
    </div>
  );
}
