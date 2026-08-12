'use client';

import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface NavbarProps {
  isArabic?: boolean;
}

export default function Navbar({ isArabic = false }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  // Blur and background opacity change on scroll
  const navBackground = useTransform(
    scrollY,
    [0, 100],
    ['rgba(10, 22, 40, 0)', 'rgba(10, 22, 40, 0.85)']
  );

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      style={{ backgroundColor: navBackground }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? 'backdrop-blur-md py-4 border-b border-white/10 shadow-lg' : 'py-8'
      }`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        {/* LOGO */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-[#C9A84C] flex items-center justify-center">
            <div className="w-4 h-4 bg-[#C9A84C] rotate-45" />
          </div>
          <span className="font-playfair text-xl md:text-2xl font-bold text-white tracking-widest uppercase">
            Sierra Estates
          </span>
        </div>

        {/* DESKTOP NAV */}
        <div className="hidden md:flex items-center gap-10">
          {['Portfolio', 'Philosophy', 'Valuation', 'Journal'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm uppercase tracking-widest text-white/80 hover:text-[#C9A84C] transition-colors duration-300"
            >
              {item}
            </a>
          ))}
        </div>

        {/* CTA & LANG */}
        <div className="flex items-center gap-6">
          <button className="text-xs font-semibold text-white/60 hover:text-white transition-colors duration-300">
            {isArabic ? 'EN' : 'AR'}
          </button>
          <button className="hidden md:block px-6 py-2.5 border border-[#C9A84C]/50 text-[#C9A84C] text-sm uppercase tracking-widest rounded-sm hover:bg-[#C9A84C] hover:text-[#0A1628] transition-all duration-300">
            {isArabic ? 'تواصل مع مستشار' : 'Contact Advisor'}
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
