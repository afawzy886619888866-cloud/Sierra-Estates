'use client';

/**
 * ACCESS APPROVALS — Phase 1 approval queue (superadmin-only tab).
 *
 * Wires the durable Google/Magic-Link access-request lifecycle
 * (POST /api/auth → access_requests 'pending' + profiles 'pending') to a
 * live admin console: pending requests are listed from
 * GET /api/admin/access-requests, a role can be assigned, and the
 * superadmin's Approve/Deny decision is sent to
 * POST /api/admin/users — which activates the profile
 * (status 'active' + granted role) and closes the request, with a full
 * audit trail (access_request.approved / access_request.denied).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Role } from '@/lib/types';

interface AccessRequestRow {
  id: string;
  email: string;
  provider: string | null;
  state: string;
  requestedAt: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  grantedRole: string | null;
  note: string | null;
}

/** Assignable roles — the full canonical vocabulary (types.ts Role). */
const ASSIGNABLE_ROLES: Role[] = [
  'viewer', 'owner', 'broker', 'agent', 'sales_agent', 'partner',
  'sales_manager', 'marketing_manager', 'inventory_manager',
  'operations_manager', 'manager', 'auditor', 'admin', 'superadmin',
];

const ROLE_LABELS: Record<string, string> = {
  viewer: 'Viewer — read-only dashboards',
  owner: 'Owner — own listings',
  broker: 'Broker — assigned leads (read)',
  agent: 'Agent — assigned leads + CRM',
  sales_agent: 'Sales Agent — leads, viewings, simulator',
  partner: 'Partner — scoped portfolio',
  sales_manager: 'Sales Manager',
  marketing_manager: 'Marketing Manager',
  inventory_manager: 'Inventory Manager',
  operations_manager: 'Operations Manager',
  manager: 'Manager',
  auditor: 'Auditor — read & audit',
  admin: 'Admin (elevated)',
  superadmin: 'Superadmin (elevated)',
};

const isArabic = (lang: string) => lang === 'ar';

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return value;
  }
}

