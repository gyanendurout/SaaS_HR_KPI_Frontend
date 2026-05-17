'use client';

import { useEffect, useState } from 'react';
import { kpis, users, regions, type Kpi, type User, type Region } from '@/lib/api';

export default function ReportsPage() {
  const [allKpis, setAllKpis] = useState<Kpi[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([kpis.list({ limit: 200 }), users.list({ limit: 200 }), regions.list()])
      .then(([kRes, uRes, rRes]) => {
        setAllKpis(kRes.data);
        setAllUsers(uRes.data);
        setAllRegions(rRes.data);
      }).finally(() => setLoading(false));
  }, []);

  const exportCsv = async (type: string) => {
    setExporting(type);
    try {
      let rows: string[][] = [];
      let filename = '';

      if (type === 'kpis') {
        filename = 'kpis-export.csv';
        rows = [
          ['KPI Number', 'Name', 'Type', 'Period', 'Status', 'Target', 'Current', 'Unit', 'Region', 'Owner', 'Start Date', 'End Date'],
          ...allKpis.map((k) => [
            k.kpi_number, k.name, k.type, k.period, k.status,
            String(k.target_value ?? ''), String(k.current_value ?? ''), k.unit ?? '',
            allRegions.find((r) => r.id === k.region_id)?.name ?? '',
            allUsers.find((u) => u.id === k.owner_id)?.full_name ?? '',
            k.start_date ?? '', k.end_date ?? '',
          ]),
        ];
      } else if (type === 'users') {
        filename = 'employees-export.csv';
        rows = [
          ['Employee Code', 'Full Name', 'Email', 'Designation', 'Department', 'Region', 'Status', 'Joined At'],
          ...allUsers.map((u) => [
            u.employee_code, u.full_name, u.email, u.designation ?? '', u.department ?? '',
            allRegions.find((r) => r.id === u.region_id)?.name ?? '',
            u.status, u.joined_at ?? '',
          ]),
        ];
      } else if (type === 'progress') {
        filename = 'kpi-progress-export.csv';
        const withProgress = allKpis.filter((k) => k.current_value !== null && k.target_value !== null);
        rows = [
          ['KPI Number', 'Name', 'Target', 'Current', 'Unit', 'Progress %', 'Status', 'Owner'],
          ...withProgress.map((k) => {
            const pct = k.target_value ? Math.round(((k.current_value ?? 0) / k.target_value) * 100) : 0;
            return [k.kpi_number, k.name, String(k.target_value), String(k.current_value), k.unit ?? '', `${pct}%`, k.status, allUsers.find((u) => u.id === k.owner_id)?.full_name ?? ''];
          }),
        ];
      }

      const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  };

  const activeKpis = allKpis.filter((k) => k.status === 'active');
  const kpisWithProgress = allKpis.filter((k) => k.current_value !== null && k.target_value !== null);
  const avgProgress = kpisWithProgress.length > 0
    ? Math.round(kpisWithProgress.reduce((sum, k) => sum + ((k.current_value ?? 0) / (k.target_value ?? 1)) * 100, 0) / kpisWithProgress.length)
    : 0;

  const EXPORT_CARDS = [
    {
      id: 'kpis', label: 'All KPIs Export', desc: 'Full KPI list with targets, values, owners, and status', count: allKpis.length, unit: 'KPIs', color: '#1854a8', icon: '📊',
    },
    {
      id: 'progress', label: 'KPI Progress Report', desc: 'KPIs with current vs target values and completion %', count: kpisWithProgress.length, unit: 'with data', color: '#1a7a4a', icon: '📈',
    },
    {
      id: 'users', label: 'Employee Directory Export', desc: 'All employee records with department and region', count: allUsers.length, unit: 'employees', color: '#b45309', icon: '👥',
    },
  ];

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, color: '#8a8580', fontSize: 13 }}>Loading…</div>;

  return (
    <div style={{ padding: '22px 26px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', marginBottom: 3, color: '#111110' }}>Reports & Exports</div>
        <div style={{ fontSize: 12, color: '#8a8580' }}>Generate and download reports across KPIs, employees, and progress metrics</div>
      </div>

      {/* Summary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Total KPIs', value: allKpis.length, color: '#111110' },
          { label: 'Active KPIs', value: activeKpis.length, color: '#1a7a4a' },
          { label: 'Avg Progress', value: `${avgProgress}%`, color: avgProgress >= 80 ? '#1a7a4a' : avgProgress >= 50 ? '#1854a8' : '#b45309' },
          { label: 'Employees', value: allUsers.length, color: '#111110' },
          { label: 'Regions', value: allRegions.length, color: '#111110' },
        ].map((stat) => (
          <div key={stat.label} style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#8a8580', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{stat.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, letterSpacing: '-.5px' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Export cards */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#4a4640', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12 }}>Export Data</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {EXPORT_CARDS.map((card) => (
            <div key={card.id} style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderTop: `3px solid ${card.color}`, borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 18, marginBottom: 6 }}>{card.icon}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111110', marginBottom: 4 }}>{card.label}</div>
                  <p style={{ fontSize: 12, color: '#8a8580', margin: 0, lineHeight: 1.5 }}>{card.desc}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                <span style={{ fontSize: 12, color: '#8a8580' }}><strong style={{ color: '#111110' }}>{card.count}</strong> {card.unit}</span>
                <button type="button"
                  onClick={() => exportCsv(card.id)}
                  disabled={exporting === card.id}
                  style={{ padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: exporting === card.id ? 'not-allowed' : 'pointer', background: card.color, color: '#fff', border: 'none', fontFamily: 'inherit', opacity: exporting === card.id ? .6 : 1, transition: 'opacity .13s' }}>
                  {exporting === card.id ? 'Exporting…' : '↓ Export CSV'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Region breakdown table */}
      <div style={{ background: '#fff', border: '1px solid #e2dfd8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 18 }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid #e2dfd8' }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#111110' }}>Region Performance Breakdown</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #e2dfd8', background: '#f0efec' }}>
                {['Region', 'Total KPIs', 'Active', 'Draft', 'Completed', 'People', 'Avg Progress'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#8a8580', textTransform: 'uppercase', letterSpacing: 1, padding: '9px 14px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allRegions.map((region) => {
                const rKpis = allKpis.filter((k) => k.region_id === region.id);
                const rUsers = allUsers.filter((u) => u.region_id === region.id);
                const withProg = rKpis.filter((k) => k.current_value !== null && k.target_value !== null);
                const avgProg = withProg.length > 0
                  ? Math.round(withProg.reduce((sum, k) => sum + ((k.current_value ?? 0) / (k.target_value ?? 1)) * 100, 0) / withProg.length)
                  : null;
                return (
                  <tr key={region.id} style={{ borderBottom: '1px solid #e2dfd8' }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = '#f8f7f5'}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111110' }}>{region.name}</div>
                      <div style={{ fontSize: 10.5, color: '#8a8580', fontFamily: 'monospace' }}>{region.code}</div>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#111110' }}>{rKpis.length}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12.5, color: '#15633c', fontWeight: 600 }}>{rKpis.filter((k) => k.status === 'active').length}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12.5, color: '#b45309', fontWeight: 600 }}>{rKpis.filter((k) => k.status === 'draft').length}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12.5, color: '#1854a8', fontWeight: 600 }}>{rKpis.filter((k) => k.status === 'completed').length}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12.5, color: '#4a4640' }}>{rUsers.length}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {avgProg !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: '#e2dfd8', borderRadius: 2, minWidth: 60 }}>
                            <div style={{ width: `${Math.min(100, avgProg)}%`, height: '100%', background: avgProg >= 80 ? '#1a7a4a' : avgProg >= 50 ? '#1854a8' : '#b45309', borderRadius: 2, transition: 'width .3s' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: avgProg >= 80 ? '#15633c' : avgProg >= 50 ? '#1854a8' : '#b45309', whiteSpace: 'nowrap' }}>{avgProg}%</span>
                        </div>
                      ) : (
                        <span style={{ color: '#c4c0b8', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {allRegions.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '32px 14px', textAlign: 'center', fontSize: 13, color: '#8a8580' }}>No regions configured</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit log note */}
      <div style={{ background: '#f8f7f5', border: '1px solid #e2dfd8', borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#4a4640', marginBottom: 3 }}>Audit Log</div>
          <div style={{ fontSize: 12, color: '#8a8580' }}>Full audit trail (KPI creates, updates, approvals, cascades, user changes) is stored in the backend. Contact your administrator to access audit logs or set up automated reporting exports.</div>
        </div>
      </div>
    </div>
  );
}
