'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { kpis, users, regions, templates as templatesApi, type Kpi, type User, type Region } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { exportTemplateCsv, type KpiTemplate, type TemplateField } from '@/lib/kpi-templates';

type Method     = 'form' | 'excel';
type ImportStep = 1 | 2 | 3 | 4;

interface ParsedRow {
  rowIndex:    number;
  values:      Record<string, string>; // field.id → value
  parentKpiNo: string;
  errors:      string[];
  isValid:     boolean;
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    cells.push(cur.trim());
    rows.push(cells);
  }
  return rows;
}

function fmtFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Steps bar ────────────────────────────────────────────────────────────────

const STEPS = ['Select Template', 'Download Sheet', 'Upload & Validate', 'Confirm & Submit'];

function StepsBar({ current }: { current: ImportStep }) {
  return (
    <div style={{ display: 'flex', background: '#fff', border: '1px solid #e2dfd8', borderRadius: 10, overflow: 'hidden', marginBottom: 18 }}>
      {STEPS.map((label, i) => {
        const num = (i + 1) as ImportStep;
        const isActive = num === current;
        const isDone   = num < current;
        return (
          <div key={num} style={{
            flex: 1, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 7,
            borderRight: i < STEPS.length - 1 ? '1px solid #e2dfd8' : 'none',
            background: isActive ? '#f8f7f5' : 'transparent',
            fontSize: 12, color: isDone ? '#15633c' : isActive ? '#111110' : '#8a8580',
            fontWeight: isActive ? 700 : 500,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800,
              background: isActive ? '#111110' : isDone ? 'rgba(26,122,74,.1)' : '#e4e1db',
              color: isActive ? '#fff' : isDone ? '#15633c' : '#8a8580',
            }}>
              {isDone ? '✓' : num}
            </div>
            {label}
          </div>
        );
      })}
    </div>
  );
}

// ─── Field input ──────────────────────────────────────────────────────────────

