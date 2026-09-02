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
  info: (msg, ...args) => (pinoLogger.info )(msg, ...args),
  warn: (msg, ...args) => (pinoLogger.warn )(msg, ...args),
  error: (msg, ...args) => (pinoLogger.error )(msg, ...args),
  debug: (msg, ...args) => (pinoLogger.debug )(msg, ...args),
};

