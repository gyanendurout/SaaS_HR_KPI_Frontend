'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { kpis, users, regions, type Kpi, type User, type Region } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const TEMPLATE_DEFAULTS: Record<string, Partial<Kpi>> = {
  t1: { name: 'Revenue Growth Rate',          type: 'quantitative', period: 'quarterly', update_frequency: 'monthly',   unit: '%',    target_value: 15    },
  t2: { name: 'Customer Satisfaction (CSAT)', type: 'quantitative', period: 'monthly',   update_frequency: 'monthly',   unit: 'score',target_value: 4.5   },
  t3: { name: 'Operational Efficiency Index', type: 'quantitative', period: 'monthly',   update_frequency: 'monthly',   unit: '%',    target_value: 92    },
  t4: { name: 'Employee Engagement Score',    type: 'quantitative', period: 'quarterly', update_frequency: 'quarterly', unit: '%',    target_value: 80    },
  t5: { name: 'Net Revenue Retention (NRR)',  type: 'quantitative', period: 'monthly',   update_frequency: 'monthly',   unit: '%',    target_value: 110   },
  t6: { name: 'Customer Churn Rate',          type: 'quantitative', period: 'monthly',   update_frequency: 'monthly',   unit: '%',    target_value: 3     },
  t7: { name: 'On-Time Delivery Rate',        type: 'quantitative', period: 'monthly',   update_frequency: 'monthly',   unit: '%',    target_value: 95    },
  t8: { name: 'Time to Hire',                 type: 'quantitative', period: 'quarterly', update_frequency: 'quarterly', unit: 'days', target_value: 30    },
  t9: { name: 'Average Contract Value (ACV)', type: 'quantitative', period: 'quarterly', update_frequency: 'quarterly', unit: 'USD',  target_value: 50000 },
};

type Method = 'form' | 'excel' | null;

