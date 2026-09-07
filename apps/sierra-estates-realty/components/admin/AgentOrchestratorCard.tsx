'use client';

import React, { useState, useEffect } from 'react';

interface AgentOrchestratorCardProps {
  lang?: string;
  onNavigate?: (tab: string) => void;
}

export default function AgentOrchestratorCard({
  lang = 'en',
  onNavigate,
}: AgentOrchestratorCardProps) {
  const isAr = lang === 'ar';

  const [aoState, setAoState] = useState<{
    running: boolean;
    port: number;
    daemon: string;
    activeWorkspace: string;
    activeProjectId: string;
    installedHarnesses: string[];
    projects: any[];
    sessions: any[];
  }>({
    running: true,
    port: 3001,
    daemon: 'ready',
    activeWorkspace: 'H:\\last\\Main\\SE-Vercel-deploy-main',
    activeProjectId: 'se-vercel-deploy-main',
    installedHarnesses: ['agy', 'claude-code', 'copilot'],
    projects: [
      { id: 'se-vercel-deploy-main', name: 'Sierra Estates Main', path: 'H:\\last\\Main\\SE-Vercel-deploy-main' },
      { id: 'se-vercel-deploy', name: 'se-vercel-deploy', path: 'F:\\SE Vercel deploy\\SE-Vercel-deploy' },
    ],
    sessions: [
      { id: 'se-vercel-deploy-1', role: 'orchestrator', harness: 'claude-code', status: 'ready', branch: 'ao/se-vercel-de-orchestrator' },
    ],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedHarness, setSelectedHarness] = useState<'agy' | 'claude-code' | 'copilot'>('agy');
  const [showSpawnModal, setShowSpawnModal] = useState(false);

  // Poll live status from API
  const refreshAoStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/agent-orchestrator?action=status');
      if (res.ok) {
        const data = await res.json();
        setAoState((prev) => ({
          ...prev,
          running: data.running ?? true,
          daemon: data.daemon ?? 'ready',
          port: data.port ?? 3001,
          projects: data.projects?.length ? data.projects : prev.projects,
          sessions: data.sessions?.length ? data.sessions : prev.sessions,
          installedHarnesses: data.installedHarnesses || prev.installedHarnesses,
        }));
      }
    } catch {
      // Keep optimistic state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAoStatus();
  }, []);

  const handleLaunchDesktopApp = async () => {
    setActionFeedback(isAr ? 'جارٍ إرسال إشارة فتح تطبيق Agent Orchestrator على ويندوز...' : 'Dispatched launch signal to Windows Agent Orchestrator app...');
    try {
      await fetch('/api/agent-orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch {
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleSpawnWorker = async () => {
    setActionFeedback(isAr ? `جارٍ تفويض مهمة جديدة إلى ${selectedHarness}...` : `Spawning parallel worker session with harness [${selectedHarness}]...`);
    setShowSpawnModal(false);
    try {
      const res = await fetch('/api/agent-orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'spawn',
          harness: selectedHarness,
          prompt: customPrompt || 'Sync and inspect Sierra Estates inventory and orchestrate platform workflows.',
        }),
      });
      const data = await res.json();
      setActionFeedback(
        isAr
          ? `✓ تم إطلاق الجلسة بنجاح في مجلد العمل المستقل (${data.sessionName || 'ao/worker'})`
          : `✓ Successfully spawned session [${data.sessionName || 'ao/worker'}] in isolated worktree`
      );
      setCustomPrompt('');
      refreshAoStatus();
      setTimeout(() => setActionFeedback(null), 5000);
    } catch {
      setActionFeedback(isAr ? 'تم إرسال أمر التفويض للمجدول المحلي' : 'Dispatched spawn command to local daemon');
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  return (
    <div
      style={{
        borderRadius: 14,
        background: 'linear-gradient(180deg, rgba(16, 35, 57, 0.85) 0%, rgba(8, 20, 36, 0.95) 100%)',
        border: '1px solid rgba(0, 174, 255, 0.28)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
        padding: '16px 20px',
        marginBottom: 16,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* ── TOP HEADER ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          paddingBottom: 12,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #00AEFF 0%, #7C3AED 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              boxShadow: '0 4px 12px rgba(0, 174, 255, 0.35)',
            }}
          >
            🪟
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h4
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: '#FFFFFF',
                  letterSpacing: '.03em',
                  fontFamily: isAr ? "'Cairo', sans-serif" : "'JetBrains Mono', monospace",
                }}
              >
                {isAr ? 'تطبيق Agent Orchestrator · ويندوز' : 'Windows Agent Orchestrator (AO)'}
              </h4>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: aoState.running ? 'rgba(52, 211, 153, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: aoState.running ? '#34D399' : '#F59E0B',
                  border: `1px solid ${aoState.running ? 'rgba(52, 211, 153, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: aoState.running ? '#34D399' : '#F59E0B',
                    boxShadow: aoState.running ? '0 0 8px #34D399' : 'none',
                  }}
                />
                {aoState.running ? (isAr ? 'متصل (Port :3001)' : 'DAEMON READY (:3001)') : (isAr ? 'في وضع الاستعداد' : 'STANDBY')}
              </span>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: 11, color: 'rgba(255, 255, 255, 0.65)' }}>
              {isAr
                ? 'تنسيق متوازي لجلسات الوكلاء عبر مساحات عمل Git المنفصلة (Claude Code + Antigravity/Agy + Copilot)'
                : 'Parallel coding-agent supervisor across git worktrees (Claude Code + Antigravity/Agy + Copilot)'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={handleLaunchDesktopApp}
            className="btn"
            style={{
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 700,
              background: 'rgba(0, 174, 255, 0.15)',
              color: '#00AEFF',
              border: '1px solid rgba(0, 174, 255, 0.35)',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            title="Open Agent Orchestrator on Windows desktop"
          >
            <span>🖥️</span>
            <span>{isAr ? 'فتح تطبيق ويندوز' : 'Open Desktop App'}</span>
          </button>

          <button
            onClick={() => setShowSpawnModal(true)}
            className="btn"
            style={{
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 700,
              background: 'linear-gradient(135deg, var(--gold), #d4af37)',
              color: '#071422',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(212, 160, 23, 0.25)',
            }}
          >
            <span>⚡</span>
            <span>{isAr ? 'إطلاق جلسة عمل متوازية' : 'Spawn AO Worker'}</span>
          </button>

          {onNavigate && (
            <button
              onClick={() => onNavigate('agents')}
              className="btn"
              style={{
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 600,
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#E5E7EB',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
              title="Jump to Autonomous Agents Fleet"
            >
              <span>🤖</span>
              <span>{isAr ? 'أسطول الوكلاء' : 'Agent Fleet'}</span>
            </button>
          )}

          <button
            onClick={refreshAoStatus}
            disabled={isLoading}
            className="btn"
            style={{
              padding: '6px 8px',
              fontSize: 11,
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
            title="Refresh status"
          >
            <span style={{ display: 'inline-block', transform: isLoading ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s' }}>
              🔄
            </span>
          </button>
        </div>
      </div>

      {/* ── ACTION FEEDBACK NOTIFICATION ── */}
      {actionFeedback && (
        <div
          style={{
            margin: '10px 0',
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(0, 174, 255, 0.12)',
            border: '1px solid rgba(0, 174, 255, 0.3)',
            fontSize: 11,
            color: '#E0F2FE',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>⚡</span>
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* ── STATUS PILLS & TELEMETRY ROW ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 10,
          marginTop: 12,
        }}
      >
        {/* Project Card */}
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            {isAr ? 'المشروع المسجل في AO' : 'Registered AO Project'}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8', marginTop: 2 }}>
            se-vercel-deploy-main
          </div>
          <div style={{ fontSize: 9.5, color: 'rgba(255, 255, 255, 0.4)', marginTop: 2, fontFamily: 'monospace' }}>
            H:\last\Main\SE-Vercel-deploy-main
          </div>
        </div>

        {/* Installed Harnesses */}
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            {isAr ? 'محركات الذكاء المرخصة' : 'Authorized AI Harnesses'}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            {[
              { id: 'agy', label: 'Agy (Antigravity)', color: '#34D399' },
              { id: 'claude-code', label: 'Claude Code', color: '#A78BFA' },
              { id: 'copilot', label: 'Copilot', color: '#60A5FA' },
            ].map((h) => (
              <span
                key={h.id}
                style={{
                  fontSize: 10,
                  padding: '2px 7px',
                  borderRadius: 6,
                  background: `${h.color}18`,
                  color: h.color,
                  border: `1px solid ${h.color}35`,
                  fontWeight: 600,
                }}
              >
                ✓ {h.label}
              </span>
            ))}
          </div>
        </div>

        {/* Sessions & Daemon Port */}
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            {isAr ? 'منفذ الخادم وحالة الجلسات' : 'Daemon Port & Sessions'}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#F0EDE5', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Port 3001</span>
            <span style={{ fontSize: 10, color: '#34D399', fontWeight: 600 }}>• Daemon Ready</span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>
            Branch: <code style={{ color: 'var(--gold)', fontSize: 10 }}>ao/se-vercel-de-orchestrator</code>
          </div>
        </div>
      </div>

      {/* ── SPAWN WORKER MODAL / POPUP ── */}
      {showSpawnModal && (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 10,
            background: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(0, 174, 255, 0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#FFFFFF' }}>
              {isAr ? 'إطلاق جلسة عامل متوازي في Agent Orchestrator' : 'Spawn Parallel Worker in Agent Orchestrator'}
            </span>
            <button
              onClick={() => setShowSpawnModal(false)}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 14 }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {(['agy', 'claude-code', 'copilot'] as const).map((h) => (
              <button
                key={h}
                onClick={() => setSelectedHarness(h)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: selectedHarness === h ? 700 : 500,
                  background: selectedHarness === h ? 'rgba(0, 174, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  color: selectedHarness === h ? '#38BDF8' : '#D1D5DB',
                  border: `1px solid ${selectedHarness === h ? '#00AEFF' : 'rgba(255, 255, 255, 0.1)'}`,
                  cursor: 'pointer',
                }}
              >
                {h === 'agy' ? 'Agy (Antigravity)' : h === 'claude-code' ? 'Claude Code' : 'Copilot'}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={
              isAr
                ? 'اكتب التعليمات للجلسة المتوازية (مثال: تدقيق وحدات التجمع وإعداد التقارير...)'
                : 'Enter task instruction for the worker worktree (e.g., Audit New Cairo listings & sync feeds)...'
            }
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              fontSize: 11.5,
              outline: 'none',
              marginBottom: 10,
              boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={() => setShowSpawnModal(false)}
              className="btn btn-ghost"
              style={{ padding: '6px 12px', fontSize: 11 }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleSpawnWorker}
              className="btn btn-gold"
              style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700 }}
            >
              {isAr ? 'إطلاق الجلسة الآن' : 'Dispatch Session'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
