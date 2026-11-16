import React from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import { isAdminPortalRole } from '@/lib/types';

/**
 * Admin Layout — Server-Gated (Defense-in-Depth)
 *
 * All admin routes require a verified admin session cookie (`sierra_sess`).
 * Unauthenticated requests are redirected to `/admin/login`.
 *
 * Watermark: admin-console-map.svg is rendered as a low-opacity fixed
 * background so the architectural wiring is visible to staff.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') || '';
  const isLoginPage = pathname === '/admin/login' || pathname.startsWith('/admin/login/');

  if (!isLoginPage) {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    const session = token ? await verifySession(token) : null;
    const isAuthorized = session && isAdminPortalRole(session.role);

    if (!isAuthorized && pathname) {
      redirect(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }

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
