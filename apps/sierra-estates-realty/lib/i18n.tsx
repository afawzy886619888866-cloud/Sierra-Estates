/**
 * Tiny i18n provider (en/ar) — per CLAUDE.md the project uses custom i18n,
 * NOT next-intl. Arabic translations live inline. The hook returns
 * { t, locale, setLocale, dir }.
 */
"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Locale } from "./types";

type Dict = Record<string, string>;

const EN: Dict = {
  "nav.home": "Home",
  "nav.listings": "Listings",
  "nav.compounds": "Compounds",
  "nav.match": "Smart Match",
  "nav.roi": "ROI",
  "nav.concierge": "Concierge",
  "nav.account": "Account",
  "nav.admin": "Admin",
  "nav.signin": "Sign in",
  "nav.signout": "Sign out",
  "hero.eyebrow": "FIRST & ONLY WEBSITE IN EGYPT DESIGNED FOR NEW CAIRO",
  "hero.title": "The First Exclusive Destination for New Cairo Properties",
  "hero.subtitle": "Rent & Resale. AI-driven matches. Curated compounds.",
  "hero.cta.browse": "Browse listings",
  "hero.cta.match": "Find my smart match",
  "search.buy": "Buy",
  "search.rent": "Rent",
  "search.compound": "Compound",
  "search.type": "Type",
  "search.beds": "Beds",
  "search.budget": "Budget (USD)",
  "search.btn": "Search",
  "listings.title": "Featured listings",
  "listings.subtitle": "AI-scored, hand-verified, ready to tour.",
  "listings.empty": "No listings match your filters.",
  "listings.filter.all": "All",
  "compounds.title": "Compounds map",
  "compounds.subtitle": "52 New Cairo compounds, ranked by AI score.",
  "match.title": "Smart Match quiz",
  "match.subtitle": "Answer 4 questions — get your top 3 listings.",
  "roi.title": "ROI calculator",
  "roi.subtitle": "Estimate rental yield and payback period.",
  "concierge.title": "Concierge",
  "concierge.subtitle": "Tell us what you want — we’ll find it within 24h.",
  "form.name": "Name",
  "form.phone": "Phone",
  "form.email": "Email (optional)",
  "form.budget": "Budget",
  "form.notes": "Notes",
  "form.submit": "Send inquiry",
  "form.success": "Thank you — we’ll call within 24h.",
  "form.error": "Something went wrong. Try again.",
  "admin.title": "Sierra Estates — Admin Console",
  "admin.dashboard": "Dashboard",
  "admin.listings": "Listings",
  "admin.compounds": "Compounds",
  "admin.inquiries": "Inquiries",
  "admin.leads": "Leads",
  "admin.users": "Users",
  "admin.reports": "Reports",
  "admin.audit": "Audit logs",
  "admin.settings": "Settings",
  "common.viewAll": "View all",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.edit": "Edit",
  "common.delete": "Delete",
  "common.archive": "Archive",
  "common.create": "Create",
  "common.search": "Search",
  "common.loading": "Loading…",
  "common.empty": "Nothing here yet.",
};

const AR: Dict = {
  "nav.home": "الرئيسية",
  "nav.listings": "العقارات",
  "nav.compounds": "الكمبوندات",
  "nav.match": "التطابق الذكي",
  "nav.roi": "العائد",
  "nav.concierge": "الكونسيرج",
  "nav.account": "حسابي",
  "nav.admin": "الإدارة",
  "nav.signin": "تسجيل الدخول",
  "nav.signout": "تسجيل الخروج",
  "hero.eyebrow": "الموقع الأول والوحيد في مصر المصمم للقاهرة الجديدة",
  "hero.title": "الوجهة الحصرية الأولى لعقارات القاهرة الجديدة",
  "hero.subtitle": "إيجار وإعادة بيع. توافق ذكي. كمبوندات منتقاة.",
  "hero.cta.browse": "تصفح العقارات",
  "hero.cta.match": "ابحث عن تطابقي الذكي",
  "search.buy": "شراء",
  "search.rent": "إيجار",
  "search.compound": "الكمبوند",
  "search.type": "النوع",
  "search.beds": "غرف النوم",
  "search.budget": "الميزانية (دولار)",
  "search.btn": "بحث",
  "listings.title": "عقارات مختارة",
  "listings.subtitle": "مُقيّمة بالذكاء الاصطناعي ومُتحقق منها وجاهزة للمعاينة.",
  "listings.empty": "لا توجد عقارات تطابق بحثك.",
  "listings.filter.all": "الكل",
  "compounds.title": "خريطة الكمبوندات",
  "compounds.subtitle": "52 كمبوند في القاهرة الجديدة، مرتبة حسب درجة الذكاء الاصطناعي.",
  "match.title": "اختبار التطابق الذكي",
  "match.subtitle": "أجب عن 4 أسئلة — احصل على أفضل 3 عقارات.",
  "roi.title": "حاسبة العائد",
  "roi.subtitle": "قدّر إيراد الإيجار وفترة الاسترداد.",
  "concierge.title": "الكونسيرج",
  "concierge.subtitle": "أخبرنا بما تريد — سنجده خلال 24 ساعة.",
  "form.name": "الاسم",
  "form.phone": "الهاتف",
  "form.email": "البريد (اختياري)",
  "form.budget": "الميزانية",
  "form.notes": "ملاحظات",
  "form.submit": "إرسال",
  "form.success": "شكراً — سنتصل بك خلال 24 ساعة.",
  "form.error": "حدث خطأ. حاول مرة أخرى.",
  "admin.title": "سييرا إستيتس — لوحة الإدارة",
  "admin.dashboard": "اللوحة",
  "admin.listings": "العقارات",
  "admin.compounds": "الكمبوندات",
  "admin.inquiries": "الطلبات",
  "admin.leads": "العملاء المحتملين",
  "admin.users": "المستخدمون",
  "admin.reports": "التقارير",
  "admin.audit": "سجل التدقيق",
  "admin.settings": "الإعدادات",
  "common.viewAll": "عرض الكل",
  "common.save": "حفظ",
  "common.cancel": "إلغاء",
  "common.edit": "تعديل",
  "common.delete": "حذف",
  "common.archive": "أرشفة",
  "common.create": "إنشاء",
  "common.search": "بحث",
  "common.loading": "جارٍ التحميل…",
  "common.empty": "لا يوجد شيء بعد.",
};

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("sierra_locale")) as Locale | null;
    if (stored === "ar" || stored === "en") setLocale(stored);
  }, []);
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    }
    try { localStorage.setItem("sierra_locale", locale); } catch {}
  }, [locale]);

  const value = useMemo<I18nCtx>(() => ({
    locale,
    setLocale,
    dir: locale === "ar" ? "rtl" : "ltr",
    t: (key: string) => (locale === "ar" ? AR : EN)[key] ?? EN[key] ?? key,
  }), [locale]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
