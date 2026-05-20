'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FIELD_TYPES, makeField, exportTemplateCsv,
  type KpiTemplate, type TemplateField, type FieldType,
} from '@/lib/kpi-templates';
import { templates as templatesApi } from '@/lib/api';

// ─── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: 34, height: 18, borderRadius: 9, flexShrink: 0,
        background: on ? '#111110' : '#d4d1cb',
        position: 'relative', cursor: 'pointer', transition: 'background .18s',
      }}
    >
      <div style={{
        position: 'absolute', top: 2,
        left: on ? 18 : 2,
        width: 14, height: 14, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        transition: 'left .18s',
      }} />
    </div>
  );
}

// ─── Builder modal ─────────────────────────────────────────────────────────────

const DEFAULT_NEW_FIELDS: TemplateField[] = [
  { id: 'f1', label: 'KPI Name',        type: 'text',     required: true  },
  { id: 'f2', label: 'Country / Region', type: 'dropdown', required: true  },
  { id: 'f3', label: 'KPI Type',         type: 'dropdown', required: true  },
  { id: 'f4', label: 'Target Value',     type: 'currency', required: true  },
];

function BuilderModal({
  editingId, bName, setBName, bCat, setBCat, bFields, setBFields,
  onSave, onClose, saving,
}: {
  editingId: string | null;
  bName: string; setBName: (v: string) => void;
  bCat:  string; setBCat:  (v: string) => void;
  bFields: TemplateField[]; setBFields: (f: TemplateField[]) => void;
  onSave: () => void; onClose: () => void;
  saving: boolean;
}) {
  const patchField = (idx: number, patch: Partial<TemplateField>) =>
    setBFields(bFields.map((f, i) => i === idx ? { ...f, ...patch } : f));
  const dropField  = (idx: number) => setBFields(bFields.filter((_, i) => i !== idx));
  const pushField  = (type: FieldType) => setBFields([...bFields, { ...makeField(), type }]);

  return createPortal(
    <div
      className="modal-bg"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: 640, borderRadius: 14, overflow: 'hidden' }}>

        {/* Modal header */}
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #e2dfd8', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#111110', letterSpacing: '-.2px' }}>
              {editingId ? 'Edit Template' : 'Create KPI Template'}
            </div>
            <div style={{ fontSize: 12, color: '#8a8580', marginTop: 2 }}>
              {editingId ? `Editing: ${bName}` : 'Google Forms-style dynamic builder'}
            </div>
          </div>
          <button type="button" onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '1px solid #e2dfd8', background: '#f5f4f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#6b6760', fontSize: 15, lineHeight: 1,
              flexShrink: 0,
            }}>
            ×
          </button>
        </div>

        <div style={{ padding: '20px 22px', maxHeight: '75vh', overflowY: 'auto' }}>

          {/* Name + Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
            <div>
              <label className="flabel">Template Name *</label>
              <input className="fi" type="text" placeholder="e.g. Revenue Growth KPI"
                value={bName} onChange={(e) => setBName(e.target.value)} />
            </div>
            <div>
              <label className="flabel">Category</label>
              <input className="fi" type="text" placeholder="e.g. Sales, CX, Ops, HR"
                value={bCat} onChange={(e) => setBCat(e.target.value)} />
            </div>
          </div>

          {/* Template Fields builder */}
          <div style={{ border: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden' }}>

            {/* Black header */}
            <div style={{
              padding: '14px 20px', background: '#111110',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', flex: 1 }}>Template Fields</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>* = required · Toggle to change</span>
            </div>

            {/* Fields list */}
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {bFields.map((field, idx) => (
                <div key={field.id}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '10px 13px', background: '#f8f7f5',
                    border: '1px solid #e2dfd8', borderRadius: 8,
                  }}>
                    {/* Drag handle */}
                    <span style={{ color: '#c4c0b8', fontSize: 17, cursor: 'grab', userSelect: 'none', flexShrink: 0 }}>⠿</span>

                    {/* Type badge */}
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                      background: '#e8e6e1', color: '#6b6862', flexShrink: 0,
                    }}>
                      {field.type}
                    </span>

                    {/* Label input */}
                    <input
                      style={{
                        flex: 1, border: 'none', background: 'transparent',
                        fontSize: 13, fontWeight: 500, color: '#111110', outline: 'none',
                        fontFamily: 'inherit',
                      }}
                      value={field.label}
                      placeholder="Field label…"
                      onChange={(e) => patchField(idx, { label: e.target.value })}
                    />

                    {/* Required label + toggle */}
                    <span style={{ fontSize: 10, color: field.required ? '#b91c1c' : '#8a8580', flexShrink: 0 }}>
                      {field.required ? 'Required' : 'Optional'}
                    </span>
                    <Toggle on={field.required} onChange={(v) => patchField(idx, { required: v })} />

                    {/* Remove */}
                    <button type="button" onClick={() => dropField(idx)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#c4c0b8', fontSize: 13, padding: '2px 4px',
                        lineHeight: 1, flexShrink: 0, fontFamily: 'inherit',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#b91c1c'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#c4c0b8'; }}>
                      ✕
                    </button>
                  </div>

                  {/* Opts input for dropdown */}
                  {field.type === 'dropdown' && (
                    <div style={{ marginTop: 5, paddingLeft: 40 }}>
                      <input className="fi"
                        placeholder="Options: Monthly, Quarterly, Annual"
                        value={field.opts?.join(', ') ?? ''}
                        onChange={(e) => patchField(idx, { opts: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                        style={{ fontSize: 12 }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add field bar */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 7,
              padding: '12px 16px', borderTop: '1px solid #e2dfd8', background: '#f8f7f5',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#8a8580', textTransform: 'uppercase', letterSpacing: '1px', marginRight: 2 }}>
                Add:
              </span>
              {FIELD_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => pushField(t)}
                  style={{
                    padding: '5px 11px', border: '1.5px dashed #cdc9c1', borderRadius: 6,
                    fontSize: 11.5, fontWeight: 500, color: '#4a4640', cursor: 'pointer',
                    background: 'transparent', fontFamily: 'inherit', transition: 'all .13s',
                  }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#000'; el.style.color = '#000'; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#cdc9c1'; el.style.color = '#4a4640'; }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid #e2dfd8', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className="btn btn-outline btn-sm" disabled={saving}>Cancel</button>
          <button type="button" onClick={onSave} disabled={!bName.trim() || saving} className="btn btn-black btn-sm">
            {saving ? 'Saving…' : editingId ? 'Save Template' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2dfd8',
      borderRadius: 12,
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14,
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0efec', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ width: 160, height: 14, borderRadius: 4, background: '#f0efec' }} />
        <div style={{ display: 'flex', gap: 5 }}>
          {[80, 100, 70, 90].map((w, i) => (
            <div key={i} style={{ width: w, height: 22, borderRadius: 5, background: '#f0efec' }} />
          ))}
        </div>
        <div style={{ width: 100, height: 12, borderRadius: 4, background: '#f0efec' }} />
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [templates, setTemplates] = useState<KpiTemplate[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Builder state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [saving, setSaving]           = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await templatesApi.list();
      setTemplates(
        res.data.map((t) => ({
          id:       t.id,
          name:     t.name,
          category: t.category,
          icon:     t.icon,
          fields:   t.fields,
          usedIn:   t.used_in,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Auto-open builder when navigated here with ?new=1 (e.g. from topbar CTA)
  useEffect(() => {
    if (searchParams.get('new') === '1') openBuilder();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [bName, setBName] = useState('');
  const [bCat,  setBCat]  = useState('');
  const [bFields, setBFields] = useState<TemplateField[]>(DEFAULT_NEW_FIELDS.map((f) => ({ ...f })));

  const openBuilder = (id?: string) => {
    if (id) {
      const t = templates.find((x) => x.id === id);
      if (!t) return;
      setEditingId(id);
      setBName(t.name);
      setBCat(t.category);
      setBFields(t.fields.length ? t.fields.map((f) => ({ ...f })) : DEFAULT_NEW_FIELDS.map((f) => ({ ...f })));
    } else {
      setEditingId(null);
      setBName('');
      setBCat('');
      setBFields(DEFAULT_NEW_FIELDS.map((f) => ({ ...f })));
    }
    setBuilderOpen(true);
  };

  const saveBuilder = async () => {
    if (!bName.trim()) return;
    const validFields = bFields.filter((f) => f.label.trim());
    setSaving(true);
    try {
      if (editingId) {
        await templatesApi.update(editingId, {
          name:     bName.trim(),
          category: bCat.trim() || 'Custom',
          fields:   validFields,
        });
      } else {
        await templatesApi.create({
          name:     bName.trim(),
          category: bCat.trim() || 'Custom',
          icon:     '📋',
          fields:   validFields,
        });
      }
      setBuilderOpen(false);
      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '22px 26px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', marginBottom: 3, color: '#111110' }}>KPI Templates</div>
          <div style={{ fontSize: 12, color: '#8a8580' }}>Google Forms-style builder · Define fields · Export to Excel</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-outline btn-sm"
            onClick={() => templates.forEach((t) => exportTemplateCsv(t))}
            disabled={loading || templates.length === 0}>
            ↓ Export All
          </button>
          <button type="button" className="btn btn-black btn-sm"
            onClick={() => openBuilder()}>
            + Create Template
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          marginBottom: 16, padding: '10px 16px',
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 8, fontSize: 13, color: '#b91c1c',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{error}</span>
          <button type="button" onClick={fetchTemplates}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontWeight: 700, fontSize: 12, fontFamily: 'inherit' }}>
            Retry
          </button>
        </div>
      )}

      {/* Template list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Skeleton while loading */}
        {loading && [1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}

        {/* Actual templates */}
        {!loading && templates.map((tmpl) => (
          <div key={tmpl.id} style={{
            background: '#fff',
            border: '1px solid #e2dfd8',
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,.06)',
          }}>
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>

              {/* Icon */}
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: '#e8e6e1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>
                {tmpl.icon}
              </div>

              {/* Main */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', color: '#111110' }}>
                    {tmpl.name}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                    background: '#f0efec', color: '#4a4640',
                  }}>
                    {tmpl.category}
                  </span>
                </div>

                {/* Field chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                  {tmpl.fields.length === 0
                    ? <span style={{ fontSize: 11.5, color: '#c4c0b8', fontStyle: 'italic' }}>No fields defined</span>
                    : tmpl.fields.map((f) => (
                        <span key={f.id} style={{
                          padding: '3px 9px', background: '#f8f7f5',
                          border: '1px solid #e2dfd8', borderRadius: 5,
                          fontSize: 11.5, color: '#4a4640',
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                        }}>
                          {f.label}
                          {f.required && <span style={{ color: '#b91c1c', fontWeight: 700, fontSize: 10 }}>*</span>}
                        </span>
                      ))
                  }
                </div>

                {/* Used in */}
                <div style={{ fontSize: 11.5, color: '#8a8580' }}>
                  Used in <strong style={{ color: tmpl.usedIn > 0 ? '#1a7a4a' : '#8a8580' }}>{tmpl.usedIn}</strong> KPI{tmpl.usedIn !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <button type="button" className="btn btn-outline btn-sm"
                  onClick={() => exportTemplateCsv(tmpl)}
                  style={{ justifyContent: 'center', minWidth: 72 }}>
                  ↓ Excel
                </button>
                <button type="button" className="btn btn-outline btn-sm"
                  onClick={() => openBuilder(tmpl.id)}
                  style={{ justifyContent: 'center', minWidth: 72 }}>
                  Edit
                </button>
                <button type="button" className="btn btn-black btn-sm"
                  onClick={() => router.push(`/kpis/new?template=${tmpl.id}`)}
                  style={{ justifyContent: 'center', minWidth: 72 }}>
                  Use →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Builder modal */}
      {builderOpen && (
        <BuilderModal
          editingId={editingId}
          bName={bName} setBName={setBName}
          bCat={bCat}   setBCat={setBCat}
          bFields={bFields} setBFields={setBFields}
          onSave={saveBuilder}
          onClose={() => setBuilderOpen(false)}
          saving={saving}
        />
      )}
    </div>
  );
}