function FieldInput({
  field, value, onChange, allRegions,
}: {
  field: TemplateField; value: string;
  onChange: (v: string) => void; allRegions: Region[];
}) {
  const ll = field.label.toLowerCase();
  const isRegionField = ll.includes('region') || ll.includes('country');

  if (isRegionField) return (
    <select className="fi" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Select Region —</option>
      {allRegions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
    </select>
  );

  if (field.type === 'dropdown') return (
    <select className="fi" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Select —</option>
      {(field.opts ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  if (field.type === 'currency') return (
    <input className="fi" type="text" placeholder="e.g. $80,000,000" value={value} onChange={(e) => onChange(e.target.value)} />
  );

  if (field.type === 'percentage') return (
    <div style={{ position: 'relative' }}>
      <input className="fi" type="number" min={0} max={100} placeholder="e.g. 90" value={value} onChange={(e) => onChange(e.target.value)} style={{ paddingRight: 28 }} />
      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#8a8580' }}>%</span>
    </div>
  );

  if (field.type === 'date') return <input className="fi" type="date" value={value} onChange={(e) => onChange(e.target.value)} />;
  if (field.type === 'number') return <input className="fi" type="number" placeholder={`Enter ${field.label.toLowerCase()}`} value={value} onChange={(e) => onChange(e.target.value)} />;
  if (field.type === 'textarea') return <textarea className="fi" rows={3} placeholder={`Enter ${field.label.toLowerCase()}`} value={value} onChange={(e) => onChange(e.target.value)} />;

  return <input className="fi" type="text" placeholder={`Enter ${field.label.toLowerCase()}`} value={value} onChange={(e) => onChange(e.target.value)} />;
}

// ─── Build KPI payload ────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string | undefined): s is string => !!s && UUID_RE.test(s);

function buildPayload(
  tmpl: KpiTemplate, values: Record<string, string>,
  parentId: string, ownerId: string, updateFreq: string, creatorId: string | undefined,
  defaultRegionId?: string,
): Partial<Kpi> {
  let name = '';
  let kpiType: Kpi['type'] = 'quantitative';
  let targetValue: number | undefined;
  let startDate: string | undefined;
  let regionIdFromCsv: string | undefined;
  const extras: string[] = [];

  tmpl.fields.forEach((field) => {
    const val = values[field.id] ?? '';
    if (!val) return;
    const ll = field.label.toLowerCase();
    if (ll.includes('kpi name') || (field.type === 'text' && tmpl.fields.indexOf(field) === 0)) {
      name = val;
    } else if (ll.includes('region') || ll.includes('country')) {
      // Only use CSV region if it looks like a UUID (avoid plain text like "China")
      if (isUuid(val)) regionIdFromCsv = val;
    } else if (ll.includes('kpi type')) {
      kpiType = val.toLowerCase() === 'qualitative' ? 'qualitative' : 'quantitative';
    } else if (ll.includes('target')) {
      targetValue = parseFloat(val.replace(/[$,]/g, '')) || undefined;
    } else if (ll.includes('financial year') || field.type === 'date') {
      startDate = val;
    } else {
      extras.push(`${field.label}: ${val}`);
    }
  });

  const resolvedRegion = regionIdFromCsv || defaultRegionId;
  const resolvedOwner  = (isUuid(ownerId) ? ownerId : undefined) ?? (isUuid(creatorId) ? creatorId : undefined);

  return {
    name:             name || 'New KPI',
    type:             kpiType,
    target_value:     targetValue,
    start_date:       startDate || undefined,
    region_id:        resolvedRegion as string,
    owner_id:         resolvedOwner,
    parent_id:        isUuid(parentId) ? parentId : undefined,
    update_frequency: (updateFreq || 'monthly') as Kpi['update_frequency'],
    status:           'draft',
    description:      extras.length ? extras.join('\n') : undefined,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewKpiPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const presetId     = searchParams.get('template');
  const currentUser  = useAuthStore((s) => s.user);

  const [method, setMethod] = useState<Method>('form');
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [tmplList,    setTmplList]    = useState<KpiTemplate[]>([]);
  const [allUsers,    setAllUsers]    = useState<User[]>([]);
  const [allRegions,  setAllRegions]  = useState<Region[]>([]);
  const [allKpis,     setAllKpis]     = useState<Kpi[]>([]);

  // Template form
  const [selectedTmplId, setSelectedTmplId] = useState(presetId ?? '');
  const [fieldValues,    setFieldValues]    = useState<Record<string, string>>({});
  const [parentId,       setParentId]       = useState('');
  const [ownerId,        setOwnerId]        = useState(currentUser?.id ?? '');
  const [updateFreq,     setUpdateFreq]     = useState('monthly');
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState('');

  // Excel wizard
  const [importStep,    setImportStep]    = useState<ImportStep>(1);
  const [importTmplId,  setImportTmplId]  = useState('');
  const [uploadedFile,  setUploadedFile]  = useState<File | null>(null);
  const [isDragging,    setIsDragging]    = useState(false);
  const [parsedRows,    setParsedRows]    = useState<ParsedRow[]>([]);
  const [importParseErr, setImportParseErr] = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [submitResult,  setSubmitResult]  = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [batchRegionId, setBatchRegionId] = useState('');
  const [batchOwnerId,  setBatchOwnerId]  = useState('');
  const [batchFreq,     setBatchFreq]     = useState('monthly');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.allSettled([
      templatesApi.list(),
      users.list({ limit: 200 }),
      regions.list(),
      kpis.list({ limit: 200 }),
    ]).then(([tRes, uRes, rRes, kRes]) => {
      if (tRes.status === 'fulfilled') {
        const list: KpiTemplate[] = tRes.value.data.map((t) => ({
          id: t.id, name: t.name, category: t.category,
          icon: t.icon, fields: t.fields, usedIn: t.used_in,
        }));
        setTmplList(list);
        if (!presetId && list.length) setSelectedTmplId(list[0].id);
        if (list.length) setImportTmplId(list[0].id);
      }
      if (uRes.status === 'fulfilled') setAllUsers(uRes.value.data);
      if (rRes.status === 'fulfilled') setAllRegions(rRes.value.data);
      if (kRes.status === 'fulfilled') setAllKpis(kRes.value.data.filter((k) => k.status !== 'cancelled'));
      setLoadingTemplates(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTmpl: KpiTemplate | undefined = tmplList.find((t) => t.id === selectedTmplId) ?? tmplList[0];
  const importTmpl:   KpiTemplate | undefined = tmplList.find((t) => t.id === importTmplId)   ?? tmplList[0];

  const setField = (id: string, val: string) =>
    setFieldValues((prev) => ({ ...prev, [id]: val }));

  const handleSubmitTemplate = async () => {
    if (!selectedTmpl) return;
    const name = fieldValues[selectedTmpl.fields[0]?.id ?? ''] || '';
    if (!name.trim()) { setError('KPI Name is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = buildPayload(selectedTmpl, fieldValues, parentId, ownerId, updateFreq, currentUser?.id);
      const res = await kpis.create(payload);
      router.push(`/kpis/${res.data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create KPI. Please try again.');
    } finally { setSaving(false); }
  };

  // ── CSV processing ──────────────────────────────────────────────────────────

  const processFile = (file: File, tmpl: KpiTemplate) => {
    setImportParseErr('');
    setParsedRows([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const matrix = parseCsvText(text);

      if (matrix.length < 2) {
        setImportParseErr('File appears empty or has only a header row. Please add data rows.');
        return;
      }

      const headerRow = matrix[0].map((h) => h.replace(/\s*\*\s*$/, '').trim());
      // Expected: KPI No, Parent KPI No, then each template field label
      const expectedFieldHeaders = tmpl.fields.map((f) => f.label);
      const colOffset = 2; // first 2 cols are KPI No + Parent KPI No

      // Soft header check — warn but don't block
      const headerMismatch = expectedFieldHeaders.some((lbl, idx) => {
        const col = headerRow[colOffset + idx];
        return col && col.toLowerCase() !== lbl.toLowerCase();
      });

      const parsed: ParsedRow[] = [];
      for (let i = 1; i < matrix.length; i++) {
        const row = matrix[i];
        const rowErrors: string[] = [];
        const values: Record<string, string> = {};
        const parentKpiNo = (row[1] ?? '').trim();

        tmpl.fields.forEach((field, idx) => {
          const val = (row[colOffset + idx] ?? '').trim();
          values[field.id] = val;

          if (field.required && !val) {
            rowErrors.push(`"${field.label}" is required`);
          }
          if (val && (field.type === 'number' || field.type === 'currency')) {
            const num = parseFloat(val.replace(/[$,\s]/g, ''));
            if (isNaN(num)) rowErrors.push(`"${field.label}": "${val}" is not a valid number`);
          }
          if (val && field.type === 'percentage') {
            const num = parseFloat(val);
            if (isNaN(num) || num < 0 || num > 100)
              rowErrors.push(`"${field.label}" must be a number between 0 and 100`);
          }
        });

        // Validate parent KPI number exists
        if (parentKpiNo && !allKpis.find((k) => k.kpi_number.toLowerCase() === parentKpiNo.toLowerCase())) {
          rowErrors.push(`Parent KPI "${parentKpiNo}" not found in system`);
        }

        parsed.push({ rowIndex: i, values, parentKpiNo, errors: rowErrors, isValid: rowErrors.length === 0 });
      }

      if (headerMismatch) {
        // Non-fatal: show a warning in the errors of row 0-like notice but continue
        setImportParseErr('Warning: Some column headers may not match the template. Check results below.');
      }
      setParsedRows(parsed);
      setImportStep(4);
    };
    reader.onerror = () => setImportParseErr('Failed to read the file. Please try again.');
    reader.readAsText(file);
  };

  const handleFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setImportParseErr('File is too large (max 10 MB).');
      return;
    }
    setUploadedFile(file);
    if (importTmpl) processFile(file, importTmpl);
  };

  const handleBulkSubmit = async () => {
    if (!importTmpl) return;
    if (!batchRegionId) { setImportParseErr('Please select a region before submitting.'); return; }
    setImportParseErr('');
    setSubmitting(true);
    let success = 0, failed = 0;
    const errs: string[] = [];
    const valid = parsedRows.filter((r) => r.isValid);
    for (const row of valid) {
      try {
        const parent = row.parentKpiNo
          ? allKpis.find((k) => k.kpi_number.toLowerCase() === row.parentKpiNo.toLowerCase())
          : null;
        const effectiveOwner = batchOwnerId || ownerId;
        const effectiveFreq  = batchFreq    || updateFreq;
        const payload = buildPayload(importTmpl, row.values, parent?.id ?? '', effectiveOwner, effectiveFreq, currentUser?.id, batchRegionId);
        await kpis.create(payload);
        success++;
      } catch (e: unknown) {
        failed++;
        errs.push(e instanceof Error ? e.message : 'Unknown error');
      }
    }
    setSubmitResult({ success, failed, errors: errs });
    setSubmitting(false);
  };

  const resetExcel = () => {
    setUploadedFile(null); setParsedRows([]);
    setImportParseErr(''); setSubmitResult(null);
    setImportStep(3);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const batchSettingsComplete = !!batchRegionId;

  const validCount   = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '22px 26px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', marginBottom: 3, color: '#111110' }}>Add KPI</div>
        <div style={{ fontSize: 12, color: '#8a8580' }}>Create from a template or import via Excel</div>
      </div>

      {/* Method cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, maxWidth: 700 }}>
        <div onClick={() => setMethod('form')}
          style={{ border: `2px solid ${method === 'form' ? '#111110' : '#e2dfd8'}`, borderRadius: 12, padding: 20, cursor: 'pointer', background: method === 'form' ? '#f8f7f5' : '#fff', transition: 'all .15s' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#e8e6e1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#4a4640" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="2" width="12" height="14" rx="2"/><line x1="6" y1="6" x2="12" y2="6"/><line x1="6" y1="9" x2="12" y2="9"/><line x1="6" y1="12" x2="10" y2="12"/>
            </svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 3, letterSpacing: '-.2px', color: '#111110' }}>Use Template</div>
          <div style={{ fontSize: 12, color: '#8a8580', lineHeight: 1.5 }}>Select a KPI template and fill in the fields directly in the portal</div>
        </div>

        <div onClick={() => { setMethod('excel'); setImportStep(1); }}
          style={{ border: `2px solid ${method === 'excel' ? '#111110' : '#e2dfd8'}`, borderRadius: 12, padding: 20, cursor: 'pointer', background: method === 'excel' ? '#f8f7f5' : '#fff', transition: 'all .15s' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#e8e6e1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#4a4640" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="14" height="14" rx="2"/><line x1="2" y1="7" x2="16" y2="7"/><line x1="2" y1="11" x2="16" y2="11"/><line x1="7" y1="7" x2="7" y2="16"/>
            </svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 3, letterSpacing: '-.2px', color: '#111110' }}>Import via Excel</div>
          <div style={{ fontSize: 12, color: '#8a8580', lineHeight: 1.5 }}>Download template → fill offline → upload for validation → confirm &amp; submit</div>
        </div>
      </div>

      {/* ── Use Template ── */}
      {method === 'form' && (
        <div style={{ maxWidth: 700 }}>
          <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <div style={{ padding: '13px 18px', borderBottom: '1px solid #e2dfd8' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111110' }}>Template Details</div>
            </div>
            <div style={{ padding: '18px 20px' }}>
              {loadingTemplates ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[0,1,2,3,4].map((i) => (
                    <div key={i}>
                      <div style={{ width: 80, height: 10, background: '#e8e6e1', borderRadius: 4, marginBottom: 7 }} />
                      <div style={{ width: '100%', height: 36, background: '#f0efec', borderRadius: 7 }} />
                    </div>
                  ))}
                </div>
              ) : !selectedTmpl ? (
                <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: '#8a8580' }}>
                  No templates found. <a href="/templates" style={{ color: '#111110', fontWeight: 600 }}>Create one first →</a>
                </div>
              ) : (<>
                <div style={{ marginBottom: 18 }}>
                  <label className="flabel">KPI Template *</label>
                  <select className="fi" value={selectedTmplId} onChange={(e) => { setSelectedTmplId(e.target.value); setFieldValues({}); }}>
                    {tmplList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div style={{ height: 1, background: '#e2dfd8', marginBottom: 16 }} />
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 16, letterSpacing: '-.2px', color: '#111110' }}>{selectedTmpl.name} — Fill KPI Details</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {selectedTmpl.fields.map((field) => (
                    <div key={field.id}>
                      <label className="flabel">
                        {field.label.toUpperCase()}{field.required && <span style={{ color: '#b91c1c', marginLeft: 3 }}>*</span>}
                      </label>
                      <FieldInput field={field} value={fieldValues[field.id] ?? ''} onChange={(v) => setField(field.id, v)} allRegions={allRegions} />
                    </div>
                  ))}
                  {/* <div>
                    <label className="flabel">Parent KPI (cascade from)</label>
                    <select className="fi" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                      <option value="">None — top-level KPI</option>
                      {allKpis.map((k) => <option key={k.id} value={k.id}>{k.kpi_number} — {k.name}</option>)}
                    </select>
                  </div> */}
                  <div>
                    <label className="flabel">Assign To</label>
                    <select className="fi" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                      <option value={currentUser?.id ?? ''}>Self-assign{currentUser ? ` (${currentUser.full_name})` : ''}</option>
                      {allUsers.filter((u) => u.id !== currentUser?.id).map((u) => (
                        <option key={u.id} value={u.id}>{u.full_name} — {u.designation ?? u.email}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="flabel">Update Frequency</label>
                    <select className="fi" value={updateFreq} onChange={(e) => setUpdateFreq(e.target.value)}>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                  </div>
                </div>
                {error && (
                  <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(185,28,28,.07)', border: '1px solid rgba(185,28,28,.2)', borderRadius: 7, fontSize: 12.5, color: '#b91c1c' }}>{error}</div>
                )}
                <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
                  <button type="button" onClick={handleSubmitTemplate} disabled={saving} className="btn btn-black" style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700, borderRadius: 8 }}>
                    {saving ? 'Creating KPI…' : 'Submit KPI for Approval →'}
                  </button>
                  <button type="button" onClick={() => router.push('/kpis')} className="btn btn-outline" style={{ padding: '10px 18px', fontSize: 13, borderRadius: 8 }}>
                    Cancel
                  </button>
                </div>
              </>)}
            </div>
          </div>
        </div>
      )}

      {/* ── Excel wizard ── */}
      {method === 'excel' && (
        <div style={{ maxWidth: 700 }}>
          <StepsBar current={importStep} />

          {/* Step 1 — Select Template */}
          {importStep === 1 && (
            <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
              <div style={{ padding: '13px 18px', borderBottom: '1px solid #e2dfd8' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111110' }}>Step 1 — Select Template</div>
              </div>
              <div style={{ padding: '18px 20px' }}>
                {loadingTemplates ? (
                  <div style={{ height: 36, background: '#f0efec', borderRadius: 7, marginBottom: 16 }} />
                ) : (
                  <div style={{ marginBottom: 16 }}>
                    <label className="flabel">Template</label>
                    <select className="fi" value={importTmplId} onChange={(e) => setImportTmplId(e.target.value)}>
                      <option value="">— choose a template —</option>
                      {tmplList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {importTmpl && (
                      <div style={{ marginTop: 10, padding: '9px 12px', background: '#f8f7f5', borderRadius: 7, border: '1px solid #e2dfd8', fontSize: 12, color: '#4a4640' }}>
                        <strong>{importTmpl.fields.length} columns</strong> will be included:{' '}
                        {importTmpl.fields.map((f) => f.label + (f.required ? '*' : '')).join(', ')}
                      </div>
                    )}
                  </div>
                )}
                <button type="button" className="btn btn-black btn-sm" disabled={!importTmplId} onClick={() => setImportStep(2)}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Download */}
          {importStep === 2 && (
            <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
              <div style={{ padding: '13px 18px', borderBottom: '1px solid #e2dfd8' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111110' }}>Step 2 — Download Template Sheet</div>
              </div>
              <div style={{ padding: '18px 20px' }}>
                {/* Download card */}
                <div style={{ padding: '22px 20px', background: '#f8f7f5', border: '1px solid #e2dfd8', borderRadius: 10, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: '#e4e1db', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#4a4640" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="2" width="16" height="18" rx="2.5"/>
                        <line x1="3" y1="8" x2="19" y2="8"/>
                        <line x1="3" y1="13" x2="19" y2="13"/>
                        <line x1="8" y1="8" x2="8" y2="20"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#111110', marginBottom: 2 }}>{importTmpl?.name ?? '—'} Template</div>
                      <div style={{ fontSize: 12, color: '#8a8580' }}>CSV with {importTmpl ? importTmpl.fields.length + 2 : 0} columns • Pre-formatted headers</div>
                    </div>
                  </div>
                  <button type="button" className="btn btn-black btn-sm" disabled={!importTmpl}
                    onClick={() => importTmpl && exportTemplateCsv(importTmpl)}>
                    ↓ Download CSV Template
                  </button>
                </div>

                {/* Column guide */}
                {importTmpl && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#4a4640', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>Column Guide</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {[
                        { col: 'KPI No',        note: 'Leave as KPI-??? — auto-assigned on import', req: false },
                        { col: 'Parent KPI No', note: 'Enter exact KPI number (e.g. KPI-001) or leave blank for root', req: false },
                        ...importTmpl.fields.map((f) => ({ col: f.label, note: `${f.type} field`, req: f.required })),
                      ].map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '5px 10px', background: i % 2 === 0 ? '#f8f7f5' : '#fff', borderRadius: 5 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 10.5, fontWeight: 700, color: '#4a4640', minWidth: 130 }}>{c.col}{c.req ? ' *' : ''}</span>
                          <span style={{ color: '#8a8580' }}>{c.note}</span>
                          {c.req && <span style={{ marginLeft: 'auto', fontSize: 9.5, fontWeight: 700, color: '#b91c1c', background: 'rgba(185,28,28,.06)', padding: '1px 5px', borderRadius: 3 }}>REQUIRED</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setImportStep(1)}>← Back</button>
                  <button type="button" className="btn btn-black btn-sm" onClick={() => setImportStep(3)}>
                    I&apos;ve filled the sheet — Upload →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Upload */}
          {importStep === 3 && (
            <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
              <div style={{ padding: '13px 18px', borderBottom: '1px solid #e2dfd8' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111110' }}>Step 3 — Upload &amp; Validate</div>
              </div>
              <div style={{ padding: '18px 20px' }}>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />

                {/* Drop zone */}
                <div
                  onDrop={(e) => {
                    e.preventDefault(); setIsDragging(false);
                    const f = e.dataTransfer.files[0];
                    if (f) handleFileSelect(f);
                  }}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    borderRadius: 10, padding: '36px 20px', textAlign: 'center',
                    cursor: 'pointer', marginBottom: 14, transition: 'all .15s',
                    borderStyle: 'dashed', borderWidth: 2,
                    borderColor: isDragging ? '#111110' : uploadedFile ? '#1a7a4a' : '#d4d1cb',
                    background: uploadedFile ? 'rgba(26,122,74,.04)' : isDragging ? '#f8f7f5' : '#faf9f7',
                  }}
                >
                  {uploadedFile ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(26,122,74,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#15633c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h8l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z"/>
                            <polyline points="12 4 12 8 16 8"/>
                          </svg>
                        </div>
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#15633c', marginBottom: 3 }}>{uploadedFile.name}</div>
                      <div style={{ fontSize: 12, color: '#8a8580', marginBottom: 6 }}>{fmtFileSize(uploadedFile.size)} · Click to replace</div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ color: '#8a8580' }}>
                          <rect x="3" y="3" width="30" height="30" rx="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                          <path d="M18 9v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                          <path d="M12 15l6-7 6 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M10 30h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#4a4640', marginBottom: 4 }}>Drop your filled CSV here</div>
                      <div style={{ fontSize: 12, color: '#8a8580' }}>or click to browse &nbsp;·&nbsp; .csv .xlsx .xls &nbsp;·&nbsp; Max 10 MB</div>
                    </>
                  )}
                </div>

                {importParseErr && (
                  <div style={{ marginBottom: 14, padding: '10px 13px', background: 'rgba(180,83,9,.06)', border: '1px solid rgba(180,83,9,.18)', borderRadius: 7, fontSize: 12.5, color: '#b45309', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                      <circle cx="7" cy="7" r="6" fill="rgba(180,83,9,.15)"/>
                      <path d="M7 4.5v3M7 9.5h.01" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    {importParseErr}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-outline btn-sm"
                    onClick={() => { setUploadedFile(null); setParsedRows([]); setImportParseErr(''); setImportStep(2); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                    ← Back
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Confirm & Submit */}
          {importStep === 4 && (
            <div>

              {/* Batch defaults — required before submit */}
              <div style={{ background: '#fff', border: `1.5px solid ${batchSettingsComplete ? '#e2dfd8' : '#b91c1c'}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: 14 }}>
                <div style={{ padding: '11px 16px', borderBottom: '1px solid #e2dfd8', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111110' }}>Batch Defaults</div>
                  {!batchSettingsComplete && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#b91c1c', background: 'rgba(185,28,28,.08)', padding: '2px 7px', borderRadius: 4 }}>REQUIRED</span>
                  )}
                </div>
                <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="flabel">Region <span style={{ color: '#b91c1c' }}>*</span></label>
                    <select className="fi" value={batchRegionId} onChange={(e) => setBatchRegionId(e.target.value)}>
                      <option value="">— Select Region —</option>
                      {allRegions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="flabel">Assign To</label>
                    <select className="fi" value={batchOwnerId} onChange={(e) => setBatchOwnerId(e.target.value)}>
                      <option value="">Self ({currentUser?.full_name ?? 'me'})</option>
                      {allUsers.filter((u) => u.id !== currentUser?.id).map((u) => (
                        <option key={u.id} value={u.id}>{u.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="flabel">Update Frequency</label>
                    <select className="fi" value={batchFreq} onChange={(e) => setBatchFreq(e.target.value)}>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Summary banner */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px',
                borderRadius: 9, marginBottom: 14,
                background: invalidCount === 0 ? 'rgba(26,122,74,.07)' : 'rgba(180,83,9,.07)',
                border: `1px solid ${invalidCount === 0 ? 'rgba(26,122,74,.2)' : 'rgba(180,83,9,.2)'}`,
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  {invalidCount === 0 ? (
                    <><circle cx="8" cy="8" r="7" fill="rgba(26,122,74,.15)"/><path d="M5 8l2 2 4-4" stroke="#15633c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></>
                  ) : (
                    <><circle cx="8" cy="8" r="7" fill="rgba(180,83,9,.15)"/><path d="M8 5v3.5M8 11h.01" stroke="#b45309" strokeWidth="1.6" strokeLinecap="round"/></>
                  )}
                </svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: invalidCount === 0 ? '#15633c' : '#b45309' }}>
                  {invalidCount === 0
                    ? `All ${validCount} row${validCount !== 1 ? 's' : ''} are valid and ready to import`
                    : `${validCount} valid · ${invalidCount} need review`}
                </span>
                <button type="button" onClick={resetExcel}
                  style={{ marginLeft: 'auto', fontSize: 12, color: '#8a8580', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
                  Re-upload
                </button>
              </div>

              {/* Validation errors */}
              {invalidCount > 0 && (
                <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: 14 }}>
                  <div style={{ padding: '11px 16px', borderBottom: '1px solid #e2dfd8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111110' }}>Validation Issues</div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'rgba(180,83,9,.1)', color: '#b45309' }}>{invalidCount} row{invalidCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {parsedRows.filter((r) => !r.isValid).map((r) => (
                      <div key={r.rowIndex} style={{ padding: '9px 12px', background: 'rgba(185,28,28,.04)', border: '1px solid rgba(185,28,28,.14)', borderRadius: 7 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#b91c1c', marginBottom: 4 }}>Row {r.rowIndex}</div>
                        {r.errors.map((e, i) => (
                          <div key={i} style={{ fontSize: 12, color: '#b45309', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                            <span style={{ marginTop: 2, flexShrink: 0 }}>•</span>{e}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview table */}
              <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: 14 }}>
                <div style={{ padding: '11px 16px', borderBottom: '1px solid #e2dfd8' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111110' }}>Preview — {parsedRows.length} row{parsedRows.length !== 1 ? 's' : ''} to import</div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f0efec', borderBottom: '1.5px solid #e2dfd8' }}>
                        {['Row', 'KPI Name', 'Parent', 'Target', 'Status'].map((h) => (
                          <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#8a8580', textTransform: 'uppercase', letterSpacing: 1, padding: '8px 14px', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row) => {
                        const tmplFields = importTmpl?.fields ?? [];
                        const nameField  = tmplFields.find((f) => f.label.toLowerCase().includes('kpi name') || (f.type === 'text' && tmplFields.indexOf(f) === 0));
                        const targetField = tmplFields.find((f) => f.label.toLowerCase().includes('target'));
                        const kpiName    = nameField   ? (row.values[nameField.id]   || '—') : '—';
                        const target     = targetField ? (row.values[targetField.id] || '—') : '—';
                        return (
                          <tr key={row.rowIndex} style={{ borderBottom: '1px solid #e2dfd8', background: row.isValid ? 'rgba(26,122,74,.02)' : 'rgba(185,28,28,.02)' }}>
                            <td style={{ padding: '9px 14px', fontSize: 11.5, color: '#8a8580', fontFamily: 'monospace' }}>{row.rowIndex}</td>
                            <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 700, color: '#111110' }}>{kpiName}</td>
                            <td style={{ padding: '9px 14px', fontSize: 12, color: '#4a4640' }}>
                              {row.parentKpiNo ? (
                                <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, padding: '2px 5px', borderRadius: 3, background: '#e4e1db', color: '#4a4640' }}>{row.parentKpiNo}</span>
                              ) : <span style={{ color: '#c4c0b8' }}>—</span>}
                            </td>
                            <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 700, color: '#111110' }}>{target}</td>
                            <td style={{ padding: '9px 14px' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: '2.5px 8px', borderRadius: 4, background: row.isValid ? 'rgba(26,122,74,.1)' : 'rgba(180,83,9,.1)', color: row.isValid ? '#15633c' : '#b45309' }}>
                                {row.isValid ? 'Valid' : 'Review'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Parse / submit error notice */}
              {importParseErr && (
                <div style={{ marginBottom: 14, padding: '10px 13px', background: 'rgba(185,28,28,.05)', border: '1px solid rgba(185,28,28,.2)', borderRadius: 8, fontSize: 12.5, color: '#b91c1c', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="7" cy="7" r="6" fill="rgba(185,28,28,.12)"/>
                    <path d="M7 4.5v3M7 9.5h.01" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {importParseErr}
                </div>
              )}

              {/* Submit result */}
              {submitResult ? (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2dfd8' }}>
                  <div style={{
                    padding: '16px 20px',
                    background: submitResult.failed === 0 ? 'rgba(26,122,74,.06)' : submitResult.success === 0 ? 'rgba(185,28,28,.04)' : '#fff',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: submitResult.failed === 0 ? 'rgba(26,122,74,.15)' : submitResult.success === 0 ? 'rgba(185,28,28,.12)' : '#e4e1db' }}>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
                        stroke={submitResult.failed === 0 ? '#15633c' : submitResult.success === 0 ? '#b91c1c' : '#4a4640'}
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {submitResult.success === 0
                          ? <><line x1="5" y1="5" x2="13" y2="13"/><line x1="13" y1="5" x2="5" y2="13"/></>
                          : <polyline points="4 9 7 12 14 6"/>}
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#111110', marginBottom: 2 }}>
                        {submitResult.success > 0
                          ? `${submitResult.success} KPI${submitResult.success !== 1 ? 's' : ''} created successfully${submitResult.failed > 0 ? ` · ${submitResult.failed} failed` : ''}`
                          : `All ${submitResult.failed} KPI${submitResult.failed !== 1 ? 's' : ''} failed to create`}
                      </div>
                      <div style={{ fontSize: 12, color: '#8a8580' }}>
                        {submitResult.success > 0 ? 'Created KPIs are in draft status pending approval.' : 'Check the errors below and try again.'}
                      </div>
                    </div>
                    {submitResult.success > 0 && (
                      <button type="button" className="btn btn-black btn-sm" onClick={() => router.push('/kpis')}>
                        View My KPIs →
                      </button>
                    )}
                  </div>
                  {/* Show API errors if any failed */}
                  {submitResult.errors.length > 0 && (
                    <div style={{ padding: '10px 20px 14px', borderTop: '1px solid #e2dfd8', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>Errors</div>
                      {submitResult.errors.map((e, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#b45309', display: 'flex', gap: 6 }}>
                          <span style={{ flexShrink: 0 }}>•</span>{e}
                        </div>
                      ))}
                    </div>
                  )}
                  {submitResult.failed > 0 && (
                    <div style={{ padding: '10px 20px 14px', borderTop: submitResult.errors.length ? 'none' : '1px solid #e2dfd8' }}>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setSubmitResult(null)}>
                        Try Again
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={resetExcel}>← Re-upload</button>
                  <button type="button" className="btn btn-black btn-sm"
                    disabled={submitting || validCount === 0 || !batchSettingsComplete}
                    onClick={handleBulkSubmit}
                    style={{ opacity: (submitting || validCount === 0 || !batchSettingsComplete) ? .6 : 1 }}>
                    {submitting ? `Submitting… (${validCount})` : `Submit ${validCount} Valid KPI${validCount !== 1 ? 's' : ''} →`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
