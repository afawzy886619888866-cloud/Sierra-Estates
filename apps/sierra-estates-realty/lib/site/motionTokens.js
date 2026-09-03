/**
 * Motion tokens for the client site.
 *
 * `smooth` is the same curve the ported CSS uses for its transitions
 * (`--silk`), so JS-driven and CSS-driven motion stay on one timing language.
 */
export const motionTokens = {
  duration: {
    fast: 0.18,
    normal: 0.35,
    slow: 0.6,
  },
  easing: {
    smooth: [0.22, 1, 0.36, 1] ,
    sharp: [0.4, 0, 0.2, 1] ,
  },
  distance: {
    sm: 8,
    md: 16,
    lg: 24,
  },
} ;
