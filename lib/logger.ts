/**
 * SIERRA ESTATES — Logger Utility
 * Thin wrapper around console to allow easy redirection in the future.
 */

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  info: (...args: unknown[]) => {
    if (isDev) console.info('[Sierra]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[Sierra]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[Sierra]', ...args);
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug('[Sierra]', ...args);
  },
};

export default logger;
