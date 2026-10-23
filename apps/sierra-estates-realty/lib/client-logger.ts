/**
 * Client-side Logger
 * Production-safe error and warning logging for browser environment
 * In development, logs appear in console; in production, they're suppressed
 */

export const clientLogger = {
  error: (message: string, error?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(message, error);
    }
    // In production, errors are silently captured but not logged to console
    // Future: could send to external service (Sentry, etc.)
  },

  warn: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(message, data);
    }
  },

  info: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(message, data);
    }
  },

  log: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(message, data);
    }
  },
};

export default clientLogger;
