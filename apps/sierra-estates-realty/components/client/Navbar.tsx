'use client';

/**
 * Sierra Estates — Canonical Client Navbar Component
 * Re-exports the unified SiteChrome navigation equipped with:
 * 1. Glowing gold 25% OFF Black Friday VIP pill badge.
 * 2. Direct routing to `/request`.
 * 3. Mobile slide-out drawer & bottom nav bar.
 */

import React from 'react';
import SiteChrome, { type ActiveNav } from '@/components/site/SiteChrome';

export interface NavbarProps {
  active?: ActiveNav;
}

export default function Navbar({ active = null }: NavbarProps) {
  return <SiteChrome active={active} />;
}

export { SiteChrome };
