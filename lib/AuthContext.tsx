"use client";
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, isFirebaseClientConfigured } from './firebase';

interface AuthContextType {
  user: User | null;
  role: 'admin' | 'manager' | 'agent' | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'manager' | 'agent' | null>(null);
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
    if (!isFirebaseClientConfigured) {
      setUser(null);
      setRole(null);
      setIsGuest(false);
      return;
    }

    try {
      await signOut(auth);
      setUser(null);
      setRole(null);
      setIsGuest(false);
    } catch (error) {
      console.error('Sign-out failed:', error);
    }
  }, []);

  const scheduleAutoSignOut = React.useCallback(() => {
    clearTimer();

    if (!isGuest && (!isFirebaseClientConfigured || !auth.currentUser)) {
      return;
    }

    timerRef.current = setTimeout(() => {
      void handleSignOut();
    }, INACTIVITY_TIMEOUT_MS);
  }, [isGuest, handleSignOut, clearTimer]);

  useEffect(() => {
    if (!isFirebaseClientConfigured) {
      setLoading(false);
      clearTimer();
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsGuest(false);
        // Fetch role from Firestore
        try {
          const { db } = await import('./firebase');
          const { doc, getDoc } = await import('firebase/firestore');
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setRole(userData.role || 'agent');
          } else {
            setRole('agent');
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
          setRole('agent');
        }
      } else {
        setRole(null);
      }
      setLoading(false);

      if (currentUser) {
        scheduleAutoSignOut();
      } else {
        clearTimer();
      }
    }, (error) => {
      console.error("Auth error:", error);
      setLoading(false);
      clearTimer();
    });

    return () => {
      unsubscribe();
      clearTimer();
    };
  }, [scheduleAutoSignOut, clearTimer]);

  useEffect(() => {
    if (!user && !isGuest) {
      return;
    }

    const handleActivity = () => scheduleAutoSignOut();
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: eventName !== 'keydown' });
    });

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
    };
  }, [user, isGuest]);


  return (
    <AuthContext.Provider value={{
      user,
      role,
      isAdmin: role === 'admin',
      isGuest,
      loading,
      setGuest: setIsGuest,
      signOut: handleSignOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
