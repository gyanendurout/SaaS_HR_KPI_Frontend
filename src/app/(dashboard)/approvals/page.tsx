'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { kpis, type Kpi } from '@/lib/api';

export default function ApprovalsPage() {
  const [data, setData] = useState<Kpi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    kpis.list({ status: 'draft', limit: 100 })
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const handleActivate = async (id: string) => {
    await kpis.update(id, { status: 'active' });
    setData((prev) => prev.filter((k) => k.id !== id));
  };

  const handleReject = async (id: string) => {
    if (!confirm('Cancel this KPI?')) return;
    await kpis.cancel(id);
    setData((prev) => prev.filter((k) => k.id !== id));
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--near-black)' }}>Approvals</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>
          Draft KPIs pending activation · {data.length} pending
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-sm" style={{ color: 'var(--t3)' }}>Loading…</p>
        </div>
      ) : data.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ border: '2px dashed var(--border)', background: 'var(--off)' }}
        >
          <p className="text-2xl mb-2">✓</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>All caught up</p>
          <p className="text-xs mt-1" style={{ color: 'var(--t3)' }}>No KPIs pending approval</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((k) => (
            <div
              key={k.id}
              className="rounded-xl p-5 flex items-start justify-between gap-4"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono" style={{ color: 'var(--t3)' }}>{k.kpi_number}</span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(180,83,9,.1)', color: '#b45309' }}
                  >
                    draft
                  </span>
                </div>
                <Link href={`/kpis/${k.id}`} className="font-semibold text-sm hover:underline" style={{ color: 'var(--t1)' }}>
                  {k.name}
                </Link>
                {k.description && (
                  <p className="text-xs mt-1 truncate" style={{ color: 'var(--t3)' }}>{k.description}</p>
                )}
                <div className="flex flex-wrap gap-3 mt-2">
                  <span className="text-xs capitalize" style={{ color: 'var(--t3)' }}>{k.type}</span>
                  <span className="text-xs capitalize" style={{ color: 'var(--t3)' }}>{k.period}</span>
                  {k.target_value && (
                    <span className="text-xs" style={{ color: 'var(--t3)' }}>
                      Target: {k.target_value.toLocaleString()} {k.unit}
                    </span>
                  )}
                  <span className="text-xs" style={{ color: 'var(--t3)' }}>
                    Created: {new Date(k.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleActivate(k.id)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(26,122,74,.1)', color: '#1a7a4a', border: '1px solid rgba(26,122,74,.2)' }}
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => handleReject(k.id)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(185,28,28,.06)', color: '#b91c1c', border: '1px solid rgba(185,28,28,.2)' }}
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
