'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import { useAuthStore } from '@/store/auth';
import { kpis, users } from '@/lib/api';

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function getPageMeta(pathname: string): { title: string; bc?: string } {
  if (pathname === '/dashboard') return { title: 'Dashboard' };
  if (pathname === '/kpis') return { title: 'My KPIs' };
  if (pathname.startsWith('/kpis/new')) return { title: 'Add KPI', bc: 'KPI Management' };
  if (pathname.startsWith('/kpis/')) return { title: 'KPI Detail' };
  if (pathname === '/org-chart') return { title: 'Org Chart', bc: 'Organization' };
  if (pathname === '/people') return { title: 'Employee Directory', bc: 'Organization' };
  if (pathname === '/templates') return { title: 'KPI Templates', bc: 'KPI Management' };
  if (pathname === '/assignments') return { title: 'KPI Assignment', bc: 'KPI Management' };
  if (pathname === '/cascade') return { title: 'Cascade KPIs', bc: 'KPI Management' };
  if (pathname === '/updates') return { title: 'KPI Progress Updates', bc: 'KPI Management' };
  if (pathname === '/approvals') return { title: 'Approval Inbox' };
  if (pathname === '/regions') return { title: 'Region Workspaces' };
  if (pathname === '/reports') return { title: 'Reports & Export' };
  if (pathname === '/permissions') return { title: 'Permission Management', bc: 'Admin' };
  return { title: 'JOOLA Track' };
}

function BellIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1.5a4.5 4.5 0 014.5 4.5v3l1 1.5H2L3 9V6A4.5 4.5 0 017.5 1.5z" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M6 12.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" fill="none" />
    </svg>
  );
}

function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [exporting, setExporting] = useState(false);

  const { title, bc } = getPageMeta(pathname);

  const handleExport = async () => {
    setExporting(true);
    try {
      if (pathname === '/people') {
        const res = await users.list({ limit: 1000 });
        const rows = res.data;
        const header = ['Employee Code', 'Full Name', 'Email', 'Designation', 'Department', 'Status'];
        const csv = [header.join(','), ...rows.map((u) =>
          [u.employee_code, `"${u.full_name}"`, u.email, u.designation ?? '', u.department ?? '', u.status].join(',')
        )].join('\n');
        downloadCsv(csv, 'employees-export.csv');
      } else if (pathname.startsWith('/kpis') || pathname === '/dashboard') {
        const res = await kpis.list({ limit: 1000 });
        const rows = res.data;
        const header = ['KPI Number', 'Name', 'Type', 'Period', 'Target', 'Current', 'Unit', 'Status', 'Start Date', 'End Date'];
        const csv = [header.join(','), ...rows.map((k) =>
          [k.kpi_number, `"${k.name}"`, k.type, k.period, k.target_value ?? '', k.current_value ?? '', k.unit ?? '', k.status, k.start_date ?? '', k.end_date ?? ''].join(',')
        )].join('\n');
        downloadCsv(csv, 'kpis-export.csv');
      } else {
        router.push('/reports');
      }
    } finally {
      setExporting(false);
    }
  };
  const initials = user?.full_name
    ? user.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div
      style={{
        height: 54,
        background: '#fff',
        borderBottom: '1px solid #e2dfd8',
        padding: '0 26px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,.08)',
      }}
    >
      <div>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#111110', letterSpacing: '-.2px' }}>
          {title}
        </span>
        {bc && (
          <div style={{ fontSize: 11, color: '#8a8580', marginTop: 1 }}>
            <span>{bc}</span>
            <span style={{ color: '#c4c0b8', margin: '0 4px' }}>›</span>
          </div>
        )}
      </div>

      {/* Right side */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Export button */}
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 6, fontSize: 12.5,
            fontFamily: 'inherit', fontWeight: 500, cursor: exporting ? 'not-allowed' : 'pointer',
            border: '1px solid #cdc9c1', background: '#fff', color: '#4a4640',
            boxShadow: '0 1px 3px rgba(0,0,0,.08)', transition: 'all .15s',
            opacity: exporting ? 0.6 : 1,
          }}
          onMouseEnter={(e) => { if (!exporting) (e.currentTarget as HTMLElement).style.background = '#eeece8'; }}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '#fff')}
        >
          {exporting ? '…' : '↓'} Export
        </button>

        {/* Notification bell */}
        <button
          style={{
            width: 34, height: 34, borderRadius: 7, background: '#f8f7f5',
            border: '1px solid #e2dfd8', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', position: 'relative',
            color: '#4a4640', transition: 'background .14s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#eeece8')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '#f8f7f5')}
        >
          <BellIcon />
          <span
            style={{
              position: 'absolute', top: 7, right: 7,
              width: 7, height: 7, borderRadius: '50%',
              background: '#b91c1c', border: '1.5px solid #fff',
            }}
          />
        </button>

        {/* User pill */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 10px 5px 6px', background: '#f8f7f5',
            border: '1px solid #e2dfd8', borderRadius: 8, cursor: 'default',
          }}
        >
          <div
            style={{
              width: 26, height: 26, borderRadius: '50%', background: '#000',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9.5, fontWeight: 800, flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#111110' }}>{user?.full_name ?? '—'}</div>
            <div style={{ fontSize: 10, color: '#8a8580' }}>{user?.is_admin ? 'Admin' : 'Member'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f5f4f1' }}>
          <Topbar />
          <main style={{ flex: 1, overflowY: 'auto' }}>
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
