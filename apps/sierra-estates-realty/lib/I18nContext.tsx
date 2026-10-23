'use client';

import { useEffect, useSyncExternalStore } from 'react';

export type Locale = 'ar' | 'en';

const DEFAULT_LOCALE: Locale = 'ar';
const STORAGE_KEY = 'sierra-estates-locale';

let localeState: Locale = DEFAULT_LOCALE;
let initialized = false;
const listeners = new Set<() => void>();

function normalizeLocale(value: unknown): Locale {
  return value === 'en' ? 'en' : 'ar';
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  listeners.forEach((listener) => listener());
}

function syncDocument(locale: Locale) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
}

function setLocale(nextLocale: Locale) {
  const normalized = normalizeLocale(nextLocale);
  if (localeState === normalized) return;
  localeState = normalized;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, normalized);
  }
  syncDocument(normalized);
  emit();
}

function initializeClientLocale() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  const browser = window.navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  const next = normalizeLocale(stored ?? browser ?? DEFAULT_LOCALE);
  if (localeState !== next) {
    localeState = next;
    emit();
  }
  syncDocument(next);
}

export function useI18n() {
  const locale = useSyncExternalStore(subscribe, () => localeState, () => DEFAULT_LOCALE);

  useEffect(() => {
    initializeClientLocale();
  }, []);

  return { locale, setLocale };
}
