'use client';

import React from 'react';
import dynamic from 'next/dynamic';

type Props = { lang: 'en' | 'ar'; section: 'overview' | 'inventory' | 'investor' | 'contact' };

const CairoPlazaExperience = dynamic(() => import('./CairoPlazaExperience'), {
  ssr: false,
  loading: () => <main className="cp-shell"><div className="cp-tour-fallback">Loading Cairo Plaza experience…</div></main>,
});

export default function CairoPlazaRouteShell({ lang, section }: Props) {
  return <CairoPlazaExperience lang={lang} section={section} />;
}
