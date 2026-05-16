'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { kpis, cascade, type Kpi, type CascadeSummary } from '@/lib/api';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active:    { bg: 'rgba(26,122,74,.1)',  color: '#15633c' },
    draft:     { bg: 'rgba(180,83,9,.1)',   color: '#b45309' },
    completed: { bg: 'rgba(24,84,168,.1)',  color: '#1854a8' },
    cancelled: { bg: 'rgba(185,28,28,.1)',  color: '#b91c1c' },
  };
  const s = map[status] ?? { bg: 'rgba(0,0,0,.05)', color: '#8a8580' };
  return (
    <span style={{ display: 'inline-flex', padding: '2.5px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

const LEVEL_COLORS = ['#000000', '#333333', '#666666', '#aaaaaa'];

export default function CascadePage() {
  const [rootKpis, setRootKpis] = useState<Kpi[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [summary, setSummary] = useState<CascadeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    kpis.list({ limit: 100, status: 'active' })
      .then((kRes) => {
        const topLevel = kRes.data.filter((k) => !k.parent_id);
        setRootKpis(topLevel);
        if (topLevel.length > 0) setSelectedId(topLevel[0].id);
      }).finally(() => setLoading(false));
  }, []);

  const loadSummary = useCallback(async (id: string) => {
    if (!id) return;
    setLoadingSummary(true);
    try {
      const res = await cascade.summary(id);
      setSummary(res.data);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => { if (selectedId) loadSummary(selectedId); }, [selectedId, loadSummary]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, color: '#8a8580', fontSize: 13 }}>Loading…</div>;

  const levelColor = (level: number) => LEVEL_COLORS[Math.min(level, 3)];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', height: '100%', overflow: 'hidden' }}>

      {/* ─── Left Panel: Tree ─── */}
      <div style={{ overflowY: 'auto', borderRight: '1px solid #e2dfd8', padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', color: '#111110' }}>KPI Cascade Tree</div>
            <div style={{ fontSize: 12, color: '#8a8580', marginTop: 2 }}>Parent → Child hierarchy with KPI numbers</div>
          </div>
          {selectedId && summary && summary.remaining_pct > 0 && (
            <button
              onClick={() => setShowCreate(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, fontSize: 12.5, fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', background: '#000', color: '#fff', border: 'none', transition: 'opacity .15s' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '.85')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
            >
              + Child KPI
            </button>
          )}
        </div>

        {rootKpis.length === 0 ? (
          <div style={{ border: '2px dashed #e2dfd8', borderRadius: 12, padding: '32px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#8a8580' }}>No active KPIs. <Link href="/kpis" style={{ color: '#000', textDecoration: 'underline' }}>Create one first.</Link></p>
          </div>
        ) : (
          <div>
            {rootKpis.map((k) => (
              <KpiTreeNode
                key={k.id}
                kpi={k}
                level={0}
                selectedId={selectedId}
                onSelect={setSelectedId}
                levelColor={levelColor}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Right Panel: Detail ─── */}
      <div style={{ overflowY: 'auto', padding: '20px 22px', background: '#f5f4f1' }}>
        {!selectedId ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 8, color: '#8a8580', textAlign: 'center' }}>
            <div style={{ fontSize: 32, opacity: .4 }}>🌳</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#4a4640' }}>Select a KPI</div>
            <div style={{ fontSize: 12.5 }}>Click any KPI in the tree to view details</div>
          </div>
        ) : loadingSummary ? (
          <p style={{ fontSize: 13, color: '#8a8580' }}>Loading…</p>
        ) : summary ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', marginBottom: 4, color: '#111110' }}>{summary.parent.name}</div>
            <div style={{ fontSize: 12, color: '#8a8580', marginBottom: 14 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: '#e4e1db', color: '#4a4640' }}>{summary.parent.kpi_number}</span>
              {' '}· {summary.parent.type} · {summary.parent.period}
            </div>

            {/* Allocation bar */}
            <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 12, padding: '16px 18px', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111110' }}>Allocation</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 19, fontWeight: 800, color: summary.remaining_pct <= 0 ? '#b91c1c' : '#111110', letterSpacing: '-.3px' }}>{summary.allocated_pct}% <span style={{ fontSize: 13, fontWeight: 400, color: '#8a8580' }}>/ 100%</span></div>
                </div>
              </div>
              <div style={{ height: 8, background: '#e4e1db', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${summary.allocated_pct}%`, background: summary.allocated_pct >= 100 ? '#b91c1c' : '#1a7a4a', borderRadius: 3, transition: 'width .4s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#8a8580' }}>
                <span>{summary.allocated_pct}% allocated</span>
                <span style={{ color: summary.remaining_pct <= 0 ? '#b91c1c' : '#1a7a4a', fontWeight: 600 }}>{summary.remaining_pct}% remaining</span>
              </div>
            </div>

            {/* Target / Current stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
              {[
                { label: 'Target', value: summary.parent.target_value ? `${summary.parent.target_value.toLocaleString()}${summary.parent.unit ? ' ' + summary.parent.unit : ''}` : '—' },
                { label: 'Current', value: summary.parent.current_value !== null ? `${summary.parent.current_value.toLocaleString()}${summary.parent.unit ? ' ' + summary.parent.unit : ''}` : '—' },
                { label: 'Children', value: summary.children.length },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 7, padding: '10px 13px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#8a8580', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.3px', color: '#111110' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Children */}
            {summary.children.length === 0 ? (
              <div style={{ border: '2px dashed #e2dfd8', borderRadius: 12, padding: '24px', textAlign: 'center', background: '#fff' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#4a4640', marginBottom: 4 }}>No child KPIs yet</p>
                <p style={{ fontSize: 12, color: '#8a8580' }}>Click &ldquo;+ Child KPI&rdquo; to cascade this KPI</p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111110', marginBottom: 8 }}>Child KPIs ({summary.children.length})</div>
                {summary.children.map((child) => {
                  const pct = child.target_value ? Math.min(100, Math.round(((child.current_value ?? 0) / child.target_value) * 100)) : null;
                  return (
                    <div key={child.id} style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 9, padding: '11px 14px', marginBottom: 7, boxShadow: '0 1px 3px rgba(0,0,0,.08)', transition: 'all .13s' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#cdc9c1'; (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e2dfd8'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: '#e4e1db', color: '#4a4640' }}>{child.kpi_number}</span>
                        <Link href={`/kpis/${child.id}`} style={{ fontSize: 13, fontWeight: 700, color: '#111110', textDecoration: 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-.1px' }}>{child.name}</Link>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#111110', flexShrink: 0 }}>{child.allocation_pct}%</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StatusBadge status={child.status} />
                        {pct !== null && (
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1, height: 4, background: '#e4e1db', borderRadius: 2, overflow: 'hidden', maxWidth: 80 }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#1a7a4a' : pct >= 50 ? '#1854a8' : '#b45309', borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 10.5, color: '#8a8580', fontWeight: 600 }}>{pct}%</span>
                          </div>
                        )}
                        <button
                          onClick={async () => {
                            if (!confirm(`Remove "${child.name}" from cascade?`)) return;
                            await cascade.remove(selectedId, child.id);
                            loadSummary(selectedId);
                          }}
                          style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 4, color: '#b91c1c', background: 'rgba(185,28,28,.08)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        >Remove</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : null}
      </div>

      {showCreate && summary && (
        <AddChildModal
          parent={summary.parent}
          remainingPct={summary.remaining_pct}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); loadSummary(selectedId); }}
        />
      )}
    </div>
  );
}

function KpiTreeNode({ kpi, level, selectedId, onSelect, levelColor }: { kpi: Kpi; level: number; selectedId: string; onSelect: (id: string) => void; levelColor: (l: number) => string }) {
  const [children, setChildren] = useState<Kpi[]>([]);
  const [expanded, setExpanded] = useState(level === 0);
  const [loaded, setLoaded] = useState(false);
  const isSelected = kpi.id === selectedId;

  const loadChildren = useCallback(async () => {
    if (loaded) return;
    try {
      const res = await kpis.children(kpi.id);
      setChildren(res.data);
      setLoaded(true);
    } catch { setLoaded(true); }
  }, [kpi.id, loaded]);

  useEffect(() => { if (expanded) loadChildren(); }, [expanded, loadChildren]);

  const borderColor = levelColor(level);

  return (
    <div>
      <div
        onClick={() => { onSelect(kpi.id); setExpanded((e) => !e); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '10px 13px',
          border: `1.5px solid ${isSelected ? '#000' : '#e2dfd8'}`,
          borderLeft: `4px solid ${borderColor}`,
          borderRadius: 9, background: isSelected ? '#f0efec' : '#fff',
          cursor: 'pointer', transition: 'all .14s', marginBottom: 4,
          boxShadow: isSelected ? '0 0 0 3px rgba(0,0,0,.06)' : '0 1px 3px rgba(0,0,0,.06)',
        }}
        onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = '#cdc9c1'; }}
        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = '#e2dfd8'; }}
      >
        <span style={{ fontFamily: 'monospace', fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: borderColor === '#000' ? '#000' : borderColor + '20', color: borderColor === '#000' ? '#fff' : borderColor, flexShrink: 0 }}>{kpi.kpi_number}</span>
        <span style={{ fontSize: 13, fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-.1px', color: '#111110' }}>{kpi.name}</span>
        {kpi.allocation_pct < 100 && <span style={{ fontSize: 11, color: '#8a8580', flexShrink: 0 }}>{kpi.allocation_pct}%</span>}
        <span style={{ fontSize: 11, color: '#8a8580', flexShrink: 0 }}>{expanded ? '▾' : '▸'}</span>
      </div>
      {expanded && children.length > 0 && (
        <div style={{ paddingLeft: 20, borderLeft: '2px solid #e2dfd8', marginLeft: 13, marginTop: 4, marginBottom: 4 }}>
          {children.map((c) => (
            <KpiTreeNode key={c.id} kpi={c} level={level + 1} selectedId={selectedId} onSelect={onSelect} levelColor={levelColor} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddChildModal({ parent, remainingPct, onClose, onSaved }: { parent: Kpi; remainingPct: number; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', type: 'quantitative', period: 'quarterly', update_frequency: 'monthly', target_value: '', unit: parent.unit ?? '', allocation_pct: String(Math.min(remainingPct, 50)) });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name) { setError('Name is required'); return; }
    const alloc = Number(form.allocation_pct);
    if (alloc <= 0 || alloc > remainingPct) { setError(`Allocation must be 1–${remainingPct}%`); return; }
    setSaving(true); setError('');
    try {
      await cascade.create(parent.id, { name: form.name, type: form.type as 'quantitative' | 'qualitative', period: form.period as 'monthly' | 'quarterly' | 'annual', update_frequency: form.update_frequency as 'weekly' | 'monthly' | 'quarterly', target_value: form.target_value ? Number(form.target_value) : undefined, unit: form.unit || undefined, allocation_pct: alloc, region_id: parent.region_id });
      onSaved();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setSaving(false); }
  };

  const inputStyle = { width: '100%', background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 6, padding: '9px 12px', color: '#111110', fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const };
  const labelStyle = { display: 'block' as const, fontSize: 11, fontWeight: 700 as const, color: '#4a4640', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '.4px' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(3px)' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: 480, borderRadius: 18, overflow: 'hidden', background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2dfd8', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.3px' }}>Add Child KPI</div>
            <div style={{ fontSize: 12, color: '#8a8580', marginTop: 2 }}>Under: {parent.kpi_number} · {remainingPct}% available</div>
          </div>
          <button onClick={onClose} style={{ background: '#f0efec', border: '1px solid #e2dfd8', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', color: '#4a4640', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: 13 }}><label style={labelStyle}>Name *</label><input style={inputStyle} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Child KPI name" onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 13 }}>
            <div><label style={labelStyle}>Allocation % *</label><input type="number" min="1" max={remainingPct} style={inputStyle} value={form.allocation_pct} onChange={(e) => set('allocation_pct', e.target.value)} onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')} /></div>
            <div><label style={labelStyle}>Target Value</label><input type="number" style={inputStyle} value={form.target_value} onChange={(e) => set('target_value', e.target.value)} placeholder="e.g. 300000" onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 13 }}>
            <div><label style={labelStyle}>Type</label><select style={{ ...inputStyle }} value={form.type} onChange={(e) => set('type', e.target.value)}><option value="quantitative">Quantitative</option><option value="qualitative">Qualitative</option></select></div>
            <div><label style={labelStyle}>Period</label><select style={{ ...inputStyle }} value={form.period} onChange={(e) => set('period', e.target.value)}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option></select></div>
          </div>
          {error && <div style={{ fontSize: 12, padding: '9px 12px', borderRadius: 7, background: 'rgba(185,28,28,.08)', color: '#b91c1c', border: '1px solid rgba(185,28,28,.2)' }}>{error}</div>}
        </div>
        <div style={{ padding: '13px 24px', borderTop: '1px solid #e2dfd8', display: 'flex', justifyContent: 'flex-end', gap: 7 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: '#fff', border: '1px solid #cdc9c1', color: '#4a4640', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', background: '#000', color: '#fff', border: '1px solid #000', fontFamily: 'inherit', opacity: saving ? .6 : 1 }}>
            {saving ? 'Saving…' : 'Add Child KPI'}
          </button>
        </div>
      </div>
    </div>
  );
}
