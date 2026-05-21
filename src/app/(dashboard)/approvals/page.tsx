'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { approvals, type Approval } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

type TabId = 'pending' | 'approved' | 'rejected' | 'all';

const TAB_BORDER: Record<TabId, string> = {
  pending:  '#b45309',
  approved: '#1a7a4a',
  rejected: '#b91c1c',
  all:      '#4a4640',
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending:  { bg: 'rgba(180,83,9,.1)',    color: '#b45309' },
  approved: { bg: 'rgba(26,122,74,.1)',   color: '#15633c' },
  rejected: { bg: 'rgba(185,28,28,.1)',   color: '#b91c1c' },
};

export default function ApprovalsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [data, setData]       = useState<Approval[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('pending');
  const [actioning, setActioning] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [noteTarget, setNoteTarget] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const LIMIT = 30;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const status = activeTab === 'all' ? undefined : activeTab;
      const res = await approvals.list({ limit: LIMIT, status });
      setData(res.data);
      setTotal(res.total);
    } catch (e: unknown) {
      setData([]);
      setTotal(0);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('schema cache') || msg.includes('does not exist')) {
        setLoadError('schema_missing');
      } else {
        setLoadError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string) => {
    setActioning(id);
    try {
      await approvals.approve(id, reviewNote || undefined);
      setNoteTarget(null);
      setReviewNote('');
      load();
    } finally { setActioning(null); }
  };

  const handleReject = async (id: string) => {
    setActioning(id);
    try {
      await approvals.reject(id, reviewNote || undefined);
      setNoteTarget(null);
      setReviewNote('');
      load();
    } finally { setActioning(null); }
  };

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'pending',  label: 'Pending',  count: activeTab === 'pending'  ? total : undefined },
    { id: 'approved', label: 'Approved', count: activeTab === 'approved' ? total : undefined },
    { id: 'rejected', label: 'Rejected', count: activeTab === 'rejected' ? total : undefined },
    { id: 'all',      label: 'All',      count: activeTab === 'all'      ? total : undefined },
  ];

  return (
    <div className="px-[26px] py-[22px]">
      <div className="mb-[18px]">
        <div className="text-[15px] font-black tracking-[-0.2px] mb-[3px] text-near-black">
          Approval Inbox
        </div>
        <div className="text-xs text-t3">
          KPI approval requests — review, approve, or reject below
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-border mb-[18px]">
        {tabs.map((t) => (
          <button type="button"
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-[6px] px-[18px] py-[9px] text-[13px] border-none bg-transparent cursor-pointer font-[inherit] transition-all duration-[140ms] -mb-[2px]"
            style={{
              fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? '#000' : '#4a4640',
              borderBottom: `2.5px solid ${activeTab === t.id ? '#000' : 'transparent'}`,
            }}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="text-[10.5px] font-bold px-[7px] py-[2px] rounded-[10px]"
                style={{
                  background: activeTab === t.id
                    ? (t.id === 'pending' ? '#b45309' : t.id === 'approved' ? '#1a7a4a' : t.id === 'rejected' ? '#b91c1c' : '#000')
                    : '#e8e6e1',
                  color: activeTab === t.id ? '#fff' : '#8a8580',
                }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Note modal */}
      {noteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setNoteTarget(null)}
        >
          <div className="w-full max-w-[440px] bg-white rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,.2)]">
            <div className="flex items-center justify-between px-[22px] py-[18px] border-b border-border">
              <span className="font-black text-sm" style={{ color: noteTarget.action === 'approve' ? '#15633c' : '#b91c1c' }}>
                {noteTarget.action === 'approve' ? '✓ Approve KPI' : '✕ Reject KPI'}
              </span>
              <button type="button" onClick={() => setNoteTarget(null)} className="text-[18px] text-t3 border-none bg-none cursor-pointer leading-none">×</button>
            </div>
            <div className="px-[22px] py-[18px]">
              <label className="block text-[11px] font-bold text-t2 mb-[6px] uppercase tracking-[0.4px]">
                Reviewer Note (optional)
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Add a comment for the requester…"
                rows={3}
                className="w-full border-[1.5px] border-border rounded-lg px-3 py-[9px] font-[inherit] text-[13px] resize-y outline-none text-near-black box-border transition-[border-color] duration-[180ms] focus:border-black"
              />
            </div>
            <div className="flex gap-2 justify-end px-[22px] py-[14px] border-t border-border">
              <button type="button" onClick={() => setNoteTarget(null)}
                className="px-4 py-2 rounded-[7px] text-[13px] font-semibold border border-border bg-white cursor-pointer font-[inherit] text-t2">
                Cancel
              </button>
              <button type="button"
                disabled={actioning === noteTarget.id}
                onClick={() => noteTarget.action === 'approve' ? handleApprove(noteTarget.id) : handleReject(noteTarget.id)}
                className="px-[18px] py-2 rounded-[7px] text-[13px] font-bold border-none text-white font-[inherit] transition-opacity duration-[140ms] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: noteTarget.action === 'approve' ? '#1a7a4a' : '#b91c1c' }}
              >
                {actioning === noteTarget.id ? 'Processing…' : noteTarget.action === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-[13px] text-t3">Loading…</p>
        </div>
      ) : loadError === 'schema_missing' ? (
        <div className="border border-[rgba(180,83,9,.25)] border-l-4 border-l-[#b45309] rounded-xl px-[22px] py-5 bg-[rgba(180,83,9,.04)]">
          <p className="text-[13px] font-bold text-[#b45309] mb-[6px]">
            Database migration required
          </p>
          <p className="text-[12.5px] text-t2 mb-3 leading-relaxed">
            The <code className="bg-[#f0efec] px-[5px] py-px rounded text-[11.5px] font-mono">approvals</code> table doesn&apos;t exist yet.
            Run migration <strong>004_approvals_notifications_audit.sql</strong> in your Supabase SQL editor to enable this feature.
          </p>
          <p className="text-[11.5px] text-t3 font-mono bg-off px-3 py-2 rounded-md border border-border m-0">
            joola-track-api/database/004_approvals_notifications_audit.sql
          </p>
        </div>
      ) : loadError ? (
        <div className="border border-[rgba(185,28,28,.2)] rounded-xl px-[18px] py-4 bg-[rgba(185,28,28,.04)] text-[12.5px] text-brand-red">
          Failed to load approvals: {loadError}
        </div>
      ) : data.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-[14px] py-12 px-5 text-center bg-off">
          <p className="text-sm font-semibold text-t2 mb-1">
            {activeTab === 'pending' ? 'All caught up — no pending approvals' : `No ${activeTab} approvals`}
          </p>
          <p className="text-xs text-t3">
            {activeTab === 'pending' ? 'Submit a KPI for approval from the KPI detail page.' : ''}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {data.map((a) => (
            <ApprovalCard
              key={a.id}
              approval={a}
              isAdmin={!!currentUser?.is_admin}
              actioning={actioning === a.id}
              onApprove={() => setNoteTarget({ id: a.id, action: 'approve' })}
              onReject={()  => setNoteTarget({ id: a.id, action: 'reject' })}
            />
          ))}
        </div>
      )}

      {total > LIMIT && (
        <p className="mt-[14px] text-xs text-t3 text-center">
          Showing {LIMIT} of {total} · Use filters for more
        </p>
      )}
    </div>
  );
}