export default function NewKpiPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const templateId   = searchParams.get('template');
  const currentUser  = useAuthStore((s) => s.user);

  const [method, setMethod] = useState<Method>(templateId ? 'form' : null);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [allUsers, setAllUsers]     = useState<User[]>([]);
  const [allRegions, setAllRegions] = useState<Region[]>([]);

  useEffect(() => {
    Promise.all([users.list({ limit: 200 }), regions.list()]).then(([uRes, rRes]) => {
      setAllUsers(uRes.data);
      setAllRegions(rRes.data);
    });
  }, []);

  const templateDefaults = templateId ? TEMPLATE_DEFAULTS[templateId] : {};

  const [form, setForm] = useState({
    name:             templateDefaults?.name             ?? '',
    description:      '',
    type:             (templateDefaults?.type             ?? 'quantitative') as Kpi['type'],
    period:           (templateDefaults?.period           ?? 'monthly')      as Kpi['period'],
    update_frequency: (templateDefaults?.update_frequency ?? 'monthly')      as Kpi['update_frequency'],
    target_value:     templateDefaults?.target_value ? String(templateDefaults.target_value) : '',
    unit:             templateDefaults?.unit             ?? '',
    start_date:       '',
    end_date:         '',
    owner_id:         currentUser?.id         ?? '',
    region_id:        currentUser?.region_id  ?? '',
  });

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('KPI name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const body: Partial<Kpi> = {
        name:             form.name.trim(),
        description:      form.description || undefined,
        type:             form.type,
        period:           form.period,
        update_frequency: form.update_frequency,
        target_value:     form.target_value ? Number(form.target_value) : undefined,
        unit:             form.unit || undefined,
        start_date:       form.start_date || undefined,
        end_date:         form.end_date   || undefined,
        status:           'draft',
        owner_id:         form.owner_id  || currentUser?.id,
        region_id:        form.region_id || undefined,
      };
      const res = await kpis.create(body);
      router.push(`/kpis/${res.data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create KPI. Please try again.');
    } finally { setSaving(false); }
  };

  /* ─── Method selection screen ─── */
  if (!method) {
    return (
      <div style={{ padding: '22px 26px' }}>
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', marginBottom: 3, color: '#111110' }}>Add New KPI</div>
          <div style={{ fontSize: 12, color: '#8a8580' }}>Choose how you&apos;d like to create your KPI</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, maxWidth: 700 }}>
          {/* Form method */}
          <div
            className="method-card"
            onClick={() => setMethod('form')}
            style={{ background: '#fff', border: '2px solid #e2dfd8', borderRadius: 16, padding: '28px 24px', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#000'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e2dfd8'; }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111110', marginBottom: 8 }}>Create with Form</div>
            <p style={{ fontSize: 12.5, color: '#8a8580', lineHeight: 1.6, margin: '0 0 16px' }}>Fill out a guided form with all KPI fields. Best for creating individual KPIs one at a time.</p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {['Custom name & target', 'Set update frequency', 'Assign owner'].map((tag) => (
                <span key={tag} style={{ fontSize: 10.5, fontWeight: 600, padding: '2.5px 8px', borderRadius: 4, background: '#f0efec', color: '#4a4640' }}>{tag}</span>
              ))}
            </div>
          </div>

          {/* Template method */}
          <div
            className="method-card"
            onClick={() => router.push('/templates')}
            style={{ background: '#fff', border: '2px solid #e2dfd8', borderRadius: 16, padding: '28px 24px', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#1a7a4a'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e2dfd8'; }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#1a7a4a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111110', marginBottom: 8 }}>Start from Template</div>
            <p style={{ fontSize: 12.5, color: '#8a8580', lineHeight: 1.6, margin: '0 0 16px' }}>Pick from pre-built KPI templates across Revenue, Customer, Operations, and HR categories.</p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {['9 templates', 'Pre-filled values', 'Customizable'].map((tag) => (
                <span key={tag} style={{ fontSize: 10.5, fontWeight: 600, padding: '2.5px 8px', borderRadius: 4, background: 'rgba(26,122,74,.08)', color: '#15633c' }}>{tag}</span>
              ))}
            </div>
          </div>

          {/* Excel method */}
          <div
            className="method-card"
            onClick={() => setMethod('excel')}
            style={{ background: '#fff', border: '2px solid #e2dfd8', borderRadius: 16, padding: '28px 24px', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#1854a8'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e2dfd8'; }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#1854a8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111110', marginBottom: 8 }}>Import via Excel</div>
            <p style={{ fontSize: 12.5, color: '#8a8580', lineHeight: 1.6, margin: '0 0 16px' }}>Bulk import KPIs from an Excel or CSV file. Great for migrating existing KPI frameworks.</p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {['Bulk create', 'Excel / CSV', 'Template download'].map((tag) => (
                <span key={tag} style={{ fontSize: 10.5, fontWeight: 600, padding: '2.5px 8px', borderRadius: 4, background: 'rgba(24,84,168,.08)', color: '#1854a8' }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Excel import screen ─── */
  if (method === 'excel') {
    return (
      <div style={{ padding: '22px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <button type="button" onClick={() => setMethod(null)} className="btn btn-outline btn-sm">← Back</button>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', color: '#111110' }}>Import via Excel</div>
        </div>

        <div style={{ maxWidth: 560 }}>
          {[
            {
              step: 1, active: true,
              title: 'Download Template',
              desc: 'Download the KPI import template. Fill in your KPIs following the column headers exactly.',
              cta: (
                <button type="button" className="btn btn-outline btn-sm"
                  onClick={() => {
                    const headers = ['name','description','type','period','update_frequency','target_value','unit','start_date','end_date'];
                    const example = ['Revenue Growth Rate','Q1 target','quantitative','quarterly','monthly','15','%','2026-01-01','2026-12-31'];
                    const csv = [headers.join(','), example.join(',')].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url  = URL.createObjectURL(blob);
                    const a    = document.createElement('a');
                    a.href = url; a.download = 'kpi-import-template.csv'; a.click();
                    URL.revokeObjectURL(url);
                  }}>
                  ↓ Download CSV Template
                </button>
              ),
            },
            {
              step: 2, active: false,
              title: 'Upload Your File',
              desc: 'Upload your completed file. Supported formats: .xlsx, .xls, .csv',
              cta: (
                <div style={{ border: '2px dashed #e2dfd8', borderRadius: 10, padding: '24px', textAlign: 'center', background: '#f8f7f5' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#4a4640', margin: '0 0 4px' }}>Drag & drop or click to upload</p>
                  <p style={{ fontSize: 11.5, color: '#8a8580', margin: 0 }}>Excel import coming soon — use the form method in the meantime.</p>
                </div>
              ),
            },
          ].map(({ step, active, title, desc, cta }) => (
            <div key={step} style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 12, padding: '20px 22px', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: active ? '#000' : '#e4e1db', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? '#fff' : '#4a4640', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {step}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111110', marginBottom: 5 }}>{title}</div>
                  <p style={{ fontSize: 12, color: '#8a8580', margin: '0 0 12px', lineHeight: 1.6 }}>{desc}</p>
                  {cta}
                </div>
              </div>
            </div>
          ))}

          <div style={{ padding: '12px 16px', background: '#f8f7f5', borderRadius: 10, border: '1px solid #e2dfd8' }}>
            <span style={{ fontSize: 12, color: '#8a8580' }}>
              Need to create a single KPI?{' '}
              <button type="button" onClick={() => setMethod('form')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#000', fontWeight: 600, fontSize: 12, fontFamily: 'inherit', textDecoration: 'underline', padding: 0 }}>
                Use the form instead →
              </button>
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Form creation screen ─── */
  return (
    <div style={{ padding: '22px 26px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button type="button" onClick={() => templateId ? router.push('/templates') : setMethod(null)} className="btn btn-outline btn-sm">← Back</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', color: '#111110' }}>
            {templateId ? 'Create from Template' : 'Create New KPI'}
          </div>
          {templateId && <div style={{ fontSize: 12, color: '#8a8580' }}>Pre-filled from template · Customize as needed</div>}
        </div>
      </div>

      <div style={{ maxWidth: 600, background: '#fff', border: '1px solid #e2dfd8', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.07)' }}>
        {/* Header */}
        <div style={{ padding: '14px 22px', borderBottom: '1px solid #e2dfd8', background: '#f8f7f5', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#b45309', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#4a4640' }}>KPI Details</div>
            <div style={{ fontSize: 11.5, color: '#8a8580', marginTop: 1 }}>New KPIs are created as <strong>Draft</strong> and require approval to become active.</div>
          </div>
        </div>

        <div style={{ padding: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Name */}
            <div>
              <label className="flabel">KPI Name *</label>
              <input className="fi" type="text" placeholder="e.g. Revenue Growth Rate Q1"
                value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>

            {/* Description */}
            <div>
              <label className="flabel">Description</label>
              <textarea className="fi" rows={3} placeholder="Describe what this KPI measures…"
                value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>

            {/* Type + Period */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="flabel">Type</label>
                <select className="fi" value={form.type} onChange={(e) => set('type', e.target.value)}>
                  <option value="quantitative">Quantitative</option>
                  <option value="qualitative">Qualitative</option>
                </select>
              </div>
              <div>
                <label className="flabel">Period</label>
                <select className="fi" value={form.period} onChange={(e) => set('period', e.target.value)}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            </div>

            {/* Update frequency */}
            <div>
              <label className="flabel">Update Frequency</label>
              <select className="fi" value={form.update_frequency} onChange={(e) => set('update_frequency', e.target.value)}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>

            {/* Target + Unit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="flabel">Target Value</label>
                <input className="fi" type="number" placeholder="e.g. 15"
                  value={form.target_value} onChange={(e) => set('target_value', e.target.value)} />
              </div>
              <div>
                <label className="flabel">Unit</label>
                <input className="fi" type="text" placeholder="e.g. %, USD, score"
                  value={form.unit} onChange={(e) => set('unit', e.target.value)} />
              </div>
            </div>

            {/* Date range */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="flabel">Start Date</label>
                <input className="fi" type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
              </div>
              <div>
                <label className="flabel">End Date</label>
                <input className="fi" type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
              </div>
            </div>

            {/* Owner + Region */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="flabel">Owner / Assignee</label>
                <select className="fi" value={form.owner_id} onChange={(e) => set('owner_id', e.target.value)}>
                  <option value="">— Unassigned —</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}{u.id === currentUser?.id ? ' (you)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flabel">Region</label>
                <select className="fi" value={form.region_id} onChange={(e) => set('region_id', e.target.value)}>
                  <option value="">— None —</option>
                  {allRegions.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(185,28,28,.07)', border: '1px solid rgba(185,28,28,.2)', borderRadius: 7, fontSize: 12.5, color: '#b91c1c' }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button type="button" onClick={handleSubmit} disabled={saving}
                className="btn btn-black"
                style={{ flex: 1, justifyContent: 'center', padding: '11px 0', fontSize: 13, fontWeight: 700, borderRadius: 8 }}>
                {saving ? 'Creating KPI…' : 'Create KPI as Draft'}
              </button>
              <button type="button" onClick={() => router.push('/kpis')}
                className="btn btn-outline"
                style={{ padding: '11px 22px', fontSize: 13, borderRadius: 8 }}>
                Cancel
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
