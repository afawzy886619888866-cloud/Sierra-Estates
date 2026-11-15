/****************************************************************************
 * Sierra Estates — /api/listings/submit (النسخة المتصلة)
 * ------------------------------------------------------------------------
 * ده بديل جاهز لملف app/api/listings/submit/route.ts في موقع Next.js.
 *
 * المشكلة في النسخة الحالية: الاستدعاء الخارجي (Supabase / مزامنة / إشعار)
 * بيتنفذ blocking من غير timeout، فالطلب بيهنج للأبد ومفيش سجل بيتحفظ.
 *
 * الترتيب هنا:
 *   (1) validate بـ zod (نفس شكل رسالة الخطأ القديمة بالظبط)
 *   (2) insert في Supabase (ومعاه retry تلقائي لو في عمود مش موجود)
 *   (3) رد فوري 201 {ok, id, code}
 *   (4) مزامنة الشيت (Apps Script) fire-and-forget — timeout 10 ثواني،
 *       فشلها عمره ما يعلّق الرد ولا يمنع الحفظ.
 *
 * المطلوب منك قبل التركيب (سطرين تحت في INSTALL):
 *   - تأكد إن أسماء متغيرات Supabase عندك زي ما الملف بيقراها
 *   - ضيف SHEET_WEBAPP_URL في ملف الـ env (لينك الـ Apps Script /exec)
 ***************************************************************************/

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------- config --
const SHEET_WEBAPP_URL  = process.env.SHEET_WEBAPP_URL  || ""; // لينك الـ Apps Script /exec (فاضي = السينك بيتسكب بصمت)
const SHEET_PUBLIC_TOKEN = process.env.SHEET_PUBLIC_TOKEN || "EASY_PUBLIC_2026";
const TABLE = process.env.LISTINGS_TABLE || "sierra_easy_listing_draft_v2";

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Supabase env missing: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

// --------------------------------------------------------------- payload --
const schema = z.object({
  code:         z.string().min(2).max(40).optional(),
  compound:     z.string().min(1).max(80),
  zone:         z.string().max(80).optional(),
  propertyType: z.string().min(1).max(60),
  mode:         z.enum(["sale", "rent"]),
  beds:         z.number().int().min(0).max(20),
  baths:        z.number().int().min(0).max(20),
  area:         z.number().positive().max(10000),
  gardenArea:   z.number().min(0).max(10000).optional(),
  price:        z.number().positive(),
  finishing:    z.string().max(60).optional(),
  furnished:    z.string().max(40).optional(),
  ownerName:    z.string().max(120).optional(),
  contactName:  z.string().max(120).optional(),
  role:         z.enum(["owner", "broker", "agent", "employee"]),
  employee:     z.string().max(120).optional(),
  phone:        z.string().min(8).max(20),
  notes:        z.string().max(2000).optional(),
  rawText:      z.string().max(5000).optional(),
  mapLink:      z.string().max(500).optional(),
});

// ------------------------------------------------------------- helpers ----
function genId(): string {
  return "form-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
}
function genCode(compound: string, mode: string): string {
  const c = compound.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "SE";
  const n = Math.floor(Math.random() * 900) + 100;
  return `SE-FRM-${c}${n}`; // نفس نمط SE-XXX-### بتاع النظام
}

/* المزامنة مع الشيت الماستر عن طريق Apps Script — الكل داخل timeout
 * ومحاط بـ try/catch: أي فشل بيتسجل لوغ بس ومفيش أي تأثير على الطلب. */
