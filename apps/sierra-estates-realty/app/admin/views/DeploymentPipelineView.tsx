'use client';

import React, { useState } from 'react';

interface PipelineStage {
  id: string;
  name: { en: string; ar: string };
  status: 'completed' | 'in_progress' | 'pending' | 'failed' | 'gate';
  duration?: string;
  details: { en: string; ar: string };
  icon: string;
}

interface DeploymentRun {
  id: string;
  commitSha: string;
  branch: string;
  message: string;
  author: string;
  environment: 'production' | 'staging';
  status: 'success' | 'running' | 'rollback';
  timestamp: string;
  duration: string;
}

export default function DeploymentPipelineView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [selectedStrategy, setSelectedStrategy] = useState<'canary' | 'blue_green' | 'rolling' | 'flags'>('canary');
  const [isDeploying, setIsDeploying] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved'>('pending');
  const [rollbackModalOpen, setRollbackModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const stages: PipelineStage[] = [
    {
      id: 'source',
      name: { en: '1. Source Checkout', ar: '1. استلام الكود' },
      status: 'completed',
      duration: '4s',
      details: { en: 'GitHub Actions checkout ref: main (SHA: b81d7f2)', ar: 'سحب التغييرات من الفرع الرئيسي main' },
      icon: '📦',
    },
    {
      id: 'build',
      name: { en: '2. Monorepo Build', ar: '2. بناء الحزم' },
      status: 'completed',
      duration: '48s',
      details: { en: 'Turborepo: Next.js 15 SSR bundle & Python wheels built', ar: 'بناء حزم Next.js وتجميع حزم بايثون' },
      icon: '⚙️',
    },
    {
      id: 'test',
      name: { en: '3. Test & Security', ar: '3. الفحص والأمان' },
      status: 'completed',
      duration: '22s',
      details: { en: 'TypeScript check, RLS audit, OWASP scan passed (0 vuln)', ar: 'فحص الأنواع وتدقيق قواعد RLS واختبارات الأمان' },
      icon: '🛡️',
    },
    {
      id: 'staging',
      name: { en: '4. Staging Deploy', ar: '4. بيئة التجربة' },
      status: 'completed',
      duration: '31s',
      details: { en: 'Deployed to staging.sierra-estates.net · E2E tests verified', ar: 'تم النشر بنجاح على سيرفر المعاينة واجتياز الاختبارات' },
      icon: '🧪',
    },
    {
      id: 'gate',
      name: { en: '5. Manual Approval Gate', ar: '5. بوابة الاعتماد' },
      status: approvalStatus === 'approved' ? 'completed' : 'gate',
      duration: approvalStatus === 'approved' ? 'Verified' : 'Awaiting',
      details: {
        en: approvalStatus === 'approved' ? 'Approved by Executive Admin' : 'Review staging metrics before promoting to Prod',
        ar: approvalStatus === 'approved' ? 'تم الاعتماد من المشرف الأعلى' : 'بانتظار مراجعة المقاييس قبل النشر للإنتاج'
      },
      icon: '✋',
    },
    {
      id: 'production',
      name: { en: '6. Production Deploy', ar: '6. النشر للإنتاج' },
      status: approvalStatus === 'approved' ? 'completed' : 'pending',
      duration: approvalStatus === 'approved' ? '18s' : '--',
      details: { en: 'Promoting canary rollout to Vercel Edge & Cloud Run', ar: 'ترقية النشر التراكمي إلى سيرفرات الإنتاج' },
      icon: '🚀',
    },
    {
      id: 'verify',
      name: { en: '7. Health Verification', ar: '7. التحقق والمراقبة' },
      status: approvalStatus === 'approved' ? 'completed' : 'pending',
      duration: approvalStatus === 'approved' ? 'Active' : '--',
      details: { en: 'Prometheus error rate < 0.01% · Health probes 200 OK', ar: 'معدل الأخطاء أقل من 0.01% والمراقبة نشطة' },
      icon: '🩺',
    },
  ];

  const recentRuns: DeploymentRun[] = [
    {
      id: 'dep-904',
      commitSha: 'b81d7f2',
      branch: 'main',
      message: 'feat: activate admin console map & obsidian telemetry',
      author: 'Lead Architect',
      environment: 'production',
      status: 'success',
      timestamp: '14 min ago',
      duration: '1m 45s',
    },
    {
      id: 'dep-903',
      commitSha: '4f29a1c',
      branch: 'main',
      message: 'refactor: harmonize cspell domain vocabulary and types',
      author: 'AI Agent',
      environment: 'production',
      status: 'success',
      timestamp: '2 hrs ago',
      duration: '1m 32s',
    },
    {
      id: 'dep-902',
      commitSha: '7e83b09',
      branch: 'feat/ecc-memory',
      message: 'fix: optimize pgvector query latency for compound search',
      author: 'Data Engineer',
      environment: 'staging',
      status: 'success',
      timestamp: '5 hrs ago',
      duration: '1m 20s',
    },
    {
      id: 'dep-901',
      commitSha: '01d4a8e',
      branch: 'main',
      message: 'rollback: revert experimental websocket proxy config',
      author: 'Site Reliability',
      environment: 'production',
      status: 'rollback',
      timestamp: '1 day ago',
      duration: '42s',
    },
  ];

  return (
    <div className="fade-up" style={{ paddingBottom: 40, direction: isAr ? 'rtl' : 'ltr' }}>
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: isAr ? 'auto' : 24,
            left: isAr ? 24 : 'auto',
            zIndex: 10000,
            background: 'linear-gradient(135deg, #0F2035, #0B1A2E)',
            border: '1px solid #34D399',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7), 0 0 15px rgba(52, 211, 153, 0.2)',
            padding: '12px 20px',
            borderRadius: 12,
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>✅</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(15, 32, 53, 0.95) 0%, rgba(8, 18, 32, 0.98) 100%)',
          border: '1px solid rgba(52, 211, 153, 0.25)',
          borderRadius: 20,
          padding: '28px 32px',
          marginBottom: 24,
          boxShadow: '0 16px 36px -8px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span
              style={{
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#34D399',
                padding: '3px 8px',
                borderRadius: 6,
                background: 'rgba(52, 211, 153, 0.1)',
                border: '1px solid rgba(52, 211, 153, 0.25)',
              }}
            >
              {isAr ? 'خطوط النشر والإنتاج' : 'MULTI-STAGE CI/CD CONTROL'}
            </span>
            <span style={{ fontSize: 11, color: '#34D399', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="pulse-dot">●</span> {isAr ? 'الإنتاج مستقر · Vercel Edge' : 'Production Nominal · Vercel Edge'}
            </span>
          </div>
          <h1
            style={{
              fontSize: '1.85rem',
              fontWeight: isAr ? 700 : 600,
              fontFamily: isAr ? "'Cairo', sans-serif" : "'Cormorant Garamond', serif",
              color: '#FFFFFF',
              marginBottom: 6,
            }}
          >
            {isAr ? 'مركز إدارة النشر والبيئات السحابية' : 'Deployment Pipeline & Progressive Delivery'}
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(240, 237, 229, 0.72)', maxWidth: 640 }}>
            {isAr
              ? 'متابعة خط النشر متعدد المراحل، بوابات الموافقة اليدوية، واستراتيجيات الترقية التدريجية مع دعم الاسترجاع الفوري.'
              : 'Multi-stage pipeline telemetry adhering to deployment-pipeline-design standards with approval gates, blue-green cutover, and automated rollback.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => {
              setIsDeploying(true);
              setTimeout(() => {
                setIsDeploying(false);
                showToast(isAr ? 'تم تشغيل خط النشر التجريبي بنجاح' : 'Staging deployment pipeline triggered successfully');
              }, 1200);
            }}
            disabled={isDeploying}
            style={{
              padding: '10px 18px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #00AEFF, #1E88D9)',
              color: '#071422',
              fontSize: 12.5,
              fontWeight: 700,
              border: 'none',
              cursor: isDeploying ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(0, 174, 255, 0.3)',
            }}
          >
            <span>{isDeploying ? '⏳' : '⚡'}</span>
            <span>{isDeploying ? (isAr ? 'جارِ النشر...' : 'Deploying...') : (isAr ? 'تشغيل خط النشر' : 'Trigger Pipeline')}</span>
          </button>

          <button
            onClick={() => setRollbackModalOpen(true)}
            style={{
              padding: '10px 16px',
              borderRadius: 12,
              background: 'rgba(230, 57, 70, 0.12)',
              border: '1px solid rgba(230, 57, 70, 0.35)',
              color: '#E63946',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>↩️</span>
            <span>{isAr ? 'استرجاع إصدار سابق' : 'Rollback'}</span>
          </button>
        </div>
      </div>

      {/* Infrastructure Nodes Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          { name: 'Vercel Edge Global', status: 'HEALTHY', latency: '42ms', uptime: '99.99%', tech: 'Next.js 15 SSR', color: '#00AEFF' },
          { name: 'Cloud Run Python API', status: 'HEALTHY', latency: '128ms', uptime: '99.95%', tech: 'FastAPI 3.12', color: '#10B981' },
          { name: 'Supabase Postgres 16', status: 'HEALTHY', latency: '18ms', uptime: '99.99%', tech: 'pgvector + RLS', color: '#34D399' },
          { name: 'n8n Automation Engine', status: 'RUNNING', latency: '85ms', uptime: '99.90%', tech: 'Docker :5678', color: '#8B5CF6' },
        ].map((node, i) => (
          <div
            key={i}
            style={{
              background: 'rgba(15, 32, 53, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              padding: '16px 18px',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>{node.name}</span>
              <span
                style={{
                  fontSize: 9.5,
                  fontFamily: 'JetBrains Mono, monospace',
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: `${node.color}18`,
                  color: node.color,
                  fontWeight: 700,
                }}
              >
                {node.status}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(240, 237, 229, 0.5)', marginBottom: 10 }}>{node.tech}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(240, 237, 229, 0.75)' }}>
              <span>{isAr ? 'الاستجابة:' : 'Latency:'} <strong style={{ color: '#FFFFFF' }}>{node.latency}</strong></span>
              <span>{isAr ? 'التوفر:' : 'Uptime:'} <strong style={{ color: '#FFFFFF' }}>{node.uptime}</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline Stage Flow */}
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(15, 32, 53, 0.85) 0%, rgba(9, 20, 36, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 18,
          padding: '22px 24px',
          marginBottom: 24,
          boxShadow: '0 14px 32px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
              {isAr ? 'مراحل خط النشر الحالية (Main Pipeline)' : 'Current Multi-Stage Pipeline Execution'}
            </h2>
            <div style={{ fontSize: 11.5, color: 'rgba(240, 237, 229, 0.5)' }}>
              {isAr ? 'المرجع: commit b81d7f2 بواسطة Lead Architect' : 'Target: commit b81d7f2 by Lead Architect'}
            </div>
          </div>

          {/* Strategy Picker */}
          <div style={{ display: 'flex', gap: 6, background: 'rgba(255, 255, 255, 0.04)', padding: 4, borderRadius: 10 }}>
            {[
              { id: 'canary', label: 'Canary (10%→100%)' },
              { id: 'blue_green', label: 'Blue / Green' },
              { id: 'rolling', label: 'Rolling Update' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStrategy(st.id as any)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: selectedStrategy === st.id ? 700 : 500,
                  background: selectedStrategy === st.id ? 'rgba(0, 174, 255, 0.25)' : 'transparent',
                  color: selectedStrategy === st.id ? '#FFFFFF' : 'rgba(240, 237, 229, 0.6)',
                  border: selectedStrategy === st.id ? '1px solid rgba(0, 174, 255, 0.4)' : 'none',
                  cursor: 'pointer',
                }}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Stage Nodes */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 12,
            position: 'relative',
          }}
        >
          {stages.map((st, i) => {
            const isCompleted = st.status === 'completed';
            const isGate = st.status === 'gate';
            return (
              <div
                key={st.id}
                style={{
                  background: isGate
                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))'
                    : isCompleted
                    ? 'linear-gradient(135deg, rgba(52, 211, 153, 0.12), rgba(52, 211, 153, 0.03))'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: isGate
                    ? '1px solid rgba(245, 158, 11, 0.4)'
                    : isCompleted
                    ? '1px solid rgba(52, 211, 153, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 12,
                  padding: '14px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 18 }}>{st.icon}</span>
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: 'JetBrains Mono, monospace',
                      padding: '1px 5px',
                      borderRadius: 4,
                      background: isGate ? 'rgba(245, 158, 11, 0.2)' : isCompleted ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255,255,255,0.06)',
                      color: isGate ? '#F59E0B' : isCompleted ? '#34D399' : 'rgba(240, 237, 229, 0.4)',
                      fontWeight: 700,
                    }}
                  >
                    {st.duration}
                  </span>
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>
                  {isAr ? st.name.ar : st.name.en}
                </div>

                <div style={{ fontSize: 10, color: 'rgba(240, 237, 229, 0.55)', lineHeight: 1.4 }}>
                  {isAr ? st.details.ar : st.details.en}
                </div>

                {isGate && approvalStatus === 'pending' && (
                  <button
                    onClick={() => {
                      setApprovalStatus('approved');
                      showToast(isAr ? 'تم اعتماد الترقية للإنتاج بنجاح' : 'Production promotion gate approved!');
                    }}
                    style={{
                      marginTop: 4,
                      padding: '5px 8px',
                      borderRadius: 6,
                      background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                      color: '#000000',
                      fontSize: 10.5,
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    ✓ {isAr ? 'اعتماد النشر' : 'Approve Gate'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Deployment History Table */}
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(15, 32, 53, 0.8) 0%, rgba(9, 20, 36, 0.9) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 18,
          padding: '22px 24px',
          boxShadow: '0 14px 32px rgba(0, 0, 0, 0.45)',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', marginBottom: 14 }}>
          {isAr ? 'سجل عمليات النشر والترقيات السابقة' : 'Recent Deployment Ledger & Audit History'}
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: isAr ? 'right' : 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(240, 237, 229, 0.45)' }}>
                <th style={{ padding: '10px 12px' }}>{isAr ? 'المعرف' : 'Run ID'}</th>
                <th style={{ padding: '10px 12px' }}>{isAr ? 'الفرع والـ SHA' : 'Branch / Commit'}</th>
                <th style={{ padding: '10px 12px' }}>{isAr ? 'رسالة الإيداع' : 'Commit Message'}</th>
                <th style={{ padding: '10px 12px' }}>{isAr ? 'البيئة' : 'Environment'}</th>
                <th style={{ padding: '10px 12px' }}>{isAr ? 'الحالة' : 'Status'}</th>
                <th style={{ padding: '10px 12px' }}>{isAr ? 'الوقت' : 'Timestamp'}</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((r) => (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    color: 'rgba(240, 237, 229, 0.85)',
                  }}
                >
                  <td style={{ padding: '12px 12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--gold, #00AEFF)' }}>
                    {r.id}
                  </td>
                  <td style={{ padding: '12px 12px' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>
                      {r.branch}@{r.commitSha}
                    </span>
                  </td>
                  <td style={{ padding: '12px 12px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.message}
                  </td>
                  <td style={{ padding: '12px 12px', textTransform: 'capitalize' }}>
                    {r.environment}
                  </td>
                  <td style={{ padding: '12px 12px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 10,
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 700,
                        background: r.status === 'success' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(230, 57, 70, 0.15)',
                        color: r.status === 'success' ? '#34D399' : '#E63946',
                      }}
                    >
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 12px', color: 'rgba(240, 237, 229, 0.45)' }}>
                    {r.timestamp} ({r.duration})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rollback Modal */}
      {rollbackModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setRollbackModalOpen(false)}
        >
          <div
            style={{
              background: 'linear-gradient(180deg, #162B44 0%, #0D1C2E 100%)',
              border: '1px solid rgba(230, 57, 70, 0.4)',
              borderRadius: 16,
              padding: 24,
              maxWidth: 480,
              width: '90%',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>⚠️</span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
                {isAr ? 'تأكيد استرجاع الإصدار (Rollback Confirmation)' : 'Confirm Production Rollback'}
              </h3>
            </div>
            <p style={{ fontSize: 12.5, color: 'rgba(240, 237, 229, 0.75)', lineHeight: 1.5, marginBottom: 20 }}>
              {isAr
                ? 'سيتم فوراً توجيه حركة المرور بنسبة 100% إلى الإصدار المستقر السابق (SHA: 4f29a1c). هل أنت متأكد من المتابعة؟'
                : 'Traffic will be immediately shifted 100% to the previous verified release (SHA: 4f29a1c). Are you sure you want to trigger this automated rollback?'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setRollbackModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  setRollbackModalOpen(false);
                  showToast(isAr ? 'تم تنفيذ الاسترجاع الفوري بنجاح' : 'Rollback triggered successfully! Traffic routed to SHA: 4f29a1c');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #E63946, #D90429)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                {isAr ? 'تأكيد الاسترجاع' : 'Execute Rollback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
