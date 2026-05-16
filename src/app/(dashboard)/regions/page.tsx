'use client';

import { useEffect, useState } from 'react';
import { regions, kpis, users, type Region, type Kpi, type User } from '@/lib/api';

export default function RegionsPage() {
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [allKpis, setAllKpis] = useState<Kpi[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);

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

  const REGION_COLORS = ['#1a7a4a', '#1854a8', '#b45309', '#7c3aed', '#b91c1c', '#0e7490', '#92400e'];

  const getRegionColor = (idx: number) => REGION_COLORS[idx % REGION_COLORS.length];

  const parentRegions = allRegions.filter((r) => !r.parent_id);
  const childRegions = (parentId: string) => allRegions.filter((r) => r.parent_id === parentId);

  const selectedKpis = selectedRegion ? allKpis.filter((k) => k.region_id === selectedRegion.id) : [];
  const selectedUsers = selectedRegion ? allUsers.filter((u) => u.region_id === selectedRegion.id) : [];

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, color: '#8a8580', fontSize: 13 }}>Loading…</div>;

  return (
    <div style={{ padding: '22px 26px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', marginBottom: 3, color: '#111110' }}>Regions & Workspaces</div>
        <div style={{ fontSize: 12, color: '#8a8580' }}>KPI performance by region — {allRegions.length} region{allRegions.length !== 1 ? 's' : ''} · {allKpis.filter((k) => k.status !== 'cancelled').length} active KPIs total</div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total Regions', value: allRegions.length, color: '#111110' },
          { label: 'Total KPIs', value: allKpis.filter((k) => k.status !== 'cancelled').length, color: '#111110' },
          { label: 'Active KPIs', value: allKpis.filter((k) => k.status === 'active').length, color: '#1a7a4a' },
          { label: 'Pending Approval', value: allKpis.filter((k) => k.status === 'draft').length, color: '#b45309' },
        ].map((stat) => (
          <div key={stat.label} style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 10, padding: '12px 14px', boxShadow: '0 1px 2px rgba(0,0,0,.04)' }}>
            <div style={{ fontSize: 11, color: '#8a8580', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{stat.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, letterSpacing: '-.5px' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedRegion ? '1fr 1.1fr' : '1fr', gap: 16 }}>
        {/* Region cards */}
        <div>
          {allRegions.length === 0 ? (
            <div style={{ border: '2px dashed #e2dfd8', borderRadius: 14, padding: '48px 20px', textAlign: 'center', background: '#f8f7f5' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#4a4640', marginBottom: 4 }}>No regions configured</p>
              <p style={{ fontSize: 12, color: '#8a8580' }}>Contact your administrator to set up regions.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(parentRegions.length > 0 ? parentRegions : allRegions).map((region, idx) => {
                const stats = regionStats(region);
                const color = getRegionColor(idx);
                const isSelected = selectedRegion?.id === region.id;
                const children = childRegions(region.id);
                return (
                  <div key={region.id}>
                    <div
                      onClick={() => setSelectedRegion(isSelected ? null : region)}
                      style={{ background: '#fff', border: `1.5px solid ${isSelected ? color : '#e2dfd8'}`, borderLeft: `4px solid ${color}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', boxShadow: isSelected ? `0 0 0 2px ${color}30` : '0 1px 3px rgba(0,0,0,.06)', transition: 'all .14s' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111110', letterSpacing: '-.1px', marginBottom: 2 }}>{region.name}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#8a8580', letterSpacing: '.5px', fontFamily: 'monospace' }}>{region.code}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                          {children.length > 0 && (
                            <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: '#f0efec', color: '#8a8580' }}>{children.length} sub-regions</span>
                          )}
                          <span style={{ fontSize: 11, color: isSelected ? color : '#8a8580', fontWeight: 700 }}>{isSelected ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                        {[
                          { label: 'Total', value: stats.total },
                          { label: 'Active', value: stats.active, color: '#1a7a4a' },
                          { label: 'Draft', value: stats.draft, color: '#b45309' },
                          { label: 'People', value: stats.users },
                        ].map((s) => (
                          <div key={s.label} style={{ background: '#f8f7f5', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: s.color ?? '#111110' }}>{s.value}</div>
                            <div style={{ fontSize: 9.5, color: '#8a8580', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Sub-regions */}
                    {children.length > 0 && (
                      <div style={{ marginLeft: 20, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {children.map((child, ci) => {
                          const cStats = regionStats(child);
                          const cColor = getRegionColor(idx + ci + 1);
                          const cSelected = selectedRegion?.id === child.id;
                          return (
                            <div key={child.id} onClick={() => setSelectedRegion(cSelected ? null : child)}
                              style={{ background: '#fff', border: `1.5px solid ${cSelected ? cColor : '#e2dfd8'}`, borderLeft: `3px solid ${cColor}`, borderRadius: 8, padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                              <div>
                                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#111110' }}>{child.name}</span>
                                <span style={{ fontSize: 10.5, color: '#8a8580', marginLeft: 8, fontFamily: 'monospace' }}>{child.code}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ fontSize: 11.5, color: '#4a4640', fontWeight: 600 }}>{cStats.total} KPIs</span>
                                <span style={{ fontSize: 11.5, color: '#8a8580' }}>{cStats.users} people</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Region detail panel */}
        {selectedRegion && (
          <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.07)', height: 'fit-content' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2dfd8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111110' }}>{selectedRegion.name}</div>
                <div style={{ fontSize: 11, color: '#8a8580', fontFamily: 'monospace', marginTop: 2 }}>{selectedRegion.code}</div>
              </div>
              <button onClick={() => setSelectedRegion(null)} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid #e2dfd8', background: '#f8f7f5', cursor: 'pointer', color: '#8a8580', fontSize: 12, fontFamily: 'inherit' }}>Close</button>
            </div>

            {/* KPIs in region */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2dfd8' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8a8580', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>KPIs ({selectedKpis.length})</div>
              {selectedKpis.length === 0 ? (
                <p style={{ fontSize: 12, color: '#8a8580' }}>No KPIs in this region.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {selectedKpis.slice(0, 8).map((k) => (
                    <div key={k.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#f8f7f5', borderRadius: 7 }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: '#e4e1db', color: '#4a4640', marginRight: 6 }}>{k.kpi_number}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#111110' }}>{k.name}</span>
                      </div>
                      <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 600, flexShrink: 0, marginLeft: 8, background: k.status === 'active' ? 'rgba(26,122,74,.1)' : k.status === 'draft' ? 'rgba(180,83,9,.1)' : 'rgba(24,84,168,.1)', color: k.status === 'active' ? '#15633c' : k.status === 'draft' ? '#b45309' : '#1854a8' }}>{k.status}</span>
                    </div>
                  ))}
                  {selectedKpis.length > 8 && <div style={{ fontSize: 11.5, color: '#8a8580', textAlign: 'center', padding: '4px 0' }}>+{selectedKpis.length - 8} more KPIs</div>}
                </div>
              )}
            </div>

            {/* People in region */}
            <div style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8a8580', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>People ({selectedUsers.length})</div>
              {selectedUsers.length === 0 ? (
                <p style={{ fontSize: 12, color: '#8a8580' }}>No employees assigned to this region.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedUsers.slice(0, 6).map((u) => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: '#f8f7f5', borderRadius: 7 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1854a8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                        {u.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111110' }}>{u.full_name}</div>
                        {u.designation && <div style={{ fontSize: 11, color: '#8a8580' }}>{u.designation}</div>}
                      </div>
                    </div>
                  ))}
                  {selectedUsers.length > 6 && <div style={{ fontSize: 11.5, color: '#8a8580', textAlign: 'center', padding: '4px 0' }}>+{selectedUsers.length - 6} more</div>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
