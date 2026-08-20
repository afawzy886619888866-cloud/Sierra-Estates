'use client';

/** Wraps a ported page in the shared nav/footer chrome and scroll effects. */
import React from 'react';
import SiteChrome, { type ActiveNav } from './SiteChrome';
import SiteFooter from './SiteFooter';
import { useReveal, useCounters } from '@/lib/site/useReveal';

export default function SiteShell({
  active = null,
  children,
}: {
  active?: ActiveNav;
  children: React.ReactNode;
}) {
  useReveal([]);
  useCounters([]);

  return (
    <>
      <SiteChrome active={active} />
      {children}
      <SiteFooter />
    </>
  );
}
