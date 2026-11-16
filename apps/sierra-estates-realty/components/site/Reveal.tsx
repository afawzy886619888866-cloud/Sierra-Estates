'use client';

/**
 * Scroll reveal built on framer-motion.
 *
 * Two rules this deliberately follows:
 *  - The reveal enhances an already-visible default. Content is never gated
 *    behind a class the observer might not fire, so a headless render or a
 *    hidden tab still ships the copy.
 *  - Reduced motion short-circuits to no animation at all, not a slower one.
 */
import React from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1] as const;

type Direction = 'up' | 'left' | 'right' | 'none';

const offset: Record<Direction, { x?: number; y?: number }> = {
  up: { y: 22 },
  left: { x: -26 },
  right: { x: 26 },
  none: {},
};

export function Reveal({
  children,
  delay = 0,
  direction = 'up',
  className,
  as = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: Direction;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;

  // Render the same element either way — falling back to a plain <div> would
  // silently change the tag (and any CSS or semantics riding on it) for
  // reduced-motion users.
  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, ...offset[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.62, ease: EASE, delay }}
    >
      {children}
    </MotionTag>
  );
}

/** Staggers direct children. Use for one list, not for every section. */
export function RevealGroup({
  children,
  className,
  stagger = 0.07,
}: {
  children: React.ReactNode;
  className?: string;
  /** Kept at or below 0.1s — longer and a list reads as sluggish rather than staggered. */
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  const parent: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: Math.min(stagger, 0.1) } },
  };

  return (
    <motion.div
      className={className}
      variants={parent}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

export const revealChild: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};
