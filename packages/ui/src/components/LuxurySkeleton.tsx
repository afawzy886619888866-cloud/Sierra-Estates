"use client";
/* eslint-disable @next/next/no-server-actions-in-client-components */

/**
 * SIERRA ESTATES — LUXURY UI SKELETON (V12.0)
 * Quiet Luxury design system with full theme + direction support.
 *
 * Variant order:
 *   1. Mobile English  (ltr, mobile)
 *   2. Mobile Arabic   (rtl, mobile, Cairo font)
 *   3. Light Theme     (ivory/white bg, navy text)
 *   4. Dark Theme      (navy bg, ivory text, gold accents)
 *   5. Desktop English (ltr, desktop)
 *   6. Desktop Arabic  (rtl, desktop, Cairo font)
 *
 * Usage:
 *   <LuxuryProvider theme="dark" dir="rtl">
 *     <LuxuryCard> … </LuxuryCard>
 *   </LuxuryProvider>
 */

import React, { createContext, useContext } from 'react';
import { motion } from 'framer-motion';

// ─── 1. Types & Tokens ────────────────────────────────────────────────────────

export type LuxuryTheme = 'light' | 'dark';
export type LuxuryDir   = 'ltr' | 'rtl';

interface LuxuryContextValue {
  theme: LuxuryTheme;
  dir:   LuxuryDir;
}

const LuxuryContext = createContext<LuxuryContextValue>({ theme: 'light', dir: 'ltr' });
export const useLuxuryTheme = () => useContext(LuxuryContext);

/** Design token map — light vs dark. */
const T = {
  light: {
    card:         'bg-white/50 border-[#C9A84C]/20 shadow-2xl',
    cardHover:    'hover:shadow-3xl',
    cardPremium:  'bg-gradient-to-br from-white/20 to-white/10 border-white/30',
    cardPremiumH: 'hover:border-[#C9A84C]/40',
    text:         'text-[#0A1628]',
    textMuted:    'text-[#0A1628]/70',
    textStat:     'text-[#0A1628]/60',
    stat:         'bg-white/30 border-[#C9A84C]/20',
    badge:        'bg-[#C9A84C]/10 border-[#C9A84C]/30',
    btnSecBorder: 'border-[#0A1628]/30',
    btnSecText:   'text-[#0A1628]',
    btnSecHoverBg:'hover:bg-[#0A1628]/5',
  },
  dark: {
    card:         'bg-white/10 border-[#C9A84C]/30 shadow-2xl shadow-black/30',
    cardHover:    'hover:shadow-3xl hover:shadow-black/50',
    cardPremium:  'bg-gradient-to-br from-white/10 to-white/5 border-white/10',
    cardPremiumH: 'hover:border-[#C9A84C]/60',
    text:         'text-[#F4F0E8]',
    textMuted:    'text-[#F4F0E8]/70',
    textStat:     'text-[#F4F0E8]/60',
    stat:         'bg-white/10 border-[#C9A84C]/30',
    badge:        'bg-[#C9A84C]/20 border-[#C9A84C]/50',
    btnSecBorder: 'border-[#F4F0E8]/30',
    btnSecText:   'text-[#F4F0E8]',
    btnSecHoverBg:'hover:bg-[#F4F0E8]/5',
  },
} as const;

// ─── 2. Provider ──────────────────────────────────────────────────────────────

/**
 * Wrap a section with a theme + direction context.
 *
 * Renders:
 *   - dir="ltr" + theme="light"  → Mobile/Desktop English Light
 *   - dir="rtl" + theme="light"  → Mobile/Desktop Arabic Light
 *   - dir="ltr" + theme="dark"   → Mobile/Desktop English Dark
 *   - dir="rtl" + theme="dark"   → Mobile/Desktop Arabic Dark
 */
export function LuxuryProvider({
  children,
  theme = 'light',
  dir   = 'ltr',
  className = '',
}: {
  children:  React.ReactNode;
  theme?:    LuxuryTheme;
  dir?:      LuxuryDir;
  className?: string;
}) {
  const fontClass = dir === 'rtl' ? 'font-cairo' : 'font-inter';
  const bgClass   = theme === 'dark' ? 'bg-[#0A1628]' : 'bg-[#F4F0E8]';

  return (
    <LuxuryContext.Provider value={{ theme, dir }}>
      <div
        dir={dir}
        className={`${bgClass} ${fontClass} min-h-screen transition-colors duration-300 ${className}`}
      >
        {children}
      </div>
    </LuxuryContext.Provider>
  );
}

