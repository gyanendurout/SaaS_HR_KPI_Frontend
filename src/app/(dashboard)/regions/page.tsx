'use client';

import { useEffect, useState } from 'react';
import { regions, kpis, users, type Region, type Kpi, type User } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function RegionsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.is_admin ?? false;

  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [allKpis, setAllKpis] = useState<Kpi[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    Promise.all([regions.list(), kpis.list({ limit: 200 }), users.list({ limit: 200 })])
      .then(([rRes, kRes, uRes]) => {
        setAllRegions(rRes.data);
        setAllKpis(kRes.data);
        setAllUsers(uRes.data);
      }).finally(() => setLoading(false));
  }, []);

  const regionStats = (region: Region) => {
    const rKpis = allKpis.filter((k) => k.region_id === region.id);
    const rUsers = allUsers.filter((u) => u.region_id === region.id);
    return {
      total: rKpis.length,
      active: rKpis.filter((k) => k.status === 'active').length,
      draft: rKpis.filter((k) => k.status === 'draft').length,
      completed: rKpis.filter((k) => k.status === 'completed').length,
      users: rUsers.length,
      kpis: rKpis,
    };
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.code.trim()) { setFormError('Name and code are required.'); return; }
    setSaving(true); setFormError('');
    try {
      const res = await regions.create({ name: form.name.trim(), code: form.code.trim() });
      setAllRegions((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: '', code: '' });
      setModalOpen(false);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to create region.');
    } finally {
      setSaving(false);
    }
  };

  const REGION_COLORS = ['#1a7a4a', '#1854a8', '#b45309', '#7c3aed', '#b91c1c', '#0e7490', '#92400e'];

  const getRegionColor = (idx: number) => REGION_COLORS[idx % REGION_COLORS.length];

  const visibleRegions = isAdmin
    ? allRegions
    : allRegions.filter((r) => r.id === currentUser?.region_id);

  const selectedKpis = selectedRegion ? allKpis.filter((k) => k.region_id === selectedRegion.id) : [];
  const selectedUsers = selectedRegion ? allUsers.filter((u) => u.region_id === selectedRegion.id) : [];

  if (loading) return <div className="flex items-center justify-center h-64 text-t3 text-[13px]">Loading…</div>;

  return (
    <div className="px-[26px] py-[22px]">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="text-[15px] font-black tracking-[-0.2px] mb-[3px] text-near-black">Regions & Workspaces</div>
          <div className="text-xs text-t3">KPI performance by region — {visibleRegions.length} region{visibleRegions.length !== 1 ? 's' : ''} · {allKpis.filter((k) => k.status !== 'cancelled').length} active KPIs total</div>
        </div>
        {isAdmin && (
          <button
            type="button"
            className="btn btn-black py-3 px-[22px] text-[15px] rounded-lg font-semibold"
            onClick={() => {
              setForm({ name: '', code: '' });
              setFormError('');
              setModalOpen(true);
            }}
          >
            + New Region
          </button>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid gap-[10px] mb-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {[
          { label: 'Total Regions', value: allRegions.length, color: '#111110' },
          { label: 'Total KPIs', value: allKpis.filter((k) => k.status !== 'cancelled').length, color: '#111110' },
          { label: 'Active KPIs', value: allKpis.filter((k) => k.status === 'active').length, color: '#1a7a4a' },
          { label: 'Pending Approval', value: allKpis.filter((k) => k.status === 'draft').length, color: '#b45309' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-border rounded-[10px] px-[14px] py-3 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
            <div className="text-[11px] text-t3 font-semibold uppercase tracking-[0.5px] mb-[5px]">{stat.label}</div>
            <div className="text-[22px] font-black tracking-[-0.5px]" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: selectedRegion ? '1fr 1.1fr' : '1fr' }}>
        {/* Region cards */}
        <div>
          {visibleRegions.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-[14px] py-12 px-5 text-center bg-off">
              <p className="text-sm font-semibold text-[#4a4640] mb-1">No regions configured</p>
              <p className="text-xs text-t3">Contact your administrator to set up regions.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-[10px]">
              {visibleRegions.map((region, idx) => {
                const stats = regionStats(region);
                const color = getRegionColor(idx);
                const isSelected = selectedRegion?.id === region.id;
                return (
                  <div key={region.id}>
                    <div
                      onClick={() => setSelectedRegion(isSelected ? null : region)}
                      className="bg-white rounded-xl px-4 py-[14px] cursor-pointer transition-all duration-[140ms]"
                      style={{
                        borderTop: `1.5px solid ${isSelected ? color : '#e2dfd8'}`,
                        borderRight: `1.5px solid ${isSelected ? color : '#e2dfd8'}`,
                        borderBottom: `1.5px solid ${isSelected ? color : '#e2dfd8'}`,
                        borderLeft: `4px solid ${color}`,
                        boxShadow: isSelected ? `0 0 0 2px ${color}30` : '0 1px 3px rgba(0,0,0,.06)',
                      }}>
                      <div className="flex items-start justify-between mb-[10px]">
                        <div>
                          <div className="text-[13.5px] font-bold text-near-black tracking-[-0.1px] mb-0.5">{region.name}</div>
                          <div className="text-[11px] font-semibold text-t3 tracking-[0.5px] font-mono">{region.code}</div>
                        </div>
                        <span className="text-[11px] font-bold" style={{ color: isSelected ? color : '#8a8580' }}>{isSelected ? '▲' : '▼'}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-[6px]">
                        {[
                          { label: 'Total', value: stats.total },
                          { label: 'Active', value: stats.active, color: '#1a7a4a' },
                          { label: 'Draft', value: stats.draft, color: '#b45309' },
                          { label: 'People', value: stats.users },
                        ].map((s) => (
                          <div key={s.label} className="bg-off rounded-[6px] px-2 py-[6px] text-center">
                            <div className="text-sm font-black" style={{ color: s.color ?? '#111110' }}>{s.value}</div>
                            <div className="text-[9.5px] text-t3 font-semibold uppercase tracking-[0.4px]">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Region detail panel */}
        {selectedRegion && (
          <div className="bg-white border border-border rounded-[14px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,.07)] h-fit">
            <div className="px-[18px] py-[14px] border-b border-border flex items-center justify-between">
              <div>
                <div className="text-[13.5px] font-bold text-near-black">{selectedRegion.name}</div>
                <div className="text-[11px] text-t3 font-mono mt-0.5">{selectedRegion.code}</div>
              </div>
              <button type="button" onClick={() => setSelectedRegion(null)} className="px-[10px] py-1 rounded-[5px] border border-border bg-off cursor-pointer text-t3 text-xs font-[inherit]">Close</button>
            </div>

            {/* KPIs in region */}
            <div className="px-[18px] py-[14px] border-b border-border">
              <div className="text-[11px] font-bold text-t3 uppercase tracking-[0.5px] mb-[10px]">KPIs ({selectedKpis.length})</div>
              {selectedKpis.length === 0 ? (
                <p className="text-xs text-t3">No KPIs in this region.</p>
              ) : (
                <div className="flex flex-col gap-[7px]">
                  {selectedKpis.slice(0, 8).map((k) => (
                    <div key={k.id} className="flex items-center justify-between px-[10px] py-[7px] bg-off rounded-[7px]">
                      <div className="min-w-0">
                        <span className="font-mono text-[9.5px] font-bold px-[5px] py-px rounded-[3px] bg-[#e4e1db] text-[#4a4640] mr-[6px]">{k.kpi_number}</span>
                        <span className="text-xs font-semibold text-near-black">{k.name}</span>
                      </div>
                      <span
                        className="inline-flex px-[7px] py-0.5 rounded font-semibold shrink-0 ml-2 text-[10.5px]"
                        style={{
                          background: k.status === 'active' ? 'rgba(26,122,74,.1)' : k.status === 'draft' ? 'rgba(180,83,9,.1)' : 'rgba(24,84,168,.1)',
                          color: k.status === 'active' ? '#15633c' : k.status === 'draft' ? '#b45309' : '#1854a8',
                        }}
                      >{k.status}</span>
                    </div>
                  ))}
                  {selectedKpis.length > 8 && <div className="text-[11.5px] text-t3 text-center py-1">+{selectedKpis.length - 8} more KPIs</div>}
                </div>
              )}
            </div>

            {/* People in region */}
            <div className="px-[18px] py-[14px]">
              <div className="text-[11px] font-bold text-t3 uppercase tracking-[0.5px] mb-[10px]">People ({selectedUsers.length})</div>
              {selectedUsers.length === 0 ? (
                <p className="text-xs text-t3">No employees assigned to this region.</p>
              ) : (
                <div className="flex flex-col gap-[6px]">
                  {selectedUsers.slice(0, 6).map((u) => (
                    <div key={u.id} className="flex items-center gap-[10px] px-[10px] py-[7px] bg-off rounded-[7px]">
                      <div className="w-7 h-7 rounded-full bg-[#1854a8] flex items-center justify-center text-white font-bold text-[11px] shrink-0">
                        {u.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold text-near-black">{u.full_name}</div>
                        {u.designation && <div className="text-[11px] text-t3">{u.designation}</div>}
                      </div>
                    </div>
                  ))}
                  {selectedUsers.length > 6 && <div className="text-[11.5px] text-t3 text-center py-1">+{selectedUsers.length - 6} more</div>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Add Region Modal */}
      {modalOpen && (
        <div className="modal-bg" onClick={() => setModalOpen(false)}>
          <div className="modal" style={{ width: 420, padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="m-0 text-[15px] font-black text-near-black">New Region</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="bg-transparent border-none cursor-pointer text-t3 text-[18px] leading-none p-1 font-[inherit]">×</button>
            </div>

            <div className="flex flex-col gap-[14px]">
              <div>
                <label className="flabel">Region Name</label>
                <input
                  className="fi w-full"
                  type="text"
                  placeholder="e.g. South Asia"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="flabel">Region Code</label>
                <input
                  className="fi w-full"
                  type="text"
                  placeholder="e.g. SA (auto-uppercased)"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  maxLength={10}
                />
              </div>

              {formError && (
                <div className="py-[9px] px-3 bg-[rgba(185,28,28,.07)] border border-[rgba(185,28,28,.2)] rounded-[7px] text-[12.5px] text-brand-red">
                  {formError}
                </div>
              )}

              <div className="flex gap-2 justify-end mt-1">
                <button
                  type="button"
                  className="btn btn-outline py-3 px-5 text-xs rounded-lg"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-black py-3 px-[22px] text-xs rounded-lg"
                  onClick={handleCreate}
                  disabled={saving}
                >
                  {saving ? 'Creating…' : 'Create Region'}
                </button>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
