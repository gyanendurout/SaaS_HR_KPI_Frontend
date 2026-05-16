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
  const LIMIT = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = activeTab === 'all' ? undefined : activeTab;
      const res = await approvals.list({ limit: LIMIT, status });
      setData(res.data);
      setTotal(res.total);
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

  const pendingCount = data.filter((a) => a.status === 'pending').length;

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'pending',  label: 'Pending',  count: activeTab === 'pending'  ? total : undefined },
    { id: 'approved', label: 'Approved', count: activeTab === 'approved' ? total : undefined },
    { id: 'rejected', label: 'Rejected', count: activeTab === 'rejected' ? total : undefined },
    { id: 'all',      label: 'All',      count: activeTab === 'all'      ? total : undefined },
  ];

  return (
    <div style={{ padding: '22px 26px' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', marginBottom: 3, color: '#111110' }}>
          Approval Inbox
        </div>
        <div style={{ fontSize: 12, color: '#8a8580' }}>
          KPI approval requests — review, approve, or reject below
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2dfd8', marginBottom: 18 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '9px 18px', fontSize: 13, fontWeight: activeTab === t.id ? 700 : 500,
              cursor: 'pointer', border: 'none', background: 'none',
              color: activeTab === t.id ? '#000' : '#4a4640', fontFamily: 'inherit',
              borderBottom: `2.5px solid ${activeTab === t.id ? '#000' : 'transparent'}`,
              marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6, transition: 'all .14s',
            }}
          >
            {t.label}
            {t.count !== undefined && (
              <span style={{
                fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                background: activeTab === t.id ? (t.id === 'pending' ? '#b45309' : t.id === 'approved' ? '#1a7a4a' : t.id === 'rejected' ? '#b91c1c' : '#000') : '#e8e6e1',
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
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => e.target === e.currentTarget && setNoteTarget(null)}
        >
          <div style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2dfd8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: noteTarget.action === 'approve' ? '#15633c' : '#b91c1c' }}>
                {noteTarget.action === 'approve' ? '✓ Approve KPI' : '✕ Reject KPI'}
              </span>
              <button onClick={() => setNoteTarget(null)} style={{ fontSize: 18, color: '#8a8580', border: 'none', background: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '18px 22px' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4a4640', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                Reviewer Note (optional)
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Add a comment for the requester…"
                rows={3}
                style={{ width: '100%', border: '1.5px solid #e2dfd8', borderRadius: 8, padding: '9px 12px', fontFamily: 'inherit', fontSize: 13, resize: 'vertical', outline: 'none', color: '#111110', boxSizing: 'border-box' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#000')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#e2dfd8')}
              />
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid #e2dfd8', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setNoteTarget(null)} style={{ padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600, border: '1px solid #e2dfd8', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', color: '#4a4640' }}>
                Cancel
              </button>
              <button
                disabled={actioning === noteTarget.id}
                onClick={() => noteTarget.action === 'approve' ? handleApprove(noteTarget.id) : handleReject(noteTarget.id)}
                style={{
                  padding: '8px 18px', borderRadius: 7, fontSize: 13, fontWeight: 700, border: 'none',
                  background: noteTarget.action === 'approve' ? '#1a7a4a' : '#b91c1c',
                  color: '#fff', cursor: actioning === noteTarget.id ? 'not-allowed' : 'pointer',
                  opacity: actioning === noteTarget.id ? .6 : 1, fontFamily: 'inherit',
                }}
              >
                {actioning === noteTarget.id ? 'Processing…' : noteTarget.action === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
          <p style={{ fontSize: 13, color: '#8a8580' }}>Loading…</p>
        </div>
      ) : data.length === 0 ? (
        <div style={{ border: '2px dashed #e2dfd8', borderRadius: 14, padding: '48px 20px', textAlign: 'center', background: '#f8f7f5' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#4a4640', marginBottom: 4 }}>
            {activeTab === 'pending' ? 'All caught up — no pending approvals' : `No ${activeTab} approvals`}
          </p>
          <p style={{ fontSize: 12, color: '#8a8580' }}>
            {activeTab === 'pending' ? 'Submit a KPI for approval from the KPI detail page.' : ''}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
        <p style={{ marginTop: 14, fontSize: 12, color: '#8a8580', textAlign: 'center' }}>
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
    <div style={{
      background: '#fff', border: '1.5px solid #e2dfd8',
      borderLeft: `4px solid ${borderColor}`,
      borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: '#e4e1db', color: '#4a4640' }}>
              {approval.kpis?.kpi_number ?? '—'}
            </span>
            <span style={{ display: 'inline-flex', padding: '2.5px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
              {approval.status}
            </span>
          </div>

          <Link
            href={`/kpis/${approval.kpi_id}`}
            style={{ fontSize: 14, fontWeight: 700, color: '#111110', textDecoration: 'none', letterSpacing: '-.1px', display: 'block', marginBottom: 5 }}
          >
            {approval.kpis?.name ?? 'KPI'}
          </Link>

          {approval.note && (
            <p style={{ fontSize: 12, color: '#4a4640', margin: '0 0 6px', lineHeight: 1.5, fontStyle: 'italic' }}>
              &ldquo;{approval.note}&rdquo;
            </p>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 11.5, color: '#8a8580' }}>
              Requested by <strong style={{ color: '#4a4640' }}>{approval.requester?.full_name ?? '—'}</strong>
            </span>
            <span style={{ fontSize: 11.5, color: '#8a8580' }}>
              {new Date(approval.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {approval.reviewed_at && (
              <span style={{ fontSize: 11.5, color: '#8a8580' }}>
                Reviewed by <strong style={{ color: '#4a4640' }}>{approval.reviewer?.full_name ?? '—'}</strong>
              </span>
            )}
          </div>

          {approval.reviewer_note && (
            <p style={{ fontSize: 11.5, color: '#8a8580', margin: '6px 0 0', padding: '6px 10px', background: '#f8f7f5', borderRadius: 6, borderLeft: '3px solid #e2dfd8' }}>
              {approval.reviewer_note}
            </p>
          )}
        </div>

        {isAdmin && approval.status === 'pending' && (
          <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
            <button
              onClick={onApprove}
              disabled={actioning}
              style={{
                padding: '7px 14px', borderRadius: 6, fontSize: 12.5, fontWeight: 600,
                cursor: actioning ? 'not-allowed' : 'pointer',
                background: 'rgba(26,122,74,.1)', color: '#15633c',
                border: '1px solid rgba(26,122,74,.2)', fontFamily: 'inherit',
                opacity: actioning ? .5 : 1, transition: 'all .14s',
              }}
              onMouseEnter={(e) => { if (!actioning) (e.currentTarget as HTMLElement).style.background = 'rgba(26,122,74,.18)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(26,122,74,.1)'; }}
            >
              ✓ Approve
            </button>
            <button
              onClick={onReject}
              disabled={actioning}
              style={{
                padding: '7px 14px', borderRadius: 6, fontSize: 12.5, fontWeight: 600,
                cursor: actioning ? 'not-allowed' : 'pointer',
                background: 'rgba(185,28,28,.06)', color: '#b91c1c',
                border: '1px solid rgba(185,28,28,.2)', fontFamily: 'inherit',
                opacity: actioning ? .5 : 1, transition: 'all .14s',
              }}
              onMouseEnter={(e) => { if (!actioning) (e.currentTarget as HTMLElement).style.background = 'rgba(185,28,28,.12)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(185,28,28,.06)'; }}
            >
              ✕ Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
