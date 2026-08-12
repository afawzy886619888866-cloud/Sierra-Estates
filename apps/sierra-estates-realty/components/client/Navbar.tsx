"use client";
/**
 * Navbar — top navigation for the client page.
 * Sticky, glass-on-scroll, supports en/ar toggle, links to in-page sections.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2, Map, Sparkles, Calculator, ConciergeBell,
  User, Shield, Menu, X, Globe,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-client";
import { useAuth } from "@/components/client/AuthModal";

export function Navbar() {
  const { t, locale, setLocale } = useI18n();
  const { me, signOut, openAuth } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navItems = [
    { href: "#listings", label: t("nav.listings"), icon: Building2 },
    { href: "#compounds", label: t("nav.compounds"), icon: Map },
    { href: "#match", label: t("nav.match"), icon: Sparkles },
    { href: "/clients", label: locale === "ar" ? "طلب عقار" : "Request Sourcing", icon: ConciergeBell },
    { href: "#roi", label: t("nav.roi"), icon: Calculator },
  ];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "glass-panel shadow-2xl py-2.5" : "bg-transparent py-4"
      }`}
    >
      <nav className="container-page flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl gold-gradient flex items-center justify-center text-slate-950 font-bold text-lg gold-glow btn-tactile">
            S
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-display text-lg font-bold text-white group-hover:text-amber-300 transition-colors">Sierra Estates</span>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400">New Cairo</span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {navItems.map((it) => (
            <a key={it.href} href={it.href} className="tab-link px-3 py-2 rounded-xl hover:bg-white/5 transition flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white btn-tactile">
              <it.icon className="h-4 w-4 text-amber-400" />
              {it.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            className="btn-ghost p-2"
            aria-label="Toggle language"
            title="العربية / English"
          >
            <Globe className="h-4 w-4" />
            <span className="text-xs font-semibold">{locale === "en" ? "ع" : "EN"}</span>
          </button>

          {me?.signedIn ? (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-muted">{me.email}</span>
              {me.role === "admin" && (
                <Link
                  href={process.env.NEXT_PUBLIC_ADMIN_URL || "/admin"}
                  className="btn-outline"
                >
                  <Shield className="h-4 w-4" />
                  {t("nav.admin")}
                </Link>
              )}
              <button onClick={signOut} className="btn-ghost">{t("nav.signout")}</button>
            </div>
          ) : (
            <button onClick={openAuth} className="btn-gold hidden sm:inline-flex">
              <User className="h-4 w-4" />
              {t("nav.signin")}
            </button>
          )}

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden btn-ghost p-2"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="lg:hidden container-page mt-2 pb-2">
          <div className="card p-2 flex flex-col">
            {navItems.map((it) => (
              <a
                key={it.href}
                href={it.href}
                onClick={() => setMobileOpen(false)}
                className="tab-link justify-start"
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </a>
            ))}
            {me?.signedIn ? (
              <>
                {me.role === "admin" && (
                  <Link
                    href={process.env.NEXT_PUBLIC_ADMIN_URL || "/admin"}
                    className="tab-link justify-start"
                  >
                    <Shield className="h-4 w-4" />
                    {t("nav.admin")}
                  </Link>
                )}
                <button onClick={signOut} className="tab-link justify-start">
                  {t("nav.signout")}
                </button>
              </>
            ) : (
              <button
                onClick={() => { openAuth(); setMobileOpen(false); }}
                className="tab-link justify-start"
              >
                <User className="h-4 w-4" />
                {t("nav.signin")}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
