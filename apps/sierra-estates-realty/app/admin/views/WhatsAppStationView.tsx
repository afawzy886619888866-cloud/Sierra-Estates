'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Sierra Estates — WhatsApp Station (admin window)
 * ───────────────────────────────────────────────────────────────────────────
 * Control plane for the portable WhatsApp Listing Station skill
 * (packages/whatsapp-station). The window shows, honestly:
 *   • runner + gateway reachability (never dressed up when offline)
 *   • QR pairing through the existing 8-line gateway QR proxy
 *   • the registered broker groups (public.whatsapp_station_groups)
 *   • waiting-list counts · RAG availability · USB import path
 *   • one-click "Scrape now" → runner workflow `whatsapp-station`
 * The admin server never holds a WhatsApp session (ban-safe second-
 * session policy) — the runner host beside the gateway does the work.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface StationStatus {
  runner: { reachable: boolean; configured: boolean; station: Record<string, unknown> | null };
  gateway: { urlConfigured: boolean };
  counts: Record<string, number>;
  groups: Array<{ id: string; group_name: string; broker_names: string; line: string; active: boolean }>;
  rag: { configured: boolean };
  usb: { dirConfigured: boolean };
}

interface StepLog {
  step: string;
  status: string;
  detail: string;
}

export default function WhatsAppStationView({ lang }: { lang: string }) {
  const isAr = lang === 'ar';
  const [status, setStatus] = useState<StationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'scrape' | 'request' | 'usb' | null>(null);
  const [result, setResult] = useState<{ ok: boolean; mode?: string; message?: string; steps?: StepLog[] } | null>(null);
  const [pairing, setPairing] = useState(false);
  const [qr, setQr] = useState<{ hasQr?: boolean; qrDataUrl?: string | null; status?: string; line?: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/whatsapp-station', { cache: 'no-store' });
      const json = await res.json();
      setStatus(json);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // QR polling — only while the operator is actively pairing
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (!pairing) return;
    const tick = async () => {
      try {
        const res = await fetch('/api/admin/whatsapp/qr?line=line-1', { cache: 'no-store' });
        const json = await res.json();
        setQr(json);
      } catch { setQr(null); }
    };
    tick();
    pollRef.current = setInterval(tick, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pairing]);

  const trigger = async (action: 'scrape' | 'request' | 'usb') => {
    setBusy(action);
    setResult(null);
    try {
      const res = await fetch('/api/admin/whatsapp-station', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action === 'usb' ? 'usb-import' : action }),
      });
      const json = await res.json();
      setResult({ ok: Boolean(json.success), mode: json.mode, message: json.message || json.note || (json.success ? 'Run accepted by runner.' : 'Run failed — see runner logs.') });
    } catch (err) {
      setResult({ ok: false, message: (err as Error).message });
    } finally {
      setBusy(null);
      load();
    }
  };

  const chip = (ok: boolean, okText: string, badText: string, cls = 'nb-green') => (
    <span className={`nb ${ok ? cls : 'nb-red'}`} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999 }}>{ok ? okText : badText}</span>
  );

  const counts = status?.counts || {};

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <style jsx>{`
        @keyframes stationPulse { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,.45);} 70% { box-shadow: 0 0 0 12px rgba(16,185,129,0);} 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0);} }
        .station-pulse { animation: stationPulse 2.2s infinite; }
      `}</style>

      <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
            📱 {isAr ? 'محطة واتساب — حصاد المجموعات' : 'WhatsApp Station — Broker Group Harvester'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, opacity: 0.7 }}>
            {isAr
              ? 'اقطع كود QR (أو وصّل الموبايل بالـ USB) → اجمع رسائل مجموعات السماسرة → كل عرض يظل في "قائمة الانتظار" حتى توافق عليه'
              : 'Pair by QR (or plug the phone in over USB) → harvest broker-group messages → every offer lands in the Listing Waiting List until you approve it.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {chip(!loading && Boolean(status), isAr ? 'متصل' : 'Console linked', isAr ? 'غير متصل' : 'Console offline')}
          {chip(Boolean(status?.runner?.reachable), isAr ? 'المنفذ يعمل' : 'Runner online', isAr ? 'المنفذ غير متاح' : 'Runner unreachable', 'nb-gold')}
          {chip(Boolean(status?.rag?.configured), 'RAG ✓', 'RAG off', 'nb-blue')}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {[
          { k: isAr ? 'بانتظار الموافقة' : 'Pending review', v: counts.PENDING ?? 0, c: '#D4AF37' },
          { k: isAr ? 'معتمد' : 'Approved', v: counts.APPROVED ?? 0, c: '#10B981' },
          { k: isAr ? 'منشور إعلانه' : 'Imported → PF', v: counts.IMPORTED ?? 0, c: '#1E88D9' },
          { k: isAr ? 'مرفوض' : 'Rejected', v: counts.REJECTED ?? 0, c: '#E63946' },
          { k: isAr ? 'مجموعات مسجلة' : 'Broker groups', v: status?.groups?.length ?? 0, c: '#7C3AED' },
        ].map((x) => (
          <div key={x.k} className="card" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 11, opacity: 0.65 }}>{x.k}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: x.c }}>{x.v}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className={`btn ${busy === 'scrape' ? 'station-pulse' : ''}`}
            disabled={busy !== null}
            onClick={() => trigger('scrape')}
            style={{ fontWeight: 800, background: 'var(--gold-luxury,#D4AF37)', color: '#07111E', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: busy ? 'wait' : 'pointer' }}
          >
            {busy === 'scrape' ? '⏳ ' : '⚡ '}{isAr ? 'شغّل الحصاد الآن' : 'Run scrape now'}
          </button>
          <button className="btn" disabled={busy !== null} onClick={() => trigger('request')} style={{ fontWeight: 700, padding: '9px 16px', borderRadius: 8 }}>
            📨 {isAr ? 'اطلب تشغيل (وضع أوفلاين)' : 'Request run (offline marker)'}
          </button>
          <button className="btn" disabled={busy !== null} onClick={() => trigger('usb')} style={{ fontWeight: 700, padding: '9px 16px', borderRadius: 8 }}>
            🔌 {isAr ? 'استيراد من الموبايل (USB)' : 'USB phone import'}
          </button>
          <button
            className="btn"
            onClick={() => setPairing((p) => !p)}
            style={{ fontWeight: 700, padding: '9px 16px', borderRadius: 8, background: pairing ? '#E63946' : undefined, color: pairing ? '#fff' : undefined }}
          >
            {pairing ? '✕ ' : '🔗 '}{pairing ? (isAr ? 'إيقاف إظهار QR' : 'Stop QR') : (isAr ? 'إظهار كود QR (ربط الجهاز)' : 'Show QR (pair device)')}
          </button>
        </div>

        {result && (
          <div
            role="status"
            className="fade-up"
            style={{ fontSize: 12.5, padding: '10px 14px', borderRadius: 8, background: result.ok ? 'rgba(16,185,129,.12)' : 'rgba(230,57,70,.12)', color: result.ok ? '#10B981' : '#E63946', whiteSpace: 'pre-wrap' }}
          >
            {result.mode ? `[${result.mode}] ` : ''}{result.message}
          </div>
        )}

        <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.7 }}>
          {isAr
            ? 'مسار USB: وصّل الموبايل بالكيبل وفعّل "نقل الملفات"، صدّر محادثات المجموعات من واتساب (Export chat بدون مرفقات) إلى مجلد يقرأه السيرفر، ثم اضبط STATION_USB_DIR على جهاز الـ runner واضغط "استيراد من الموبايل". الأرقام تُقنّع تلقائياً (***) واتصال العملاء يوحّد على 01092048333.'
            : 'USB path: plug the phone in with "File transfer" enabled, export the group chats from WhatsApp (Export chat, without media) to a folder the runner can read, set STATION_USB_DIR on the runner host, then press USB phone import. All numbers are auto-masked (***) and client contact is unified on 01092048333.'}
        </div>
      </div>

      {/* QR + groups side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {pairing && (
          <div className="card fade-up" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>{isAr ? 'امسح بالواتساب ← الأجهزة المرتبطة' : 'Scan in WhatsApp → Linked devices'}</div>
            {qr?.qrDataUrl ? (
              <img src={qr.qrDataUrl} alt="WhatsApp QR" style={{ width: 240, height: 240, margin: '0 auto', display: 'block', borderRadius: 8, animation: 'fadeUp .4s ease' }} />
            ) : (
              <div style={{ padding: 30, opacity: 0.6, fontSize: 12.5 }}>{qr?.status || (isAr ? 'بانتظار الـ gateway… (تأكد أن خط line-1 يعمل)' : 'Waiting for gateway… (is line-1 up?)')}</div>
            )}
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8 }}>{isAr ? 'الجلسة تُحفظ على الـ gateway — لا جلسة ثانية على نفس الرقم (حماية من الحظر)' : 'Session is kept by the gateway — never a second session on your SIM (ban-safe).'}</div>
          </div>
        )}

        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>👥 {isAr ? 'مجموعات السماسرة المراقبة' : 'Watched broker groups'}</div>
          {status?.groups?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {status.groups.map((g) => (
                <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 12.5, borderBottom: '1px solid var(--bd)', paddingBottom: 6 }}>
                  <span>{g.group_name}</span>
                  <span style={{ opacity: 0.65 }}>{g.broker_names || '—'} · {g.line}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, opacity: 0.6 }}>
              {isAr ? 'لا مجموعات مسجلة — جدول whatsapp_station_groups فارغ (طبّق migration 052).' : 'No groups registered — whatsapp_station_groups is empty (apply migration 052).'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
