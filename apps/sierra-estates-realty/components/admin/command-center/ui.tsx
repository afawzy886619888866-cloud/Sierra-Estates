'use client';

/**
 * SIERRA ESTATES — UNIFIED ADMIN COMMAND CENTER · shared primitives
 *
 * The design-system layer for the /admin command-center routes (overview,
 * pipeline, properties, leads, bots, applicants): glassmorphism cards in the
 * "Luxury Minimal" register (Deep Navy #0A192F + Royal Gold #D4AF37 — see
 * app/admin/command-center.css), KPI widgets, pills, modals, loading/empty/
 * error states and the API fetch hook every console view shares.
 *
 * These are intentionally framework-light (no external UI kit): the legacy
 * Intelligence OS portal keeps its own stack, and the command center stays
 * deterministic, typed and dependency-free.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Inbox, Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';

// ─── Formatting ────────────────────────────────────────────────────────────

/** EGP currency with compact magnitude (2.4M / 18.5K). */
export function formatCurrency(value: number, currency = 'EGP'): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const symbol = currency === 'EGP' ? 'EGP' : currency;
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)}B ${symbol}`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M ${symbol}`;
  if (abs >= 10_000) return `${sign}${(abs / 1_000).toFixed(1)}K ${symbol}`;
  return `${sign}${abs.toLocaleString('en-US')} ${symbol}`;
}

export function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString('en-US') : '—';
}

export function timeAgo(input: unknown): string {
  if (!input) return '—';
  const t = typeof input === 'string' ? Date.parse(input) : Number(input);
  if (!Number.isFinite(t)) return '—';
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── API fetch hook ────────────────────────────────────────────────────────

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** 401 from the admin guard — the console renders the sign-in prompt. */
  unauthorized: boolean;
  reload: () => void;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useAdminApi<T>(url: string, deps: unknown[] = []): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [tick, setTick] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(url, { cache: 'no-store' })
      .then(async (res) => {
        if (res.status === 401) {
          setUnauthorized(true);
          throw new Error('unauthorized');
        }
        setUnauthorized(false);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body?.error ?? `Request failed (${res.status})`);
        }
        return body as T;
      })
      .then((body) => {
        if (!cancelled && mounted.current) setData(body);
      })
      .catch((err: unknown) => {
        if (cancelled || !mounted.current) return;
        if (err instanceof Error && err.message === 'unauthorized') {
          setError(null);
          setData(null);
        } else {
          setError(err instanceof Error ? err.message : 'Unexpected error');
        }
      })
      .finally(() => {
        if (!cancelled && mounted.current) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick, ...deps]);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  return { data, loading, error, unauthorized, reload, setData };
}

/** POST/PATCH helper with JSON body; resolves to {ok, status, body}. */
export async function mutateApi(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const parsed = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, body: parsed };
}

// ─── Layout primitives ─────────────────────────────────────────────────────

