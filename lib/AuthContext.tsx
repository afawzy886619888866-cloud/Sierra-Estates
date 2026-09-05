"use client";
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

export interface AppUser {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any>;
}

interface AuthContextType {
  user: AppUser | null;
  role: 'admin' | 'manager' | 'agent' | 'client' | null;
  isAdmin: boolean;
  isGuest: boolean;
  loading: boolean;
  setGuest: (value: boolean) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isAdmin: false,
  isGuest: false,
  loading: true,
  setGuest: () => {},
  signOut: async () => {},
});

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'scroll', 'touchstart'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<'admin' | 'manager' | 'agent' | 'client' | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleSignOut = React.useCallback(async () => {
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Supabase sign-out error:', err);
    }
    setUser(null);
    setRole(null);
    setIsGuest(false);
  }, []);

  const scheduleAutoSignOut = React.useCallback(() => {
    clearTimer();
    if (!isGuest && !user) {
      return;
    }
    timerRef.current = setTimeout(() => {
      void handleSignOut();
    }, INACTIVITY_TIMEOUT_MS);
  }, [isGuest, user, handleSignOut, clearTimer]);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const isSupabaseConfigured = Boolean(
          process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
        );

        if (isSupabaseConfigured) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && mounted) {
            setUser({
              id: session.user.id,
              email: session.user.email,
              user_metadata: session.user.user_metadata,
            });
            const userRole = (session.user.user_metadata?.role as any) || 'agent';
            setRole(userRole);
          }

          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return;
            if (session?.user) {
              setUser({
                id: session.user.id,
                email: session.user.email,
                user_metadata: session.user.user_metadata,
              });
              setRole((session.user.user_metadata?.role as any) || 'agent');
              setIsGuest(false);
              scheduleAutoSignOut();
            } else {
              setUser(null);
              setRole(null);
              clearTimer();
            }
            setLoading(false);
          });

          return () => {
            subscription.unsubscribe();
          };
        } else {
          // Fallback / Guest mode
          if (mounted) {
            setLoading(false);
          }
        }
      } catch (err) {
        console.warn("Auth initialization fallback:", err);
        if (mounted) setLoading(false);
      }
    }

    const unsubPromise = initAuth();

    return () => {
      mounted = false;
      clearTimer();
      unsubPromise.then(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [scheduleAutoSignOut, clearTimer]);

  useEffect(() => {
    if (!user && !isGuest) return;

    const handleActivity = () => scheduleAutoSignOut();
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: eventName !== 'keydown' });
    });

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
    };
  }, [user, isGuest, scheduleAutoSignOut]);

  return (
    <AuthContext.Provider value={{
      user,
      role,
      isAdmin: role === 'admin' || role === 'superadmin' as any,
      isGuest,
      loading,
      setGuest: setIsGuest,
      signOut: handleSignOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
