"use client";

import React, { useState, useRef, useCallback } from "react";
import Image from "next/image";
import {
  ShieldCheck,
  Phone,
  MessageSquare,
  Copy,
  Check,
  Globe,
  X,
  ExternalLink,
  Sparkles,
} from "lucide-react";

export interface SierraBrandLogoProps {
  /** Display variant */
  variant?: "header" | "stacked" | "seal" | "compact";
  /** Current language code ('en' | 'ar') */
  lang?: "en" | "ar";
  /** Dark mode active */
  isDark?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Enable interactive 3D perspective tilt on hover */
  enableTilt?: boolean;
  /** Enable clicking to open VIP credentials & WhatsApp QR modal */
  interactiveModal?: boolean;
  /** Size scale multiplier */
  scale?: number;
  /** Custom on click override */
  onClick?: () => void;
}

export default function SierraBrandLogo({
  variant = "header",
  lang = "en",
  isDark = true,
  className = "",
  enableTilt = true,
  interactiveModal = true,
  scale = 1,
  onClick,
}: SierraBrandLogoProps) {
  const isAr = lang === "ar";
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // High-performance 3D parallax tilt calculation
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!enableTilt || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      // Bounded subtle luxury tilt (max 8 degrees)
      const rotateX = -(y / (rect.height / 2)) * 7;
      const rotateY = (x / (rect.width / 2)) * 7;
      setTilt({ x: rotateX, y: rotateY });
    },
    [enableTilt],
  );

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
      return;
    }
    if (interactiveModal) {
      e.preventDefault();
      setModalOpen(true);
    }
  };

  const copyOfficialLink = async () => {
    try {
      await navigator.clipboard.writeText("https://sierra-estates.net");
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
  };

  const brandNameEn = "SIERRA ESTATES";
  const brandNameAr = "سييرا إيستيتس";
  const sloganEn = "FUTURE OF REAL ESTATE";
  const sloganAr = "مستقبل الاستثمار العقاري";

  const titleText = isAr ? brandNameAr : brandNameEn;
  const sloganText = isAr ? sloganAr : sloganEn;

  // Calculate scaled sizes
  const shieldSize =
    variant === "compact"
      ? 36
      : variant === "seal"
        ? 48
        : variant === "stacked"
          ? 64
          : 44;
  const effectiveShieldSize = Math.round(shieldSize * scale);

  return (
    <>
      {/* Interactive Brand Logo Surface */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleLogoClick}
        role={interactiveModal ? "button" : undefined}
        tabIndex={interactiveModal ? 0 : undefined}
        onKeyDown={(e) => {
          if (interactiveModal && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setModalOpen(true);
          }
        }}
        aria-label={`${titleText} — ${sloganText}`}
        className={`group relative inline-flex items-center cursor-pointer select-none transition-transform duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl ${className}`}
        style={{
          transform:
            isHovered && enableTilt
              ? `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.02, 1.02, 1.02)`
              : "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          willChange: "transform",
        }}
      >
        {/* Variant: SEAL ONLY */}
        {variant === "seal" && (
          <div
            className="relative rounded-2xl p-1.5 flex items-center justify-center transition-all duration-300"
            style={{
              width: effectiveShieldSize + 12,
              height: effectiveShieldSize + 12,
              background: isDark
                ? "radial-gradient(circle at 50% 30%, rgba(30, 41, 59, 0.8), rgba(8, 14, 26, 0.95))"
                : "radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.9), rgba(245, 240, 230, 0.95))",
              border: isDark
                ? "1px solid rgba(234, 179, 8, 0.35)"
                : "1px solid rgba(180, 83, 9, 0.3)",
              boxShadow: isDark
                ? "0 8px 24px -4px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 243, 209, 0.15)"
                : "0 8px 20px -4px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.8)",
            }}
          >
            <div className="relative w-full h-full overflow-hidden rounded-xl flex items-center justify-center">
              <img
                src="/assets/logo-shield.png"
                alt="Sierra Estates Seal"
                width={effectiveShieldSize}
                height={effectiveShieldSize}
                className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(234,179,8,0.25)] transition-transform duration-300 group-hover:scale-105"
              />
              {/* Light Sheen Sweep on Hover */}
              <div
                className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
                  isHovered ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  background:
                    "linear-gradient(105deg, transparent 20%, rgba(255, 243, 209, 0.4) 50%, transparent 80%)",
                  transform: isHovered
                    ? "translateX(100%)"
                    : "translateX(-100%)",
                  transition: "transform 0.75s ease-in-out",
                }}
              />
            </div>
          </div>
        )}

        {/* Variant: STACKED (Centered Shield above Title and Slogan) */}
        {variant === "stacked" && (
          <div className="flex flex-col items-center text-center gap-2.5">
            <div
              className="relative rounded-2xl p-2 flex items-center justify-center transition-all duration-300 group-hover:shadow-[0_0_24px_rgba(234,179,8,0.25)]"
              style={{
                width: effectiveShieldSize + 16,
                height: effectiveShieldSize + 16,
                background: isDark
                  ? "radial-gradient(circle at 50% 30%, rgba(20, 30, 48, 0.85), rgba(6, 17, 34, 0.95))"
                  : "radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.95), rgba(247, 245, 240, 0.95))",
                border: isDark
                  ? "1px solid rgba(234, 179, 8, 0.4)"
                  : "1px solid rgba(180, 83, 9, 0.35)",
              }}
            >
              <img
                src="/assets/logo-shield.png"
                alt="Sierra Estates Shield"
                width={effectiveShieldSize}
                height={effectiveShieldSize}
                className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(234,179,8,0.3)] transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col items-center">
              <span
                className={`text-[19px] sm:text-[22px] font-black tracking-[0.14em] uppercase leading-none font-serif ${
                  isDark ? "text-white" : "text-[#061122]"
                }`}
              >
                {titleText}
              </span>
              <span
                className="text-[10px] sm:text-[11px] font-bold tracking-[0.18em] uppercase mt-1.5"
                style={{
                  color: isDark ? "#EAB308" : "#B45309",
                }}
              >
                {sloganText}
              </span>
            </div>
          </div>
        )}

        {/* Variant: HEADER / COMPACT (Horizontal Row) */}
        {(variant === "header" || variant === "compact") && (
          <div className="flex items-center gap-3">
            {/* Shield Icon Container */}
            <div
              className="relative rounded-xl p-1 shrink-0 flex items-center justify-center transition-all duration-300 group-hover:border-amber-400/80"
              style={{
                width: effectiveShieldSize + 8,
                height: effectiveShieldSize + 8,
                background: isDark
                  ? "radial-gradient(circle at 50% 30%, rgba(24, 34, 52, 0.8), rgba(6, 17, 34, 0.95))"
                  : "radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.95), rgba(244, 240, 230, 0.9))",
                border: isDark
                  ? "1px solid rgba(234, 179, 8, 0.35)"
                  : "1px solid rgba(180, 83, 9, 0.3)",
                boxShadow: isDark
                  ? "0 4px 16px -2px rgba(0, 0, 0, 0.4)"
                  : "0 4px 12px -2px rgba(0, 0, 0, 0.06)",
              }}
            >
              <img
                src="/assets/logo-shield.png"
                alt="Sierra Estates Official Shield"
                width={effectiveShieldSize}
                height={effectiveShieldSize}
                className="w-full h-full object-contain filter drop-shadow-[0_2px_6px_rgba(234,179,8,0.25)] transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            {/* Typography */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[15px] sm:text-[16px] font-black tracking-[0.12em] uppercase leading-none font-serif ${
                    isDark ? "text-white" : "text-[#061122]"
                  }`}
                >
                  {titleText}
                </span>
                {interactiveModal && (
                  <span
                    className="hidden sm:inline-flex items-center gap-0.5 text-[8.5px] font-mono px-1.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 group-hover:border-amber-400/60 transition-colors"
                    title="Click for official VIP contact and credentials"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                    <span>VIP</span>
                  </span>
                )}
              </div>

              {variant === "header" && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className="text-[9.5px] sm:text-[10px] font-bold tracking-[0.14em] uppercase font-sans leading-none"
                    style={{
                      color: isDark ? "#EAB308" : "#B45309",
                    }}
                  >
                    {sloganText}
                  </span>
                  <span className="text-stone-400 dark:text-stone-600 text-[9px]">
                    ·
                  </span>
                  <span className="text-[9px] font-mono text-cyan-600 dark:text-cyan-400 font-semibold tracking-wider">
                    {isAr ? "القاهرة الجديدة" : "NEW CAIRO"}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Luxury Interactive VIP Brand & Contact Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
          onClick={() => setModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-md rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl p-6 sm:p-7 text-stone-100 animate-scale-up"
            style={{
              background:
                "radial-gradient(circle at 50% 0%, #0d1e38 0%, #061122 65%, #040914 100%)",
              boxShadow:
                "0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(234, 179, 8, 0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition-colors focus:outline-none"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header: Centered Shield Emblem */}
            <div className="flex flex-col items-center text-center">
              <div className="relative w-24 h-24 mb-3 rounded-2xl p-2 bg-linear-to-b from-stone-900/90 to-stone-950/90 border border-amber-500/40 shadow-xl flex items-center justify-center">
                <img
                  src="/assets/logo-shield.png"
                  alt="Sierra Estates Shield Emblem"
                  className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(234,179,8,0.35)]"
                />
              </div>

              <h3 className="text-2xl font-black tracking-widest uppercase font-serif text-white">
                SIERRA ESTATES
              </h3>
              <p className="text-sm font-semibold tracking-wider text-stone-300 mt-0.5">
                سييرا إيستيتس
              </p>

              {/* Slogan Badges */}
              <div className="mt-2.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
                <p className="text-[11px] font-extrabold tracking-widest uppercase text-amber-400">
                  FUTURE OF REAL ESTATE · مستقبل الاستثمار العقاري
                </p>
              </div>

              <p className="text-xs text-stone-400 mt-3 leading-relaxed max-w-xs">
                Authoritative Luxury Real Estate & PropTech Network dominating
                New Cairo & The 5th Settlement.
              </p>
            </div>

            {/* High-Resolution VIP WhatsApp QR Code */}
            <div className="mt-6 flex flex-col items-center">
              <div className="relative p-3 rounded-2xl bg-[#FAF8F5] border-2 border-amber-400/50 shadow-lg">
                <img
                  src="/assets/whatsapp-business-qr.png"
                  alt="Official WhatsApp Business QR"
                  className="w-44 h-44 object-contain rounded-lg"
                />
              </div>
              <p className="text-[11px] font-mono text-stone-400 mt-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Direct WhatsApp Channel</span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-2.5">
              {/* WhatsApp Direct Chat */}
              <a
                href="https://wa.me/201092048333?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D8%B3%D9%8A%D9%8A%D8%B1%D8%A7%20%D8%A5%D9%8A%D8%B3%D8%AA%D9%8A%D8%AA%D8%B3%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1%20%D8%B9%D9%86%20%D8%A7%D9%84%D8%B9%D9%82%D8%A7%D8%B1%D8%A7%D8%AA%20%D8%A7%D9%84%D9%85%D8%AA%D8%A7%D8%AD%D8%A9"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat on Official WhatsApp (+201092048333)</span>
              </a>

              {/* VIP Direct Phone Call */}
              <a
                href="tel:+201092048333"
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-stone-200 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Phone className="w-4 h-4 text-amber-400" />
                <span>Call VIP Desk (+20 109 204 8333)</span>
              </a>

              {/* Copy Official URL */}
              <button
                type="button"
                onClick={copyOfficialLink}
                className="w-full py-2 px-4 rounded-xl bg-stone-900/80 hover:bg-stone-900 border border-stone-800 text-stone-300 font-mono text-xs flex items-center justify-center gap-2 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">
                      Link Copied: sierra-estates.net
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-400" />
                    <span>Copy Official Portal Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Footer Notice */}
            <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-stone-500 font-mono">
              <span>EST. 2026 · NEW CAIRO</span>
              <a
                href="https://sierra-estates.net"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400/80 hover:underline flex items-center gap-1"
              >
                <span>sierra-estates.net</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
