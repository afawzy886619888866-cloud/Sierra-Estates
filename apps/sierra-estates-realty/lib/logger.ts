import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

// In Next.js client-side, fallback or suppress pino pretty
const pinoLogger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  transport: !isProduction && typeof window === 'undefined'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'HH:MM:ss Z',
        },
      }
    : undefined,
});

function sanitize<T>(val: T): T {
  if (typeof val === 'string') {
    return (val as string).replace(/\n|\r/g, ' ') as unknown as T;
  }
  return val;
}

export const logger = {
  info: (msg: any, ...args: any[]) =>
    (pinoLogger.info as any)(typeof msg === 'string' ? msg.replace(/\n|\r/g, ' ') : msg, ...args.map(sanitize)),
  warn: (msg: any, ...args: any[]) =>
    (pinoLogger.warn as any)(typeof msg === 'string' ? msg.replace(/\n|\r/g, ' ') : msg, ...args.map(sanitize)),
  error: (msg: any, ...args: any[]) =>
    (pinoLogger.error as any)(typeof msg === 'string' ? msg.replace(/\n|\r/g, ' ') : msg, ...args.map(sanitize)),
  debug: (msg: any, ...args: any[]) =>
    (pinoLogger.debug as any)(typeof msg === 'string' ? msg.replace(/\n|\r/g, ' ') : msg, ...args.map(sanitize)),
};

export default logger;