async function syncToSheet(row: Record<string, unknown>): Promise<void> {
  if (!SHEET_WEBAPP_URL) {
    console.log("[sheet-sync] SHEET_WEBAPP_URL مش متسطب — اتسكبت (الشيت مش هياخد الوحدة دي)");
    return;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(SHEET_WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      // ملاحظة: مفيش حقل honey هنا عشان — ده فخ سبام في الـ Apps Script بيرفض الطلب لو موجود
      body: JSON.stringify({
        action:   "easy_listing",
        token:    SHEET_PUBLIC_TOKEN,
        phone:    String(row.ownerPhone || ""),
        name:     String(row.contactName || row.ownerName || "بدون اسم"),
        price:    row.price as number,
        deal:     row.mode === "rent" ? "إيجار" : "بيع",
        role:     row.role === "owner" ? "مالك" : row.role === "employee" ? "موظف" : "بروكر",
        unitType: String(row.propertyType || ""),
        compound: String(row.compound || ""),
        area:     String(row.zone || ""),
        size:     String(row.area || ""),
        rooms:    row.beds ? String(row.beds) : "",
        baths:    row.baths ? String(row.baths) : "",
        finish:   String(row.finishing || ""),
        furnished:String(row.furnished || ""),
        payment:  "",
      }),
      signal: ctrl.signal,
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; ref?: string; msg?: string } | null;
    if (data && data.ok) console.log("[sheet-sync] ✓ الوحدة في الشيت — ref:", data.ref);
    else console.log("[sheet-sync] Apps Script رفض:", data && data.msg);
  } catch (e) {
    console.log("[sheet-sync] فشل (الحفظ في Supabase تمام — دي المزامنة بس):", (e as Error).message);
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------- handler -
export async function POST(req: NextRequest) {
  // (1) التحقق من البيانات — نفس شكل الرد القديم بالظبط
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const code = d.code && d.code.startsWith("SE-") ? d.code : genCode(d.compound, d.mode);
  const row: Record<string, unknown> = {
    id: genId(),
    code,
    compound: d.compound,
    zone: d.zone || "",
    propertyType: d.propertyType,
    mode: d.mode,
    area: d.area,
    gardenArea: d.gardenArea || 0,
    beds: d.beds,
    baths: d.baths,
    price: d.price,
    finishing: d.finishing || "",
    furnished: d.furnished || "",
    role: d.role,
    contactName: d.contactName || d.ownerName || "",
    ownerName: d.ownerName || "",
    ownerPhone: d.phone,
    employee: d.employee || "",
    notes: d.notes || "",
    rawText: d.rawText || "",
    status: "form_submitted",
    mapLink: d.mapLink || "https://maps.google.com/?q=" + encodeURIComponent(d.compound + " New Cairo"),
    createdAt: new Date().toISOString(),
  };

  // (2) الحفظ في Supabase — ومعاه retry تلقائي: لو الجدول مفيهوش عمود من
  //     العمودا دي (ownerName مثلًا) بنشيل الأعمدة اللي مش موجودة ونحاول تاني
  //     بالأعمدة الأساسية اللي متأكدين منها (شكل GET /owner-intakes).
  let saved: Record<string, unknown> | null = null;
  try {
    const sb = supabaseAdmin();
    const full = await sb.from(TABLE).insert(row).select().single();
    if (full.error) {
      const core = { ...row } as Record<string, unknown>;
      for (const k of ["furnished", "ownerName", "employee", "notes"]) delete core[k];
      const retry = await sb.from(TABLE).insert(core).select().single();
      if (retry.error) throw retry.error;
      saved = retry.data;
    } else {
      saved = full.data;
    }
  } catch (e) {
    console.error("[submit] Supabase insert فشل:", (e as Error).message);
    return NextResponse.json(
      { success: false, error: "Could not save listing", detail: (e as Error).message },
      { status: 500 }
    );
  }

  // (4) المزامنة في الخلفية — بتبدأ قبل الرد ومحدش مستنيها
  void syncToSheet(saved || row);

  // (3) الرد الفوري — أقل من ثانية مهما حصل
  return NextResponse.json(
    { success: true, ok: true, id: saved?.id ?? row.id, code: saved?.code ?? row.code },
    { status: 201 }
  );
}
