import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  }),
});

function sanitizeLog<T>(input: T): T {
  if (typeof input === 'string') {
    return (input as string).replace(/[\r\n]/g, ' ') as unknown as T;
  }
  if (input !== null && typeof input === 'object') {
    try {
      const sanitized = JSON.stringify(input).replace(/[\r\n]/g, ' ');
      return JSON.parse(sanitized) as T;
    } catch {
      return String(input).replace(/[\r\n]/g, ' ') as unknown as T;
    }
  }
  return input;
}

export const logger = {
  info: (msg: any, ...args: any[]) => (pinoLogger.info as any)(sanitizeLog(msg), ...args.map(sanitizeLog)),
  warn: (msg: any, ...args: any[]) => (pinoLogger.warn as any)(sanitizeLog(msg), ...args.map(sanitizeLog)),
  error: (msg: any, ...args: any[]) => (pinoLogger.error as any)(sanitizeLog(msg), ...args.map(sanitizeLog)),
  debug: (msg: any, ...args: any[]) => (pinoLogger.debug as any)(sanitizeLog(msg), ...args.map(sanitizeLog)),
};

