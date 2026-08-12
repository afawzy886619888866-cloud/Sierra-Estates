'use client';

/**
 * SIERRA ESTATES — PREMIUM HERO SECTION
 * Cinematic parallax hero with luxury villa imagery
 * Design: Quiet Luxury (Navy/Gold/Ivory)
 */

import React, { useRef, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Play } from 'lucide-react';

interface PremiumHeroProps {
  title: string;
  subtitle: string;
  ctaLabel: string;
  onCtaClick?: () => void;
  isArabic?: boolean;
}

export default function PremiumHero({
  title,
  subtitle,
  ctaLabel,
  onCtaClick,
  isArabic = false,
}: PremiumHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  // Parallax effects
  const bgY = useTransform(scrollY, [0, 500], [0, 150]);
  const contentY = useTransform(scrollY, [0, 500], [0, 100]);
  const contentOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  useEffect(() => {
    const unsubBg = bgY.on('change', (latest) => {
      if (bgRef.current) {
        bgRef.current.style.transform = `translateY(${latest}px) translateZ(0)`;
      }
    });

    const unsubContentY = contentY.on('change', (latest) => {
      if (contentRef.current) {
        contentRef.current.style.transform = `translateY(${latest}px) translateZ(0)`;
      }
    });

    const unsubContentOpacity = contentOpacity.on('change', (latest) => {
      if (contentRef.current) {
        contentRef.current.style.opacity = String(latest);
      }
    });

    return () => {
      unsubBg();
      unsubContentY();
      unsubContentOpacity();
    };
  }, [bgY, contentY, contentOpacity]);

  return (
    <section
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-[#0A1628]"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* --- BACKGROUND HERO IMAGE LAYERS --- */}

      {/* Primary Hero Image with Parallax */}
      <div
        ref={bgRef}
        className="absolute inset-0 w-full h-full"
      >
        <div className="w-full h-full bg-cover bg-center bg-fixed bg-[url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&fit=crop')]" />
      </div>

      {/* --- OVERLAY LAYERS --- */}

      {/* Dark gradient overlay for extreme contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628]/60 via-black/50 to-[#0A1628]/80" />

      {/* Gold accent line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, delay: 0.3 }}
        className="absolute top-1/3 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent"
      />

      {/* --- CONTENT --- */}
      <div
        ref={contentRef}
        className="relative z-10 text-center max-w-4xl px-6 md:px-12"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="inline-flex items-center gap-2 mb-8 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full shadow-lg"
        >
          <Play size={12} className="text-[#C9A84C] fill-[#C9A84C]" />
          <span className="text-xs uppercase tracking-[0.2em] text-white/90 font-semibold">
            {isArabic ? 'شاهد الرؤية' : 'Watch The Vision'}
          </span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="font-playfair text-6xl md:text-8xl lg:text-9xl italic text-white leading-tight mb-6 tracking-tight drop-shadow-2xl"
        >
          {title}
        </motion.h1>

        {/* Decorative line under title */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="w-24 h-1 bg-[#C9A84C] mx-auto mb-8 shadow-[0_0_15px_rgba(201,168,76,0.5)]"
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-lg md:text-2xl text-white/90 leading-relaxed font-light mb-12 max-w-2xl mx-auto drop-shadow-md"
        >
          {subtitle}
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(201, 168, 76, 0.4)' }}
            whileTap={{ scale: 0.95 }}
            onClick={onCtaClick}
            className="px-10 py-4 bg-[#C9A84C] text-[#0A1628] font-bold uppercase tracking-[0.15em] rounded-lg text-sm md:text-base transition-all duration-300 hover:bg-[#B8973B] shadow-[0_10px_20px_rgba(0,0,0,0.3)]"
          >
            {ctaLabel}
          </motion.button>
        </motion.div>
      </div>

      {/* --- SCROLL INDICATOR --- */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-white/70 font-medium">
            {isArabic ? 'تمرير لأسفل' : 'Scroll'}
          </span>
          <div className="w-[2px] h-8 bg-gradient-to-b from-white/70 to-transparent" />
        </div>
      </motion.div>
    </section>
  );
}
