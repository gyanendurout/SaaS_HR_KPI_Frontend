'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { kpis, users, cascade, type Kpi, type User } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const colors = ['#1854a8', '#15633c', '#b45309', '#7c3aed', '#b91c1c', '#0e7490'];
  const color  = colors[name.charCodeAt(0) % colors.length];
  return (
    <div title={name}
      className="rounded-full text-white flex items-center justify-center font-black shrink-0 border-2 border-white box-border"
      style={{ width: size, height: size, background: color, fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
}

// ─── KPI number badge ─────────────────────────────────────────────────────────

function KpiNumBadge({ num, level, large = false }: { num: string; level: number; large?: boolean }) {
  const bg =
    level === 0 ? '#111110' :
    level === 1 ? '#3a3832' :
    level === 2 ? '#6b6760' : '#9a9690';
  return (
    <span
      className={`font-mono font-bold text-white whitespace-nowrap shrink-0 rounded ${large ? 'text-[11px] py-0.75 px-2' : 'text-[9.5px] py-0.5 px-1.5'}`}
      style={{ background: bg, letterSpacing: '.3px' }}>
      {num}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    active:    ['rgba(26,122,74,.1)',   '#15633c'],
    completed: ['rgba(24,84,168,.1)',   '#1854a8'],
    draft:     ['rgba(180,83,9,.1)',    '#b45309'],
    cancelled: ['rgba(185,28,28,.08)', '#b91c1c'],
  };
  const [bg, color] = map[status] ?? ['rgba(0,0,0,.05)', '#4a4640'];
  const label = status === 'active' ? 'In Progress' : status === 'draft' ? 'Not Started' : status;
  return (
    <span
      className="font-semibold capitalize whitespace-nowrap rounded py-0.5 px-1.75 text-[10.5px]"
      style={{ background: bg, color }}>
      {label}
    </span>
  );
}

// ─── Progress badge ───────────────────────────────────────────────────────────

function ProgressBadge({ pct }: { pct: number }) {
  const color = pct >= 80 ? '#15633c' : pct >= 50 ? '#1854a8' : '#b45309';
  return (
    <span
      className="font-bold whitespace-nowrap rounded py-0.5 px-1.75 text-[10.5px]"
      style={{ background: `${color}1a`, color }}>
      {pct}%
    </span>
  );
}

// ─── Tree Node ────────────────────────────────────────────────────────────────

function KpiTreeNode({
  kpi, level, selectedId, onSelect, allUsers, refreshKey, onAddChild, onDelete,
}: {
  kpi: Kpi;
  level: number;
  selectedId: string;
  onSelect: (kpi: Kpi) => void;
  allUsers: User[];
  refreshKey: number;
  onAddChild: (kpi: Kpi) => void;
  onDelete: (kpi: Kpi) => void;
}) {
  const [children,  setChildren]  = useState<Kpi[]>([]);
  const [expanded,  setExpanded]  = useState(level === 0);
  const isSelected = kpi.id === selectedId;

  const owner = allUsers.find((u) => u.id === kpi.owner_id);
  const pct   = kpi.target_value && kpi.current_value != null
    ? Math.min(100, Math.round((kpi.current_value / kpi.target_value) * 100))
    : null;

  const levelBorderColor =
    level === 0 ? '#111110' :
    level === 1 ? '#3a3832' :
    level === 2 ? '#6b6760' : '#9a9690';

  const loadChildren = useCallback(async () => {
    try {
      const res = await kpis.children(kpi.id);
      setChildren(res.data.filter((c) => c.status !== 'cancelled'));
    } catch { /* ignore */ }
  }, [kpi.id]);

  useEffect(() => { if (expanded)    loadChildren(); }, [expanded, loadChildren]);
  useEffect(() => { if (isSelected)  { setExpanded(true); loadChildren(); } }, [isSelected, loadChildren]);
  useEffect(() => { if (refreshKey > 0) { setExpanded(true); loadChildren(); } }, [refreshKey, loadChildren]);

  const fmtVal = (v: number | null, unit: string | null) =>
    v == null ? null : (unit ? `${unit}${v.toLocaleString()}` : v.toLocaleString());

  return (
    <div>
      <div
        onClick={() => onSelect(kpi)}
        className="flex items-center gap-2 cursor-pointer transition-[border-color,background] duration-140 mb-1.25"
        style={{
          padding: '9px 11px',
          borderTop:    `1.5px solid ${isSelected ? '#111110' : '#e2dfd8'}`,
          borderRight:  `1.5px solid ${isSelected ? '#111110' : '#e2dfd8'}`,
          borderBottom: `1.5px solid ${isSelected ? '#111110' : '#e2dfd8'}`,
          borderLeft:   `3.5px solid ${levelBorderColor}`,
          borderRadius: 9,
          background: isSelected ? '#f0efec' : '#fff',
          boxShadow: isSelected ? '0 0 0 3px rgba(0,0,0,.06)' : '0 1px 3px rgba(0,0,0,.05)',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            const el = e.currentTarget as HTMLElement;
            el.style.borderTopColor    = '#cdc9c1';
            el.style.borderRightColor  = '#cdc9c1';
            el.style.borderBottomColor = '#cdc9c1';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            const el = e.currentTarget as HTMLElement;
            el.style.borderTopColor    = '#e2dfd8';
            el.style.borderRightColor  = '#e2dfd8';
            el.style.borderBottomColor = '#e2dfd8';
          }
        }}
      >
        {/* Left: badge + name + sub-info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.75 mb-0.75">
            <KpiNumBadge num={kpi.kpi_number} level={level} />
            <span className="text-[13px] font-bold text-near-black truncate tracking-[-0.1px]">
              {kpi.name}
            </span>
          </div>
          <div className="text-[11px] text-t3 flex items-center gap-1 flex-wrap">
            {owner && <span>{owner.full_name}</span>}
            {owner && fmtVal(kpi.target_value, kpi.unit) && <span>·</span>}
            {fmtVal(kpi.target_value, kpi.unit) && <span>{fmtVal(kpi.target_value, kpi.unit)}</span>}
            {fmtVal(kpi.current_value, kpi.unit) && <span>· {fmtVal(kpi.current_value, kpi.unit)}</span>}
          </div>
        </div>

        {/* Right: badges + actions */}
        <div className="flex items-center gap-1.25 shrink-0" onClick={(e) => e.stopPropagation()}>
          {pct !== null && <ProgressBadge pct={pct} />}
          <StatusBadge status={kpi.status} />

          <button
            type="button"
            title="Add child KPI"
            onClick={() => onAddChild(kpi)}
            className="text-[11px] py-0.75 px-2 rounded border border-border bg-off cursor-pointer text-t2 font-[inherit] font-semibold whitespace-nowrap">
            +Child
          </button>

          <Link
            href={`/kpis/${kpi.id}`}
            title="Open KPI"
            onClick={(e) => e.stopPropagation()}
            className="w-6 h-6 rounded border border-border bg-off flex items-center justify-center text-t2 no-underline shrink-0">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 1.5h5.5v5.5M9.5 1.5L1 10"/>
            </svg>
          </Link>

          <button
            type="button"
            title="Remove"
            onClick={() => onDelete(kpi)}
            className="w-6 h-6 rounded border border-[rgba(185,28,28,.2)] bg-[rgba(185,28,28,.06)] cursor-pointer text-brand-red flex items-center justify-center shrink-0">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M1 1l7 7M8 1l-7 7"/>
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-5 h-5 flex items-center justify-center text-t3 cursor-pointer text-[11px] bg-transparent border-none shrink-0">
            {expanded ? '▾' : '▸'}
          </button>
        </div>
      </div>

      {/* Children */}
      {expanded && children.length > 0 && (
        <div className="pl-5.5 border-l-2 border-border ml-3.5 mt-0.5 mb-0.5">
          {children.map((c) => (
            <KpiTreeNode
              key={c.id}
              kpi={c}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              allUsers={allUsers}
              refreshKey={refreshKey}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Right panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  kpi, allKpis, allUsers,
  onAddChild, onUpdateStatus, onDelete, onModify,
}: {
  kpi: Kpi | null;
  allKpis: Kpi[];
  allUsers: User[];
  onAddChild: (k: Kpi) => void;
  onUpdateStatus: (k: Kpi) => void;
  onDelete: (k: Kpi) => void;
  onModify: (k: Kpi) => void;
}) {
  if (!kpi) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2.5 text-t3 text-center p-8">
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" className="opacity-[.22]">
          <rect x="6" y="6" width="14" height="14" rx="3" stroke="#111110" strokeWidth="2"/>
          <rect x="24" y="6" width="14" height="14" rx="3" stroke="#111110" strokeWidth="2"/>
          <rect x="15" y="24" width="14" height="14" rx="3" stroke="#111110" strokeWidth="2"/>
          <path d="M13 20v4M31 20v4M22 14v10" stroke="#111110" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <div className="text-sm font-bold text-t2">Select a KPI</div>
        <div className="text-[12.5px] max-w-[220px] leading-relaxed">
          Click any KPI in the tree to view detail, ownership, and actions
        </div>
      </div>
    );
  }

  const owner  = allUsers.find((u) => u.id === kpi.owner_id);
  const parent = kpi.parent_id ? allKpis.find((k) => k.id === kpi.parent_id) : null;
  const pct    = kpi.target_value && kpi.current_value != null
    ? Math.min(100, Math.round((kpi.current_value / kpi.target_value) * 100))
    : null;

  const fmtVal = (v: number | null, u: string | null) =>
    v == null ? '—' : (u ? `${u}${v.toLocaleString()}` : v.toLocaleString());

  return (
    <div className="px-5.5 pt-5.5 pb-7">

      {/* KPI number + level chip */}
      <div className="text-[11px] font-semibold text-t3 mb-1.75 tracking-[.1px]">
        {kpi.kpi_number} · LEVEL {kpi.level ?? 0}
      </div>

      {/* Title */}
      <div className="text-[21px] font-black text-near-black tracking-[-0.45px] leading-tight mb-3">
        {kpi.name}
      </div>

      {/* Tags row */}
      <div className="flex gap-1.5 flex-wrap mb-4.5">
        <span
          className="text-[11px] font-bold py-0.75 px-2 rounded"
          style={{
            background: kpi.type === 'quantitative' ? 'rgba(24,84,168,.1)' : 'rgba(124,58,237,.1)',
            color:      kpi.type === 'quantitative' ? '#1854a8' : '#7c3aed',
          }}>
          {kpi.type === 'quantitative' ? 'Quant' : 'Qual'}
        </span>
        <StatusBadge status={kpi.status} />
        {kpi.parent_id && kpi.allocation_pct > 0 && (
          <span className="text-[11px] font-semibold py-0.75 px-2 rounded border border-border text-t2 bg-card">
            {kpi.allocation_pct}% of parent
          </span>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'TARGET',  value: fmtVal(kpi.target_value, kpi.unit)  },
          { label: 'CURRENT', value: fmtVal(kpi.current_value, kpi.unit) },
          { label: 'PERIOD',  value: kpi.period?.toUpperCase() ?? '—'    },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-lg py-2.5 px-3.25">
            <div className="text-[9px] font-bold text-t3 uppercase tracking-[1px] mb-1.25">{label}</div>
            <div className="text-[15px] font-black tracking-[-0.3px] text-near-black">{value}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {pct !== null && (
        <div className="bg-card border border-border rounded-lg py-2.5 px-3.25 mb-4">
          <div className="flex justify-between mb-1.5">
            <span className="text-[11.5px] font-semibold text-near-black">Progress</span>
            <span className="text-[11.5px] font-bold"
              style={{ color: pct >= 80 ? '#15633c' : pct >= 50 ? '#1854a8' : '#b45309' }}>{pct}%</span>
          </div>
          <div className="h-1.5 bg-bg3 rounded-sm overflow-hidden">
            <div className="h-full rounded-sm transition-[width] duration-[400ms]"
              style={{ width: `${pct}%`, background: pct >= 80 ? '#1a7a4a' : pct >= 50 ? '#1854a8' : '#b45309' }} />
          </div>
        </div>
      )}

      {/* Primary Owner */}
      <div className="mb-3.5">
        <div className="text-[9.5px] font-bold text-t3 uppercase tracking-[1px] mb-2">
          PRIMARY OWNER
        </div>
        {owner ? (
          <div className="bg-card border border-border rounded-lg py-2.75 px-3.5 flex items-center gap-2.5">
            <Avatar name={owner.full_name} size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-bold text-near-black">{owner.full_name}</div>
              <div className="text-[11.5px] text-t3 mt-px truncate">
                {owner.designation && <>{owner.designation} · </>}{owner.email}
              </div>
            </div>
            <span className="text-[9.5px] font-bold py-0.75 px-1.75 rounded bg-[#e8e6e1] text-t2 tracking-[.3px] shrink-0">
              INDIVIDUAL
            </span>
          </div>
        ) : (
          <div className="bg-card border-[1.5px] border-dashed border-border rounded-lg py-3.25 px-3.5 text-center text-xs text-t3">
            No owner assigned
          </div>
        )}
      </div>

      {/* Cascaded From */}
      {parent && (
        <div className="mb-3.5">
          <div className="text-[9.5px] font-bold text-t3 uppercase tracking-[1px] mb-2">
            CASCADED FROM
          </div>
          <div className="bg-card border border-border rounded-lg py-2.5 px-3.5 flex items-center gap-2.25">
            <KpiNumBadge num={parent.kpi_number} level={parent.level ?? 0} large />
            <span className="text-[13px] font-bold text-near-black flex-1 truncate">{parent.name}</span>
            {parent.target_value != null && (
              <span className="text-xs font-semibold text-t2 shrink-0">
                {parent.unit ? `${parent.unit}${parent.target_value.toLocaleString()}` : parent.target_value.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}

      {!kpi.parent_id && (
        <div className="mb-3.5 text-[11.5px] text-t3 italic">Root KPI — top of cascade tree</div>
      )}
      {kpi.parent_id && !parent && (
        <div className="mb-3.5 text-[11.5px] text-t3 italic">Leaf node — no child KPIs</div>
      )}

      {/* Latest Note */}
      {kpi.description && (
        <div className="mb-4.5">
          <div className="text-[9.5px] font-bold text-t3 uppercase tracking-[1px] mb-2">LATEST NOTE</div>
          <div className="bg-card border border-border rounded-lg py-2.5 px-3.5 text-[12.5px] text-near-black leading-relaxed">
            {kpi.description}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-1.75 flex-wrap">
        <button type="button" onClick={() => onUpdateStatus(kpi)}
          className="py-2 px-3.5 rounded-[7px] text-[12.5px] font-semibold cursor-pointer bg-card border border-border text-near-black font-[inherit]">
          Update Status
        </button>
        <button type="button" onClick={() => onAddChild(kpi)}
          className="py-2 px-3.5 rounded-[7px] text-[12.5px] font-semibold cursor-pointer bg-near-black border border-near-black text-white font-[inherit]">
          + Child KPI
        </button>
        <button type="button" onClick={() => onModify(kpi)}
          className="py-2 px-3.5 rounded-[7px] text-[12.5px] font-semibold cursor-pointer bg-card border border-border text-t2 font-[inherit]">
          ⟵ Modify
        </button>
        <button type="button" onClick={() => onDelete(kpi)}
          className="py-2 px-3.5 rounded-[7px] text-[12.5px] font-semibold cursor-pointer bg-[rgba(185,28,28,.06)] border border-[rgba(185,28,28,.25)] text-brand-red font-[inherit]">
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Update Status Modal ──────────────────────────────────────────────────────

function UpdateStatusModal({ kpi, onClose, onSaved }: { kpi: Kpi; onClose: () => void; onSaved: () => void }) {
  const [status,  setStatus]  = useState(kpi.status);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const handleSave = async () => {
    if (status === kpi.status) { onClose(); return; }
    setSaving(true); setError('');
    try {
      await kpis.update(kpi.id, { status });
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update.');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal rounded-modal overflow-hidden" style={{ maxWidth: 380 }}>
        <div className="px-5.5 py-4 border-b border-border flex items-center justify-between">
          <div className="text-[15px] font-black text-near-black">Update Status</div>
          <button type="button" onClick={onClose}
            className="w-7 h-7 rounded-full border border-border bg-[#f5f4f0] cursor-pointer text-[#6b6760] text-[15px] flex items-center justify-center">×</button>
        </div>
        <div className="px-5.5 py-4.5">
          <div className="mb-1 text-[11px] font-bold text-t2 uppercase tracking-[.4px]">KPI</div>
          <div className="text-[13px] font-bold text-near-black mb-3.5">{kpi.name}</div>
          <label className="flabel">New Status</label>
          <select className="fi" value={status} onChange={(e) => setStatus(e.target.value as Kpi['status'])}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {error && <div className="mt-2.5 text-xs text-brand-red">{error}</div>}
        </div>
        <div className="px-5.5 py-3 border-t border-border flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn btn-outline btn-sm">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="btn btn-black btn-sm">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Child Modal ──────────────────────────────────────────────────────────

function AddChildModal({
  parent, ownerFilter, onClose, onSaved,
}: {
  parent: Kpi;
  ownerFilter?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [allKpisList,  setAllKpisList]  = useState<Kpi[]>([]);
  const [selectedId,   setSelectedId]   = useState('');
  const [alloc,        setAlloc]        = useState('50');
  const [remainingPct, setRemainingPct] = useState(100);
  const [error,        setError]        = useState('');
  const [saving,       setSaving]       = useState(false);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    Promise.allSettled([
      kpis.list({ limit: 200, owner_id: ownerFilter }),
      cascade.summary(parent.id),
    ]).then(([kRes, cRes]) => {
      if (kRes.status === 'fulfilled') {
        const eligible = kRes.value.data.filter(
          (k) => k.id !== parent.id && k.parent_id !== parent.id && k.status !== 'cancelled'
        );
        setAllKpisList(eligible);
        if (eligible.length > 0) setSelectedId(eligible[0].id);
      }
      if (cRes.status === 'fulfilled') {
        const rem = cRes.value.data.remaining_pct;
        setRemainingPct(rem);
        setAlloc(String(Math.min(rem, 50)));
      }
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = allKpisList.find((k) => k.id === selectedId);

  const handleSave = async () => {
    if (!selectedId) { setError('Select a KPI'); return; }
    const num = Number(alloc);
    if (num <= 0 || num > remainingPct) { setError(`Allocation must be 1–${remainingPct}%`); return; }
    setSaving(true); setError('');
    try {
      await cascade.link(parent.id, selectedId, num);
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to link KPI.');
    } finally { setSaving(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[480px] rounded-2xl overflow-hidden bg-card shadow-[0_20px_60px_rgba(0,0,0,.2)]">
        <div className="px-5.5 pt-4.5 pb-3.5 border-b border-border flex items-start justify-between">
          <div>
            <div className="text-[16px] font-black tracking-[-0.3px]">Add Child KPI</div>
            <div className="text-xs text-t3 mt-0.5">Under: {parent.kpi_number} · {remainingPct}% allocation available</div>
          </div>
          <button type="button" onClick={onClose}
            className="w-7 h-7 rounded-full border border-border bg-[#f5f4f0] cursor-pointer text-[#6b6760] text-[15px] flex items-center justify-center">×</button>
        </div>

        <div className="px-5.5 py-4.5">
          {loading ? (
            <p className="text-[13px] text-t3 text-center py-4">Loading…</p>
          ) : allKpisList.length === 0 ? (
            <p className="text-[13px] text-t3 text-center py-4">No eligible KPIs to link.</p>
          ) : (
            <>
              <div className="mb-3.25">
                <label className="block text-[11px] font-bold text-t2 mb-1.25 uppercase tracking-[.4px]">Select KPI *</label>
                <select
                  className="w-full bg-card border-[1.5px] border-border rounded-[6px] py-2.25 px-3 text-near-black font-[inherit] text-[13px] outline-none box-border"
                  value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                  {allKpisList.map((k) => (
                    <option key={k.id} value={k.id}>{k.kpi_number} — {k.name}</option>
                  ))}
                </select>
              </div>

              {selected && (
                <div className="mb-3.25 py-2.25 px-3 bg-off rounded-[7px] border border-border text-xs text-t2 flex flex-wrap gap-y-1 gap-x-3.5">
                  <span><b>Type:</b> {selected.type}</span>
                  <span><b>Period:</b> {selected.period}</span>
                  <span><b>Status:</b> {selected.status}</span>
                  {selected.target_value != null && <span><b>Target:</b> {selected.target_value.toLocaleString()}{selected.unit ? ` ${selected.unit}` : ''}</span>}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-t2 mb-1.25 uppercase tracking-[.4px]">Allocation % *</label>
                <input
                  type="number" min="1" max={remainingPct}
                  className="w-full bg-card border-[1.5px] border-border rounded-[6px] py-2.25 px-3 text-near-black font-[inherit] text-[13px] outline-none box-border transition-[border-color] duration-180 focus:border-black"
                  value={alloc}
                  onChange={(e) => setAlloc(e.target.value)} />
                <div className="text-[11px] text-t3 mt-1">Max {remainingPct}% available</div>
              </div>
            </>
          )}
          {error && (
            <div className="mt-2.5 text-xs py-2.25 px-3 rounded-[7px] bg-[rgba(185,28,28,.08)] text-brand-red border border-[rgba(185,28,28,.2)]">{error}</div>
          )}
        </div>

        <div className="px-5.5 py-3 border-t border-border flex justify-end gap-1.75">
          <button type="button" onClick={onClose}
            className="py-2 px-4 rounded-[6px] text-[13px] font-medium cursor-pointer bg-card border border-border2 text-t2 font-[inherit]">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving || allKpisList.length === 0}
            className="py-2 px-4 rounded-[6px] text-[13px] font-semibold bg-black text-white border border-black font-[inherit] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
            {saving ? 'Linking…' : 'Link KPI'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CascadePage() {
  const router      = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin     = currentUser?.is_admin ?? false;

  const [rootKpis,    setRootKpis]    = useState<Kpi[]>([]);
  const [allKpis,     setAllKpis]     = useState<Kpi[]>([]);
  const [allUsers,    setAllUsers]    = useState<User[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedId,  setSelectedId]  = useState('');
  const [treeVersion, setTreeVersion] = useState(0);

  // Modals
  const [addChildTarget,     setAddChildTarget]     = useState<Kpi | null>(null);
  const [updateStatusTarget, setUpdateStatusTarget] = useState<Kpi | null>(null);

  // selected KPI: prefer full-loaded over tree-lazy version
  const [selectedKpiFull, setSelectedKpiFull] = useState<Kpi | null>(null);
  const selectedKpi = selectedKpiFull ?? allKpis.find((k) => k.id === selectedId) ?? null;

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      kpis.list({
        limit: 500,
        owner_id: isAdmin ? undefined : (currentUser?.id ?? undefined),
      }),
      users.list({ limit: 200 }),
    ]).then(([kRes, uRes]) => {
      if (kRes.status === 'fulfilled') {
        const all = kRes.value.data;
        setAllKpis(all);
        const roots = all.filter((k) => !k.parent_id && k.status !== 'cancelled');
        setRootKpis(roots);
        if (roots.length > 0 && !selectedId) setSelectedId(roots[0].id);
      }
      if (uRes.status === 'fulfilled') setAllUsers(uRes.value.data);
    }).finally(() => setLoading(false));
  }, [isAdmin, currentUser?.id, selectedId]);

  useEffect(() => { load(); }, [load]);

  // When a node is selected that isn't in allKpis (lazy-loaded child), fetch it
  useEffect(() => {
    if (!selectedId) { setSelectedKpiFull(null); return; }
    const found = allKpis.find((k) => k.id === selectedId);
    if (found) { setSelectedKpiFull(found); return; }
    kpis.getById(selectedId)
      .then((r) => setSelectedKpiFull(r.data))
      .catch(() => setSelectedKpiFull(null));
  }, [selectedId, allKpis]);

  const handleSelect = (kpi: Kpi) => {
    setSelectedId(kpi.id);
    setSelectedKpiFull(kpi);
  };

  const handleDelete = async (kpi: Kpi) => {
    if (!confirm(`Remove "${kpi.name}" from cascade? This marks it as cancelled.`)) return;
    try {
      if (kpi.parent_id) {
        await cascade.remove(kpi.parent_id, kpi.id);
      } else {
        await kpis.update(kpi.id, { status: 'cancelled' });
      }
      if (selectedId === kpi.id) { setSelectedId(''); setSelectedKpiFull(null); }
      setTreeVersion((v) => v + 1);
      load();
    } catch { /* ignore */ }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-t3 text-[13px]">
      Loading…
    </div>
  );

  return (
    <div className="grid h-full overflow-hidden grid-cols-[1.3fr_1fr]">

      {/* ── Left: Tree ── */}
      <div className="overflow-y-auto border-r border-border px-5.5 py-5">

        {/* Header */}
        <div className="flex items-start justify-between mb-4.5">
          <div>
            <div className="text-[16px] font-black tracking-[-0.25px] text-near-black">
              Cascade KPIs
            </div>
            <div className="text-xs text-t3 mt-0.75">
              <Link href="/kpis" className="text-t3 no-underline">KPI Management</Link>
              <span className="mx-1">›</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-black btn-sm"
            onClick={() => selectedKpi && setAddChildTarget(selectedKpi)}
            disabled={!selectedKpi}
          >
            + Assign KPI
          </button>
        </div>

        {/* Tree */}
        {rootKpis.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-card p-8 text-center">
            <p className="text-[13px] text-t3">
              No KPIs. <Link href="/kpis/new" className="text-black underline">Create one first.</Link>
            </p>
          </div>
        ) : (
          rootKpis.map((k) => (
            <KpiTreeNode
              key={k.id}
              kpi={k}
              level={0}
              selectedId={selectedId}
              onSelect={handleSelect}
              allUsers={allUsers}
              refreshKey={treeVersion}
              onAddChild={setAddChildTarget}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* ── Right: Detail ── */}
      <div className="overflow-y-auto bg-bg">
        <DetailPanel
          kpi={selectedKpi}
          allKpis={allKpis}
          allUsers={allUsers}
          onAddChild={setAddChildTarget}
          onUpdateStatus={setUpdateStatusTarget}
          onDelete={handleDelete}
          onModify={(kpi) => router.push(`/kpis/${kpi.id}`)}
        />
      </div>

      {/* Modals */}
      {addChildTarget && (
        <AddChildModal
          parent={addChildTarget}
          ownerFilter={isAdmin ? undefined : (currentUser?.id ?? undefined)}
          onClose={() => setAddChildTarget(null)}
          onSaved={() => {
            setAddChildTarget(null);
            setTreeVersion((v) => v + 1);
            load();
          }}
        />
      )}

      {updateStatusTarget && (
        <UpdateStatusModal
          kpi={updateStatusTarget}
          onClose={() => setUpdateStatusTarget(null)}
          onSaved={() => {
            setUpdateStatusTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}
