'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isFirebaseClientConfigured } from '@/lib/firebase';

/**
 * Auth guard only — no chrome. The portal (AdminPortal.tsx) brings its own
 * sidebar/topbar. Staff-gating matches the previous admin layout and the
 * Firestore rules: users/{uid}.role must be 'admin' or 'manager'.
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
    let refreshInterval: NodeJS.Timeout | null = null;
    let unsubAuth: (() => void) | null = null;

    const verifyAccess = async () => {
      // 1. Check server-side session cookie via /api/auth
      try {
        const res = await fetch('/api/auth', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.signedIn && ['admin', 'manager', 'superadmin', 'agent'].includes(data.role)) {
            setIsAuth(true);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('[AdminLayout] Session cookie verification failed:', err);
      }

      // 2. Check Firebase client auth if configured
      if (isFirebaseClientConfigured) {
        unsubAuth = onAuthStateChanged(auth, async (user) => {
          if (!user) {
            setIsAuth(false);
            if (!isLoginPage) router.replace('/admin/login');
            setIsLoading(false);
            return;
          }

          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const role = userDoc.data()?.role;

            if (role === 'admin' || role === 'manager' || role === 'superadmin' || role === 'agent') {
              setIsAuth(true);
              if (refreshInterval) clearInterval(refreshInterval);
              refreshInterval = setInterval(() => {
                user.getIdToken(true).catch(() => {});
              }, 10 * 60 * 1000);
            } else {
              setIsAuth(false);
              router.replace('/admin/login');
            }
          } catch (error) {
            console.error('Error checking admin role:', error);
            setIsAuth(false);
            router.replace('/admin/login');
          } finally {
            setIsLoading(false);
          }
        });
      } else {
        setIsAuth(false);
        if (!isLoginPage) router.replace('/admin/login');
        setIsLoading(false);
      }
    };

    verifyAccess();

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
      if (unsubAuth) unsubAuth();
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

  if (!isAuth) return null;

  return <>{children}</>;
}
