'use client';

import React, { useState, useEffect } from 'react';
import CairoPlazaExperience from './CairoPlazaExperience';

type Props = { lang: 'en' | 'ar'; section: 'overview' | 'inventory' | 'investor' | 'contact' };

export default function CairoPlazaRouteShell({ lang, section }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="cp-shell" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="cp-tour-fallback">{lang === 'ar' ? 'جارٍ تحميل تجربة كايرو بلازا…' : 'Loading Cairo Plaza experience…'}</div>
      </main>
    );
  }

  return <CairoPlazaExperience lang={lang} section={section} />;
}
