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

export const logger = {
  info: (msg: any, ...args: any[]) => (pinoLogger.info as any)(msg, ...args),
  warn: (msg: any, ...args: any[]) => (pinoLogger.warn as any)(msg, ...args),
  error: (msg: any, ...args: any[]) => (pinoLogger.error as any)(msg, ...args),
  debug: (msg: any, ...args: any[]) => (pinoLogger.debug as any)(msg, ...args),
};