// ─── 3. LuxuryCard ────────────────────────────────────────────────────────────
// Mobile English  → p-4 text-base   (default responsive: starts small)
// Mobile Arabic   → same + dir=rtl inherited from provider
// Desktop English → md:p-8 md:text-lg
// Desktop Arabic  → same + dir=rtl

export const LuxuryCard = ({
  children,
  className = '',
}: {
  children:  React.ReactNode;
  className?: string;
}) => {
  const { theme } = useLuxuryTheme();
  const t = T[theme];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className={`backdrop-blur-xl border rounded-lg transition-shadow duration-500
        p-4 md:p-8
        ${t.card} ${t.cardHover}
        ${className}`}
    >
      {children}
    </motion.div>
  );
};

// ─── 4. PremiumCard ───────────────────────────────────────────────────────────

export const PremiumCard = ({
  children,
  className = '',
  onClick,
}: {
  children:  React.ReactNode;
  className?: string;
  onClick?:  React.MouseEventHandler<HTMLDivElement>;
}) => {
  const { theme } = useLuxuryTheme();
  const t = T[theme];
  return (
    <motion.div
      whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}
      onClick={onClick}
      className={`backdrop-blur-md border shadow-xl rounded-xl transition-all duration-300 cursor-pointer
        p-6 md:p-10
        ${t.cardPremium} ${t.cardPremiumH}
        ${className}`}
    >
      {children}
    </motion.div>
  );
};

// ─── 5. GoldButton ────────────────────────────────────────────────────────────
// Identical gold fill in both themes — gold is the constant luxury signal.
// Mobile: full-width by default (w-full md:w-auto)

export const GoldButton = ({
  label,
  onClick,
  className = '',
  disabled  = false,
}: {
  label:     string;
  onClick?:  () => void;
  className?: string;
  disabled?:  boolean;
}) => (
  <motion.button
    whileHover={!disabled ? { scale: 1.02, backgroundColor: '#B8973B' } : {}}
    whileTap={!disabled   ? { scale: 0.98 } : {}}
    onClick={onClick}
    disabled={disabled}
    className={`bg-[#C9A84C] text-[#0A1628] font-semibold rounded-lg tracking-[0.15em] uppercase
      transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg
      py-3 px-6 text-sm
      w-full md:w-auto md:px-8
      ${className}`}
  >
    {label}
  </motion.button>
);

// ─── 6. SecondaryButton ───────────────────────────────────────────────────────

