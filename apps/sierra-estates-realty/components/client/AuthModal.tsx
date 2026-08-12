"use client";
/**
 * AuthProvider + AuthModal — wraps the app, exposes useAuth().
 * On mount, calls GET /api/auth to read current session.
 * The modal supports two flows:
 *   • Sandbox (no Firebase) — email + password (demo admin).
 *   • Production — email + password → client-side Firebase sign-in
 *     → POST /api/auth with the Firebase ID token.
 */
import {
  createContext, useCallback, useContext, useEffect, useState,
  type ReactNode,
} from "react";
import { X, Shield, Loader2, Mail, Lock } from "lucide-react";
import { useToast } from "@/components/client/Toast";
import { api } from "@/lib/api-client";
import { isFirebaseClientConfigured as firebaseEnabled, auth } from "@/lib/firebase";
import { DEMO_ADMIN } from "@/lib/auth";

interface Me { signedIn: boolean; role?: string; name?: string; email?: string; uid?: string; }
interface AuthCtx {
  me: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  openAuth: () => void;
  closeAuth: () => void;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const refresh = useCallback(async () => {
    try { setMe(await api.me()); } catch { setMe({ signedIn: false }); }
    finally { setLoading(false); }
  }, []);

  const signOut = useCallback(async () => {
    try { await api.signOut(); setMe({ signedIn: false }); } catch {}
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <Ctx.Provider value={{
      me, loading, refresh, signOut,
      openAuth: () => setIsOpen(true),
      closeAuth: () => setIsOpen(false),
    }}>
      {children}
      {isOpen && <AuthModal onClose={() => setIsOpen(false)} onSignedIn={refresh} />}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

function AuthModal({ onClose, onSignedIn }: { onClose: () => void; onSignedIn: () => Promise<void> }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (firebaseEnabled) {
        // Production: client-side Firebase sign-in, mint session cookie.
        if (!auth) throw new Error("Firebase not initialized");
        const { signInWithEmailAndPassword, getIdToken } = await import("firebase/auth");
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await getIdToken(cred.user);
        // Send the token to the server to mint a session cookie
        await api.signIn(email, password, idToken);
      } else {
        await api.signIn(email, password);
      }
      toast({ title: "Welcome back", kind: "success" });
      await onSignedIn();
      onClose();
    } catch (err: any) {
      toast({
        title: "Sign-in failed",
        description: err?.message ?? "Try again.",
        kind: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-text">
          <X className="h-5 w-5" />
        </button>
        <div className="text-center mb-6">
          <div className="mx-auto h-14 w-14 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-navy-950 mb-3">
            <Shield className="h-7 w-7" />
          </div>
          <h2 className="font-serif text-2xl font-bold">Welcome to Sierra Estates</h2>
          <p className="text-sm text-muted mt-1">Sign in to access your saved listings and inquiries.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input pl-9"
              />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input pl-9"
              />
            </div>
          </div>
          <button type="submit" disabled={busy} className="btn-gold w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {!firebaseEnabled && (
          <div className="mt-4 p-3 rounded-md bg-gold-300/10 border border-gold-300/30 text-xs text-gold-600">
            <p className="font-semibold mb-1">Demo mode (Firebase not configured)</p>
            <p>Use <code className="font-mono">{DEMO_ADMIN.email}</code> / <code className="font-mono">{DEMO_ADMIN.password}</code> to sign in as admin.</p>
          </div>
        )}
      </div>
    </div>
  );
}
