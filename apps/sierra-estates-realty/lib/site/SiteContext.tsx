'use client';

/**
 * Theme + language state for the ported static site.
 * Mirrors the behaviour of deploy/shared.js, including its localStorage keys.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { I18N, type Lang } from './i18n-dict';

type Theme = 'light' | 'dark';

interface SiteState {
  lang: Lang;
  theme: Theme;
  isAr: boolean;
  t: (key: string) => string;
  toggleLang: () => void;
  toggleTheme: () => void;
}

const SiteCtx = createContext<SiteState | null>(null);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const storedLang = window.localStorage.getItem('hzp-lang');
    const storedTheme = window.localStorage.getItem('hzp-theme');
    if (storedLang === 'ar' || storedLang === 'en') setLang(storedLang);
    if (storedTheme === 'dark' || storedTheme === 'light') setTheme(storedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  }, [theme, lang]);

  const t = useCallback(
    (key: string) => {
      const table = I18N[lang] as Record<string, string>;
      const fallback = I18N.en as Record<string, string>;
      return table?.[key] ?? fallback[key] ?? key;
    },
    [lang]
  );

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next: Lang = prev === 'ar' ? 'en' : 'ar';
      window.localStorage.setItem('hzp-lang', next);
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem('hzp-theme', next);
      return next;
    });
  }, []);

  return (
    <SiteCtx.Provider value={{ lang, theme, isAr: lang === 'ar', t, toggleLang, toggleTheme }}>
      {children}
    </SiteCtx.Provider>
  );
}

const defaultSiteState: SiteState = {
  lang: 'en',
  theme: 'light',
  isAr: false,
  t: (key: string) => (I18N.en as Record<string, string>)?.[key] ?? key,
  toggleLang: () => {},
  toggleTheme: () => {},
};

export function useSite() {
  const ctx = useContext(SiteCtx);
  return ctx ?? defaultSiteState;
}
