'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'dropdown' | 'currency' | 'date' | 'textarea';
  required: boolean;
  opts?: string[];
}

interface KpiTemplate {
  id: string;
  category: string;
  name: string;
  description: string;
  type: 'quantitative' | 'qualitative';
  period: 'monthly' | 'quarterly' | 'annual';
  unit: string;
  targetExample: string;
  tags: string[];
  color: string;
  icon: string;
  usedIn: number;
  fields: TemplateField[];
}

// ─── Seed templates ────────────────────────────────────────────────────────────

const SEED: KpiTemplate[] = [
  {
    id: 't1', category: 'Revenue', name: 'Revenue Growth Rate',
    description: 'Measures percentage increase in total revenue over a defined period. Core financial health indicator.',
    type: 'quantitative', period: 'quarterly', unit: '%', targetExample: '15%',
    tags: ['Finance', 'Growth'], color: '#1a7a4a', icon: '💰', usedIn: 0,
    fields: [
      { id: 'f1', label: 'KPI Name',           type: 'text',     required: true },
      { id: 'f2', label: 'Target Growth (%)',   type: 'number',   required: true },
      { id: 'f3', label: 'Measurement Period',  type: 'dropdown', required: true, opts: ['Monthly', 'Quarterly', 'Annual'] },
      { id: 'f4', label: 'Baseline Value (%)',  type: 'number',   required: false },
    ],
  },
  {
    id: 't2', category: 'Customer', name: 'Customer Satisfaction (CSAT)',
    description: 'Tracks customer satisfaction scores from surveys and feedback forms. Key CX metric.',
    type: 'quantitative', period: 'monthly', unit: 'score', targetExample: '4.5/5',
    tags: ['CX', 'NPS'], color: '#1854a8', icon: '⭐', usedIn: 0,
    fields: [
      { id: 'f1', label: 'KPI Name',           type: 'text',     required: true },
      { id: 'f2', label: 'CSAT Target (score)', type: 'number',   required: true },
      { id: 'f3', label: 'Survey Method',       type: 'dropdown', required: true, opts: ['NPS', 'CSAT', 'CES'] },
      { id: 'f4', label: 'Sample Size',         type: 'number',   required: false },
    ],
  },
  {
    id: 't3', category: 'Operations', name: 'Operational Efficiency Index',
    description: 'Composite score of process throughput, defect rate, and cycle time. Used by ops leadership.',
    type: 'quantitative', period: 'monthly', unit: '%', targetExample: '92%',
    tags: ['Ops', 'Efficiency'], color: '#b45309', icon: '⚡', usedIn: 0,
    fields: [
      { id: 'f1', label: 'KPI Name',       type: 'text',     required: true },
      { id: 'f2', label: 'OTD Target (%)', type: 'number',   required: true },
      { id: 'f3', label: 'Scope',          type: 'dropdown', required: true, opts: ['Projects', 'Shipments', 'Tickets'] },
      { id: 'f4', label: 'Notes',          type: 'textarea', required: false },
    ],
  },
  {
    id: 't4', category: 'HR', name: 'Employee Engagement Score',
    description: 'Quarterly pulse survey tracking workforce motivation, belonging, and satisfaction.',
    type: 'quantitative', period: 'quarterly', unit: '%', targetExample: '80%',
    tags: ['HR', 'Culture'], color: '#7c3aed', icon: '🤝', usedIn: 0,
    fields: [
      { id: 'f1', label: 'KPI Name',              type: 'text',     required: true },
      { id: 'f2', label: 'Engagement Target (%)',  type: 'number',   required: true },
      { id: 'f3', label: 'Survey Frequency',       type: 'dropdown', required: true, opts: ['Monthly', 'Quarterly', 'Annual'] },
    ],
  },
  {
    id: 't5', category: 'Revenue', name: 'Net Revenue Retention (NRR)',
    description: 'Measures revenue retained from existing customers including expansions and churns.',
    type: 'quantitative', period: 'monthly', unit: '%', targetExample: '110%',
    tags: ['Finance', 'SaaS'], color: '#1a7a4a', icon: '💰', usedIn: 0,
    fields: [
      { id: 'f1', label: 'KPI Name',       type: 'text',   required: true },
      { id: 'f2', label: 'NRR Target (%)', type: 'number', required: true },
      { id: 'f3', label: 'Cohort Period',  type: 'date',   required: false },
    ],
  },
  {
    id: 't6', category: 'Customer', name: 'Customer Churn Rate',
    description: "Percentage of customers who cancelled or didn't renew in a given period.",
    type: 'quantitative', period: 'monthly', unit: '%', targetExample: '<3%',
    tags: ['CX', 'Retention'], color: '#b91c1c', icon: '📉', usedIn: 0,
    fields: [
      { id: 'f1', label: 'KPI Name',           type: 'text',     required: true },
      { id: 'f2', label: 'Churn Target (%)',    type: 'number',   required: true },
      { id: 'f3', label: 'Measurement Window',  type: 'dropdown', required: true, opts: ['Monthly', 'Quarterly'] },
    ],
  },
  {
    id: 't7', category: 'Operations', name: 'On-Time Delivery Rate',
    description: 'Tracks percentage of deliveries or releases completed within the committed timeline.',
    type: 'quantitative', period: 'monthly', unit: '%', targetExample: '95%',
    tags: ['Ops', 'Delivery'], color: '#b45309', icon: '⚡', usedIn: 0,
    fields: [
      { id: 'f1', label: 'KPI Name',       type: 'text',   required: true },
      { id: 'f2', label: 'OTD Target (%)', type: 'number', required: true },
    ],
  },
  {
    id: 't8', category: 'HR', name: 'Time to Hire',
    description: 'Average number of days from job opening to accepted offer. Tracks recruitment efficiency.',
    type: 'quantitative', period: 'quarterly', unit: 'days', targetExample: '30',
    tags: ['HR', 'Recruiting'], color: '#0e7490', icon: '🤝', usedIn: 0,
    fields: [
      { id: 'f1', label: 'KPI Name',    type: 'text',     required: true },
      { id: 'f2', label: 'Target Days', type: 'number',   required: true },
      { id: 'f3', label: 'Role Level',  type: 'dropdown', required: false, opts: ['IC', 'Manager', 'Senior Manager', 'Director', 'VP+'] },
    ],
  },
  {
    id: 't9', category: 'Revenue', name: 'Average Contract Value (ACV)',
    description: 'Average annualized revenue per contract. Useful for tracking deal quality over time.',
    type: 'quantitative', period: 'quarterly', unit: 'USD', targetExample: '$50,000',
    tags: ['Finance', 'Sales'], color: '#1a7a4a', icon: '💰', usedIn: 0,
    fields: [
      { id: 'f1', label: 'KPI Name',     type: 'text',     required: true },
      { id: 'f2', label: 'ACV Target',   type: 'currency', required: true },
      { id: 'f3', label: 'Deal Segment', type: 'dropdown', required: false, opts: ['SMB', 'Mid-Market', 'Enterprise'] },
    ],
  },
];

