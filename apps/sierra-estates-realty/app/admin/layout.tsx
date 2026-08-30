'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isFirebaseClientConfigured } from '@/lib/firebase';
import { isAdminPortalRole } from '@/lib/types';

/**
 * Auth guard only — no chrome. The portal (AdminPortal.tsx) brings its own
 * sidebar/topbar. Staff-gating matches the previous admin layout and the
   * Firestore rules: users/{uid}.role must be an approved staff role, including 'owner'.
 */
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const [isAuth, setIsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const verifyAccess = async () => {
      // 1. Check server-side session cookie via /api/auth (primary source of truth)
      try {
        const res = await fetch('/api/auth', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.signedIn && isAdminPortalRole(data.role)) {
            if (!cancelled) {
              setIsAuth(true);
              setIsLoading(false);
            }
            return;
          }
        }
      } catch (err) {
        console.warn('[AdminLayout] Session cookie verification failed:', err);
      }

      // 2. Fallback: check Firebase client auth if configured and exchange token
      if (isFirebaseClientConfigured && auth?.currentUser) {
        try {
          const user = auth.currentUser;
          const token = await user.getIdToken();
          const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              action: 'signin',
              provider: 'google',
              email: user.email,
              token,
              uid: user.uid,
              name: user.displayName,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.ok && isAdminPortalRole(data.role)) {
              if (!cancelled) {
                setIsAuth(true);
                setIsLoading(false);
              }
              return;
            }
          }
        } catch (fbErr) {
          console.warn('[AdminLayout] Firebase client token exchange error:', fbErr);
        }
      }

      // 3. Not authenticated -> redirect to login
      if (!cancelled) {
        setIsAuth(false);
        setIsLoading(false);
        if (!isLoginPage) {
          router.replace('/admin/login');
        }
      }
    };

    verifyAccess();

    return () => {
      cancelled = true;
    };
  }, [router, isLoginPage]);

  if (isLoginPage) return <>{children}</>;

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#07111E',
          color: 'rgba(240,237,229,.58)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          letterSpacing: '.2em',
        }}
      >
        AUTHENTICATING…
      </div>
    );
  }

  if (!isAuth) {
    // router.replace() above should already be navigating away - this is a
    // fallback for the window between "not authenticated" and the redirect
    // actually completing. Previously this returned null, i.e. a genuinely
    // blank page if that redirect silently didn't fire (matches the
    // "blank dark screen, no controls" symptom from the 2026-08-18 smoke
    // test) with no way out except reloading the URL by hand.
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          background: '#07111E',
          color: 'rgba(240,237,229,.58)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          letterSpacing: '.2em',
        }}
      >
        <div>REDIRECTING…</div>
        <a href="/admin/login" style={{ color: '#00AEFF', letterSpacing: 'normal', fontSize: 13 }}>
          Click here if you are not redirected
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
