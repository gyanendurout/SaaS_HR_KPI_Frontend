'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { kpis, users, regions, type Kpi, type User, type Region } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const TEMPLATE_DEFAULTS: Record<string, Partial<Kpi>> = {
  t1: { name: 'Revenue Growth Rate', type: 'quantitative', period: 'quarterly', update_frequency: 'monthly', unit: '%', target_value: 15 },
  t2: { name: 'Customer Satisfaction (CSAT)', type: 'quantitative', period: 'monthly', update_frequency: 'monthly', unit: 'score', target_value: 4.5 },
  t3: { name: 'Operational Efficiency Index', type: 'quantitative', period: 'monthly', update_frequency: 'monthly', unit: '%', target_value: 92 },
  t4: { name: 'Employee Engagement Score', type: 'quantitative', period: 'quarterly', update_frequency: 'quarterly', unit: '%', target_value: 80 },
  t5: { name: 'Net Revenue Retention (NRR)', type: 'quantitative', period: 'monthly', update_frequency: 'monthly', unit: '%', target_value: 110 },
  t6: { name: 'Customer Churn Rate', type: 'quantitative', period: 'monthly', update_frequency: 'monthly', unit: '%', target_value: 3 },
  t7: { name: 'On-Time Delivery Rate', type: 'quantitative', period: 'monthly', update_frequency: 'monthly', unit: '%', target_value: 95 },
  t8: { name: 'Time to Hire', type: 'quantitative', period: 'quarterly', update_frequency: 'quarterly', unit: 'days', target_value: 30 },
  t9: { name: 'Average Contract Value (ACV)', type: 'quantitative', period: 'quarterly', update_frequency: 'quarterly', unit: 'USD', target_value: 50000 },
};

type Method = 'form' | 'excel' | null;

