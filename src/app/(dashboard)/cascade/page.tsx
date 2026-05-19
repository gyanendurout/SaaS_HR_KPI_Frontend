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
    <div title={name} style={{
      width: size, height: size, borderRadius: '50%', background: color,
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 800, flexShrink: 0,
      border: '2px solid #fff', boxSizing: 'border-box',
    }}>
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
    <span style={{
      fontFamily: 'monospace',
      fontSize: large ? 11 : 9.5,
      fontWeight: 700,
      padding: large ? '3px 8px' : '2px 6px',
      borderRadius: 4,
      background: bg,
      color: '#fff',
      whiteSpace: 'nowrap',
      letterSpacing: '.3px',
      flexShrink: 0,
    }}>
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
    <span style={{
      fontSize: 10.5, fontWeight: 600,
      padding: '2px 7px', borderRadius: 4,
      background: bg, color,
      textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

// ─── Progress badge ───────────────────────────────────────────────────────────

function ProgressBadge({ pct }: { pct: number }) {
  const color = pct >= 80 ? '#15633c' : pct >= 50 ? '#1854a8' : '#b45309';
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700,
      padding: '2px 7px', borderRadius: 4,
      background: `${color}1a`, color,
      whiteSpace: 'nowrap',
    }}>
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
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 11px',
          borderTop:    `1.5px solid ${isSelected ? '#111110' : '#e2dfd8'}`,
          borderRight:  `1.5px solid ${isSelected ? '#111110' : '#e2dfd8'}`,
          borderBottom: `1.5px solid ${isSelected ? '#111110' : '#e2dfd8'}`,
          borderLeft:   `3.5px solid ${levelBorderColor}`,
          borderRadius: 9,
          background: isSelected ? '#f0efec' : '#fff',
          cursor: 'pointer',
          transition: 'border-color .14s, background .14s',
          marginBottom: 5,
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
            <KpiNumBadge num={kpi.kpi_number} level={level} />
            <span style={{
              fontSize: 13, fontWeight: 700, color: '#111110',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              letterSpacing: '-.1px',
            }}>
              {kpi.name}
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#8a8580', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {owner && <span>{owner.full_name}</span>}
            {owner && fmtVal(kpi.target_value, kpi.unit) && <span>·</span>}
            {fmtVal(kpi.target_value, kpi.unit) && <span>{fmtVal(kpi.target_value, kpi.unit)}</span>}
            {fmtVal(kpi.current_value, kpi.unit) && <span>· {fmtVal(kpi.current_value, kpi.unit)}</span>}
          </div>
        </div>

        {/* Right: badges + actions */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {pct !== null && <ProgressBadge pct={pct} />}
          <StatusBadge status={kpi.status} />

          <button
            type="button"
            title="Add child KPI"
            onClick={() => onAddChild(kpi)}
            style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 4,
              border: '1px solid #e2dfd8', background: '#f8f7f5',
              cursor: 'pointer', color: '#4a4640',
              fontFamily: 'inherit', fontWeight: 600, whiteSpace: 'nowrap',
            }}
          >
            +Child
          </button>

          <Link
            href={`/kpis/${kpi.id}`}
            title="Open KPI"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 24, height: 24, borderRadius: 4,
              border: '1px solid #e2dfd8', background: '#f8f7f5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#4a4640', textDecoration: 'none', flexShrink: 0,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 1.5h5.5v5.5M9.5 1.5L1 10"/>
            </svg>
          </Link>

          <button
            type="button"
            title="Remove"
            onClick={() => onDelete(kpi)}
            style={{
              width: 24, height: 24, borderRadius: 4,
              border: '1px solid rgba(185,28,28,.2)',
              background: 'rgba(185,28,28,.06)',
              cursor: 'pointer', color: '#b91c1c',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M1 1l7 7M8 1l-7 7"/>
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{
              width: 20, height: 20, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#8a8580',
              cursor: 'pointer', fontSize: 11, background: 'none', border: 'none',
              flexShrink: 0,
            }}
          >
            {expanded ? '▾' : '▸'}
          </button>
        </div>
      </div>

      {/* Children */}
      {expanded && children.length > 0 && (
        <div style={{ paddingLeft: 22, borderLeft: '2px solid #e2dfd8', marginLeft: 14, marginTop: 2, marginBottom: 2 }}>
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
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: 10,
        color: '#8a8580', textAlign: 'center', padding: 32,
      }}>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ opacity: .22 }}>
          <rect x="6" y="6" width="14" height="14" rx="3" stroke="#111110" strokeWidth="2"/>
          <rect x="24" y="6" width="14" height="14" rx="3" stroke="#111110" strokeWidth="2"/>
          <rect x="15" y="24" width="14" height="14" rx="3" stroke="#111110" strokeWidth="2"/>
          <path d="M13 20v4M31 20v4M22 14v10" stroke="#111110" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#4a4640' }}>Select a KPI</div>
        <div style={{ fontSize: 12.5, maxWidth: 220, lineHeight: 1.6 }}>
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
    <div style={{ padding: '22px 22px 28px' }}>

      {/* KPI number + level chip */}
      <div style={{ fontSize: 11, fontWeight: 600, color: '#8a8580', marginBottom: 7, letterSpacing: '.1px' }}>
        {kpi.kpi_number} · LEVEL {kpi.level ?? 0}
      </div>

      {/* Title */}
      <div style={{ fontSize: 21, fontWeight: 800, color: '#111110', letterSpacing: '-.45px', lineHeight: 1.2, marginBottom: 12 }}>
        {kpi.name}
      </div>

      {/* Tags row */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
          background: kpi.type === 'quantitative' ? 'rgba(24,84,168,.1)' : 'rgba(124,58,237,.1)',
          color:      kpi.type === 'quantitative' ? '#1854a8' : '#7c3aed',
        }}>
          {kpi.type === 'quantitative' ? 'Quant' : 'Qual'}
        </span>
        <StatusBadge status={kpi.status} />
        {kpi.parent_id && kpi.allocation_pct > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, border: '1px solid #e2dfd8', color: '#4a4640', background: '#fff' }}>
            {kpi.allocation_pct}% of parent
          </span>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'TARGET',  value: fmtVal(kpi.target_value, kpi.unit)  },
          { label: 'CURRENT', value: fmtVal(kpi.current_value, kpi.unit) },
          { label: 'PERIOD',  value: kpi.period?.toUpperCase() ?? '—'    },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 8, padding: '10px 13px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#8a8580', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.3px', color: '#111110' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {pct !== null && (
        <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 8, padding: '10px 13px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#111110' }}>Progress</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: pct >= 80 ? '#15633c' : pct >= 50 ? '#1854a8' : '#b45309' }}>{pct}%</span>
          </div>
          <div style={{ height: 6, background: '#e4e1db', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? '#1a7a4a' : pct >= 50 ? '#1854a8' : '#b45309', borderRadius: 3, transition: 'width .4s' }} />
          </div>
        </div>
      )}

      {/* Primary Owner */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: '#8a8580', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          PRIMARY OWNER
        </div>
        {owner ? (
          <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 8, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={owner.full_name} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111110' }}>{owner.full_name}</div>
              <div style={{ fontSize: 11.5, color: '#8a8580', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {owner.designation && <>{owner.designation} · </>}{owner.email}
              </div>
            </div>
            <span style={{ fontSize: 9.5, fontWeight: 700, padding: '3px 7px', borderRadius: 4, background: '#e8e6e1', color: '#4a4640', letterSpacing: '.3px', flexShrink: 0 }}>
              INDIVIDUAL
            </span>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1.5px dashed #e2dfd8', borderRadius: 8, padding: '13px 14px', textAlign: 'center', fontSize: 12, color: '#8a8580' }}>
            No owner assigned
          </div>
        )}
      </div>

      {/* Cascaded From */}
      {parent && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#8a8580', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            CASCADED FROM
          </div>
          <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
            <KpiNumBadge num={parent.kpi_number} level={parent.level ?? 0} large />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111110', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {parent.name}
            </span>
            {parent.target_value != null && (
              <span style={{ fontSize: 12, fontWeight: 600, color: '#4a4640', flexShrink: 0 }}>
                {parent.unit ? `${parent.unit}${parent.target_value.toLocaleString()}` : parent.target_value.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Leaf node notice if no parent_id and not a root with allocation */}
      {!kpi.parent_id && (
        <div style={{ marginBottom: 14, fontSize: 11.5, color: '#8a8580', fontStyle: 'italic' }}>
          Root KPI — top of cascade tree
        </div>
      )}
      {kpi.parent_id && !parent && (
        <div style={{ marginBottom: 14, fontSize: 11.5, color: '#8a8580', fontStyle: 'italic' }}>
          Leaf node — no child KPIs
        </div>
      )}

      {/* Latest Note */}
      {kpi.description && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#8a8580', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            LATEST NOTE
          </div>
          <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: '#111110', lineHeight: 1.65 }}>
            {kpi.description}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => onUpdateStatus(kpi)}
          style={{ padding: '8px 14px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: '#fff', border: '1px solid #e2dfd8', color: '#111110', fontFamily: 'inherit' }}>
          Update Status
        </button>
        <button type="button" onClick={() => onAddChild(kpi)}
          style={{ padding: '8px 14px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: '#111110', border: '1px solid #111110', color: '#fff', fontFamily: 'inherit' }}>
          + Child KPI
        </button>
        <button type="button" onClick={() => onModify(kpi)}
          style={{ padding: '8px 14px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: '#fff', border: '1px solid #e2dfd8', color: '#4a4640', fontFamily: 'inherit' }}>
          ⟵ Modify
        </button>
        <button type="button" onClick={() => onDelete(kpi)}
          style={{ padding: '8px 14px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: 'rgba(185,28,28,.06)', border: '1px solid rgba(185,28,28,.25)', color: '#b91c1c', fontFamily: 'inherit' }}>
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
      <div className="modal" style={{ maxWidth: 380, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #e2dfd8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#111110' }}>Update Status</div>
          <button type="button" onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #e2dfd8', background: '#f5f4f0', cursor: 'pointer', color: '#6b6760', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ padding: '18px 22px' }}>
          <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 700, color: '#4a4640', textTransform: 'uppercase', letterSpacing: '.4px' }}>KPI</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111110', marginBottom: 14 }}>{kpi.name}</div>
          <label className="flabel">New Status</label>
          <select className="fi" value={status} onChange={(e) => setStatus(e.target.value as Kpi['status'])}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {error && <div style={{ marginTop: 10, fontSize: 12, color: '#b91c1c' }}>{error}</div>}
        </div>
        <div style={{ padding: '12px 22px', borderTop: '1px solid #e2dfd8', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
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

  const inp = {
    width: '100%', background: '#fff', border: '1.5px solid #e2dfd8',
    borderRadius: 6, padding: '9px 12px', color: '#111110',
    fontFamily: 'inherit', fontSize: 13, outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: 480, borderRadius: 16, overflow: 'hidden', background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #e2dfd8', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.3px' }}>Add Child KPI</div>
            <div style={{ fontSize: 12, color: '#8a8580', marginTop: 2 }}>Under: {parent.kpi_number} · {remainingPct}% allocation available</div>
          </div>
          <button type="button" onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #e2dfd8', background: '#f5f4f0', cursor: 'pointer', color: '#6b6760', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ padding: '18px 22px' }}>
          {loading ? (
            <p style={{ fontSize: 13, color: '#8a8580', textAlign: 'center', padding: '16px 0' }}>Loading…</p>
          ) : allKpisList.length === 0 ? (
            <p style={{ fontSize: 13, color: '#8a8580', textAlign: 'center', padding: '16px 0' }}>No eligible KPIs to link.</p>
          ) : (
            <>
              <div style={{ marginBottom: 13 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4a4640', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px' }}>Select KPI *</label>
                <select style={inp} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                  {allKpisList.map((k) => (
                    <option key={k.id} value={k.id}>{k.kpi_number} — {k.name}</option>
                  ))}
                </select>
              </div>

              {selected && (
                <div style={{ marginBottom: 13, padding: '9px 12px', background: '#f8f7f5', borderRadius: 7, border: '1px solid #e2dfd8', fontSize: 12, color: '#4a4640', display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
                  <span><b>Type:</b> {selected.type}</span>
                  <span><b>Period:</b> {selected.period}</span>
                  <span><b>Status:</b> {selected.status}</span>
                  {selected.target_value != null && <span><b>Target:</b> {selected.target_value.toLocaleString()}{selected.unit ? ` ${selected.unit}` : ''}</span>}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4a4640', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px' }}>Allocation % *</label>
                <input type="number" min="1" max={remainingPct} style={inp} value={alloc}
                  onChange={(e) => setAlloc(e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = '#000')}
                  onBlur={(e)  => (e.target.style.borderColor = '#e2dfd8')} />
                <div style={{ fontSize: 11, color: '#8a8580', marginTop: 4 }}>Max {remainingPct}% available</div>
              </div>
            </>
          )}
          {error && <div style={{ marginTop: 10, fontSize: 12, padding: '9px 12px', borderRadius: 7, background: 'rgba(185,28,28,.08)', color: '#b91c1c', border: '1px solid rgba(185,28,28,.2)' }}>{error}</div>}
        </div>

        <div style={{ padding: '12px 22px', borderTop: '1px solid #e2dfd8', display: 'flex', justifyContent: 'flex-end', gap: 7 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: '#fff', border: '1px solid #cdc9c1', color: '#4a4640', fontFamily: 'inherit' }}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving || allKpisList.length === 0}
            style={{ padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: (saving || allKpisList.length === 0) ? 'not-allowed' : 'pointer', background: '#000', color: '#fff', border: '1px solid #000', fontFamily: 'inherit', opacity: (saving || allKpisList.length === 0) ? .6 : 1 }}>
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
  const [addChildTarget,    setAddChildTarget]    = useState<Kpi | null>(null);
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, color: '#8a8580', fontSize: 13 }}>
      Loading…
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', height: '100%', overflow: 'hidden' }}>

      {/* ── Left: Tree ── */}
      <div style={{ overflowY: 'auto', borderRight: '1px solid #e2dfd8', padding: '20px 22px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.25px', color: '#111110' }}>
              Cascade KPIs
            </div>
            <div style={{ fontSize: 12, color: '#8a8580', marginTop: 3 }}>
              <Link href="/kpis" style={{ color: '#8a8580', textDecoration: 'none' }}>KPI Management</Link>
              <span style={{ margin: '0 4px' }}>›</span>
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
          <div style={{ border: '2px dashed #e2dfd8', borderRadius: 12, padding: '32px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#8a8580' }}>
              No KPIs. <Link href="/kpis/new" style={{ color: '#000', textDecoration: 'underline' }}>Create one first.</Link>
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
      <div style={{ overflowY: 'auto', background: '#f5f4f1' }}>
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
