'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import gsap from 'gsap';

/**
 * Hyouz Luxury Real Estate Motion Suite
 * Powered by Framer Motion & GSAP
 * Aesthetic: Architectural Obsidian, Liquid Champagne Gold (#D4AF37), Tactile Springs
 */

/**
 * Smooth, anti-slop view transition between admin consoles
 */
export function HyouzPageTransition({
  children,
  transitionKey,
  className = '',
}: {
  children: React.ReactNode;
  transitionKey?: string;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      key={transitionKey}
      initial={{ opacity: 0, y: 10, filter: 'blur(3px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  );
}

/**
 * GSAP Animated Numerical Counter
 * Smoothly tweens from 0 or prior value to the target number
 */
export function HyouzCounter({
  value,
  duration = 1.2,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const counterObj = useRef<{ val: number }>({ val: 0 });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }

    const tween = gsap.to(counterObj.current, {
      val: value,
      duration,
      ease: 'power3.out',
      onUpdate: () => {
        setDisplayValue(counterObj.current.val);
      },
    });

    return () => {
      tween.kill();
    };
  }, [value, duration, shouldReduceMotion]);

  const formatted = useMemo(() => {
    const num = decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toLocaleString();
    return `${prefix}${num}${suffix}`;
  }, [displayValue, decimals, prefix, suffix]);

  return <span className={className}>{formatted}</span>;
}

/**
 * Hyouz Luxury Bento Card
 * Combines Framer Motion hover lift with GSAP specular cursor spotlight
 */
export function HyouzCard({
  children,
  className = '',
  onClick,
  glowColor = 'rgba(212, 175, 55, 0.12)',
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  glowColor?: string;
  style?: React.CSSProperties;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [spotlight, setSpotlight] = useState({ x: -1000, y: -1000, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setSpotlight({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      opacity: 1,
    });
  };

  const handleMouseLeave = () => {
    setSpotlight((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileHover={{ y: -3, transition: { duration: 0.22, ease: 'easeOut' } }}
      whileTap={onClick ? { scale: 0.985 } : undefined}
      className={`relative overflow-hidden transition-all duration-300 ${className}`}
      style={{
        ...style,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Specular Spotlight Layer */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: spotlight.opacity,
          background: `radial-gradient(450px circle at ${spotlight.x}px ${spotlight.y}px, ${glowColor}, transparent 70%)`,
        }}
      />
      {children}
    </motion.div>
  );
}

/**
 * GSAP Magnetic Interactive Action Button
 * Gently pulls toward cursor on hover and snaps elastically on leave
 */
export function HyouzMagneticButton({
  children,
  onClick,
  className = '',
  style = {},
  strength = 0.28,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  strength?: number;
  disabled?: boolean;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = (e.clientX - (rect.left + rect.width / 2)) * strength;
    const y = (e.clientY - (rect.top + rect.height / 2)) * strength;

    gsap.to(btnRef.current, {
      x,
      y,
      duration: 0.35,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };

  const handleMouseLeave = () => {
    if (!btnRef.current) return;
    gsap.to(btnRef.current, {
      x: 0,
      y: 0,
      duration: 0.55,
      ease: 'elastic.out(1.1, 0.4)',
      overwrite: 'auto',
    });
  };

  return (
    <motion.button
      ref={btnRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      disabled={disabled}
      className={className}
      style={{
        willChange: 'transform',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {children}
    </motion.button>
  );
}

/**
 * Hyouz Live Status Beacon
 * Subtle breathing animation for real-time nodes (WhatsApp Gateway, Cloudflare, Supabase)
 */
export function HyouzBeacon({
  color = '#10B981',
  size = 8,
  glow = true,
}: {
  color?: string;
  size?: number;
  glow?: boolean;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: size,
        height: size,
      }}
    >
      {glow && (
        <motion.span
          animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            backgroundColor: color,
          }}
        />
      )}
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: glow ? `0 0 8px ${color}` : 'none',
          display: 'inline-block',
        }}
      />
    </span>
  );
}

export { AnimatePresence, motion };
