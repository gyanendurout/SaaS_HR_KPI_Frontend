'use client';

import { useEffect, useState, Fragment } from 'react';
import Link from 'next/link';
import { kpis, users, regions, type Kpi, type User, type Region } from '@/lib/api';

export default function AssignmentsPage() {
  const [allKpis, setAllKpis] = useState<Kpi[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState<{ owner_id: string }>({ owner_id: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      kpis.list({ limit: 200 }),
      users.list({ limit: 200 }),
      regions.list(),
    ]).then(([kRes, uRes, rRes]) => {
      setAllKpis(kRes.data);
      setAllUsers(uRes.data);
      setAllRegions(rRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const userName = (id: string | null) => allUsers.find((u) => u.id === id)?.full_name ?? '—';
  const regionName = (id: string) => allRegions.find((r) => r.id === id)?.name ?? '—';

  const filtered = allKpis.filter((k) => {
    const q = search.toLowerCase();
    const matchSearch = !search || k.name.toLowerCase().includes(q) || k.kpi_number.toLowerCase().includes(q);
    const matchStatus = !filterStatus || k.status === filterStatus;
    const matchRegion = !filterRegion || k.region_id === filterRegion;
    return matchSearch && matchStatus && matchRegion;
  });

  const handleOpenAssign = (k: Kpi) => {
    setAssigning(k.id);
    setAssignForm({ owner_id: k.owner_id ?? '' });
  };

  const handleSaveAssign = async (kpiId: string) => {
    setSaving(true);
    try {
      await kpis.update(kpiId, { owner_id: assignForm.owner_id || undefined });
      setAllKpis((prev) => prev.map((k) => k.id === kpiId ? { ...k, owner_id: assignForm.owner_id || null } : k));
      setAssigning(null);
    } finally { setSaving(false); }
  };

  const unassignedCount = allKpis.filter((k) => !k.owner_id && k.status !== 'cancelled').length;

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, color: '#8a8580', fontSize: 13 }}>Loading…</div>;

  return (
    <div style={{ padding: '22px 26px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', marginBottom: 3, color: '#111110' }}>KPI Assignments</div>
          <div style={{ fontSize: 12, color: '#8a8580' }}>Assign KPI owners, manage responsibility, and track accountability across the organization</div>
        </div>
        {unassignedCount > 0 && (
          <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: 8, background: 'rgba(185,28,28,.08)', border: '1px solid rgba(185,28,28,.2)', color: '#b91c1c', fontSize: 12, fontWeight: 600, gap: 6, alignItems: 'center' }}>
            <span>⚠</span> {unassignedCount} KPI{unassignedCount !== 1 ? 's' : ''} unassigned
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search by name or KPI number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#111110', fontFamily: 'inherit', outline: 'none', width: 280 }}
          onFocus={(e) => (e.target.style.borderColor = '#000')}
          onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#111110', fontFamily: 'inherit', outline: 'none' }}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
          style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#111110', fontFamily: 'inherit', outline: 'none' }}>
          <option value="">All Regions</option>
          {allRegions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {(search || filterStatus || filterRegion) && (
          <button type="button" onClick={() => { setSearch(''); setFilterStatus(''); setFilterRegion(''); }} style={{ padding: '8px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', background: '#fff', border: '1px solid #e2dfd8', color: '#8a8580', fontFamily: 'inherit' }}>Clear</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#8a8580' }}>{filtered.length} KPI{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.07)' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#4a4640', marginBottom: 4 }}>No KPIs found</p>
            <p style={{ fontSize: 12, color: '#8a8580' }}>Adjust your filters or <Link href="/kpis/new" style={{ color: '#000', textDecoration: 'underline' }}>create a new KPI</Link>.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #e2dfd8', background: '#f0efec' }}>
                  {['KPI No', 'KPI Name', 'Region', 'Type', 'Status', 'Current Owner', 'Assign To', ''].map((h) => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#8a8580', textTransform: 'uppercase', letterSpacing: 1, padding: '9px 14px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((k) => {
                  const isAssigning = assigning === k.id;
                  const isUnassigned = !k.owner_id;
                  return (
                    <Fragment key={k.id}>
                      <tr
                        style={{ borderBottom: '1px solid #e2dfd8', background: isAssigning ? '#f8f7f5' : 'transparent', transition: 'background .1s' }}
                        onMouseEnter={(e) => { if (!isAssigning) (e.currentTarget as HTMLElement).style.background = '#f8f7f5'; }}
                        onMouseLeave={(e) => { if (!isAssigning) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: '#e4e1db', color: '#4a4640' }}>{k.kpi_number}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Link href={`/kpis/${k.id}`} style={{ fontSize: 13, fontWeight: 700, color: '#111110', textDecoration: 'none', letterSpacing: '-.1px' }}>{k.name}</Link>
                          {k.parent_id && <div style={{ fontSize: 11, color: '#8a8580', marginTop: 1 }}>Cascaded</div>}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#8a8580', whiteSpace: 'nowrap' }}>{regionName(k.region_id)}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#8a8580', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{k.type}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ display: 'inline-flex', padding: '2.5px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: k.status === 'active' ? 'rgba(26,122,74,.1)' : k.status === 'draft' ? 'rgba(180,83,9,.1)' : k.status === 'completed' ? 'rgba(24,84,168,.1)' : 'rgba(185,28,28,.08)', color: k.status === 'active' ? '#15633c' : k.status === 'draft' ? '#b45309' : k.status === 'completed' ? '#1854a8' : '#b91c1c' }}>{k.status}</span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                          {isUnassigned ? (
                            <span style={{ color: '#b91c1c', fontWeight: 600, fontSize: 11.5 }}>Unassigned</span>
                          ) : (
                            <span style={{ color: '#111110', fontWeight: 500 }}>{userName(k.owner_id)}</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#8a8580' }}>
                          {isAssigning ? '—' : <span style={{ color: '#8a8580' }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {!isAssigning ? (
                            <button type="button"
                              onClick={() => handleOpenAssign(k)}
                              style={{ fontSize: 11.5, padding: '5px 11px', borderRadius: 5, border: `1px solid ${isUnassigned ? 'rgba(185,28,28,.3)' : '#e2dfd8'}`, background: isUnassigned ? 'rgba(185,28,28,.06)' : '#f8f7f5', cursor: 'pointer', color: isUnassigned ? '#b91c1c' : '#4a4640', fontFamily: 'inherit', fontWeight: 600 }}>
                              {isUnassigned ? 'Assign' : 'Reassign'}
                            </button>
                          ) : (
                            <button type="button" onClick={() => setAssigning(null)} style={{ fontSize: 11.5, padding: '5px 11px', borderRadius: 5, border: '1px solid #e2dfd8', background: '#fff', cursor: 'pointer', color: '#8a8580', fontFamily: 'inherit' }}>Cancel</button>
                          )}
                        </td>
                      </tr>
                      {isAssigning && (
                        <tr style={{ borderBottom: '1px solid #e2dfd8', background: '#f8f7f5' }}>
                          <td colSpan={8} style={{ padding: '12px 18px' }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4a4640', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px' }}>Assign To</label>
                                <select
                                  value={assignForm.owner_id}
                                  onChange={(e) => setAssignForm({ owner_id: e.target.value })}
                                  style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 6, padding: '8px 12px', color: '#111110', fontFamily: 'inherit', fontSize: 13, outline: 'none', minWidth: 220 }}>
                                  <option value="">— Unassigned —</option>
                                  {allUsers.filter((u) => u.status === 'active').map((u) => (
                                    <option key={u.id} value={u.id}>{u.full_name}{u.designation ? ` · ${u.designation}` : ''}</option>
                                  ))}
                                </select>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button type="button" onClick={() => handleSaveAssign(k.id)} disabled={saving} style={{ padding: '8px 16px', borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', background: '#000', color: '#fff', border: '1px solid #000', fontFamily: 'inherit', opacity: saving ? .6 : 1 }}>
                                  {saving ? 'Saving…' : 'Confirm Assignment'}
                                </button>
                                <button type="button" onClick={() => setAssigning(null)} style={{ padding: '8px 16px', borderRadius: 6, fontSize: 12.5, cursor: 'pointer', background: '#fff', border: '1px solid #cdc9c1', color: '#4a4640', fontFamily: 'inherit' }}>Cancel</button>
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
    </div>
  );
}
