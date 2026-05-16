'use client';

import { useEffect, useState, Fragment } from 'react';
import Link from 'next/link';
import { kpis, users, type Kpi, type User } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function UpdatesPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [myKpis, setMyKpis] = useState<Kpi[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [form, setForm] = useState<{ current_value: string; status: string }>({ current_value: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  // Snapshot "now" once after mount so render stays pure and comparisons are stable.
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    setNow(Date.now());
    if (!currentUser) return;
    Promise.all([users.kpis(currentUser.id), users.list({ limit: 100 })])
      .then(([kpisRes, usersRes]) => {
        setMyKpis(kpisRes.data.filter((k) => k.status !== 'cancelled'));
        setAllUsers(usersRes.data);
      }).finally(() => setLoading(false));
  }, [currentUser]);

  const ownerName = (ownerId: string | null) => allUsers.find((u) => u.id === ownerId)?.full_name ?? '—';
  const soonCutoff = now + 7 * 86400000;
  const dueKpis = myKpis.filter((k) => k.next_due_date && new Date(k.next_due_date).getTime() <= soonCutoff);

  const handleOpenUpdate = (k: Kpi) => {
    setUpdating(k.id);
    setForm({ current_value: String(k.current_value ?? ''), status: k.status });
  };

  const handleSave = async (kpiId: string) => {
    setSaving(true);
    try {
      await kpis.update(kpiId, { current_value: form.current_value ? Number(form.current_value) : undefined, status: form.status as Kpi['status'] });
      setMyKpis((prev) => prev.map((k) => k.id === kpiId ? { ...k, current_value: form.current_value ? Number(form.current_value) : k.current_value, status: form.status as Kpi['status'] } : k));
      setUpdating(null);
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, color: '#8a8580', fontSize: 13 }}>Loading…</div>;

  return (
    <div style={{ padding: '22px 26px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', marginBottom: 3, color: '#111110' }}>KPI Progress Updates</div>
          <div style={{ fontSize: 12, color: '#8a8580' }}>Periodic updates · Configurable frequency · Flows upward through hierarchy</div>
        </div>
      </div>

      {/* KPI Updates Table */}
      <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.08)', marginBottom: 18 }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid #e2dfd8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#111110', letterSpacing: '-.1px' }}>My KPIs — Updates</span>
          <span style={{ display: 'inline-flex', padding: '2.5px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'rgba(180,83,9,.1)', color: '#b45309' }}>
            {dueKpis.length} due soon
          </span>
        </div>

        {myKpis.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, opacity: .4, marginBottom: 8 }}>📊</div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#4a4640', marginBottom: 4 }}>No KPIs assigned</p>
            <p style={{ fontSize: 12, color: '#8a8580' }}>You have no owned or contributing KPIs. <Link href="/kpis" style={{ color: '#000', textDecoration: 'underline' }}>Browse KPIs →</Link></p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #e2dfd8', background: '#f0efec' }}>
                  {['KPI No', 'KPI Name', 'Target', 'Current Value', 'Frequency', 'Next Due', 'Status', ''].map((h) => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#8a8580', textTransform: 'uppercase', letterSpacing: 1, padding: '9px 14px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myKpis.map((k) => {
                  const due = k.next_due_date ? new Date(k.next_due_date).getTime() : null;
                  const isDue = due !== null && due <= soonCutoff;
                  const isOverdue = due !== null && due < now;
                  const isUpdating = updating === k.id;
                  return (
                    <Fragment key={k.id}>
                      <tr style={{ borderBottom: '1px solid #e2dfd8', background: isUpdating ? '#f8f7f5' : 'transparent', transition: 'background .1s' }}
                        onMouseEnter={(e) => { if (!isUpdating) (e.currentTarget as HTMLElement).style.background = '#f8f7f5'; }}
                        onMouseLeave={(e) => { if (!isUpdating) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: '#e4e1db', color: '#4a4640' }}>{k.kpi_number}</span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <Link href={`/kpis/${k.id}`} style={{ fontSize: 13, fontWeight: 700, color: '#111110', textDecoration: 'none', letterSpacing: '-.1px' }}>{k.name}</Link>
                          <div style={{ fontSize: 11, color: '#8a8580', marginTop: 1 }}>{ownerName(k.owner_id)}</div>
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 12, color: '#4a4640', whiteSpace: 'nowrap' }}>
                          {k.target_value ? `${k.target_value.toLocaleString()}${k.unit ? ' ' + k.unit : ''}` : '—'}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 12, color: '#111110', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {k.current_value !== null ? `${k.current_value.toLocaleString()}${k.unit ? ' ' + k.unit : ''}` : <span style={{ color: '#c4c0b8' }}>—</span>}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 12, color: '#8a8580', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{k.update_frequency}</td>
                        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                          {k.next_due_date ? (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: isOverdue ? 'rgba(185,28,28,.1)' : isDue ? 'rgba(180,83,9,.1)' : 'transparent', color: isOverdue ? '#b91c1c' : isDue ? '#b45309' : '#8a8580' }}>
                              {new Date(k.next_due_date).toLocaleDateString()}
                            </span>
                          ) : <span style={{ color: '#c4c0b8', fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ display: 'inline-flex', padding: '2.5px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: k.status === 'active' ? 'rgba(26,122,74,.1)' : k.status === 'draft' ? 'rgba(180,83,9,.1)' : 'rgba(24,84,168,.1)', color: k.status === 'active' ? '#15633c' : k.status === 'draft' ? '#b45309' : '#1854a8' }}>{k.status}</span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          {!isUpdating ? (
                            <button onClick={() => handleOpenUpdate(k)} style={{ fontSize: 11.5, padding: '5px 11px', borderRadius: 5, border: '1px solid #e2dfd8', background: '#f8f7f5', cursor: 'pointer', color: '#4a4640', fontFamily: 'inherit', fontWeight: 600, transition: 'all .13s' }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#000'; (e.currentTarget as HTMLElement).style.background = '#fff'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e2dfd8'; (e.currentTarget as HTMLElement).style.background = '#f8f7f5'; }}>
                              Log Update
                            </button>
                          ) : (
                            <button onClick={() => setUpdating(null)} style={{ fontSize: 11.5, padding: '5px 11px', borderRadius: 5, border: '1px solid #e2dfd8', background: '#fff', cursor: 'pointer', color: '#8a8580', fontFamily: 'inherit' }}>Cancel</button>
                          )}
                        </td>
                      </tr>

                      {/* Inline update form */}
                      {isUpdating && (
                        <tr style={{ borderBottom: '1px solid #e2dfd8', background: '#f8f7f5' }}>
                          <td colSpan={8} style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4a4640', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                                  Current Value {k.unit ? `(${k.unit})` : ''}
                                </label>
                                <input
                                  style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 6, padding: '8px 12px', color: '#111110', fontFamily: 'inherit', fontSize: 13, outline: 'none', width: 160 }}
                                  type="number"
                                  value={form.current_value}
                                  onChange={(e) => setForm((f) => ({ ...f, current_value: e.target.value }))}
                                  placeholder={String(k.target_value ?? '')}
                                  onFocus={(e) => (e.target.style.borderColor = '#000')}
                                  onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4a4640', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px' }}>Status</label>
                                <select style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 6, padding: '8px 12px', color: '#111110', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
                                  value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                                  <option value="draft">Draft</option>
                                  <option value="active">Active</option>
                                  <option value="completed">Completed</option>
                                </select>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => handleSave(k.id)} disabled={saving} style={{ padding: '8px 16px', borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', background: '#000', color: '#fff', border: '1px solid #000', fontFamily: 'inherit', opacity: saving ? .6 : 1 }}>
                                  {saving ? 'Saving…' : 'Save Update'}
                                </button>
                                <button onClick={() => setUpdating(null)} style={{ padding: '8px 16px', borderRadius: 6, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', background: '#fff', border: '1px solid #cdc9c1', color: '#4a4640', fontFamily: 'inherit' }}>Cancel</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Update Timeline */}
      <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid #e2dfd8' }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#111110', letterSpacing: '-.1px' }}>Update Timeline</span>
          <span style={{ fontSize: 11.5, color: '#8a8580', marginLeft: 8 }}>visible to hierarchy above</span>
        </div>
        <div style={{ padding: '16px 18px' }}>
          {myKpis.filter((k) => k.current_value !== null).length === 0 ? (
            <p style={{ fontSize: 13, color: '#8a8580' }}>No updates logged yet. Click &quot;Log Update&quot; on any KPI above to record progress.</p>
          ) : (
            <div>
              {myKpis.filter((k) => k.current_value !== null).map((k, i) => {
                const pct = k.target_value ? Math.min(100, Math.round(((k.current_value ?? 0) / k.target_value) * 100)) : null;
                return (
                  <div key={k.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < myKpis.filter((x) => x.current_value !== null).length - 1 ? '1px dashed #e2dfd8' : 'none' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#000', border: '2px solid #000', flexShrink: 0, marginTop: 4 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 9.5, fontWeight: 700, padding: '2px 5px', borderRadius: 3, background: '#e4e1db', color: '#4a4640' }}>{k.kpi_number}</span>
                        <Link href={`/kpis/${k.id}`} style={{ fontSize: 13, fontWeight: 700, color: '#111110', textDecoration: 'none' }}>{k.name}</Link>
                        {pct !== null && (
                          <span style={{ fontSize: 11.5, color: pct >= 100 ? '#15633c' : pct >= 50 ? '#1854a8' : '#b45309', fontWeight: 700 }}>{pct}%</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#8a8580' }}>
                        Current: <strong style={{ color: '#111110' }}>{k.current_value?.toLocaleString()} {k.unit}</strong>
                        {k.target_value && <> · Target: <strong style={{ color: '#111110' }}>{k.target_value.toLocaleString()} {k.unit}</strong></>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
