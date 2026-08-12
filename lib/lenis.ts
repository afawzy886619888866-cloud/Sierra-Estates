import Lenis from 'lenis';
import { useEffect } from 'react';

/**
 * Hook that initializes Lenis for smooth scrolling.
 * Call it once at the top level (e.g., in RootLayout) to affect the whole app.
 */
export default function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
    });

    const raf = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);
}
