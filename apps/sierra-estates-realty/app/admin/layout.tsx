'use client';

import React from 'react';

/**
 * Admin Layout — Open Access
 * Direct navigation to the Admin Portal & Intelligence OS.
 *
 * Background: admin-console-map.svg is wired here as a low-opacity fixed
 * watermark so the "who does what" architecture picture is always visible
 * to staff. Regenerate the SVG whenever route/role/worker wiring changes.
 * See: docs/obsidian-vault/Admin Console Map.md §Visual background
 */
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Admin Console Map — architectural watermark */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/admin/admin-console-map.svg"
        alt=""
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity: 0.04,
          pointerEvents: 'none',
          zIndex: 0,
          userSelect: 'none',
        }}
      />
      {/* Admin shell rendered above the watermark */}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

