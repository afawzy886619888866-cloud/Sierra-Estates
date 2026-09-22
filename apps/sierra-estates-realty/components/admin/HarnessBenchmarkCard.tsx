'use client';

import React, { useState } from 'react';

interface HarnessScenarioResult {
  scenarioId: string;
  success: boolean;
  accuracyScore: number;
  latencyMs: number;
  validationErrors?: string[];
}

interface HarnessReport {
  suiteId: string;
  totalScenarios: number;
  passedCount: number;
  failedCount: number;
  overallScore: number;
  averageLatencyMs: number;
  results: HarnessScenarioResult[];
}

export function HarnessBenchmarkCard() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<HarnessReport | null>(null);

  const handleRunHarness = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/internal/run-harness', { method: 'POST' });
      const data = await res.json();
      if (data?.report) {
        setReport(data.report);
      }
    } catch (e) {
      console.error('Failed to run harness:', e);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div className="card-hd" style={{ marginBottom: 16 }}>
        <div>
          <span className="card-title">🎯 DeepSeek Reasoning & Benchmark Harness</span>
          <p style={{ fontSize: 11, color: 'var(--tx-m)', margin: '4px 0 0 0' }}>
            Multi-agent real estate evaluation across 10 deterministic benchmark scenarios.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRunHarness}
          disabled={running}
          className="btn btn-gold"
          style={{ padding: '6px 14px', fontSize: 11 }}
        >
          {running ? 'Running 10 Scenarios…' : '⚡ Run Full Benchmark'}
        </button>
      </div>

      {report && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
            <div style={{ background: 'var(--bg-e)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)', fontFamily: 'JetBrains Mono' }}>
                {(report.overallScore * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: 9, color: 'var(--tx-f)', textTransform: 'uppercase' }}>Overall Score</div>
            </div>
            <div style={{ background: 'var(--bg-e)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#34D399', fontFamily: 'JetBrains Mono' }}>
                {report.passedCount} / {report.totalScenarios}
              </div>
              <div style={{ fontSize: 9, color: 'var(--tx-f)', textTransform: 'uppercase' }}>Scenarios Passed</div>
            </div>
            <div style={{ background: 'var(--bg-e)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#C8961A', fontFamily: 'JetBrains Mono' }}>
                {report.averageLatencyMs}ms
              </div>
              <div style={{ fontSize: 9, color: 'var(--tx-f)', textTransform: 'uppercase' }}>Avg Latency</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
            {report.results.map((r) => (
              <div
                key={r.scenarioId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'var(--surf)',
                  borderRadius: 8,
                  border: '1px solid var(--bd)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`chip ${r.success ? 'chip-green' : 'chip-red'}`}>
                    {r.success ? '✓ PASS' : '✗ FAIL'}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--tx)' }}>
                    {r.scenarioId}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--gold)' }}>
                    Score: {(r.accuracyScore * 100).toFixed(0)}%
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--tx-f)' }}>
                    {r.latencyMs}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
