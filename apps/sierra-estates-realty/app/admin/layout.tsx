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
    if (!isFirebaseClientConfigured) {
      // No Firebase config (local dev without .env.local): keep the guard
      // closed rather than open.
      if (!isLoginPage) router.replace('/admin/login');
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAuth(false);
        // The login page renders without the guard — don't redirect it to itself
        if (!isLoginPage) router.replace('/admin/login');
        setIsLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const role = userDoc.data()?.role;

        if (role === 'admin' || role === 'manager') {
          setIsAuth(true);
        } else {
          router.replace('/admin/login');
        }
      } catch (error) {
        console.error('Error checking admin role:', error);
        router.replace('/admin/login');
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
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
