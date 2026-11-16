'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MotionTextProps {
  text: string;
  className?: string;
  delay?: number;
  variant?: 'fadeUp' | 'staggerWords';
}

export default function MotionText({
  text,
  className = '',
  delay = 0,
  variant = 'fadeUp',
}: MotionTextProps) {
  if (variant === 'staggerWords') {
    const words = text.split(' ');
    
    return (
      <motion.span
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-20px' }}
        className={`inline-block ${className}`}
      >
        {words.map((word, idx) => (
          <motion.span
            key={idx}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{
              duration: 0.5,
              delay: delay + idx * 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="inline-block mr-[0.25em]"
          >
            {word}
          </motion.span>
        ))}
      </motion.span>
    );
  }

  return (
    <motion.span
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`inline-block ${className}`}
    >
      {text}
    </motion.span>
  );
}
