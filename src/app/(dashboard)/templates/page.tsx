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
      className="w-8.5 h-4.5 rounded-[9px] shrink-0 relative cursor-pointer transition-colors duration-180"
      style={{ background: on ? '#111110' : '#d4d1cb' }}
    >
      <div
        className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.2)] transition-[left] duration-180"
        style={{ left: on ? 18 : 2 }}
      />
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
      <div className="modal max-w-160 rounded-modal overflow-hidden">

        {/* Modal header */}
        <div className="py-4 px-5.5 border-b border-border flex items-start justify-between">
          <div>
            <div className="text-[15px] font-black text-near-black tracking-[-0.2px]">
              {editingId ? 'Edit Template' : 'Create KPI Template'}
            </div>
            <div className="text-xs text-t3 mt-0.5">
              {editingId ? `Editing: ${bName}` : 'Google Forms-style dynamic builder'}
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="w-7 h-7 rounded-full border border-border bg-[#f5f4f0] flex items-center justify-center cursor-pointer text-[#6b6760] text-[15px] leading-none shrink-0">
            ×
          </button>
        </div>

        <div className="py-5 px-5.5 max-h-[75vh] overflow-y-auto">

          {/* Name + Category */}
          <div className="grid grid-cols-2 gap-3 mb-4.5">
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
          <div className="border border-border rounded-modal overflow-hidden">

            {/* Black header */}
            <div className="py-3.5 px-5 bg-black flex items-center gap-2.5">
              <span className="text-[13px] font-black text-white flex-1">Template Fields</span>
              <span className="text-[11px] text-white/40">* = required · Toggle to change</span>
            </div>

            {/* Fields list */}
            <div className="py-3 px-4 flex flex-col gap-1.5">
              {bFields.map((field, idx) => (
                <div key={field.id}>
                  <div className="flex items-center gap-2.25 py-2.5 px-3.25 bg-off border border-border rounded-lg">
                    {/* Drag handle */}
                    <span className="text-t4 text-[17px] cursor-grab select-none shrink-0">⠿</span>

                    {/* Type badge */}
                    <span className="text-[10px] font-bold py-0.5 px-1.75 rounded bg-[#e8e6e1] text-[#6b6862] shrink-0">
                      {field.type}
                    </span>

                    {/* Label input */}
                    <input
                      className="flex-1 border-none bg-transparent text-[13px] font-medium text-near-black outline-none font-[inherit]"
                      value={field.label}
                      placeholder="Field label…"
                      onChange={(e) => patchField(idx, { label: e.target.value })}
                    />

                    {/* Required label + toggle */}
                    <span className={`text-[10px] shrink-0 ${field.required ? 'text-brand-red' : 'text-t3'}`}>
                      {field.required ? 'Required' : 'Optional'}
                    </span>
                    <Toggle on={field.required} onChange={(v) => patchField(idx, { required: v })} />

                    {/* Remove */}
                    <button type="button" onClick={() => dropField(idx)}
                      className="bg-transparent border-none cursor-pointer text-t4 text-[13px] py-0.5 px-1 leading-none shrink-0 font-[inherit]"
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#b91c1c'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#c4c0b8'; }}>
                      ✕
                    </button>
                  </div>

                  {/* Opts input for dropdown */}
                  {field.type === 'dropdown' && (
                    <div className="mt-1.25 pl-10">
                      <input className="fi text-xs"
                        placeholder="Options: Monthly, Quarterly, Annual"
                        value={field.opts?.join(', ') ?? ''}
                        onChange={(e) => patchField(idx, { opts: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add field bar */}
            <div className="flex flex-wrap gap-1.75 py-3 px-4 border-t border-border bg-off items-center">
              <span className="text-[10px] font-black text-t3 uppercase tracking-[1px] mr-0.5">
                Add:
              </span>
              {FIELD_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => pushField(t)}
                  className="py-1.25 px-2.75 border-[1.5px] border-dashed border-border2 rounded-md text-[11.5px] font-medium text-t2 cursor-pointer bg-transparent font-[inherit] transition-all duration-130"
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#000'; el.style.color = '#000'; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#cdc9c1'; el.style.color = '#4a4640'; }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div className="py-3.5 px-5.5 border-t border-border flex gap-2 justify-end">
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
    <div className="bg-card border border-border rounded-xl py-4 px-5 flex items-start gap-3.5">
      <div className="w-11 h-11 rounded-[10px] bg-off shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="w-40 h-3.5 rounded bg-off" />
        <div className="flex gap-1.25">
          {[80, 100, 70, 90].map((w, i) => (
            <div key={i} className="h-5.5 rounded-[5px] bg-off" style={{ width: w }} />
          ))}
        </div>
        <div className="w-25 h-3 rounded bg-off" />
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

  // Auto-open builder when navigated here with ?new=1
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
    <div className="px-6.5 py-5.5">

      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="text-[15px] font-black tracking-[-0.2px] mb-0.75 text-near-black">KPI Templates</div>
          <div className="text-xs text-t3">Google Forms-style builder · Define fields · Export to Excel</div>
        </div>
        <div className="flex gap-2">
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
        <div className="mb-4 py-2.5 px-4 bg-[#fef2f2] border border-[#fecaca] rounded-lg text-[13px] text-brand-red flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={fetchTemplates}
            className="bg-transparent border-none cursor-pointer text-brand-red font-bold text-xs font-[inherit]">
            Retry
          </button>
        </div>
      )}

      {/* Template list */}
      <div className="flex flex-col gap-2.5">

        {/* Skeleton while loading */}
        {loading && [1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}

        {/* Actual templates */}
        {!loading && templates.map((tmpl) => (
          <div key={tmpl.id} className="bg-card border border-border rounded-xl shadow-card">
            <div className="py-4 px-5 flex items-start gap-3.5">

              {/* Icon */}
              <div className="w-11 h-11 rounded-[10px] bg-[#e8e6e1] flex items-center justify-center text-[22px] shrink-0">
                {tmpl.icon}
              </div>

              {/* Main */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[15px] font-black tracking-[-0.2px] text-near-black">
                    {tmpl.name}
                  </span>
                  <span className="text-[11px] font-semibold py-0.5 px-2 rounded bg-off text-t2">
                    {tmpl.category}
                  </span>
                </div>

                {/* Field chips */}
                <div className="flex flex-wrap gap-1.25 mb-2">
                  {tmpl.fields.length === 0
                    ? <span className="text-[11.5px] text-t4 italic">No fields defined</span>
                    : tmpl.fields.map((f) => (
                        <span key={f.id}
                          className="py-0.75 px-2.25 bg-off border border-border rounded-[5px] text-[11.5px] text-t2 inline-flex items-center gap-0.75">
                          {f.label}
                          {f.required && <span className="text-brand-red font-bold text-[10px]">*</span>}
                        </span>
                      ))
                  }
                </div>

                {/* Used in */}
                <div className="text-[11.5px] text-t3">
                  Used in <strong style={{ color: tmpl.usedIn > 0 ? '#1a7a4a' : '#8a8580' }}>{tmpl.usedIn}</strong> KPI{tmpl.usedIn !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <button type="button" className="btn btn-outline btn-sm justify-center min-w-18"
                  onClick={() => exportTemplateCsv(tmpl)}>
                  ↓ Excel
                </button>
                <button type="button" className="btn btn-outline btn-sm justify-center min-w-18"
                  onClick={() => openBuilder(tmpl.id)}>
                  Edit
                </button>
                <button type="button" className="btn btn-black btn-sm justify-center min-w-18"
                  onClick={() => router.push(`/kpis/new?template=${tmpl.id}`)}>
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
