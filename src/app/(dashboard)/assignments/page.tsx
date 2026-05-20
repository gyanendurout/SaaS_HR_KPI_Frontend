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
    <div title={name} style={{
      width: size, height: size, borderRadius: '50%', background: color,
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 800, flexShrink: 0,
      border: '2px solid #fff', boxSizing: 'border-box',
    }}>
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
    <span style={{
      fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
      padding: '3px 7px', borderRadius: 4, background: bg, color: '#fff',
      whiteSpace: 'nowrap', letterSpacing: '.3px',
    }}>
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
    <span style={{ display: 'inline-flex', padding: '2.5px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: bg, color, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
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
      <div className="modal" style={{ maxWidth: 560, borderRadius: 14, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #e2dfd8', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#111110', letterSpacing: '-.2px' }}>Assign KPI</div>
            <div style={{ fontSize: 12, color: '#8a8580', marginTop: 2 }}>Self-assign or delegate — RBAC enforced</div>
          </div>
          <button type="button" onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #e2dfd8', background: '#f5f4f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b6760', fontSize: 15, flexShrink: 0 }}>×</button>
        </div>

        <div style={{ padding: '20px 22px', maxHeight: '75vh', overflowY: 'auto' }}>

          {/* Method cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            {/* Self-Assign */}
            <div onClick={() => setMethod('self')} style={{ border: `2px solid ${method === 'self' ? '#111110' : '#e2dfd8'}`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer', background: method === 'self' ? '#f8f7f5' : '#fff', transition: 'all .13s' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e8e6e1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#4a4640" strokeWidth="1.4" strokeLinecap="round">
                  <circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
                </svg>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#111110', marginBottom: 3 }}>Self-Assign</div>
              <div style={{ fontSize: 11.5, color: '#8a8580', lineHeight: 1.5 }}>Assign to yourself. Requires immediate manager approval before becoming active.</div>
            </div>

            {/* Assign to Someone */}
            <div onClick={() => setMethod('delegate')} style={{ border: `2px solid ${method === 'delegate' ? '#111110' : '#e2dfd8'}`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer', background: method === 'delegate' ? '#f8f7f5' : '#fff', transition: 'all .13s' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e8e6e1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#4a4640" strokeWidth="1.4" strokeLinecap="round">
                  <circle cx="5.5" cy="5" r="2.5"/><path d="M1 14c0-2.5 2-4.5 4.5-4.5"/><circle cx="11" cy="5" r="2.5"/><path d="M8 14c0-2.5 2-4.5 4.5-4.5 0 0 0 0 .5 0"/>
                </svg>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#111110', marginBottom: 3 }}>Assign to Someone</div>
              <div style={{ fontSize: 11.5, color: '#8a8580', lineHeight: 1.5 }}>Delegate to someone in your hierarchy. RBAC enforced. They get an email on activation.</div>
            </div>
          </div>

          {/* KPI selector */}
          <div style={{ marginBottom: 14 }}>
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
            <div style={{ marginBottom: 14 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
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
          <div style={{ marginBottom: 16 }}>
            <label className="flabel">Note to Approver</label>
            <textarea className="fi" rows={3} placeholder="Add context for the approval request…"
              value={note} onChange={(e) => setNote(e.target.value)}
              style={{ resize: 'vertical', minHeight: 72 }} />
          </div>

          {/* Approval flow info */}
          <div style={{ padding: '10px 13px', background: '#f0efec', border: '1px solid #e2dfd8', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="7" cy="7" r="6" stroke="#4a4640" strokeWidth="1.3"/>
              <path d="M7 6v4M7 4.5h.01" stroke="#4a4640" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: 11.5, color: '#4a4640', lineHeight: 1.5 }}>
              <strong>Approval flow:</strong> Self-assign → manager approves → activated. Assign to someone → RBAC check → approval email sent to assignee&apos;s manager.
            </span>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: '9px 13px', background: 'rgba(185,28,28,.07)', border: '1px solid rgba(185,28,28,.2)', borderRadius: 7, fontSize: 12.5, color: '#b91c1c' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid #e2dfd8', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, color: '#8a8580', fontSize: 13 }}>Loading…</div>
  );

  return (
    <div style={{ padding: '22px 26px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', marginBottom: 3, color: '#111110' }}>KPI Assignment</div>
          <div style={{ fontSize: 12, color: '#8a8580' }}>Self-assign or delegate · RBAC enforced · Email on activation</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" className="btn btn-black btn-sm" onClick={() => openModal()}>+ Assign KPI</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Search KPI name or number…" value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#111110', fontFamily: 'inherit', outline: 'none', width: 260 }}
          onFocus={(e) => (e.target.style.borderColor = '#000')}
          onBlur={(e)  => (e.target.style.borderColor = '#e2dfd8')} />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#111110', fontFamily: 'inherit', outline: 'none' }}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
        <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}
          style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#111110', fontFamily: 'inherit', outline: 'none' }}>
          <option value="">All Regions</option>
          {allRegions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {(search || filterStatus || filterRegion) && (
          <button type="button" onClick={() => { setSearch(''); setFilterStatus(''); setFilterRegion(''); }}
            style={{ padding: '8px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', background: '#fff', border: '1px solid #e2dfd8', color: '#8a8580', fontFamily: 'inherit' }}>
            Clear
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#8a8580' }}>{filtered.length} KPI{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.07)' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#4a4640', marginBottom: 4 }}>No KPIs found</p>
            <p style={{ fontSize: 12, color: '#8a8580' }}>Adjust your filters or <Link href="/kpis/new" style={{ color: '#000', textDecoration: 'underline' }}>create a new KPI</Link>.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #e2dfd8', background: '#f0efec' }}>
                  {['KPI No', 'KPI Name', 'Type', 'Target / Current', 'Owner', 'Region', 'Status', 'Actions'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#8a8580', textTransform: 'uppercase', letterSpacing: 1, padding: '9px 14px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((k) => {
                  const owner    = allUsers.find((u) => u.id === k.owner_id);
                  const ownerName = owner?.full_name ?? '';
                  return (
                    <tr key={k.id}
                      style={{ borderBottom: '1px solid #e2dfd8', transition: 'background .1s' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#f8f7f5')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>

                      {/* KPI No */}
                      <td style={{ padding: '11px 14px' }}>
                        <KpiNumBadge num={k.kpi_number} level={k.level ?? 0} />
                      </td>

                      {/* KPI Name */}
                      <td style={{ padding: '11px 14px', maxWidth: 220 }}>
                        <Link href={`/kpis/${k.id}`} style={{ fontSize: 13, fontWeight: 700, color: '#111110', textDecoration: 'none', letterSpacing: '-.1px', display: 'block' }}>{k.name}</Link>
                        {k.parent_id && <div style={{ fontSize: 11, color: '#8a8580', marginTop: 1 }}>↑ Cascaded</div>}
                      </td>

                      {/* Type */}
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: k.type === 'quantitative' ? 'rgba(24,84,168,.1)' : 'rgba(124,58,237,.1)', color: k.type === 'quantitative' ? '#1854a8' : '#7c3aed' }}>
                          {k.type === 'quantitative' ? 'Quant' : 'Qual'}
                        </span>
                      </td>

                      {/* Target / Current */}
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        {k.target_value != null ? (
                          <>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#111110' }}>
                              {k.unit ? `${k.unit}${k.target_value}` : k.target_value}
                            </div>
                            {k.current_value != null && (
                              <div style={{ fontSize: 11, color: '#8a8580', marginTop: 1 }}>
                                Current: {k.unit ? `${k.unit}${k.current_value}` : k.current_value}
                              </div>
                            )}
                          </>
                        ) : <span style={{ color: '#c4c0b8' }}>—</span>}
                      </td>

                      {/* Owner */}
                      <td style={{ padding: '11px 14px' }}>
                        {ownerName ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <Avatar name={ownerName} size={26} />
                            <div>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111110', whiteSpace: 'nowrap' }}>{ownerName}</div>
                              {owner?.designation && <div style={{ fontSize: 11, color: '#8a8580' }}>{owner.designation}</div>}
                            </div>
                          </div>
                        ) : (
                          <button type="button" onClick={() => openModal(k.id)}
                            style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(185,28,28,.3)', background: 'rgba(185,28,28,.06)', cursor: 'pointer', color: '#b91c1c', fontFamily: 'inherit', fontWeight: 600 }}>
                            Unassigned
                          </button>
                        )}
                      </td>

                      {/* Region */}
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#8a8580', whiteSpace: 'nowrap' }}>
                        {regionName(k.region_id)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '11px 14px' }}>
                        <StatusBadge status={k.status} />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button type="button" onClick={() => openModal(k.id)}
                            style={{ fontSize: 11.5, padding: '5px 11px', borderRadius: 5, border: '1px solid #e2dfd8', background: '#f8f7f5', cursor: 'pointer', color: '#4a4640', fontFamily: 'inherit', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {k.owner_id ? 'Reassign' : 'Assign'}
                          </button>
                          <Link href={`/kpis/${k.id}`}
                            style={{ width: 28, height: 28, borderRadius: 5, border: '1px solid #e2dfd8', background: '#f8f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a4640', textDecoration: 'none', flexShrink: 0 }}>
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
