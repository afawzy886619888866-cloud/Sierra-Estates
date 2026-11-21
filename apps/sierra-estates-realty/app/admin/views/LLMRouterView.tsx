'use client';

/**
 * Admin → AI Intelligence → LLM Router (freellmapi integration, 2026-11-20)
 * Edit the agent free-LLM routing table: enable/order/test free providers,
 * point base URLs, reference env-var key NAMES (never key values), trigger
 * the catalog refresh (GET /models discovery) and watch per-agent usage.
 * Backend: /api/admin/llm-router (verifyAdminRequest-guarded).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Play, Save, RotateCcw, CheckCircle2, XCircle, Loader2, AlertTriangle, Zap } from 'lucide-react';

interface ProviderRow {
  id: number;
  slug: string;
  label: string;
  kind: string;
  base_url: string;
  api_key_env: string | null;
  default_model: string | null;
  enabled: boolean;
  priority: number;
  models: Array<{ id: string; owned_by?: string }>;
  health: { status?: 'ok' | 'error'; latencyMs?: number; checkedAt?: string; lastError?: string };
  notes?: string;
}

interface UsageRow {
  agent: string;
  providerSlug: string;
  model: string | null;
  status: string;
  latencyMs: number;
  createdAt: string;
  error: string | null;
}

interface RouterData {
  providers: ProviderRow[];
  keyPresence: Record<string, boolean>;
  recentUsage: UsageRow[];
  totals: { attempts: number; ok: number; failed: number };
}

interface Props {
  lang?: 'ar' | 'en';
}

export default function LLMRouterView({ lang = 'en' }: Props) {
  const isAr = lang === 'ar';
  const [data, setData] = useState<RouterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState<ProviderRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/llm-router');
      if (res.ok) setData(await res.json());
      else setMessage({ kind: 'error', text: `GET failed: HTTP ${res.status}` });
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const post = async (body: Record<string, unknown>, busyKey: string) => {
    setBusy(busyKey);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/llm-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      setMessage({ kind: res.ok ? 'ok' : 'error', text: json.message || json.error || `HTTP ${res.status}` });
      if (res.ok) await load();
      return json;
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
      return null;
    } finally {
      setBusy('');
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    await post(
      {
        action: 'update',
        slug: editing.slug,
        patch: {
          baseUrl: editing.base_url,
          priority: editing.priority,
          enabled: editing.enabled,
          defaultModel: editing.default_model,
          apiKeyEnv: editing.api_key_env,
        },
      },
      `save-${editing.slug}`,
    );
    setEditing(null);
  };

  const t = (en: string, ar: string) => (isAr ? ar : en);
  const cell: React.CSSProperties = { padding: '7px 10px', borderBottom: '1px solid var(--bd)', fontSize: 12.5 };
  const th: React.CSSProperties = { ...cell, fontWeight: 700, fontSize: 11, color: 'var(--tx-f)', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'left' };
  const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--bd)', background: 'transparent', color: 'var(--tx)', fontSize: 12, cursor: 'pointer' };
  const input: React.CSSProperties = { width: '100%', padding: '6px 9px', borderRadius: 8, border: '1px solid var(--bd)', background: 'var(--bg-e)', color: 'var(--tx)', fontSize: 12.5, fontFamily: 'JetBrains Mono, monospace' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={17} color="var(--ac)" /> {t('LLM Router — Free Provider Fleet', 'راوتر النماذج — أسطول المزودين المجانيين')}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--tx-f)', marginTop: 3 }}>
            {t(
              'freellmapi integration: agents route across free LLM providers (wise failover, health-checked, admin-ordered). Keys are referenced by env-var NAME only.',
              'تكامل freellmapi: يوجَّه الوكلاء عبر مزودي النماذج المجانيين مع تجاوز ذكي وفحص صحة. تُخزَّن مفاتيح كأسماء متغيرات بيئة فقط.'
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btn} onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> {t('Reload', 'تحديث')}
          </button>
          <button style={btn} onClick={() => post({ action: 'refresh' }, 'refresh-all')} disabled={busy === 'refresh-all'}>
            {busy === 'refresh-all' ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />} {t('Refresh catalogs now', 'تحديث الفهارس الآن')}
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, fontSize: 12.5,
          background: message.kind === 'ok' ? 'rgba(52,211,153,.09)' : 'rgba(230,57,70,.09)',
          border: `1px solid ${message.kind === 'ok' ? 'rgba(52,211,153,.35)' : 'rgba(230,57,70,.35)'}`,
          color: message.kind === 'ok' ? '#34D399' : '#E63946',
        }}>
          {message.kind === 'ok' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {message.text}
        </div>
      )}

      {/* Totals */}
      {data && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {[
            { label: t('Providers enabled', 'مزودون مفعّلون'), value: `${data.providers.filter((p) => p.enabled).length}/${data.providers.length}` },
            { label: t('Models discovered', 'نماذج مكتشفة'), value: String(data.providers.reduce((s, p) => s + (p.models?.length ?? 0), 0)) },
            { label: t('Recent attempts', 'محاولات حديثة'), value: String(data.totals.attempts) },
            { label: t('Success rate', 'نسبة النجاح'), value: data.totals.attempts ? `${Math.round((data.totals.ok / data.totals.attempts) * 100)}%` : '—' },
          ].map((s) => (
            <div key={s.label} style={{ padding: '9px 14px', borderRadius: 12, border: '1px solid var(--bd)', background: 'var(--bg-e)', minWidth: 130 }}>
              <div style={{ fontSize: 17, fontWeight: 800 }}>{s.value}</div>
              <div style={{ fontSize: 10.5, color: 'var(--tx-f)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Provider table */}
      <div style={{ borderRadius: 14, border: '1px solid var(--bd)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ background: 'var(--bg-e)' }}>
              <th style={th}>{t('Provider', 'المزود')}</th>
              <th style={th}>{t('Pri', 'أولوية')}</th>
              <th style={th}>{t('Base URL', 'العنوان')}</th>
              <th style={th}>{t('Models', 'النماذج')}</th>
              <th style={th}>{t('Health', 'الصحة')}</th>
              <th style={th}>{t('Key env', 'متغير المفتاح')}</th>
              <th style={th}>{t('Actions', 'إجراءات')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td style={{ ...cell, textAlign: 'center', padding: 24 }} colSpan={7}><Loader2 size={18} className="spin" /></td></tr>
            )}
            {!loading && data?.providers.map((p) => (
              <tr key={p.slug} style={{ opacity: p.enabled ? 1 : 0.62 }}>
                <td style={cell}>
                  <div style={{ fontWeight: 700, fontSize: 12.5 }}>{p.label}</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--tx-f)' }}>{p.slug} · {p.kind}</div>
                </td>
                <td style={cell}>{p.priority}</td>
                <td style={{ ...cell, fontFamily: 'JetBrains Mono', fontSize: 10.5, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.base_url}>{p.base_url}</td>
                <td style={cell}>
                  {p.models?.length > 0 ? (
                    <span title={p.models.slice(0, 8).map((m) => m.id).join('\n')}>{p.models.length} {p.default_model ? `· ${p.default_model}` : ''}</span>
                  ) : (
                    <span style={{ color: 'var(--tx-f)' }}>— {p.default_model || ''}</span>
                  )}
                </td>
                <td style={cell}>
                  {p.health?.status === 'ok' && <span style={{ color: '#34D399' }}>● {p.health.latencyMs ?? '?'}ms</span>}
                  {p.health?.status === 'error' && <span style={{ color: '#E63946' }} title={p.health.lastError}>● err</span>}
                  {!p.health?.status && <span style={{ color: 'var(--tx-f)' }}>○ {t('unknown', 'غير معروف')}</span>}
                </td>
                <td style={{ ...cell, fontFamily: 'JetBrains Mono', fontSize: 10.5 }}>
                  {data?.keyPresence?.[p.slug] ? (
                    <span style={{ color: '#34D399' }}>✓ {p.api_key_env || 'keyless'}</span>
                  ) : (
                    <span style={{ color: 'var(--tx-f)' }}>{p.api_key_env || 'keyless'}</span>
                  )}
                </td>
                <td style={cell}>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <button style={btn} onClick={() => post({ action: 'update', slug: p.slug, patch: { enabled: !p.enabled } }, `toggle-${p.slug}`)} disabled={busy === `toggle-${p.slug}`}>
                      {p.enabled ? '⏸' : '▶'} {p.enabled ? t('Disable', 'إيقاف') : t('Enable', 'تفعيل')}
                    </button>
                    <button style={btn} onClick={() => post({ action: 'test', slug: p.slug }, `test-${p.slug}`)} disabled={busy === `test-${p.slug}`}>
                      {busy === `test-${p.slug}` ? <Loader2 size={12} className="spin" /> : <Play size={12} />} Test
                    </button>
                    <button style={btn} onClick={() => setEditing({ ...p })}>✎ Edit</button>
                    <button style={btn} onClick={() => post({ action: 'reset', slug: p.slug }, `reset-${p.slug}`)} disabled={busy === `reset-${p.slug}`}>
                      <RotateCcw size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit drawer */}
      {editing && (
        <div style={{ borderRadius: 14, border: '1px solid var(--ac)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg-e)' }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>✎ {editing.label} <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--tx-f)' }}>/{editing.slug}</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            <label style={{ fontSize: 11, color: 'var(--tx-f)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              Base URL
              <input style={input} value={editing.base_url} onChange={(e) => setEditing({ ...editing, base_url: e.target.value })} />
            </label>
            <label style={{ fontSize: 11, color: 'var(--tx-f)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {t('Key env var NAMES (comma-separated — never values)', 'أسماء متغيرات المفتاح (مفصولة بفواصل — لا قيم)')}
              <input style={input} value={editing.api_key_env ?? ''} onChange={(e) => setEditing({ ...editing, api_key_env: e.target.value })} />
            </label>
            <label style={{ fontSize: 11, color: 'var(--tx-f)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              Default model
              <input style={input} value={editing.default_model ?? ''} onChange={(e) => setEditing({ ...editing, default_model: e.target.value })} placeholder={t('empty = first discovered', 'فارغ = أول نموذج مكتشف')} />
            </label>
            <label style={{ fontSize: 11, color: 'var(--tx-f)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              Priority (lower = tried first)
              <input style={input} type="number" value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) || 1 })} />
            </label>
          </div>
          {editing.notes && <div style={{ fontSize: 11, color: 'var(--tx-f)', lineHeight: 1.5 }}>{editing.notes}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...btn, background: 'var(--ac)', color: '#fff', border: 'none' }} onClick={saveEdit} disabled={busy === `save-${editing.slug}`}>
              {busy === `save-${editing.slug}` ? <Loader2 size={13} className="spin" /> : <Save size={13} />} {t('Save', 'حفظ')}
            </button>
            <button style={btn} onClick={() => setEditing(null)}>{t('Cancel', 'إلغاء')}</button>
          </div>
        </div>
      )}

      {/* Recent usage */}
      {data && data.recentUsage.length > 0 && (
        <div style={{ borderRadius: 14, border: '1px solid var(--bd)', overflowX: 'auto' }}>
          <div style={{ padding: '10px 12px', fontSize: 12.5, fontWeight: 800, borderBottom: '1px solid var(--bd)' }}>
            {t('Recent routing attempts (last 25)', 'آخر محاولات التوجيه (25)')}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: 'var(--bg-e)' }}>
                <th style={th}>{t('When', 'الوقت')}</th>
                <th style={th}>{t('Agent', 'الوكيل')}</th>
                <th style={th}>{t('Provider', 'المزود')}</th>
                <th style={th}>{t('Model', 'النموذج')}</th>
                <th style={th}>{t('Status', 'الحالة')}</th>
                <th style={th}>{t('Latency', 'الزمن')}</th>
              </tr>
            </thead>
            <tbody>
              {data.recentUsage.map((u, i) => (
                <tr key={i}>
                  <td style={{ ...cell, fontFamily: 'JetBrains Mono', fontSize: 10.5 }}>{new Date(u.createdAt).toLocaleTimeString()}</td>
                  <td style={cell}>{u.agent}</td>
                  <td style={{ ...cell, fontFamily: 'JetBrains Mono', fontSize: 10.5 }}>{u.providerSlug}</td>
                  <td style={{ ...cell, fontFamily: 'JetBrains Mono', fontSize: 10.5 }}>{u.model ?? '—'}</td>
                  <td style={cell}>
                    {u.status === 'ok' ? <span style={{ color: '#34D399' }}>✓</span> : <span style={{ color: '#E63946' }} title={u.error ?? ''}>✗</span>}
                  </td>
                  <td style={cell}>{u.latencyMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && (!data || data.providers.length === 0) && (
        <div style={{ textAlign: 'center', padding: 26, color: 'var(--tx-f)', fontSize: 12.5, border: '1px dashed var(--bd)', borderRadius: 14 }}>
          {t('No providers loaded — is migration 20261120_053_agent_llm_router.sql applied?', 'لا يوجد مزودون — تأكد من تطبيق ترحيل 20261120_053_agent_llm_router.sql')}
        </div>
      )}
    </div>
  );
}
