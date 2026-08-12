'use client';
/**
 * Sierra Estates — Client-side i18n hooks.
 * Provides useI18n() hook with { t, locale, setLocale } and an I18nProvider
 * wrapper that syncs locale state across the component tree.
 *
 * Kept separate from lib/i18n.ts (which is a server-side next-intl config).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type Locale = 'ar' | 'en';

// ─── Flat translation dictionaries ──────────────────────────────────────────

const ar: Record<string, string> = {
  // Navbar
  'nav.listings': 'العقارات',
  'nav.compounds': 'الكمبوندات',
  'nav.match': 'التوافق الذكي',
  'nav.roi': 'العائد',
  'nav.concierge': 'خدمة VIP',
  'nav.signin': 'تسجيل الدخول',
  'nav.signout': 'تسجيل الخروج',
  'nav.admin': 'لوحة الإدارة',

  // Hero
  'hero.title': 'اكتشف عقارات القاهرة الجديدة',
  'hero.subtitle': 'أكثر من 52 كمبوند مختار بعناية — إيجار وبيع — مدعوم بالذكاء الاصطناعي',
  'hero.cta': 'ابدأ البحث',

  // Search
  'search.placeholder': 'ابحث عن كمبوند أو منطقة...',
  'search.type.all': 'الكل',
  'search.type.sale': 'للبيع',
  'search.type.rent': 'للإيجار',
  'search.btn': 'بحث',

  // Listings
  'listings.title': 'أحدث العقارات',
  'listings.empty': 'لا توجد نتائج',
  'listings.beds': 'غرف',
  'listings.baths': 'حمامات',
  'listings.area': 'م²',

  // Compounds map
  'compounds.title': 'خريطة الكمبوندات',

  // Match
  'match.title': 'التوافق الذكي',
  'match.subtitle': 'أخبرنا عن متطلباتك ونجد العقار المثالي',
  'match.budget': 'الميزانية',
  'match.type': 'النوع',
  'match.rooms': 'عدد الغرف',
  'match.submit': 'ابحث عن توافق',

  // ROI
  'roi.title': 'حاسبة العائد',
  'roi.price': 'سعر الشراء',
  'roi.rent': 'الإيجار الشهري',
  'roi.yield': 'العائد السنوي',

  // Inquiry / Concierge
  'inquiry.title': 'تواصل معنا',
  'inquiry.name': 'الاسم',
  'inquiry.phone': 'الهاتف',
  'inquiry.message': 'الرسالة',
  'inquiry.submit': 'إرسال',
  'inquiry.success': 'تم الإرسال بنجاح',

  // Auth
  'auth.email': 'البريد الإلكتروني',
  'auth.password': 'كلمة المرور',
  'auth.signin': 'تسجيل الدخول',
  'auth.signup': 'إنشاء حساب',
  'auth.or': 'أو',
};

const en: Record<string, string> = {
  // Navbar
  'nav.listings': 'Listings',
  'nav.compounds': 'Compounds',
  'nav.match': 'Smart Match',
  'nav.roi': 'ROI',
  'nav.concierge': 'VIP Concierge',
  'nav.signin': 'Sign In',
  'nav.signout': 'Sign Out',
  'nav.admin': 'Admin',

  // Hero
  'hero.title': 'Discover New Cairo Properties',
  'hero.subtitle': '52+ curated compounds — rent & resale — AI-powered',
  'hero.cta': 'Start Searching',

  // Search
  'search.placeholder': 'Search compound or area…',
  'search.type.all': 'All',
  'search.type.sale': 'For Sale',
  'search.type.rent': 'For Rent',
  'search.btn': 'Search',

  // Listings
  'listings.title': 'Latest Listings',
  'listings.empty': 'No results found',
  'listings.beds': 'Beds',
  'listings.baths': 'Baths',
  'listings.area': 'sqm',

  // Compounds map
  'compounds.title': 'Compounds Map',

  // Match
  'match.title': 'Smart Match',
  'match.subtitle': 'Tell us your requirements and we find the perfect property',
  'match.budget': 'Budget',
  'match.type': 'Type',
  'match.rooms': 'Rooms',
  'match.submit': 'Find Matches',

  // ROI
  'roi.title': 'ROI Calculator',
  'roi.price': 'Purchase Price',
  'roi.rent': 'Monthly Rent',
  'roi.yield': 'Annual Yield',

  // Inquiry / Concierge
  'inquiry.title': 'Contact Us',
  'inquiry.name': 'Name',
  'inquiry.phone': 'Phone',
  'inquiry.message': 'Message',
  'inquiry.submit': 'Send',
  'inquiry.success': 'Sent successfully',

  // Auth
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.signin': 'Sign In',
  'auth.signup': 'Create Account',
  'auth.or': 'or',
};

const dicts: Record<Locale, Record<string, string>> = { ar, en };

// ─── Context ────────────────────────────────────────────────────────────────

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ar');

  // Persist locale preference
  useEffect(() => {
    const saved = localStorage.getItem('se-locale') as Locale | null;
    if (saved === 'ar' || saved === 'en') setLocaleState(saved);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('se-locale', l);
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) =>
      dicts[locale][key] ?? fallback ?? key,
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }
  return ctx;
}
