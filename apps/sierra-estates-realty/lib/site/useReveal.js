'use client';

/**
 * Reveal-on-scroll + counter animation — port of initReveal()/initCounters()
 * in deploy/shared.js. Call once per page after content renders.
 */
import { useEffect } from 'react';

export function useReveal(deps = []) {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nodes = Array.from(document.querySelectorAll('.rv:not(.in)'));

    if (reduce || !('IntersectionObserver' in window)) {
      nodes.forEach((el) => el.classList.add('in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.06 }
    );
    nodes.forEach((el) => io.observe(el));

    // Safety net: anything already within the viewport gets revealed.
    const timer = window.setTimeout(() => {
      document.querySelectorAll('.rv:not(.in)').forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in');
      });
    }, 600);

    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useCounters(deps = []) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('[data-count]'));
    if (!els.length) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach((el) => { el.textContent = el.getAttribute('data-count') || ''; });
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target ;
        io.unobserve(el);
        const target = parseFloat(el.getAttribute('data-count') || '0');
        const dur = 1400;
        let start = 0;
        const step = (ts) => {
          if (!start) start = ts;
          const k = Math.min(1, (ts - start) / dur);
          const eased = 1 - Math.pow(1 - k, 3);
          const val = target * eased;
          el.textContent = target % 1 ? val.toFixed(1) : Math.round(val).toLocaleString();
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.3 });

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
