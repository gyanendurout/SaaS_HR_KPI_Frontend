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

  if (loading) return <div className="flex items-center justify-center h-64 text-t3 text-[13px]">Loading…</div>;

  return (
    <div className="px-6.5 py-5.5">
      <div className="flex items-center justify-between mb-4.5">
        <div>
          <div className="text-[15px] font-black tracking-[-0.2px] mb-0.75 text-near-black">KPI Progress Updates</div>
          <div className="text-xs text-t3">Periodic updates · Configurable frequency · Flows upward through hierarchy</div>
        </div>
      </div>

      {/* KPI Updates Table */}
      <div className="bg-white border border-border rounded-modal overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,.08)] mb-4.5">
        <div className="flex items-center justify-between px-4.5 py-3.25 border-b border-border">
          <span className="text-[13.5px] font-bold text-near-black tracking-[-0.1px]">My KPIs — Updates</span>
          <span className="inline-flex px-2 py-[2.5px] rounded text-[11px] font-semibold bg-[rgba(180,83,9,.1)] text-brand-amber">
            {dueKpis.length} due soon
          </span>
        </div>

        {myKpis.length === 0 ? (
          <div className="py-12 px-5 text-center">
            <div className="text-[28px] opacity-40 mb-2">📊</div>
            <p className="text-[13px] font-semibold text-t2 mb-1">No KPIs assigned</p>
            <p className="text-xs text-t3">
              You have no owned or contributing KPIs.{' '}
              <Link href="/kpis" className="text-black underline">Browse KPIs →</Link>
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-[1.5px] border-border bg-[#f0efec]">
                  {['KPI No', 'KPI Name', 'Target', 'Current Value', 'Frequency', 'Next Due', 'Status', ''].map((h) => (
                    <th key={h} className="text-left text-[10px] font-bold text-t3 uppercase tracking-widest py-2.25 px-3.5 whitespace-nowrap">{h}</th>
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
                      <tr
                        className="border-b border-border transition-colors duration-100"
                        style={{ background: isUpdating ? '#f8f7f5' : undefined }}
                        onMouseEnter={(e) => { if (!isUpdating) (e.currentTarget as HTMLElement).style.background = '#f8f7f5'; }}
                        onMouseLeave={(e) => { if (!isUpdating) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <td className="py-[11px] px-3.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] bg-[#e4e1db] text-t2">{k.kpi_number}</span>
                        </td>
                        <td className="py-[11px] px-3.5">
                          <Link href={`/kpis/${k.id}`} className="text-[13px] font-bold text-near-black no-underline tracking-[-0.1px] hover:underline">{k.name}</Link>
                          <div className="text-[11px] text-t3 mt-px">{ownerName(k.owner_id)}</div>
                        </td>
                        <td className="py-[11px] px-3.5 text-xs text-t2 whitespace-nowrap">
                          {k.target_value ? `${k.target_value.toLocaleString()}${k.unit ? ' ' + k.unit : ''}` : '—'}
                        </td>
                        <td className="py-[11px] px-3.5 text-xs text-near-black font-semibold whitespace-nowrap">
                          {k.current_value !== null
                            ? `${k.current_value.toLocaleString()}${k.unit ? ' ' + k.unit : ''}`
                            : <span className="text-t4">—</span>}
                        </td>
                        <td className="py-[11px] px-3.5 text-xs text-t3 capitalize whitespace-nowrap">{k.update_frequency}</td>
                        <td className="py-[11px] px-3.5 whitespace-nowrap">
                          {k.next_due_date ? (
                            <span className="text-[11px] font-bold px-[7px] py-0.5 rounded"
                              style={{
                                background: isOverdue ? 'rgba(185,28,28,.1)' : isDue ? 'rgba(180,83,9,.1)' : 'transparent',
                                color: isOverdue ? '#b91c1c' : isDue ? '#b45309' : '#8a8580',
                              }}>
                              {new Date(k.next_due_date).toLocaleDateString()}
                            </span>
                          ) : <span className="text-xs text-t4">—</span>}
                        </td>
                        <td className="py-[11px] px-3.5">
                          <span className="inline-flex px-2 py-[2.5px] rounded text-[11px] font-semibold"
                            style={{
                              background: k.status === 'active' ? 'rgba(26,122,74,.1)' : k.status === 'draft' ? 'rgba(180,83,9,.1)' : 'rgba(24,84,168,.1)',
                              color: k.status === 'active' ? '#15633c' : k.status === 'draft' ? '#b45309' : '#1854a8',
                            }}>
                            {k.status}
                          </span>
                        </td>
                        <td className="py-[11px] px-3.5">
                          {!isUpdating ? (
                            <button type="button" onClick={() => handleOpenUpdate(k)}
                              className="text-[11.5px] py-[5px] px-[11px] rounded-[5px] border border-border bg-off cursor-pointer text-t2 font-[inherit] font-semibold transition-all duration-130 hover:border-black hover:bg-white">
                              Log Update
                            </button>
                          ) : (
                            <button type="button" onClick={() => setUpdating(null)}
                              className="text-[11.5px] py-[5px] px-[11px] rounded-[5px] border border-border bg-white cursor-pointer text-t3 font-[inherit]">
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Inline update form */}
                      {isUpdating && (
                        <tr className="border-b border-border bg-off">
                          <td colSpan={8} className="py-3.5 px-4.5">
                            <div className="flex flex-wrap gap-3 items-end">
                              <div>
                                <label className="block text-[11px] font-bold text-t2 mb-[5px] uppercase tracking-[0.4px]">
                                  Current Value {k.unit ? `(${k.unit})` : ''}
                                </label>
                                <input
                                  className="bg-white border-[1.5px] border-border rounded-md py-2 px-3 text-near-black font-[inherit] text-[13px] outline-none w-40 transition-[border-color] duration-180 focus:border-black"
                                  type="number"
                                  value={form.current_value}
                                  onChange={(e) => setForm((f) => ({ ...f, current_value: e.target.value }))}
                                  placeholder={String(k.target_value ?? '')}
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-t2 mb-[5px] uppercase tracking-[0.4px]">Status</label>
                                <select
                                  className="bg-white border-[1.5px] border-border rounded-md py-2 px-3 text-near-black font-[inherit] text-[13px] outline-none"
                                  value={form.status}
                                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                                  <option value="draft">Draft</option>
                                  <option value="active">Active</option>
                                  <option value="completed">Completed</option>
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => handleSave(k.id)} disabled={saving}
                                  className="py-2 px-4 rounded-md text-[12.5px] font-semibold bg-black text-white border border-black font-[inherit] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
                                  {saving ? 'Saving…' : 'Save Update'}
                                </button>
                                <button type="button" onClick={() => setUpdating(null)}
                                  className="py-2 px-4 rounded-md text-[12.5px] font-medium bg-white border border-border2 text-t2 font-[inherit] cursor-pointer">
                                  Cancel
                                </button>
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
      <div className="bg-white border border-border rounded-modal overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,.08)]">
        <div className="flex items-center gap-2 px-4.5 py-3.25 border-b border-border">
          <span className="text-[13.5px] font-bold text-near-black tracking-[-0.1px]">Update Timeline</span>
          <span className="text-[11.5px] text-t3">visible to hierarchy above</span>
        </div>
        <div className="px-4.5 py-4">
          {myKpis.filter((k) => k.current_value !== null).length === 0 ? (
            <p className="text-[13px] text-t3">No updates logged yet. Click &quot;Log Update&quot; on any KPI above to record progress.</p>
          ) : (
            <div>
              {myKpis.filter((k) => k.current_value !== null).map((k, i) => {
                const pct = k.target_value ? Math.min(100, Math.round(((k.current_value ?? 0) / k.target_value) * 100)) : null;
                const total = myKpis.filter((x) => x.current_value !== null).length;
                return (
                  <div key={k.id} className="flex items-start gap-3 py-2.5"
                    style={{ borderBottom: i < total - 1 ? '1px dashed #e2dfd8' : 'none' }}>
                    <div className="w-2.5 h-2.5 rounded-full bg-black border-2 border-black shrink-0 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.75">
                        <span className="font-mono text-[9.5px] font-bold px-[5px] py-0.5 rounded-[3px] bg-[#e4e1db] text-t2">{k.kpi_number}</span>
                        <Link href={`/kpis/${k.id}`} className="text-[13px] font-bold text-near-black no-underline hover:underline">{k.name}</Link>
                        {pct !== null && (
                          <span className="text-[11.5px] font-bold"
                            style={{ color: pct >= 100 ? '#15633c' : pct >= 50 ? '#1854a8' : '#b45309' }}>
                            {pct}%
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-t3">
                        Current: <strong className="text-near-black">{k.current_value?.toLocaleString()} {k.unit}</strong>
                        {k.target_value && <> · Target: <strong className="text-near-black">{k.target_value.toLocaleString()} {k.unit}</strong></>}
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