export function AccessApprovalsView({ lang }: { lang: string }) {
  const ar = isArabic(lang);
  const [requests, setRequests] = useState<AccessRequestRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roleChoice, setRoleChoice] = useState<Record<string, Role>>({});
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/access-requests', { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `${res.status} ${res.statusText}`);
      }
      const rows: AccessRequestRow[] = await res.json();
      setRequests(rows);
    } catch (err) {
      setError((err as Error).message);
      setRequests([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = useCallback(
    async (email: string, decision: 'approved' | 'denied') => {
      setBusyEmail(email);
      setError(null);
      setFlash(null);
      try {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            email,
            decision,
            ...(decision === 'approved' && roleChoice[email]
              ? { role: roleChoice[email] }
              : {}),
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `${res.status} ${res.statusText}`);
        }
        setFlash(
          decision === 'approved'
            ? ar
              ? `تمت الموافقة على ${email} — الحساب أصبح نشطاً`
              : `Approved ${email} — account activated`
            : ar
              ? `تم رفض طلب ${email}`
              : `Denied ${email}`,
        );
        await load();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusyEmail(null);
      }
    },
    [roleChoice, load, ar],
  );

  const pending = useMemo(
    () => (requests ?? []).filter((r) => r.state === 'pending'),
    [requests],
  );
  const decided = useMemo(
    () => (requests ?? []).filter((r) => r.state !== 'pending').slice(0, 12),
    [requests],
  );

  return (
    <div className="fade-up" style={{ paddingTop: 4 }}>
      {/* Header */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
            ✅ {ar ? 'طلبات الوصول — موافقات المشرف الأعلى' : 'Access Approvals — Superadmin Queue'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, opacity: 0.7 }}>
            {ar
              ? 'طلبات الدخول عبر جوجل أو الرابط السحري تُسجَّل تلقائياً وتنتظر موافقتكم مع تعيين الدور.'
              : 'Google OAuth & Magic-Link sign-ins from unprovisioned accounts are recorded automatically and wait here for a role assignment and your decision.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="chip chip-amber" style={{ fontSize: 11 }}>
            {ar ? 'قيد الانتظار' : 'Pending'}: {pending.length}
          </span>
          <button className="btn btn-pri" style={{ padding: '7px 14px', fontSize: 12, cursor: 'pointer' }} onClick={() => void load()}>
            ↻ {ar ? 'تحديث' : 'Refresh'}
          </button>
        </div>
      </div>

      {flash && (
        <div className="card" style={{ padding: '10px 16px', marginBottom: 12, borderColor: 'rgba(52,211,153,.4)', fontSize: 12.5, color: '#34D399' }}>✓ {flash}</div>
      )}
      {error && (
        <div className="card" style={{ padding: '10px 16px', marginBottom: 12, borderColor: 'rgba(230,57,70,.4)', fontSize: 12.5, color: '#E63946' }}>
          ⚠ {ar ? 'تعذر تنفيذ الطلب:' : 'Request failed:'} {error}
        </div>
      )}

      {/* Pending queue */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-hd">
          <span className="card-title">🕒 {ar ? 'طلبات قيد المراجعة' : 'Pending Requests'}</span>
        </div>
        <div className="card-body">
          {requests === null ? (
            <div style={{ padding: 18, fontSize: 12.5, opacity: 0.7 }}>
              {ar ? 'جارٍ تحميل الطلبات…' : 'Loading requests…'}
            </div>
          ) : pending.length === 0 ? (
            <div style={{ padding: 18, fontSize: 12.5, opacity: 0.7 }}>
              {ar ? 'لا توجد طلبات معلّقة — كل الطلبات تمت معالجتها.' : 'No pending access requests — the queue is clear.'}
            </div>
          ) : (
            pending.map((req) => {
              const chosen = roleChoice[req.email] ?? 'viewer';
              const busy = busyEmail === req.email;
              return (
                <div
                  key={req.id}
                  style={{
                    display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
                    padding: '12px 14px', borderBottom: '1px solid var(--bd-s)', fontSize: 13,
                  }}
                >
                  <div style={{ flex: '1 1 260px', minWidth: 240 }}>
                    <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: 12.5 }}>{req.email}</div>
                    <div style={{ fontSize: 11, opacity: 0.65, marginTop: 3 }}>
                      {ar ? 'المزوّد' : 'Provider'}: {req.provider || '—'} · {ar ? 'طُلب في' : 'Requested'} {formatDate(req.requestedAt)}
                    </div>
                  </div>
                  <select
                    className="f-in"
                    style={{ width: 'auto', minWidth: 220 }}
                    value={chosen}
                    disabled={busy}
                    onChange={(e) => setRoleChoice((prev) => ({ ...prev, [req.email]: e.target.value as Role }))}
                    title={ar ? 'تعيين الدور' : 'Assign role'}
                    aria-label={ar ? `تعيين دور ل${req.email}` : `Assign role for ${req.email}`}
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-pri"
                      disabled={busy}
                      style={{ padding: '7px 16px', fontSize: 12, cursor: busy ? 'wait' : 'pointer', background: '#C8961A', color: '#0B0E17', border: 0, borderRadius: 8, fontWeight: 800 }}
                      onClick={() => void decide(req.email, 'approved')}
                    >
                      {busy ? '…' : ar ? 'موافقة' : 'Approve'}
                    </button>
                    <button
                      className="btn"
                      disabled={busy}
                      style={{ padding: '7px 16px', fontSize: 12, cursor: busy ? 'wait' : 'pointer', borderRadius: 8, fontWeight: 700 }}
                      onClick={() => void decide(req.email, 'denied')}
                    >
                      {ar ? 'رفض' : 'Deny'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Decision ledger */}
      <div className="card">
        <div className="card-hd">
          <span className="card-title">🗂 {ar ? 'سجل القرارات الأخيرة' : 'Recent Decisions'}</span>
        </div>
        <div className="card-body">
          {decided.length === 0 ? (
            <div style={{ padding: 18, fontSize: 12.5, opacity: 0.7 }}>
              {ar ? 'لا توجد قرارات مسجلة بعد.' : 'No recorded decisions yet.'}
            </div>
          ) : (
            decided.map((req) => (
              <div
                key={req.id}
                style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: '10px 14px', borderBottom: '1px solid var(--bd-s)', fontSize: 12.5 }}
              >
                <span className={`chip ${req.state === 'approved' ? 'chip-green' : 'chip-red'}`} style={{ fontSize: 10.5 }}>
                  {req.state === 'approved' ? '✓ APPROVED' : '✕ DENIED'}
                </span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{req.email}</span>
                <span style={{ opacity: 0.65, fontSize: 11 }}>
                  {ar ? 'الدور الممنوح' : 'Granted role'}: {req.grantedRole || '—'} · {ar ? 'بواسطة' : 'By'} {req.decidedBy || '—'} · {formatDate(req.decidedAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default AccessApprovalsView;
