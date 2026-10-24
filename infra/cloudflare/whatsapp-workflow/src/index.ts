/**
 * Sierra Estates — Serverless WhatsApp Outreach Workflow
 * Cloudflare Worker with Scheduled Cron Triggers
 *
 * Runs completely serverless on Cloudflare (no AWS EC2 instance required!).
 * Replaces EC2 se-workflow-runner cron.
 */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SHEET_ID: string;
  SHEET_GID: string;
  ACTIVE_HOURS_START?: string;
  ACTIVE_HOURS_END?: string;
  TIMEZONE?: string;
  BATCH_SIZE?: string;
  DAILY_CAP?: string;
  WHATSAPP_API_URL?: string;
  WHATSAPP_API_TOKEN?: string;
  OPENWA_SESSION_ID?: string;
}

interface OwnerCandidate {
  code: string;
  name: string;
  phone: string;
  location: string;
  propertyType: string;
  availability: string;
  lastContact: string;
}

const TEMPLATE = `السلام عليكم ورحمة الله وبركاته {_SALUTATION_}

مع حضرتك فريق Sierra Estates للتسويق العقاري بالتجمع الخامس.

بعتذر جداً لحضرتك على الإزعاج، كنا حابين نستفسر لو متاح عند حضرتك وحدة معروضة للإيجار أو البيع {_LOCATION_}؟ وحابين نتأكد من التفاصيل الحالية من حضرتك مباشرة إذا مناسب نتعاون في تسويقها لعملائنا.

لو الوحدة غير متاحة حالياً بنعتذر لحضرتك وشكراً جزيلاً لوقتك 🤝
(لعدم استقبال رسائل أخرى، أرسل كلمة "إلغاء")`;

function buildMessage(r: OwnerCandidate): string {
  let salutation = 'يا فندم،';
  if (r.name && r.name.trim() && !r.name.toLowerCase().includes('owner') && !r.name.includes('المالك')) {
    const cleanName = r.name.trim().replace(/^أ[\.\/]\s*/, '');
    salutation = `أ/ ${cleanName}،`;
  }

  const loc = r.location && r.location.trim() ? `في ${r.location.trim()}` : 'بالتجمع الخامس';

  return TEMPLATE
    .replace('{_SALUTATION_}', salutation)
    .replace('{_LOCATION_}', loc);
}

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const western = raw.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  let d = western.replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('0020')) d = d.slice(4);
  else if (d.startsWith('20')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  if (/^1[0125]\d{8}$/.test(d)) return '20' + d;
  return null;
}

function getCairoHour(tz = 'Africa/Cairo'): number {
  try {
    const hourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      hour12: false,
    }).format(new Date());
    return Number(hourStr) % 24;
  } catch {
    const d = new Date();
    return (d.getUTCHours() + 2) % 24; // Cairo standard offset approx
  }
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