const CATEGORIES = ['All', 'Revenue', 'Customer', 'Operations', 'HR'];
const FIELD_TYPES: TemplateField['type'][] = ['text', 'number', 'dropdown', 'currency', 'date', 'textarea'];
const CAT_COLORS: Record<string, string> = { Revenue: '#1a7a4a', Customer: '#1854a8', Operations: '#b45309', HR: '#7c3aed' };
const CAT_ICONS:  Record<string, string> = { Revenue: '💰',      Customer: '⭐',      Operations: '⚡',      HR: '🤝'     };

function makeField(): TemplateField {
  return { id: `f${Date.now()}`, label: '', type: 'text', required: false };
}

function exportCsv(t: KpiTemplate) {
  const hdrs = ['KPI No', 'Parent KPI No', ...t.fields.map((f) => f.label + (f.required ? ' *' : ''))];
  const row  = ['KPI-???', '(leave blank)', ...t.fields.map(() => '')];
  const csv  = [hdrs, row].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
  const a    = document.createElement('a');
  a.href     = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  a.download = `JOOLA_${t.name.replace(/\s+/g, '_')}.csv`;
  a.click();
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const router = useRouter();

  const [templates, setTemplates]   = useState<KpiTemplate[]>(SEED);
  const [activeCategory, setActive] = useState('All');
  const [search, setSearch]         = useState('');

  // Builder state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [bName, setBName]             = useState('');
  const [bCat, setBCat]               = useState('Revenue');
  const [bDesc, setBDesc]             = useState('');
  const [bFields, setBFields]         = useState<TemplateField[]>([makeField()]);

  const filtered = templates.filter((t) => {
    const catOk = activeCategory === 'All' || t.category === activeCategory;
    const srchOk = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((g) => g.toLowerCase().includes(search.toLowerCase()));
    return catOk && srchOk;
  });

  const counts = CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = cat === 'All' ? templates.length : templates.filter((t) => t.category === cat).length;
    return acc;
  }, {});

  const openBuilder = (id?: string) => {
    if (id) {
      const t = templates.find((x) => x.id === id);
      if (!t) return;
      setEditingId(id); setBName(t.name); setBCat(t.category); setBDesc(t.description);
      setBFields(t.fields.length ? t.fields.map((f) => ({ ...f })) : [makeField()]);
    } else {
      setEditingId(null); setBName(''); setBCat('Revenue'); setBDesc(''); setBFields([makeField()]);
    }
    setBuilderOpen(true);
  };

  const saveBuilder = () => {
    if (!bName.trim()) return;
    const validFields = bFields.filter((f) => f.label.trim());
    if (editingId) {
      setTemplates((prev) => prev.map((t) => t.id !== editingId ? t : {
        ...t, name: bName.trim(), category: bCat, description: bDesc,
        color: CAT_COLORS[bCat] ?? '#4a4640', icon: CAT_ICONS[bCat] ?? '📋',
        fields: validFields,
      }));
    } else {
      setTemplates((prev) => [...prev, {
        id: `custom_${Date.now()}`, category: bCat, name: bName.trim(),
        description: bDesc || 'Custom template', type: 'quantitative', period: 'monthly',
        unit: '', targetExample: '', tags: [bCat],
        color: CAT_COLORS[bCat] ?? '#4a4640', icon: CAT_ICONS[bCat] ?? '📋',
        usedIn: 0, fields: validFields,
      }]);
    }
    setBuilderOpen(false);
  };

  const patchField = (idx: number, patch: Partial<TemplateField>) =>
    setBFields((prev) => prev.map((f, i) => i === idx ? { ...f, ...patch } : f));
  const dropField  = (idx: number) => setBFields((prev) => prev.filter((_, i) => i !== idx));
  const pushField  = (type: TemplateField['type']) => setBFields((prev) => [...prev, { ...makeField(), type }]);

  return (
    <div style={{ padding: '22px 26px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', marginBottom: 3, color: '#111110' }}>KPI Templates</div>
          <div style={{ fontSize: 12, color: '#8a8580' }}>Pre-built templates · Define fields · Export to Excel · {templates.length} total</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-outline btn-sm"
            onClick={() => filtered.forEach((t) => exportCsv(t))}>
            ↓ Export All
          </button>
          <button type="button" className="btn btn-black btn-sm"
            onClick={() => openBuilder()}>
            + Create Template
          </button>
        </div>
      </div>

      {/* Search + Category filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="fi" placeholder="Search templates…" value={search}
          onChange={(e) => setSearch(e.target.value)} style={{ width: 240 }} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => (
            <button type="button" key={cat} onClick={() => setActive(cat)}
              style={{
                padding: '7px 13px', borderRadius: 7, fontSize: 12.5, cursor: 'pointer',
                fontWeight: activeCategory === cat ? 700 : 500,
                background: activeCategory === cat ? '#000' : '#fff',
                color: activeCategory === cat ? '#fff' : '#4a4640',
                border: `1.5px solid ${activeCategory === cat ? '#000' : '#e2dfd8'}`,
                fontFamily: 'inherit', transition: 'all .14s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
              {cat}
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 5px', borderRadius: 8, background: activeCategory === cat ? 'rgba(255,255,255,.25)' : '#f0efec', color: activeCategory === cat ? '#fff' : '#8a8580' }}>
                {counts[cat]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Template list */}
      {filtered.length === 0 ? (
        <div style={{ border: '2px dashed #e2dfd8', borderRadius: 14, padding: '48px 20px', textAlign: 'center', background: '#f8f7f5' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#4a4640', marginBottom: 4 }}>No templates found</p>
          <p style={{ fontSize: 12, color: '#8a8580' }}>Try a different search term or category filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((tmpl) => (
            <div key={tmpl.id} style={{
              background: '#fff',
              borderTop: `3px solid ${tmpl.color}`,
              borderRight: '1px solid #e2dfd8',
              borderBottom: '1px solid #e2dfd8',
              borderLeft: '1px solid #e2dfd8',
              borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,.06)',
            }}>
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>

                {/* Category icon */}
                <div style={{ width: 46, height: 46, borderRadius: 10, background: `${tmpl.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {tmpl.icon}
                </div>

                {/* Main content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#111110', letterSpacing: '-.1px' }}>{tmpl.name}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: `${tmpl.color}18`, color: tmpl.color }}>{tmpl.category}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 500, padding: '2px 8px', borderRadius: 4, background: '#f0efec', color: '#8a8580', textTransform: 'capitalize' }}>{tmpl.period}</span>
                  </div>

                  <p style={{ fontSize: 12, color: '#8a8580', margin: '0 0 10px', lineHeight: 1.5 }}>{tmpl.description}</p>

                  {/* Fields chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 9 }}>
                    {tmpl.fields.length === 0
                      ? <span style={{ fontSize: 11.5, color: '#c4c0b8', fontStyle: 'italic' }}>No fields defined</span>
                      : tmpl.fields.map((f) => (
                          <span key={f.id} style={{ padding: '3px 9px', background: '#f8f7f5', border: '1px solid #e2dfd8', borderRadius: 5, fontSize: 11.5, color: '#4a4640', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            {f.label}
                            {f.required && <span style={{ color: '#b91c1c', fontWeight: 700, fontSize: 10 }}>*</span>}
                          </span>
                        ))
                    }
                  </div>

                  {/* Meta row */}
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#8a8580' }}>Unit: <strong style={{ color: '#4a4640' }}>{tmpl.unit || '—'}</strong></span>
                    <span style={{ fontSize: 11, color: '#8a8580' }}>Target: <strong style={{ color: '#4a4640' }}>{tmpl.targetExample || '—'}</strong></span>
                    <span style={{ fontSize: 11, color: tmpl.usedIn > 0 ? '#1a7a4a' : '#8a8580' }}>
                      Used in <strong>{tmpl.usedIn}</strong> KPI{tmpl.usedIn !== 1 ? 's' : ''}
                    </span>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {tmpl.tags.map((tag) => (
                        <span key={tag} style={{ fontSize: 10.5, fontWeight: 600, padding: '1.5px 6px', borderRadius: 4, background: '#f0efec', color: '#4a4640' }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <button type="button" className="btn btn-outline btn-sm"
                    onClick={() => exportCsv(tmpl)}
                    style={{ justifyContent: 'center', minWidth: 80 }}>
                    ↓ Excel
                  </button>
                  <button type="button" className="btn btn-outline btn-sm"
                    onClick={() => openBuilder(tmpl.id)}
                    style={{ justifyContent: 'center', minWidth: 80 }}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-black btn-sm"
                    onClick={() => router.push(`/kpis/new?template=${tmpl.id}`)}
                    style={{ justifyContent: 'center', minWidth: 80 }}>
                    Use →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 18, padding: '11px 16px', background: '#f8f7f5', border: '1px solid #e2dfd8', borderRadius: 10, fontSize: 12, color: '#8a8580', lineHeight: 1.6 }}>
        Templates are starting points — customize the name, target, frequency, and owner after applying.
        Custom templates created here are session-only until API persistence is enabled.
      </div>

      {/* Template builder modal */}
      {builderOpen && (
        <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setBuilderOpen(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>

            {/* Modal header */}
            <div style={{ padding: '16px 22px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>
                {editingId ? 'Edit Template' : 'Create Template'}
              </span>
              <button type="button" onClick={() => setBuilderOpen(false)}
                style={{ fontSize: 20, color: 'rgba(255,255,255,.45)', border: 'none', background: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: '20px 22px' }}>

              {/* Name + Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="flabel">Template Name *</label>
                  <input className="fi" type="text" placeholder="e.g. Revenue Growth"
                    value={bName} onChange={(e) => setBName(e.target.value)} />
                </div>
                <div>
                  <label className="flabel">Category</label>
                  <select className="fi" value={bCat} onChange={(e) => setBCat(e.target.value)}>
                    {['Revenue', 'Customer', 'Operations', 'HR'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 18 }}>
                <label className="flabel">Description</label>
                <textarea className="fi" rows={2} placeholder="Describe what this template tracks…"
                  value={bDesc} onChange={(e) => setBDesc(e.target.value)} />
              </div>

              {/* Fields list */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label className="flabel" style={{ marginBottom: 0 }}>Template Fields</label>
                <span style={{ fontSize: 11, color: '#8a8580' }}>{bFields.filter((f) => f.label.trim()).length} defined</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12, maxHeight: 300, overflowY: 'auto', paddingRight: 2 }}>
                {bFields.map((field, idx) => (
                  <div key={field.id} style={{ padding: '10px 12px', background: '#f8f7f5', border: '1px solid #e2dfd8', borderRadius: 8 }}>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 7 }}>
                      <input className="fi" type="text" placeholder="Field label…"
                        value={field.label} onChange={(e) => patchField(idx, { label: e.target.value })}
                        style={{ flex: 1 }} />
                      <button type="button" onClick={() => dropField(idx)}
                        style={{ padding: '5px 8px', borderRadius: 5, border: '1px solid rgba(185,28,28,.2)', background: 'rgba(185,28,28,.06)', color: '#b91c1c', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, lineHeight: 1 }}>
                        ✕
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                      <select className="fi" value={field.type} onChange={(e) => patchField(idx, { type: e.target.value as TemplateField['type'] })}
                        style={{ flex: 1 }}>
                        {FIELD_TYPES.map((t) => (
                          <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                        ))}
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#4a4640', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', flexShrink: 0 }}>
                        <input type="checkbox" checked={field.required} onChange={(e) => patchField(idx, { required: e.target.checked })} />
                        Required
                      </label>
                    </div>
                    {field.type === 'dropdown' && (
                      <input className="fi" type="text"
                        placeholder="Options: Monthly, Quarterly, Annual"
                        value={field.opts?.join(', ') ?? ''}
                        onChange={(e) => patchField(idx, { opts: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                        style={{ marginTop: 7 }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Add field buttons */}
              <div style={{ padding: '10px 12px', background: '#f8f7f5', borderRadius: 8, border: '1px solid #e2dfd8', marginBottom: 4 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#8a8580', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Add Field</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {FIELD_TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => pushField(t)}
                      style={{
                        padding: '5px 11px', border: '1.5px dashed #cdc9c1', borderRadius: 6,
                        fontSize: 11.5, fontWeight: 500, color: '#4a4640', cursor: 'pointer',
                        transition: 'all .14s', background: 'transparent', fontFamily: 'inherit',
                      }}
                      onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#000'; el.style.color = '#000'; }}
                      onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#cdc9c1'; el.style.color = '#4a4640'; }}>
                      + {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding: '14px 22px', borderTop: '1px solid #e2dfd8', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setBuilderOpen(false)} className="btn btn-outline">Cancel</button>
              <button type="button" onClick={saveBuilder} disabled={!bName.trim()} className="btn btn-black">
                {editingId ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
