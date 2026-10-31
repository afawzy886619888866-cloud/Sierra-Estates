'use client';

/**
 * SIERRA ESTATES — RECRUITMENT & APPLICANT MANAGEMENT (/admin/applicants)
 *
 * The hiring funnel over the `applicants` view (security_invoker alias of
 * public.career_applications — migration 037): status workflow
 * (new → pending_review → reviewed → hired | rejected), CV link inspection,
 * reviewer notes, and candidate onboarding — which queues the WhatsApp
 * onboarding message through the production dispatch pipeline and flips the
 * applicant to hired (POST/PATCH /api/admin/applicants[/id]).
 */
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  ExternalLink,
  FileText,
  Search,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  CcButton,
  CcCard,
  CcEmpty,
  CcError,
  CcField,
  CcKpi,
  CcModal,
  CcPageShell,
  CcPill,
  CcRealtimeBadge,
  CcSpinner,
  CcUnauthorized,
  mutateApi,
  timeAgo,
  useAdminApi,
} from '@/components/admin/command-center/ui';

interface ApplicantRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  position: string;
  experience: string | null;
  hasVehicle: boolean | null;
  biggestAchievements: string | null;
  expectedSalary: string | null;
  realEstateKnowledge: string | null;
  availability: string | null;
  cvUrl: string | null;
  message: string | null;
  source: string | null;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ApplicantsResponse {
  rows: ApplicantRow[];
  counts: Record<string, number>;
  total: number;
}

const STATUS_TONES: Record<string, 'gold' | 'azure' | 'amber' | 'green' | 'red' | 'neutral'> = {
  new: 'gold',
  pending_review: 'amber',
  reviewed: 'azure',
  hired: 'green',
  rejected: 'red',
};

const STATUS_FLOW: Record<string, { label: string; next?: string[] }> = {
  new: { label: 'Review', next: ['pending_review', 'rejected'] },
  pending_review: { label: 'Advance', next: ['reviewed', 'rejected'] },
  reviewed: { label: 'Decide', next: ['hired', 'rejected'] },
  hired: { label: 'Hired' },
  rejected: { label: 'Rejected' },
};