export default {
  // ── Scheduled Cron Handler (Cloudflare Cron Triggers) ─────────────────
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runOutreachCycle(env, { dryRun: false }));
  },

  // ── HTTP API Handler (Manual Dispatch & Health Check) ─────────────────
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      const cairoHour = getCairoHour(env.TIMEZONE);
      const start = Number(env.ACTIVE_HOURS_START || 10);
      const end = Number(env.ACTIVE_HOURS_END || 20);
      const isOpen = cairoHour >= start && cairoHour < end;

      return new Response(
        JSON.stringify({
          service: 'sierra-whatsapp-workflow-cloudflare',
          status: 'online',
          runtime: 'Cloudflare Workers (Edge)',
          cairoHour,
          operatingWindow: `${start}:00 – ${end}:00`,
          isWithinActiveHours: isOpen,
          batchSize: Number(env.BATCH_SIZE || 25),
          dailyCap: Number(env.DAILY_CAP || 80),
        }, null, 2),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.pathname === '/dispatch' && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as any;
      const dryRun = Boolean(body?.dryRun);
      const limit = body?.limit ? Number(body.limit) : undefined;

      const summary = await runOutreachCycle(env, { dryRun, limitOverride: limit });
      return new Response(JSON.stringify(summary, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function runOutreachCycle(env: Env, opts: { dryRun?: boolean; limitOverride?: number } = {}) {
  const cairoHour = getCairoHour(env.TIMEZONE);
  const start = Number(env.ACTIVE_HOURS_START || 10);
  const end = Number(env.ACTIVE_HOURS_END || 20);

  if (!opts.dryRun && (cairoHour < start || cairoHour >= end)) {
    return {
      status: 'skipped',
      reason: `Outside active operating hours (${cairoHour}:00 Cairo; window is ${start}:00–${end}:00)`,
    };
  }

  const sheetId = env.SHEET_ID || '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk';
  const sheetGid = env.SHEET_GID || '1127958606';
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${sheetGid}`;

  const res = await fetch(gvizUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) {
    return { status: 'error', error: `Sheet fetch failed (HTTP ${res.status})` };
  }

  const csvText = await res.text();
  const rows = parseCsv(csvText);
  if (!rows || rows.length <= 1) {
    return { status: 'error', error: 'Sheet is empty or missing header' };
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const col = (candidates: string[]) => headers.findIndex((h) => candidates.some((c) => h.includes(c)));

  const iCode = col(['code', 'كود']);
  const iName = col(['name', 'owner', 'الاسم', 'مالك']);
  const iMob = col(['mobile', 'phone', 'موبايل', 'هاتف']);
  const iLoc = col(['location', 'الكمبوند', 'الموقع']);
  const iType = col(['property tybe', 'property type', 'نوع']);
  const iAvail = col(['availablty', 'availability', 'الحالة']);
  const iLast = col(['تاريخ اخر تواصل', 'اخر تواصل', 'تاريخ اخر تحديث']);

  // Fetch already contacted phones from Supabase to prevent duplicates
  const contactedPhones = new Set<string>();
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const auditRes = await fetch(`${env.SUPABASE_URL}/rest/v1/owner_outreach_log?select=phone`, {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
      if (auditRes.ok) {
        const auditList = await auditRes.json() as Array<{ phone: string }>;
        auditList.forEach((a) => {
          if (a.phone) contactedPhones.add(a.phone.replace(/\D/g, ''));
        });
      }
    } catch {
      // Degrade gracefully if Supabase audit table is not reachable
    }
  }

  const batchLimit = opts.limitOverride || Number(env.BATCH_SIZE || 25);
  const eligible: OwnerCandidate[] = [];

  for (let idx = 1; idx < rows.length; idx++) {
    const r = rows[idx];
    const rawMob = iMob >= 0 ? r[iMob] : '';
    const phone = normalizePhone(rawMob);
    if (!phone) continue;

    // Skip if already contacted in the sheet column
    const lastContactStr = iLast >= 0 ? (r[iLast] || '').trim() : '';
    if (lastContactStr.length >= 6) continue;

    // Skip if already in Supabase audit ledger
    if (contactedPhones.has(phone)) continue;

    // Check availability status
    const avail = (iAvail >= 0 ? r[iAvail] : '').trim().toLowerCase();
    if (avail && (avail.includes('sold') || avail.includes('rented') || avail.includes('تم'))) {
      continue;
    }

    eligible.push({
      code: iCode >= 0 ? r[iCode] : `SE-ONL-${idx}`,
      name: iName >= 0 ? r[iName] : 'المالك',
      phone,
      location: iLoc >= 0 ? r[iLoc] : 'القاهرة الجديدة',
      propertyType: iType >= 0 ? r[iType] : 'عقار',
      availability: avail || 'Available',
      lastContact: lastContactStr,
    });

    if (eligible.length >= batchLimit) break;
  }

  const results: Array<{ phone: string; code: string; ok: boolean; status?: string; error?: string }> = [];
  const gatewayUrl = env.WHATSAPP_API_URL?.replace(/\/+$/, '') || 'http://127.0.0.1:2785';
  const gatewayToken = env.WHATSAPP_API_TOKEN || '';
  const sessionId = env.OPENWA_SESSION_ID || 'session-default';

  for (const item of eligible) {
    const message = buildMessage(item);

    if (opts.dryRun) {
      results.push({ phone: item.phone, code: item.code, ok: true, status: 'simulated_dry_run' });
      continue;
    }

    try {
      const sendRes = await fetch(`${gatewayUrl}/api/sessions/${sessionId}/messages/send-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': gatewayToken,
        },
        body: JSON.stringify({
          chatId: `${item.phone}@c.us`,
          text: message,
        }),
      });

      if (sendRes.ok) {
        results.push({ phone: item.phone, code: item.code, ok: true, status: 'delivered' });

        // Record in Supabase audit log
        if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
          fetch(`${env.SUPABASE_URL}/rest/v1/owner_outreach_log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              phone: item.phone,
              listing_code: item.code,
              message_text: message,
              host_side: 'cloudflare-worker',
              sent_at: new Date().toISOString(),
            }),
          }).catch(() => {});
        }
      } else {
        const errText = await sendRes.text().catch(() => '');
        results.push({ phone: item.phone, code: item.code, ok: false, error: errText || `HTTP ${sendRes.status}` });
      }
    } catch (err: any) {
      results.push({ phone: item.phone, code: item.code, ok: false, error: err?.message || 'network_error' });
    }
  }

  return {
    status: 'completed',
    dryRun: Boolean(opts.dryRun),
    totalEligibleFound: eligible.length,
    sentCount: results.filter((r) => r.ok).length,
    failedCount: results.filter((r) => !r.ok).length,
    sampleResults: results.slice(0, 5),
  };
}
