 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import EventEmitter from 'node:events';
import pino from 'pino';

const logger = pino({ name: 'ai-pubsub-broker' });





















export class PubSubBroker {
  
   __init() {this.emitter = new EventEmitter()}
   __init2() {this.isGcpAvailable = false}
   __init3() {this.isRedisAvailable = false}
   __init4() {this.localSubscribers = new Map()}

   constructor() {;PubSubBroker.prototype.__init.call(this);PubSubBroker.prototype.__init2.call(this);PubSubBroker.prototype.__init3.call(this);PubSubBroker.prototype.__init4.call(this);
    this.detectEnvironment();
  }

   static getInstance() {
    if (!PubSubBroker.instance) {
      PubSubBroker.instance = new PubSubBroker();
    }
    return PubSubBroker.instance;
  }

   detectEnvironment() {
    if (process.env.GOOGLE_CLOUD_PROJECT && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      this.isGcpAvailable = true;
      logger.info('PubSubBroker: GCP Cloud Pub/Sub provider selected.');
    } else if (process.env.REDIS_URL || process.env.KV_URL) {
      this.isRedisAvailable = true;
      logger.info('PubSubBroker: Redis dev fallback provider selected.');
    } else {
      logger.info('PubSubBroker: Local In-Memory EventBus fallback initialized (Development Mode).');
    }
  }

  /**
   * Publish a message to a designated topic (e.g. 'ai.recommendations')
   */
   async publish(
    topic,
    payload,
    attributes = {}
  ) {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const message = {
      id: messageId,
      topic,
      payload,
      attributes,
      timestamp: new Date().toISOString(),
    };

    logger.info({ msg: `Publishing message to topic [${topic}]`, messageId });

    // 1. In-memory dispatch
    this.emitter.emit(topic, message);

    const handlers = this.localSubscribers.get(topic);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(message);
        } catch (err) {
          logger.error({ err, msg: `Error in subscriber handler for topic ${topic}`, messageId });
        }
      }
    }

    return messageId;
  }

  /**
   * Subscribe to a topic with a callback handler
   */
   subscribe(topic, handler) {
    if (!this.localSubscribers.has(topic)) {
      this.localSubscribers.set(topic, new Set());
    }
    this.localSubscribers.get(topic).add(handler);
    logger.info({ msg: `Subscribed handler to topic [${topic}]` });

    return () => {
      _optionalChain([this, 'access', _ => _.localSubscribers, 'access', _2 => _2.get, 'call', _3 => _3(topic), 'optionalAccess', _4 => _4.delete, 'call', _5 => _5(handler)]);
    };
  }

  /**
   * Specific helper to publish to the canonical ai.recommendations topic
   */
   async publishRecommendation(payload) {
    return this.publish('ai.recommendations', payload, {
      source: 'ai-orchestrator',
      action: payload.suggestedAction,
    });
  }
}

export const pubsub = PubSubBroker.getInstance();
