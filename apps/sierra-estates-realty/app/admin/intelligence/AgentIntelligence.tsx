'use client';

/**
 * Agent Intelligence — what the fleet has learned, and whether that claim is
 * trustworthy.
 *
 * The banner at the top is the most important element on the page: if memory
 * is not durable, every number below is computed from a cache that dies with
 * the process, and the operator needs to know that before acting on any of it.
 */
import React, { useCallback, useEffect, useState } from 'react';

interface Pattern {
  name: string;
  occurrences: number;
  successRate: number;
  lastUsed: string;
  skills: string[];
}
interface SkillScore {
  skillId: string;
  attempts: number;
  successes: number;
  rawSuccessRate: number;
  confidence: number;
}
interface Execution {
  agentId: string;
  action: string;
  success: boolean;
  error?: string;
  timestamp: string;
}
interface Payload {
  store: { name: string; healthy: boolean; error: string | null; durable: boolean };
  summary: {
    totalRuns: number;
    overallSuccessRate: number;
    strongest: Pattern | null;
    weakest: Pattern | null;
  };
  patterns: Pattern[];
  skills: SkillScore[];
  recent: Execution[];
  generatedAt: string;
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function rateColor(rate: number): string {
  if (rate >= 0.8) return '#34D399';
  if (rate >= 0.5) return '#f59e0b';
  return '#E63946';
}

export default function AgentIntelligence() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/intelligence?sinceHours=${hours}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Request failed');
      setData(json.data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ padding: '28px 24px', maxWidth: 1180, margin: '0 auto' }}>
      <header style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Agent Intelligence</h1>
        <p style={{ color: 'var(--tx-m, #6b7684)', fontSize: 13, marginTop: 6 }}>
          Measured performance of the agent fleet, from durable execution history.
        </p>
      </header>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        {[6, 24, 168, 720].map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHours(h)}
            style={{
              padding: '7px 14px',
              borderRadius: 9,
              cursor: 'pointer',
              border: `1px solid ${hours === h ? '#00AEFF' : 'rgba(128,128,128,.3)'}`,
              background: hours === h ? 'rgba(0,174,255,.12)' : 'transparent',
              color: 'inherit',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {h < 24 ? `${h}h` : `${h / 24}d`}
          </button>
        ))}
        <button
          type="button"
          onClick={load}
          disabled={loading}
          style={{
            marginInlineStart: 'auto',
            padding: '7px 14px',
            borderRadius: 9,
            cursor: 'pointer',
            border: '1px solid rgba(128,128,128,.3)',
            background: 'transparent',
            color: 'inherit',
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ padding: 14, borderRadius: 10, background: 'rgba(230,57,70,.12)', border: '1px solid rgba(230,57,70,.35)', color: '#E63946', fontSize: 13, marginBottom: 18 }}>
          {error}
        </div>
      )}

      {data && !data.store.durable && (
        <div
          style={{
            padding: 14,
            borderRadius: 10,
            background: 'rgba(245,158,11,.12)',
            border: '1px solid rgba(245,158,11,.4)',
            color: '#b45309',
            fontSize: 13,
            marginBottom: 18,
          }}
        >
          <strong>Memory is not durable.</strong> The store is{' '}
          <code>{data.store.name}</code>, so execution history is lost whenever the
          process recycles — on serverless that is nearly every request. The figures
          below reflect only what this instance happened to handle. Set{' '}
          <code>MEMORY_PERSISTENCE=database</code> with Firebase credentials to make
          them real.
          {data.store.error && <div style={{ marginTop: 6 }}>Last store error: {data.store.error}</div>}
        </div>
      )}

      {data && (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14, marginBottom: 26 }}>
            <Stat label="Total runs" value={String(data.summary.totalRuns)} />
            <Stat
              label="Overall success"
              value={pct(data.summary.overallSuccessRate)}
              color={rateColor(data.summary.overallSuccessRate)}
            />
            <Stat label="Distinct patterns" value={String(data.patterns.length)} />
            <Stat label="Tracked skills" value={String(data.skills.length)} />
          </section>

          <Panel title="Patterns" empty={!data.patterns.length} emptyText="No runs recorded in this window.">
            <Table
              head={['Agent : action', 'Runs', 'Success', 'Last used']}
              rows={data.patterns.map((p) => [
                p.name,
                String(p.occurrences),
                <span key="r" style={{ color: rateColor(p.successRate), fontWeight: 700 }}>
                  {pct(p.successRate)}
                </span>,
                new Date(p.lastUsed).toLocaleString(),
              ])}
            />
          </Panel>

          <Panel
            title="Skill confidence"
            subtitle="Ranked by Wilson lower bound, so a single lucky success cannot outrank a long track record."
            empty={!data.skills.length}
            emptyText="No skills have been exercised yet."
          >
            <Table
              head={['Skill', 'Attempts', 'Raw rate', 'Confidence']}
              rows={data.skills.map((s) => [
                s.skillId,
                `${s.successes}/${s.attempts}`,
                pct(s.rawSuccessRate),
                <span key="c" style={{ color: rateColor(s.confidence), fontWeight: 700 }}>
                  {pct(s.confidence)}
                </span>,
              ])}
            />
          </Panel>

          <Panel title="Recent runs" empty={!data.recent.length} emptyText="Nothing recorded yet.">
            <Table
              head={['When', 'Agent', 'Action', 'Result']}
              rows={data.recent.map((e) => [
                new Date(e.timestamp).toLocaleTimeString(),
                e.agentId,
                e.action,
                <span key="s" style={{ color: e.success ? '#34D399' : '#E63946', fontWeight: 700 }}>
                  {e.success ? 'ok' : e.error ? `failed — ${e.error}` : 'failed'}
                </span>,
              ])}
            />
          </Panel>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid rgba(128,128,128,.22)' }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: color ?? 'inherit' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--tx-m, #6b7684)', marginTop: 3 }}>{label}</div>
    </div>
  );
}

function Panel({
  title, subtitle, children, empty, emptyText,
}: {
  title: string; subtitle?: string; children: React.ReactNode; empty?: boolean; emptyText?: string;
}) {
  return (
    <section style={{ marginBottom: 26 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>{title}</h2>
      {subtitle && (
        <p style={{ fontSize: 12, color: 'var(--tx-m, #6b7684)', margin: '0 0 10px' }}>{subtitle}</p>
      )}
      <div style={{ border: '1px solid rgba(128,128,128,.22)', borderRadius: 12, overflow: 'hidden' }}>
        {empty ? (
          <p style={{ padding: 18, fontSize: 13, color: 'var(--tx-m, #6b7684)', margin: 0 }}>{emptyText}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                style={{
                  textAlign: 'start',
                  padding: '10px 14px',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                  color: 'var(--tx-m, #6b7684)',
                  borderBottom: '1px solid rgba(128,128,128,.22)',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i}>
              {cells.map((c, j) => (
                <td key={j} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(128,128,128,.12)' }}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