export function CcPageShell({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#05080f] text-[#f5f3ec] font-sans">
      <div
        className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10 py-6 lg:py-10"
        style={{ fontFamily: "'Inter', 'Cairo', system-ui, sans-serif" }}
      >
        <header className="mb-6 lg:mb-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-semibold tracking-[0.28em] uppercase text-gold-500/80">
                {eyebrow}
              </p>
              <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">
                <span className="cc-gold-text">{title}</span>
              </h1>
              {subtitle && (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#f5f3ec]/60">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

export function CcRealtimeBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[0.7rem] font-medium text-[#f5f3ec]/70"
      title={
        connected
          ? 'Supabase Realtime CDC connected — updates stream live'
          : 'Realtime disconnected — showing last known snapshot'
      }
    >
      {connected ? <Wifi className="h-3.5 w-3.5 text-emerald-soft" /> : <WifiOff className="h-3.5 w-3.5 opacity-50" />}
      {connected ? (
        <>
          <span className="cc-live-dot" aria-hidden />
          LIVE · CDC
        </>
      ) : (
        'OFFLINE'
      )}
    </span>
  );
}

export function CcButton({
  variant = 'ghost',
  loading = false,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'gold' | 'ghost' | 'danger';
  loading?: boolean;
}) {
  const variantClass =
    variant === 'gold' ? 'cc-btn cc-btn-gold' : variant === 'danger' ? 'cc-btn cc-btn-danger' : 'cc-btn cc-btn-ghost';
  return (
    <button {...rest} disabled={rest.disabled || loading} className={`${variantClass} ${rest.className ?? ''}`}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function CcCard({
  raised = false,
  hover = false,
  className = '',
  children,
}: {
  raised?: boolean;
  hover?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const base = raised ? 'cc-glass-raised' : 'cc-glass';
  const motion = hover ? 'cc-glass-hover' : '';
  return <div className={`${base} ${motion} ${className}`}>{children}</div>;
}

// ─── KPI widget ────────────────────────────────────────────────────────────

export function CcKpi({
  label,
  value,
  sub,
  icon,
  tone = 'gold',
  progress,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  tone?: 'gold' | 'green' | 'azure' | 'neutral';
  /** 0..100 — renders the progress rail when provided. */
  progress?: number;
  href?: string;
}) {
  const toneColor =
    tone === 'green'
      ? 'text-emerald-soft'
      : tone === 'azure'
        ? 'text-azure-soft'
        : tone === 'neutral'
          ? 'text-[#f5f3ec]/80'
          : 'text-gold-400';
  const progressPct = typeof progress === 'number' ? Math.min(100, Math.max(0, progress)) : null;

  const inner = (
    <div className="cc-glass cc-glass-hover relative overflow-hidden p-5 sm:p-6 h-full">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl"
        style={{ background: tone === 'gold' ? 'rgba(212,175,55,0.12)' : tone === 'green' ? 'rgba(52,211,153,0.1)' : 'rgba(30,136,217,0.1)' }}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[#f5f3ec]/45">
          {label}
        </p>
        {icon && <span className={`${toneColor} shrink-0`}>{icon}</span>}
      </div>
      <p className={`cc-num mt-3 text-2xl sm:text-3xl font-semibold ${toneColor}`}>{value}</p>
      {sub && <p className="mt-1.5 text-xs text-[#f5f3ec]/50">{sub}</p>}
      {progressPct !== null && (
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progressPct}%`,
                background:
                  progressPct >= 90
                    ? 'linear-gradient(90deg,#34d399,#a7f3d0)'
                    : progressPct >= 60
                      ? 'linear-gradient(90deg,#d4af37,#f5d77f)'
                      : 'linear-gradient(90deg,#e63946,#ff8b95)',
              }}
            />
          </div>
          <p className="mt-1.5 text-[0.68rem] text-[#f5f3ec]/40">
            {progressPct >= 90 ? 'Target met (≥ 90%)' : `${progressPct}% · target 90%`}
          </p>
        </div>
      )}
    </div>
  );

  return href ? (
    <a href={href} className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 rounded-[20px]">
      {inner}
    </a>
  ) : (
    inner
  );
}

// ─── Pills & badges ────────────────────────────────────────────────────────

export type PillTone = 'gold' | 'green' | 'red' | 'azure' | 'neutral' | 'amber';

const PILL_STYLES: Record<PillTone, { border: string; bg: string; color: string }> = {
  gold: { border: 'rgba(212,175,55,0.45)', bg: 'rgba(212,175,55,0.1)', color: '#e9c176' },
  green: { border: 'rgba(52,211,153,0.45)', bg: 'rgba(52,211,153,0.08)', color: '#6ee7b7' },
  red: { border: 'rgba(230,57,70,0.45)', bg: 'rgba(230,57,70,0.08)', color: '#ff8b95' },
  azure: { border: 'rgba(30,136,217,0.45)', bg: 'rgba(30,136,217,0.08)', color: '#7cc4f5' },
  neutral: { border: 'rgba(255,255,255,0.16)', bg: 'rgba(255,255,255,0.04)', color: 'rgba(245,243,236,0.72)' },
  amber: { border: 'rgba(245,158,11,0.45)', bg: 'rgba(245,158,11,0.08)', color: '#fcd34d' },
};

export function CcPill({ tone = 'neutral', children }: { tone?: PillTone; children: React.ReactNode }) {
  const s = PILL_STYLES[tone];
  return (
    <span className="cc-pill" style={{ borderColor: s.border, background: s.bg, color: s.color }}>
      {children}
    </span>
  );
}

/** Lead score pill — gold heat by decile. */
export function CcScorePill({ score }: { score: number }) {
  const tone: PillTone = score >= 80 ? 'gold' : score >= 60 ? 'amber' : score >= 40 ? 'azure' : 'neutral';
  return <CcPill tone={tone}>Score {Math.round(score)}</CcPill>;
}

// ─── States ────────────────────────────────────────────────────────────────

export function CcSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-14 text-sm text-[#f5f3ec]/50" role="status" aria-live="polite">
      <Loader2 className="h-5 w-5 animate-spin text-gold-500" aria-hidden />
      {label}…
    </div>
  );
}

export function CcSkeletonGrid({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="cc-glass p-6">
          <div className="cc-skeleton h-3 w-24" />
          <div className="cc-skeleton mt-4 h-8 w-32" />
          <div className="cc-skeleton mt-3 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function CcEmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <Inbox className="h-8 w-8 text-[#f5f3ec]/20" aria-hidden />
      <p className="text-sm font-medium text-[#f5f3ec]/60">{title}</p>
      {hint && <p className="max-w-sm text-xs leading-relaxed text-[#f5f3ec]/35">{hint}</p>}
    </div>
  );
}

export function CcError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="cc-glass flex flex-col items-center gap-3 py-12 text-center" role="alert">
      <AlertTriangle className="h-8 w-8 text-ruby-soft" aria-hidden />
      <p className="max-w-md text-sm text-[#f5f3ec]/70">{message}</p>
      {onRetry && (
        <CcButton variant="gold" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden /> Retry
        </CcButton>
      )}
    </div>
  );
}

export function CcUnauthorized() {
  return (
    <CcCard className="p-10 text-center" raised>
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-gold-500/70">
        Sierra Estates · Command Center
      </p>
      <h2 className="mt-3 text-xl font-semibold text-[#f5f3ec]">Staff sign-in required</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#f5f3ec]/55">
        This console reads live operational data from Supabase under row-level security. Sign in
        with a staff account to continue.
      </p>
      <a href="/admin/login" className="cc-btn cc-btn-gold mt-6 no-underline">
        Go to sign-in
      </a>
    </CcCard>
  );
}

// ─── Modal ─────────────────────────────────────────────────────────────────

export function CcModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-[#05080f]/80 p-4 backdrop-blur-sm sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`cc-glass-raised my-auto w-full ${wide ? 'max-w-4xl' : 'max-w-xl'} p-6 sm:p-8`}
        style={{ animation: 'ccModalIn 260ms cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#f5f3ec]">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-[#f5f3ec]/50">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-[#f5f3ec]/60 transition hover:border-white/25 hover:text-[#f5f3ec]"
            aria-label="Close dialog"
          >
            ESC
          </button>
        </div>
        {children}
      </div>
      <style>{`@keyframes ccModalIn { from { opacity: 0; transform: translateY(14px) scale(0.985); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}

/** Definition list row used inside detail modals. */
export function CcField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/[0.05] py-2.5 last:border-0">
      <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#f5f3ec]/40">
        {label}
      </dt>
      <dd className="text-right text-sm text-[#f5f3ec]/85">{children}</dd>
    </div>
  );
}