export const SecondaryButton = ({
  label,
  onClick,
  className = '',
}: {
  label:     string;
  onClick?:  () => void;
  className?: string;
}) => {
  const { theme } = useLuxuryTheme();
  const t = T[theme];
  return (
    <motion.button
      whileHover={{ scale: 1.02, borderColor: '#C9A84C', color: '#C9A84C' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`border-2 font-semibold rounded-lg tracking-[0.1em] uppercase
        transition-all duration-300
        py-3 px-6 text-sm
        w-full md:w-auto md:px-8
        ${t.btnSecBorder} ${t.btnSecText} ${t.btnSecHoverBg}
        ${className}`}
    >
      {label}
    </motion.button>
  );
};

// ─── 7. EditorialHeading ──────────────────────────────────────────────────────
// Mobile:  text-3xl / text-2xl / text-xl
// Desktop: md:text-6xl / md:text-5xl / md:text-4xl
// Arabic:  font-cairo, leading-loose (Arabic scripts need more line-height)

export const EditorialHeading = ({
  children,
  level     = 1,
  className = '',
}: {
  children:  React.ReactNode;
  level?:    1 | 2 | 3;
  className?: string;
}) => {
  const { theme, dir } = useLuxuryTheme();
  const t = T[theme];

  const mobileSizes: Record<1|2|3, string> = {
    1: 'text-3xl md:text-6xl',
    2: 'text-2xl md:text-5xl',
    3: 'text-xl  md:text-4xl',
  };

  const fontClass = dir === 'rtl'
    ? 'font-cairo leading-loose'
    : 'font-playfair italic tracking-tight';

  const tags = { 1: 'h1', 2: 'h2', 3: 'h3' } as const;
  const Tag  = tags[level];

  return (
    <Tag
      className={`${fontClass} leading-tight ${mobileSizes[level]} ${t.text} ${className}`}
    >
      {children}
    </Tag>
  );
};

// ─── 8. SubtitleText ──────────────────────────────────────────────────────────

export const SubtitleText = ({
  children,
  className = '',
}: {
  children:  React.ReactNode;
  className?: string;
}) => {
  const { theme, dir } = useLuxuryTheme();
  const fontClass = dir === 'rtl' ? 'font-cairo' : 'font-inter';
  return (
    <p
      className={`${fontClass} text-base md:text-lg leading-relaxed font-light
        ${T[theme].textMuted} ${className}`}
    >
      {children}
    </p>
  );
};

// ─── 9. StatBox ───────────────────────────────────────────────────────────────
// Mobile: p-4 text-2xl label  |  Desktop: md:p-6 md:text-4xl

export const StatBox = ({
  value,
  label,
  className = '',
}: {
  value:     string | number;
  label:     string;
  className?: string;
}) => {
  const { theme, dir } = useLuxuryTheme();
  const t = T[theme];
  const fontLabel = dir === 'rtl' ? 'font-cairo' : 'font-inter';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`flex flex-col items-center backdrop-blur-md border rounded-lg
        p-4 md:p-6
        ${t.stat} ${className}`}
    >
      <div className="text-2xl md:text-4xl font-bold text-[#C9A84C] mb-2">{value}</div>
      <div className={`${fontLabel} text-xs md:text-sm uppercase tracking-widest ${t.textStat}`}>
        {label}
      </div>
    </motion.div>
  );
};

// ─── 10. SectionBadge ─────────────────────────────────────────────────────────

export const SectionBadge = ({
  text,
  className = '',
}: {
  text:      string;
  className?: string;
}) => {
  const { theme, dir } = useLuxuryTheme();
  const fontClass = dir === 'rtl' ? 'font-cairo text-xs' : 'text-xs uppercase tracking-widest';
  return (
    <div
      className={`inline-block px-4 py-2 border rounded-full ${T[theme].badge} ${className}`}
    >
      <span className={`font-semibold text-[#C9A84C] ${fontClass}`}>{text}</span>
    </div>
  );
};

// ─── 11. Convenience pre-configured wrappers ──────────────────────────────────
// These remove the need to pass theme/dir props at the page level.

/** Mobile English — light, ltr */
export const MobileEnglishShell = ({ children }: { children: React.ReactNode }) => (
  <LuxuryProvider theme="light" dir="ltr">{children}</LuxuryProvider>
);

/** Mobile Arabic — light, rtl */
export const MobileArabicShell = ({ children }: { children: React.ReactNode }) => (
  <LuxuryProvider theme="light" dir="rtl">{children}</LuxuryProvider>
);

/** Light Theme — ltr (override dir via className/dir on inner elements if needed) */
export const LightThemeShell = ({ children, dir = 'ltr' }: { children: React.ReactNode; dir?: LuxuryDir }) => (
  <LuxuryProvider theme="light" dir={dir}>{children}</LuxuryProvider>
);

/** Dark Theme */
export const DarkThemeShell = ({ children, dir = 'ltr' }: { children: React.ReactNode; dir?: LuxuryDir }) => (
  <LuxuryProvider theme="dark" dir={dir}>{children}</LuxuryProvider>
);

/** Desktop English — dark by default (can override) */
export const DesktopEnglishShell = ({ children, theme = 'dark' }: { children: React.ReactNode; theme?: LuxuryTheme }) => (
  <LuxuryProvider theme={theme} dir="ltr">{children}</LuxuryProvider>
);

/** Desktop Arabic — dark by default (can override) */
export const DesktopArabicShell = ({ children, theme = 'dark' }: { children: React.ReactNode; theme?: LuxuryTheme }) => (
  <LuxuryProvider theme={theme} dir="rtl">{children}</LuxuryProvider>
);