export default function ApplicantsConsole() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [openApplicant, setOpenApplicant] = useState<ApplicantRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setSearch(q), 300);
    return () => clearTimeout(id);
  }, [q]);

  const url = useMemo(() => {
    const params = new URLSearchParams({ limit: '200' });
    if (status !== 'all') params.set('status', status);
    return `/api/admin/applicants?${params.toString()}`;
  }, [status]);

  const { data, loading, error, unauthorized, reload } = useAdminApi<ApplicantsResponse>(url);

  const rows = useMemo(() => {
    const all = data?.rows ?? [];
    const needle = search.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((row) =>
      [row.name, row.email, row.phone, row.position, row.experience]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [data, search]);

  async function setStatusFor(row: ApplicantRow, next: string) {
    setBusyId(row.id);
    setNotice(null);
    const res = await mutateApi(`/api/admin/applicants/${row.id}`, 'PATCH', { status: next });
    setBusyId(null);
    if (res.ok) {
      setNotice({ tone: 'ok', text: `${row.name} → ${next.replace(/_/g, ' ')}.` });
      setOpenApplicant((current) => (current?.id === row.id ? { ...current, status: next } : current));
      reload();
    } else {
      setNotice({ tone: 'err', text: String(res.body.error ?? 'Status update failed.') });
    }
  }

  async function onboard(row: ApplicantRow) {
    setBusyId(row.id);
    setNotice(null);
    const res = await mutateApi(`/api/admin/applicants/${row.id}`, 'PATCH', { action: 'onboard' });
    setBusyId(null);
    if (res.ok) {
      setNotice({
        tone: 'ok',
        text: `${row.name} onboarded — WhatsApp onboarding message queued through the dispatch pipeline.`,
      });
      setOpenApplicant((current) => (current?.id === row.id ? { ...current, status: 'hired' } : current));
      reload();
    } else {
      setNotice({ tone: 'err', text: String(res.body.error ?? 'Onboarding failed.') });
    }
  }

  if (unauthorized) {
    return (
      <CcPageShell eyebrow="Sierra Estates · Command Center" title="Recruitment">
        <CcUnauthorized />
      </CcPageShell>
    );
  }

  const counts = data?.counts ?? {};

  return (
    <CcPageShell
      eyebrow="Sierra Estates · Unified Admin Command Center"
      title="Recruitment & Applicant Management"
      subtitle="The hiring funnel over public.career_applications (read through the applicants view) — CV inspection, status workflow and one-click onboarding with WhatsApp dispatch."
      actions={
        <>
          <CcRealtimeBadge connected={!error && !loading} />
          <Link href="/admin" className="cc-btn cc-btn-ghost no-underline">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Overview
          </Link>
        </>
      }
    >
      {error && !data ? (
        <CcError message={error} onRetry={reload} />
      ) : loading && !data ? (
        <CcSpinner label="Loading applicants" />
      ) : (
        <>
          <section aria-label="Recruitment summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <CcKpi label="Total (window)" value={String(data?.total ?? 0)} sub="Newest 200 applications" icon={<BriefcaseBusiness className="h-5 w-5" />} tone="gold" />
            <CcKpi label="New" value={String(counts.new ?? 0)} sub="Untouched intake" tone="azure" />
            <CcKpi label="In Review" value={String((counts.pending_review ?? 0) + (counts.reviewed ?? 0))} sub={`${counts.pending_review ?? 0} pending · ${counts.reviewed ?? 0} reviewed`} tone="gold" />
            <CcKpi label="Hired" value={String(counts.hired ?? 0)} sub="Onboarded to the team" icon={<UserCheck className="h-5 w-5" />} tone="green" />
            <CcKpi label="Rejected" value={String(counts.rejected ?? 0)} sub="Closed out" icon={<XCircle className="h-5 w-5" />} tone="neutral" />
          </section>

          <CcCard className="mt-6 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f5f3ec]/30" aria-hidden />
                <input
                  className="cc-input pl-9"
                  placeholder="Search name, phone, email, position…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Search applicants"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['all', 'new', 'pending_review', 'reviewed', 'hired', 'rejected'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      status === s
                        ? 'border-gold-500/60 bg-gold-500/15 text-gold-300'
                        : 'border-white/10 bg-white/[0.03] text-[#f5f3ec]/55 hover:border-white/25'
                    }`}
                  >
                    {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          </CcCard>

          {notice && (
            <div
              className={`mt-4 rounded-xl border px-4 py-2.5 text-xs ${
                notice.tone === 'ok'
                  ? 'border-emerald-soft/40 bg-emerald-soft/10 text-emerald-soft'
                  : 'border-ruby-soft/40 bg-ruby-soft/10 text-[#ff8b95]'
              }`}
              role="status"
            >
              {notice.text}
            </div>
          )}

          <CcCard className="mt-4 overflow-hidden">
            <div className="cc-scroll max-h-[62vh] overflow-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[#0a192f]/95 backdrop-blur">
                  <tr className="text-[0.64rem] uppercase tracking-[0.14em] text-[#f5f3ec]/40">
                    <th className="px-4 py-3 font-semibold">Candidate</th>
                    <th className="px-4 py-3 font-semibold">Position</th>
                    <th className="px-4 py-3 font-semibold">Experience</th>
                    <th className="px-4 py-3 font-semibold">CV</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Applied</th>
                    <th className="px-4 py-3 text-right font-semibold">Workflow</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const flow = STATUS_FLOW[row.status] ?? { label: 'Review' };
                    return (
                      <tr
                        key={row.id}
                        className={`cursor-pointer border-t border-white/[0.05] transition-colors hover:bg-white/[0.02] ${
                          busyId === row.id ? 'opacity-50' : ''
                        }`}
                        onClick={() => setOpenApplicant(row)}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#f5f3ec]/90">{row.name}</p>
                          <p className="mt-0.5 text-[0.66rem] text-[#f5f3ec]/40">
                            {row.phone}
                            {row.email ? ` · ${row.email}` : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-[0.75rem] text-[#f5f3ec]/75">{row.position}</td>
                        <td className="px-4 py-3 text-[0.72rem] text-[#f5f3ec]/55">
                          {row.experience ?? '—'}
                          {row.hasVehicle ? ' · vehicle' : ''}
                        </td>
                        <td className="px-4 py-3">
                          {row.cvUrl ? (
                            <a
                              href={row.cvUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 rounded-md border border-gold-500/25 bg-gold-500/[0.07] px-2 py-1 text-[0.66rem] text-gold-300 transition hover:border-gold-500/50"
                            >
                              <FileText className="h-3 w-3" aria-hidden /> CV
                              <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                          ) : (
                            <span className="text-[0.66rem] text-[#f5f3ec]/30">no link</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <CcPill tone={STATUS_TONES[row.status] ?? 'neutral'}>
                            {row.status.replace(/_/g, ' ')}
                          </CcPill>
                        </td>
                        <td className="px-4 py-3 text-[0.7rem] text-[#f5f3ec]/50">
                          {timeAgo(row.createdAt)}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {row.status !== 'hired' && row.status !== 'rejected' && flow.next && (
                              <>
                                {row.status === 'reviewed' ? (
                                  <CcButton variant="gold" onClick={() => onboard(row)} disabled={busyId === row.id}>
                                    <CheckCircle2 className="h-4 w-4" aria-hidden /> Onboard
                                  </CcButton>
                                ) : (
                                  <CcButton
                                    variant="gold"
                                    onClick={() => setStatusFor(row, flow.next![0])}
                                    disabled={busyId === row.id}
                                  >
                                    {flow.label}
                                  </CcButton>
                                )}
                                <CcButton
                                  variant="danger"
                                  onClick={() => setStatusFor(row, 'rejected')}
                                  disabled={busyId === row.id}
                                >
                                  Reject
                                </CcButton>
                              </>
                            )}
                            {(row.status === 'hired' || row.status === 'rejected') && (
                              <CcButton variant="ghost" onClick={() => setStatusFor(row, 'new')} disabled={busyId === row.id}>
                                Reopen
                              </CcButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <CcEmpty
                          title="No applications in this view"
                          hint="The public careers form (components/ApplicantForm.tsx) writes into career_applications."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CcCard>
        </>
      )}

      {/* ── Applicant detail modal ─────────────────────────────────────────── */}
      <CcModal
        open={openApplicant !== null}
        onClose={() => setOpenApplicant(null)}
        title={openApplicant?.name ?? 'Applicant'}
        subtitle={`${openApplicant?.position ?? '—'} · applied ${timeAgo(openApplicant?.createdAt)}`}
        wide
      >
        {openApplicant && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <dl>
              <CcField label="Phone">{openApplicant.phone}</CcField>
              <CcField label="Email">{openApplicant.email ?? '—'}</CcField>
              <CcField label="Position">{openApplicant.position}</CcField>
              <CcField label="Experience">{openApplicant.experience ?? '—'}</CcField>
              <CcField label="Vehicle">{openApplicant.hasVehicle ? 'Yes' : 'No'}</CcField>
              <CcField label="Expected salary">{openApplicant.expectedSalary ?? '—'}</CcField>
              <CcField label="Availability">{openApplicant.availability ?? '—'}</CcField>
              <CcField label="Source">{openApplicant.source ?? '—'}</CcField>
            </dl>
            <div>
              <CcField label="Status">
                <CcPill tone={STATUS_TONES[openApplicant.status] ?? 'neutral'}>
                  {openApplicant.status.replace(/_/g, ' ')}
                </CcPill>
              </CcField>
              <CcField label="CV">
                {openApplicant.cvUrl ? (
                  <a
                    href={openApplicant.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-gold-300 underline decoration-gold-500/40"
                  >
                    Open CV link <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : (
                  'No CV link provided'
                )}
              </CcField>
              <p className="mt-4 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#f5f3ec]/40">
                Biggest achievements
              </p>
              <p className="mt-2 max-h-24 overflow-y-auto rounded-xl border border-white/[0.07] bg-black/20 p-3 text-xs leading-relaxed text-[#f5f3ec]/70">
                {openApplicant.biggestAchievements || '—'}
              </p>
              <p className="mt-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#f5f3ec]/40">
                Real estate knowledge
              </p>
              <p className="mt-2 max-h-20 overflow-y-auto rounded-xl border border-white/[0.07] bg-black/20 p-3 text-xs leading-relaxed text-[#f5f3ec]/70">
                {openApplicant.realEstateKnowledge || '—'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {openApplicant.status !== 'hired' && (
                  <CcButton variant="gold" onClick={() => onboard(openApplicant)} loading={busyId === openApplicant.id}>
                    <CheckCircle2 className="h-4 w-4" aria-hidden /> Hire & onboard
                  </CcButton>
                )}
                {openApplicant.status !== 'rejected' && (
                  <CcButton variant="danger" onClick={() => setStatusFor(openApplicant, 'rejected')} disabled={busyId === openApplicant.id}>
                    Reject
                  </CcButton>
                )}
              </div>
            </div>
          </div>
        )}
      </CcModal>
    </CcPageShell>
  );
}
