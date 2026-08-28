import pino from 'pino';

const logger = pino({ name: 'sentry-telemetry-hook' });

export interface SentryBreadcrumb {
  category: string;
  message: string;
  level?: 'info' | 'warning' | 'error' | 'fatal';
  data?: Record<string, any>;
  timestamp?: number;
}

export class SentryHook {
  private static instance: SentryHook;
  private breadcrumbs: SentryBreadcrumb[] = [];
  private isInitialized = false;

  public static getInstance(): SentryHook {
    if (!SentryHook.instance) {
      SentryHook.instance = new SentryHook();
    }
    return SentryHook.instance;
  }

  public init(dsn?: string): void {
    const activeDsn = dsn || process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (activeDsn) {
      this.isInitialized = true;
      logger.info('Sentry telemetry hooks initialized successfully.');
    } else {
      logger.info('Sentry DSN not provided; running in local telemetry logging mode.');
    }
  }

  public addBreadcrumb(crumb: SentryBreadcrumb): void {
    const fullCrumb = {
      ...crumb,
      timestamp: crumb.timestamp || Date.now(),
    };
    this.breadcrumbs.push(fullCrumb);
    if (this.breadcrumbs.length > 100) {
      this.breadcrumbs.shift();
    }
  }

  public captureException(error: Error | any, context?: Record<string, any>): string {
    const eventId = `sentry-evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    logger.error({
      err: error,
      eventId,
      context,
      recentBreadcrumbsCount: this.breadcrumbs.length,
      msg: `[Sentry] Captured exception: ${error?.message || error}`,
    });
    return eventId;
  }

  public captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): string {
    const eventId = `sentry-msg-${Date.now()}`;
    logger.info({ msg: `[Sentry] ${message}`, level, eventId });
    return eventId;
  }
}

export const sentry = SentryHook.getInstance();
