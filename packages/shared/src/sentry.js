 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import pino from 'pino';

const logger = pino({ name: 'sentry-telemetry-hook' });









export class SentryHook {constructor() { SentryHook.prototype.__init.call(this);SentryHook.prototype.__init2.call(this); }
  
   __init() {this.breadcrumbs = []}
   __init2() {this.isInitialized = false}

   static getInstance() {
    if (!SentryHook.instance) {
      SentryHook.instance = new SentryHook();
    }
    return SentryHook.instance;
  }

   init(dsn) {
    const activeDsn = dsn || process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (activeDsn) {
      this.isInitialized = true;
      logger.info('Sentry telemetry hooks initialized successfully.');
    } else {
      logger.info('Sentry DSN not provided; running in local telemetry logging mode.');
    }
  }

   addBreadcrumb(crumb) {
    const fullCrumb = {
      ...crumb,
      timestamp: crumb.timestamp || Date.now(),
    };
    this.breadcrumbs.push(fullCrumb);
    if (this.breadcrumbs.length > 100) {
      this.breadcrumbs.shift();
    }
  }

   captureException(error, context) {
    const eventId = `sentry-evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    logger.error({
      err: error,
      eventId,
      context,
      recentBreadcrumbsCount: this.breadcrumbs.length,
      msg: `[Sentry] Captured exception: ${_optionalChain([error, 'optionalAccess', _ => _.message]) || error}`,
    });
    return eventId;
  }

   captureMessage(message, level = 'info') {
    const eventId = `sentry-msg-${Date.now()}`;
    logger.info({ msg: `[Sentry] ${message}`, level, eventId });
    return eventId;
  }
}

export const sentry = SentryHook.getInstance();
