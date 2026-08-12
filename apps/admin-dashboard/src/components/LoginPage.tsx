import React, { useState } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase';
import { api } from '../lib/apiClient';

interface LoginPageProps {
  onLoginSuccess: () => void;
  isAdminUser: boolean;
  currentUser: any;
  loading: boolean;
}

export default function LoginPage({ onLoginSuccess, isAdminUser, currentUser, loading }: LoginPageProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  
  // Custom auth states
  const [activeMode, setActiveMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Admin access is granted via the backend's users/{uid}.role doc (see Settings → Admin Control),
  // not a self-service request here — App.tsx's onAuthStateChanged calls /api/admin/auth/verify.
  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Authentication cancelled or failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please fill in all requested credentials.");
      return;
    }

    setAuthLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      if (activeMode === 'signup') {
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters in length.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        
        await createUserWithEmailAndPassword(auth, email, password);

        setInfoMsg("Account created. Ask an existing admin to grant you access from Settings → Admin Control (they'll need your Firebase UID).");
        setActiveMode('signin');
      } else {
        // Sign In
        await signInWithEmailAndPassword(auth, email, password);
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error(err);
      let localizedError = err.message;
      // Firebase v9+ uses 'auth/invalid-credential' for wrong email/password
      if (
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential'
      ) {
        localizedError = "Invalid email or password combination.";
      } else if (err.code === 'auth/email-already-in-use') {
        localizedError = "This email is already registered in the registry.";
      } else if (err.code === 'auth/invalid-email') {
        localizedError = "Please enter a valid email address.";
      } else if (err.code === 'auth/too-many-requests') {
        localizedError = "Too many failed attempts. Please wait a moment and try again.";
      } else if (err.code === 'auth/network-request-failed') {
        localizedError = "Network error. Please check your internet connection.";
      } else if (err.code === 'auth/unauthorized-domain') {
        localizedError = "This domain is not authorized. Please contact the administrator.";
      }
      setErrorMsg(localizedError || "Authentication attempt failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setErrorMsg(null);
      setInfoMsg(null);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrorMsg("Please enter your email address in the field above to initiate password recovery.");
      return;
    }
    
    setAuthLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    
    try {
      await sendPasswordResetEmail(auth, email);
      setInfoMsg("A password recovery link has been dispatched to your email address. Please check your inbox.");
    } catch (err: any) {
      console.error(err);
      let localizedError = err.message;
      if (err.code === 'auth/user-not-found') {
        localizedError = "No account found matching this email address.";
      } else if (err.code === 'auth/invalid-email') {
        localizedError = "Please check the email format and try again.";
      }
      setErrorMsg(localizedError || "Failed to trigger password recovery request.");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#05080f] text-slate-300 selection:bg-cyan-500/30 relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute inset-0 bg-radial-[circle_800px_at_center] from-cyan-500/10 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-md bg-[#0a0f1d]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-8 relative shadow-2xl z-10 text-center animate-fade-in animate-duration-500">
        {/* Shield Logo Wrapper */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <span className="text-3xl">🛡️</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
          SIERRA ESTATES 3.0
        </h1>
        <p className="font-mono text-[9px] tracking-[0.22em] text-slate-500 uppercase mb-6">
          INTELLIGENCE OS · SECURITY PORTAL
        </p>

        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Verifying Identity...</p>
          </div>
        ) : currentUser ? (
          <div className="py-4">
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 mb-6 text-left">
              <p className="text-[10px] font-mono uppercase text-slate-500 tracking-wider mb-1">Authenticated Authenticity</p>
              <p className="text-xs font-semibold text-white truncate">{currentUser.displayName || "Email Operator"}</p>
              <p className="text-[11px] font-mono text-cyan-400 truncate mt-0.5">{currentUser.email}</p>
              
              {!isAdminUser && (
                <div className="mt-4 p-3 bg-red-950/40 border border-red-500/20 rounded-lg">
                  <p className="text-xs text-red-400 font-medium font-sans">
                    ⚠️ Access Restricted
                  </p>
                  <p className="text-[11px] text-red-200 mt-1 leading-relaxed font-sans">
                    This account is not registered as an admin on the backend. Ask an existing admin to grant you access from Settings → Admin Control — they'll need your Firebase UID (
                    <span className="select-all font-mono">{currentUser.uid}</span>) and email.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {isAdminUser ? (
                <button
                  onClick={onLoginSuccess}
                  className="w-full py-3 px-4 bg-cyan-500 text-black rounded-xl font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:bg-cyan-400 active:scale-98 transition duration-150 cursor-pointer text-sm"
                  id="btn-goto-dash"
                >
                  Enter Intelligence OS
                </button>
              ) : (
                <button
                  onClick={handleGoogleLogin}
                  className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 font-medium active:scale-98 transition duration-150 cursor-pointer text-sm"
                  id="btn-try-another-auth"
                >
                  Authenticate Diff User
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="text-xs text-slate-500 hover:text-white underline font-mono tracking-widest uppercase py-2 transition cursor-pointer"
                id="btn-signout"
              >
                Sign Out / Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Custom Mode Toggle Tabs */}
            <div className="flex border-b border-slate-850 mb-6 p-0.5 bg-slate-950/60 rounded-lg">
              <button
                onClick={() => {
                  setActiveMode('signin');
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeMode === 'signin' 
                    ? 'bg-slate-800 text-cyan-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                🔐 Sign In
              </button>
              <button
                onClick={() => {
                  setActiveMode('signup');
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeMode === 'signup' 
                    ? 'bg-slate-800 text-cyan-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                ✨ Register
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-950/30 border border-red-500/15 rounded-xl p-3 mb-4 text-left">
                <p className="text-xs text-red-400 font-medium">Authentication Alert</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{errorMsg}</p>
              </div>
            )}

            {infoMsg && (
              <div className="bg-emerald-950/30 border border-emerald-500/15 rounded-xl p-3 mb-4 text-left">
                <p className="text-xs text-emerald-400 font-medium">Registry Update</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{infoMsg}</p>
              </div>
            )}

            <form onSubmit={handleEmailAuthSubmit} className="space-y-4 mb-6 text-left">
              <div>
                <label className="block text-[10px] font-mono text-slate-550 uppercase tracking-widest mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@sierraestates.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={authLoading}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-650 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/40 transition-all font-mono"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-mono text-slate-550 uppercase tracking-widest">Security Password</label>
                  {activeMode === 'signin' && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={authLoading}
                      className="text-[10px] font-mono text-cyan-500 hover:text-cyan-400 hover:underline cursor-pointer transition-colors disabled:opacity-50"
                      id="forgot-password-trigger"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={authLoading}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-650 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/40 transition-all font-mono"
                />
              </div>

              {activeMode === 'signup' && (
                <div>
                  <label className="block text-[10px] font-mono text-slate-550 uppercase tracking-widest mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={authLoading}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-650 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/40 transition-all font-mono"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-black text-sm rounded-xl font-bold shadow-[0_0_20px_rgba(6,182,212,0.15)] active:scale-98 transition duration-150 flex items-center justify-center gap-2 cursor-pointer mt-6"
              >
                {authLoading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <span>{activeMode === 'signin' ? 'Sign In' : 'Create Admin Account'}</span>
                )}
              </button>
            </form>

            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <span className="relative bg-[#0a0f1d] px-3 text-[10px] font-mono text-slate-550 uppercase tracking-wider">
                Or Use Single Sign-On
              </span>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold active:scale-98 transition duration-150 flex items-center justify-center gap-2.5 cursor-pointer"
              id="google-login-trigger"
            >
              🔑 Google SSO Administration
            </button>
            
            <div className="mt-8 text-[9px] text-slate-600 font-mono tracking-widest uppercase">
              Primary: A.FAWZY8866@GMAIL.COM • EMERALDESTATESEGYPT@GMAIL.COM
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
