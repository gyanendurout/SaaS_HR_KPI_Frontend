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

  const kpisWithProgress = allKpis.filter((k) => k.current_value !== null && k.target_value !== null);

  const EXPORT_CARDS = [
    { id: 'kpis',     label: 'All KPIs Export',           desc: 'Full KPI list with targets, values, owners, and status',      count: allKpis.length,         unit: 'KPIs',        color: '#1854a8' },
    { id: 'progress', label: 'KPI Progress Report',        desc: 'KPIs with current vs target values and completion %',         count: kpisWithProgress.length, unit: 'with data',   color: '#1a7a4a' },
    { id: 'users',    label: 'Employee Directory Export',  desc: 'All employee records with department and region',             count: allUsers.length,         unit: 'employees',   color: '#b45309' },
  ];

  if (loading) return <div className="flex items-center justify-center h-64 text-t3 text-[13px]">Loading…</div>;

  return (
    <div className="px-6.5 py-5.5">
      {/* Export cards */}
      <div className="mb-6">
        <div className="text-[12.5px] font-bold text-t2 uppercase tracking-[0.5px] mb-3">Export Data</div>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {EXPORT_CARDS.map((card) => (
            <div key={card.id}
              className="bg-white border-[1.5px] border-border rounded-xl px-4.5 py-4 shadow-[0_1px_3px_rgba(0,0,0,.06)]"
              style={{ borderTop: `3px solid ${card.color}` }}>
              <div className="flex items-start justify-between mb-2.5">
                <div>
                  <div className="text-[13.5px] font-bold text-near-black mb-1">{card.label}</div>
                  <p className="text-xs text-t3 m-0 leading-relaxed">{card.desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3.5">
                <span className="text-xs text-t3">
                  <strong className="text-near-black">{card.count}</strong> {card.unit}
                </span>
                <button type="button"
                  onClick={() => exportCsv(card.id)}
                  disabled={exporting === card.id}
                  className="py-[7px] px-3.5 rounded-[7px] text-xs font-semibold text-white border-none font-[inherit] transition-opacity duration-[130ms] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  style={{ background: card.color }}>
                  {exporting === card.id ? 'Exporting…' : '↓ Export CSV'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Region breakdown table */}
      <div className="bg-white border border-border rounded-[14px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,.06)] mb-4.5">
        <div className="px-4.5 py-[13px] border-b border-border">
          <span className="text-[13.5px] font-bold text-near-black">Region Performance Breakdown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-[1.5px] border-border bg-[#f0efec]">
                {['Region', 'Total KPIs', 'Active', 'Draft', 'Completed', 'People', 'Avg Progress'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-bold text-t3 uppercase tracking-widest py-[9px] px-3.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allRegions.map((region) => {
                const rKpis  = allKpis.filter((k) => k.region_id === region.id);
                const rUsers = allUsers.filter((u) => u.region_id === region.id);
                const withProg = rKpis.filter((k) => k.current_value !== null && k.target_value !== null);
                const avgProg  = withProg.length > 0
                  ? Math.round(withProg.reduce((sum, k) => sum + ((k.current_value ?? 0) / (k.target_value ?? 1)) * 100, 0) / withProg.length)
                  : null;
                return (
                  <tr key={region.id} className="border-b border-border transition-colors duration-100 hover:bg-off">
                    <td className="py-2.5 px-3.5">
                      <div className="text-[13px] font-bold text-near-black">{region.name}</div>
                      <div className="text-[10.5px] text-t3 font-mono">{region.code}</div>
                    </td>
                    <td className="py-2.5 px-3.5 text-[13px] font-bold text-near-black">{rKpis.length}</td>
                    <td className="py-2.5 px-3.5 text-[12.5px] font-semibold text-[#15633c]">{rKpis.filter((k) => k.status === 'active').length}</td>
                    <td className="py-2.5 px-3.5 text-[12.5px] font-semibold text-brand-amber">{rKpis.filter((k) => k.status === 'draft').length}</td>
                    <td className="py-2.5 px-3.5 text-[12.5px] font-semibold text-brand-blue">{rKpis.filter((k) => k.status === 'completed').length}</td>
                    <td className="py-2.5 px-3.5 text-[12.5px] text-t2">{rUsers.length}</td>
                    <td className="py-2.5 px-3.5">
                      {avgProg !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-border rounded-sm min-w-[60px]">
                            <div className="h-full rounded-sm transition-[width] duration-300"
                              style={{ width: `${Math.min(100, avgProg)}%`, background: avgProg >= 80 ? '#1a7a4a' : avgProg >= 50 ? '#1854a8' : '#b45309' }} />
                          </div>
                          <span className="text-xs font-bold whitespace-nowrap"
                            style={{ color: avgProg >= 80 ? '#15633c' : avgProg >= 50 ? '#1854a8' : '#b45309' }}>
                            {avgProg}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-t4">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {allRegions.length === 0 && (
                <tr><td colSpan={7} className="py-8 px-3.5 text-center text-[13px] text-t3">No regions configured</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
