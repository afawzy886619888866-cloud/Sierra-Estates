'use client';

/**
 * Hero3D — safe boundary around the react-three-fiber hero scene.
 *
 * Three.js touches `window`/WebGL at module scope, so the scene is loaded with
 * ssr:false and only mounted once we know the browser can actually draw it:
 *
 *  - prefers-reduced-motion  → static gradient, no canvas, no rAF loop
 *  - no WebGL context        → same static gradient
 *  - still loading           → same static gradient
 *
 * In every case the hero keeps its composition, so nothing shifts when the
 * canvas arrives.
 */

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from 'framer-motion';

const Hero3DScene = dynamic(() => import('./Hero3DScene'), {
  ssr: false,
  loading: () => <div className="hero3d hero3d--fallback" aria-hidden />,
});

function hasWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')),
    );
  } catch {
    return false;
  }
}

export default function Hero3D() {
  const reduceMotion = useReducedMotion();
  const [canRender, setCanRender] = useState(false);

  useEffect(() => {
    setCanRender(hasWebGL());
  }, []);

  if (!canRender || reduceMotion) {
    return <div className="hero3d hero3d--fallback" aria-hidden />;
  }

  return <Hero3DScene />;
}
