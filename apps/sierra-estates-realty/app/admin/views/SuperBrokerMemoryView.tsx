'use client';

/**
 * Admin → AI Intelligence → Super Broker Memory (the Soul) — 2026-11-20.
 * One united memory spine: search/rank entries, read the consolidated Soul
 * digests, run the consolidation pass (LLM-routed via the free-provider
 * router when enabled), add facts, archive/delete entries.
 * Backend: /api/admin/soul (verifyAdminRequest-guarded).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Brain, RefreshCw, Archive, Trash2, Sparkles, Loader2, Search } from 'lucide-react';

interface SoulEntry {
  id: number;
  createdAt: string;
  kind: string;
  scope: string;
  agent: string;
  subject: string | null;
  content: string;
  importance: number;
  confidence: number;
  source: string | null;
}

interface SoulDigest {
  id: number;
  createdAt: string;
  period: string;
  periodStart: string;
  digest: string;
  insights: Array<{ text: string; tag?: string }>;
  provider: string | null;
  model: string | null;
  entryCount: number;
}

interface SoulStats {
  total: number;
  active: number;
  last24h: number;
  byKind: Record<string, number>;
  byAgent: Record<string, number>;
  lastDigest: SoulDigest | null;
  tableReady: boolean;
}

interface Props {
  lang?: 'ar' | 'en';
}

const KIND_COLORS: Record<string, string> = {
  observation: '#6aa9ff',
  insight: '#d4af37',
  fact: '#4ade80',
  event: '#f59e0b',
  reflection: '#c084fc',
  digest: '#94a3b8',
};

export default function SuperBrokerMemoryView({ lang = 'en' }: Props) {
  const isAr = lang === 'ar';
  const [stats, setStats] = useState<SoulStats | null>(null);
  const [entries, setEntries] = useState<SoulEntry[]>([]);
  const [digests, setDigests] = useState<SoulDigest[]>([]);
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const t = (en: string, ar: string) => (isAr ? ar : en);
  const cell: React.CSSProperties = { padding: '7px 10px', borderBottom: '1px solid var(--bd)', fontSize: 12.5 };
  const th: React.CSSProperties = { ...cell, fontWeight: 700, fontSize: 11, color: 'var(--tx-f)', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'left' };
  const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--bd)', background: 'transparent', color: 'var(--tx)', fontSize: 12, cursor: 'pointer' };
  const statCard: React.CSSProperties = { flex: '1 1 130px', minWidth: 130, border: '1px solid var(--bd)', borderRadius: 12, padding: '10px 14px', background: 'var(--bg-e)' };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ digests: '1', limit: '40' });
      if (query.trim()) params.set('q', query.trim());
      if (kindFilter) params.set('kind', kindFilter);
      const res = await fetch(`/api/admin/soul?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setStats(json.stats ?? null);
        setEntries(json.entries ?? []);
        setDigests(json.digests ?? []);
      } else {
        setMessage({ kind: 'error', text: `GET failed: HTTP ${res.status}` });
      }
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [query, kindFilter]);

  useEffect(() => { load(); }, [load]);

  const post = async (body: Record<string, unknown>, busyKey: string) => {
    setBusy(busyKey);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/soul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      const okRes = res.ok && json.success !== false;
      setMessage({
        kind: okRes ? 'ok' : 'error',
        text: okRes
          ? (json.deduped
              ? t('Already on the spine — duplicate skipped.', 'موجودة مسبقاً — تم تجاهل التكرار.')
              : t('Saved to the Soul.', 'تم الحفظ في الروح.'))
          : (json.error || `HTTP ${res.status}`),
      });
      if (res.ok && json.success !== false) await load();
      return json;
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
      return null;
    } finally {
      setBusy('');
    }
  };

  const consolidate = async () => {
    const json = await post({ action: 'consolidate', period: 'day' }, 'consolidate');
    if (json?.ok) {
      setMessage({
        kind: 'ok',
        text: json.llmSummarized
          ? t(`Digest via ${json.provider}/${json.model} over ${json.entryCount} entries.`, `تم التلخيص عبر ${json.provider}/${json.model} على ${json.entryCount} مدخل.`)
          : t(`Stats-only digest over ${json.entryCount} entries (no free-LLM provider enabled).`, `تلخيص إحصائي على ${json.entryCount} مدخل (لا مزود LLM مجاني مُفعّل).`),
      });
    }
  };

  const rememberNote = async () => {
    if (note.trim().length < 3) return;
    const json = await post({ action: 'remember', entry: { content: note.trim(), importance: 4 } }, 'remember');
    if (json?.ok) setNote('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Brain size={17} color="var(--ac)" /> {t('Super Broker Memory — the Soul', 'ذاكرة الوسيط الأعلى — الروح')}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--tx-f)', marginTop: 3 }}>
            {t(
              'One united memory spine: every engine and agent remembers here and recalls before acting. The consolidation pass grows it daily through the free-provider LLM router.',
              'ذاكرة موحدة واحدة: كل المحركات والوكلاء تكتب هنا وتستدعي قبل العمل، وتتغذّى يومياً عبر راوتر النماذج المجاني.',
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={btn} onClick={load} disabled={loading}>
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} {t('Reload', 'تحديث')}
          </button>
          <button style={{ ...btn, borderColor: 'var(--ac)', color: 'var(--ac)' }} onClick={consolidate} disabled={busy === 'consolidate'}>
            {busy === 'consolidate' ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} {t('Consolidate now', 'تلخيص الذاكرة الآن')}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ fontSize: 12.5, padding: '8px 12px', borderRadius: 8, border: `1px solid ${message.kind === 'ok' ? '#4ade8055' : '#f8717155'}`, color: message.kind === 'ok' ? '#4ade80' : '#f87171', background: 'var(--bg-e)' }}>
          {message.text}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <div style={statCard}>
          <div style={{ fontSize: 10.5, color: 'var(--tx-f)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('Total memories', 'إجمالي الذكريات')}</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{stats?.total ?? '—'}</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 10.5, color: 'var(--tx-f)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('Active', 'نشطة')}</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{stats?.active ?? '—'}</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 10.5, color: 'var(--tx-f)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('Last 24h', 'آخر ٢٤ ساعة')}</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{stats?.last24h ?? '—'}</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 10.5, color: 'var(--tx-f)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('Last digest', 'آخر تلخيص')}</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 4 }}>
            {stats?.lastDigest
              ? `${stats.lastDigest.entryCount} ${t('entries via', 'مدخل عبر')} ${stats.lastDigest.provider}/${stats.lastDigest.model}`
              : t(stats?.tableReady ? 'none yet — press Consolidate' : 'soul tables not applied yet (migration 054)', 'لا يوجد بعد — اضغط تلخيص')}
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 260px', border: '1px solid var(--bd)', borderRadius: 8, padding: '4px 10px', background: 'var(--bg-e)' }}>
          <Search size={14} color="var(--tx-f)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Search the broker memory…', 'ابحث في ذاكرة الوسيط…')}
            style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--tx)', fontSize: 12.5, outline: 'none' }}
          />
        </div>
        <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} style={{ ...btn, borderRadius: 8 }}>
          <option value="">{t('All kinds', 'كل الأنواع')}</option>
          {Object.keys(KIND_COLORS).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <div style={{ display: 'flex', flex: '1 1 260px', gap: 6 }}>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('Add a fact the brokerage should never forget…', 'أضف معلومة يجب ألا تُنسى…')}
            style={{ flex: 1, border: '1px solid var(--bd)', borderRadius: 8, padding: '6px 10px', background: 'var(--bg-e)', color: 'var(--tx)', fontSize: 12.5 }}
          />
          <button style={btn} onClick={rememberNote} disabled={busy === 'remember' || note.trim().length < 3}>
            {busy === 'remember' ? <Loader2 size={13} className="animate-spin" /> : t('Remember', 'تذكّر')}
          </button>
        </div>
      </div>

      {/* Entries */}
      <div style={{ border: '1px solid var(--bd)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-e)' }}>
              <th style={th}>{t('Kind', 'النوع')}</th>
              <th style={th}>{t('Agent', 'الوكيل')}</th>
              <th style={th}>{t('Subject', 'الموضوع')}</th>
              <th style={th}>{t('Memory', 'الذكريات')}</th>
              <th style={th}>{t('Imp.', 'الأهمية')}</th>
              <th style={th}>{t('When', 'الوقت')}</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr><td style={cell} colSpan={7}>{t('No memories match yet — write facts, let engines observe, or run Consolidate.', 'لا ذكريات مطابقة بعد — أضف معلومات أو شغّل التلخيص.')}</td></tr>
            )}
            {entries.map((e) => (
              <tr key={e.id}>
                <td style={cell}>
                  <span style={{ color: KIND_COLORS[e.kind] || 'var(--tx)', fontWeight: 700, fontSize: 11 }}>{e.kind}</span>
                </td>
                <td style={cell}>{e.agent}</td>
                <td style={cell}>{e.subject || '—'}</td>
                <td style={{ ...cell, maxWidth: 420 }}>{e.content}</td>
                <td style={cell}>{'★'.repeat(e.importance)}</td>
                <td style={cell}>{new Date(e.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })}</td>
                <td style={cell}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button style={btn} title={t('Archive', 'أرشفة')} onClick={() => post({ action: 'archive', id: e.id }, `archive-${e.id}`)} disabled={busy === `archive-${e.id}`}>
                      <Archive size={12} />
                    </button>
                    <button style={{ ...btn, color: '#f87171' }} title={t('Delete', 'حذف')} onClick={() => post({ action: 'delete', id: e.id }, `delete-${e.id}`)} disabled={busy === `delete-${e.id}`}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Digests timeline */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>{t('Soul digests (consolidated)', 'تلخيصات الروح (المدمجة)')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {digests.length === 0 && <div style={{ fontSize: 12, color: 'var(--tx-f)' }}>{t('No digests yet.', 'لا تلخيصات بعد.')}</div>}
          {digests.map((d) => (
            <div key={d.id} style={{ border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', background: 'var(--bg-e)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--tx-f)' }}>
                  {d.period} · {d.periodStart} · {d.entryCount} {t('entries', 'مدخل')} · {d.provider}/{d.model}
                </span>
                <span style={{ fontSize: 11, color: 'var(--tx-f)' }}>{new Date(d.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
              <div style={{ fontSize: 12.5, whiteSpace: 'pre-wrap' }}>{d.digest}</div>
              {(d.insights?.length ?? 0) > 0 && (
                <ul style={{ margin: '6px 0 0', paddingInlineStart: 18 }}>
                  {d.insights.map((i, idx) => (
                    <li key={idx} style={{ fontSize: 12, color: 'var(--tx)' }}>{i.text}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