function ApprovalCard({
  approval, isAdmin, actioning, onApprove, onReject,
}: {
  approval: Approval;
  isAdmin: boolean;
  actioning: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const s = STATUS_STYLE[approval.status] ?? { bg: 'rgba(0,0,0,.05)', color: '#8a8580' };
  const borderColor = TAB_BORDER[approval.status as TabId] ?? '#cdc9c1';

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,.06)]"
      style={{
        borderTop: '1.5px solid #e2dfd8', borderRight: '1.5px solid #e2dfd8',
        borderBottom: '1.5px solid #e2dfd8', borderLeft: `4px solid ${borderColor}`,
      }}>
      <div className="flex items-start justify-between gap-4 px-[18px] py-[14px]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-[6px]">
            <span className="font-mono text-[10px] font-bold px-[6px] py-[2px] rounded bg-[#e4e1db] text-t2">
              {approval.kpis?.kpi_number ?? '—'}
            </span>
            <span className="inline-flex px-2 py-[2.5px] rounded text-[11px] font-semibold"
              style={{ background: s.bg, color: s.color }}>
              {approval.status}
            </span>
          </div>

          <Link
            href={`/kpis/${approval.kpi_id}`}
            className="text-sm font-bold text-near-black no-underline tracking-[-0.1px] block mb-[5px] hover:underline"
          >
            {approval.kpis?.name ?? 'KPI'}
          </Link>

          {approval.note && (
            <p className="text-xs text-t2 m-0 mb-[6px] leading-relaxed italic">
              &ldquo;{approval.note}&rdquo;
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <span className="text-[11.5px] text-t3">
              Requested by <strong className="text-t2">{approval.requester?.full_name ?? '—'}</strong>
            </span>
            <span className="text-[11.5px] text-t3">
              {new Date(approval.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {approval.reviewed_at && (
              <span className="text-[11.5px] text-t3">
                Reviewed by <strong className="text-t2">{approval.reviewer?.full_name ?? '—'}</strong>
              </span>
            )}
          </div>

          {approval.reviewer_note && (
            <p className="text-[11.5px] text-t3 mt-[6px] mb-0 px-[10px] py-[6px] bg-off rounded-md border-l-[3px] border-border">
              {approval.reviewer_note}
            </p>
          )}
        </div>

        {isAdmin && approval.status === 'pending' && (
          <div className="flex gap-[7px] shrink-0">
            <button type="button"
              onClick={onApprove}
              disabled={actioning}
              className="px-[14px] py-[7px] rounded-md text-[12.5px] font-semibold border border-[rgba(26,122,74,.2)] bg-[rgba(26,122,74,.1)] text-[#15633c] font-[inherit] transition-all duration-[140ms] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:bg-[rgba(26,122,74,.18)]"
            >
              ✓ Approve
            </button>
            <button type="button"
              onClick={onReject}
              disabled={actioning}
              className="px-[14px] py-[7px] rounded-md text-[12.5px] font-semibold border border-[rgba(185,28,28,.2)] bg-[rgba(185,28,28,.06)] text-brand-red font-[inherit] transition-all duration-[140ms] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:bg-[rgba(185,28,28,.12)]"
            >
              ✕ Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