export default function NewKpiPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');
  const currentUser = useAuthStore((s) => s.user);

  const [method, setMethod] = useState<Method>(templateId ? 'form' : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allRegions, setAllRegions] = useState<Region[]>([]);

  useEffect(() => {
    Promise.all([users.list({ limit: 200 }), regions.list()]).then(([uRes, rRes]) => {
      setAllUsers(uRes.data);
      setAllRegions(rRes.data);
    });
  }, []);

  const templateDefaults = templateId ? TEMPLATE_DEFAULTS[templateId] : {};

  const [form, setForm] = useState({
    name: templateDefaults?.name ?? '',
    description: '',
    type: (templateDefaults?.type ?? 'quantitative') as Kpi['type'],
    period: (templateDefaults?.period ?? 'monthly') as Kpi['period'],
    update_frequency: (templateDefaults?.update_frequency ?? 'monthly') as Kpi['update_frequency'],
    target_value: templateDefaults?.target_value ? String(templateDefaults.target_value) : '',
    unit: templateDefaults?.unit ?? '',
    start_date: '',
    end_date: '',
    owner_id: currentUser?.id ?? '',
    region_id: currentUser?.region_id ?? '',
  });

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('KPI name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const body: Partial<Kpi> = {
        name: form.name.trim(),
        description: form.description || undefined,
        type: form.type,
        period: form.period,
        update_frequency: form.update_frequency,
        target_value: form.target_value ? Number(form.target_value) : undefined,
        unit: form.unit || undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        status: 'draft',
        owner_id: form.owner_id || currentUser?.id,
        region_id: form.region_id || undefined,
      };
      const res = await kpis.create(body);
      router.push(`/kpis/${res.data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create KPI. Please try again.');
    } finally { setSaving(false); }
  };

  const inputStyle = { background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#111110', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' as const };
  const labelStyle = { display: 'block' as const, fontSize: 11, fontWeight: 700, color: '#4a4640', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '.4px' };

  if (!method) {
    return (
      <div style={{ padding: '22px 26px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', marginBottom: 3, color: '#111110' }}>Add New KPI</div>
          <div style={{ fontSize: 12, color: '#8a8580' }}>Choose how you&apos;d like to create your KPI</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, maxWidth: 700 }}>
          {/* Form method */}
          <div
            onClick={() => setMethod('form')}
            style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 14, padding: '28px 24px', cursor: 'pointer', transition: 'all .15s', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#000'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e2dfd8'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,.06)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>📝</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111110', marginBottom: 8 }}>Create with Form</div>
            <p style={{ fontSize: 12.5, color: '#8a8580', lineHeight: 1.6, margin: '0 0 16px' }}>Fill out a guided form with all KPI fields. Best for creating individual KPIs one at a time.</p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {['Custom name & target', 'Set update frequency', 'Assign owner'].map((tag) => (
                <span key={tag} style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: '#f0efec', color: '#4a4640' }}>{tag}</span>
              ))}
            </div>
          </div>

          {/* Template method */}
          <div
            onClick={() => router.push('/templates')}
            style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 14, padding: '28px 24px', cursor: 'pointer', transition: 'all .15s', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#1a7a4a'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e2dfd8'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,.06)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111110', marginBottom: 8 }}>Start from Template</div>
            <p style={{ fontSize: 12.5, color: '#8a8580', lineHeight: 1.6, margin: '0 0 16px' }}>Pick from pre-built KPI templates across Revenue, Customer, Operations, and HR categories.</p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {['9 templates', 'Pre-filled values', 'Customizable'].map((tag) => (
                <span key={tag} style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'rgba(26,122,74,.08)', color: '#15633c' }}>{tag}</span>
              ))}
            </div>
          </div>

          {/* Excel import method */}
          <div
            onClick={() => setMethod('excel')}
            style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 14, padding: '28px 24px', cursor: 'pointer', transition: 'all .15s', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#1854a8'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e2dfd8'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,.06)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111110', marginBottom: 8 }}>Import via Excel</div>
            <p style={{ fontSize: 12.5, color: '#8a8580', lineHeight: 1.6, margin: '0 0 16px' }}>Bulk import KPIs from an Excel or CSV file. Great for migrating existing KPI frameworks.</p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {['Bulk create', 'Excel / CSV', 'Template download'].map((tag) => (
                <span key={tag} style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'rgba(24,84,168,.08)', color: '#1854a8' }}>{tag}</span>
              ))}
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (method === 'excel') {
    return (
      <div style={{ padding: '22px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <button onClick={() => setMethod(null)} style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #e2dfd8', background: '#fff', cursor: 'pointer', color: '#4a4640', fontSize: 12.5, fontFamily: 'inherit' }}>← Back</button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', color: '#111110' }}>Import via Excel</div>
          </div>
        </div>

        <div style={{ maxWidth: 560 }}>
          {/* Step 1 */}
          <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 12, padding: '20px 22px', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>1</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111110', marginBottom: 5 }}>Download Template</div>
                <p style={{ fontSize: 12, color: '#8a8580', margin: '0 0 12px', lineHeight: 1.6 }}>Download the KPI import template. Fill in your KPIs following the column headers exactly.</p>
                <button
                  onClick={() => {
                    const headers = ['name', 'description', 'type', 'period', 'update_frequency', 'target_value', 'unit', 'start_date', 'end_date'];
                    const example = ['Revenue Growth Rate', 'Q1 target', 'quantitative', 'quarterly', 'monthly', '15', '%', '2026-01-01', '2026-12-31'];
                    const csv = [headers.join(','), example.join(',')].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'kpi-import-template.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{ padding: '8px 16px', borderRadius: 7, border: '1.5px solid #e2dfd8', background: '#f8f7f5', cursor: 'pointer', color: '#4a4640', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit' }}>
                  ↓ Download CSV Template
                </button>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 12, padding: '20px 22px', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e4e1db', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a4640', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>2</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111110', marginBottom: 5 }}>Upload Your File</div>
                <p style={{ fontSize: 12, color: '#8a8580', margin: '0 0 12px', lineHeight: 1.6 }}>Upload your completed file. Supported formats: .xlsx, .xls, .csv</p>
                <div style={{ border: '2px dashed #e2dfd8', borderRadius: 10, padding: '24px', textAlign: 'center', background: '#f8f7f5' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📁</div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#4a4640', margin: '0 0 4px' }}>Drag & drop or click to upload</p>
                  <p style={{ fontSize: 11.5, color: '#8a8580', margin: 0 }}>Excel import is coming soon. Use the form method in the meantime.</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: '12px 16px', background: '#f8f7f5', borderRadius: 10, border: '1px solid #e2dfd8' }}>
            <span style={{ fontSize: 12, color: '#8a8580' }}>💡 Need to create a single KPI? <button onClick={() => setMethod('form')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#000', fontWeight: 600, fontSize: 12, fontFamily: 'inherit', textDecoration: 'underline', padding: 0 }}>Use the form instead →</button></span>
          </div>
        </div>
      </div>
    );
  }

  // Form method
  return (
    <div style={{ padding: '22px 26px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button onClick={() => templateId ? router.push('/templates') : setMethod(null)} style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #e2dfd8', background: '#fff', cursor: 'pointer', color: '#4a4640', fontSize: 12.5, fontFamily: 'inherit' }}>← Back</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', color: '#111110' }}>
            {templateId ? `Create from Template` : 'Create New KPI'}
          </div>
          {templateId && <div style={{ fontSize: 12, color: '#8a8580' }}>Pre-filled from template · Customize as needed</div>}
        </div>
      </div>

      <div style={{ maxWidth: 600, background: '#fff', border: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.07)' }}>
        {/* Form header */}
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #e2dfd8', background: '#f8f7f5' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#4a4640' }}>KPI Details</div>
          <div style={{ fontSize: 12, color: '#8a8580', marginTop: 2 }}>New KPIs are created as <strong>Draft</strong> and require approval to become active.</div>
        </div>

        <div style={{ padding: '22px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>KPI Name *</label>
              <input style={inputStyle} type="text" placeholder="e.g. Revenue Growth Rate Q1" value={form.name} onChange={(e) => set('name', e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')} />
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} placeholder="Describe what this KPI measures…" value={form.description} onChange={(e) => set('description', e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')} />
            </div>

            {/* Type + Period row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Type</label>
                <select style={inputStyle} value={form.type} onChange={(e) => set('type', e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')}>
                  <option value="quantitative">Quantitative</option>
                  <option value="qualitative">Qualitative</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Period</label>
                <select style={inputStyle} value={form.period} onChange={(e) => set('period', e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            </div>

            {/* Update frequency */}
            <div>
              <label style={labelStyle}>Update Frequency</label>
              <select style={inputStyle} value={form.update_frequency} onChange={(e) => set('update_frequency', e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>

            {/* Target + Unit row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Target Value</label>
                <input style={inputStyle} type="number" placeholder="e.g. 15" value={form.target_value} onChange={(e) => set('target_value', e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')} />
              </div>
              <div>
                <label style={labelStyle}>Unit</label>
                <input style={inputStyle} type="text" placeholder="e.g. %, USD, score" value={form.unit} onChange={(e) => set('unit', e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')} />
              </div>
            </div>

            {/* Date range */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Start Date</label>
                <input style={inputStyle} type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')} />
              </div>
              <div>
                <label style={labelStyle}>End Date</label>
                <input style={inputStyle} type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')} />
              </div>
            </div>

            {/* Owner + Region */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Owner / Assignee</label>
                <select style={inputStyle} value={form.owner_id} onChange={(e) => set('owner_id', e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')}>
                  <option value="">— Unassigned —</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}{u.id === currentUser?.id ? ' (you)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Region</label>
                <select style={inputStyle} value={form.region_id} onChange={(e) => set('region_id', e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = '#000')} onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')}>
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
              <button
                onClick={handleSubmit}
                disabled={saving}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', background: '#000', color: '#fff', border: '1px solid #000', fontFamily: 'inherit', opacity: saving ? .6 : 1, transition: 'opacity .13s' }}>
                {saving ? 'Creating KPI…' : 'Create KPI as Draft'}
              </button>
              <button
                onClick={() => router.push('/kpis')}
                style={{ padding: '10px 20px', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: '#fff', border: '1px solid #e2dfd8', color: '#4a4640', fontFamily: 'inherit' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
