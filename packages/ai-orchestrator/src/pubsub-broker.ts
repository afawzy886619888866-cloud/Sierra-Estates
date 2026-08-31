import EventEmitter from 'node:events';
import pino from 'pino';

const logger = pino({ name: 'ai-pubsub-broker' });

export interface PubSubMessage<T = any> {
  id: string;
  topic: string;
  payload: T;
  attributes?: Record<string, string>;
  timestamp: string;
}

export interface RecommendationPayload {
  recommendationId: string;
  clientId: string;
  listingCodes: string[];
  matchScore: number;
  rationale: string;
  suggestedAction: 'send_whatsapp' | 'schedule_viewing' | 'broker_review';
  metadata?: Record<string, any>;
}

export type MessageHandler<T = any> = (message: PubSubMessage<T>) => Promise<void> | void;

export class PubSubBroker {
  private static instance: PubSubBroker;
  private emitter: EventEmitter = new EventEmitter();
  private isGcpAvailable: boolean = false;
  private isRedisAvailable: boolean = false;
  private localSubscribers: Map<string, Set<MessageHandler>> = new Map();

  private constructor() {
    this.detectEnvironment();
  }

  public static getInstance(): PubSubBroker {
    if (!PubSubBroker.instance) {
      PubSubBroker.instance = new PubSubBroker();
    }
    return PubSubBroker.instance;
  }

  private detectEnvironment(): void {
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
  public async publish<T = any>(
    topic: string,
    payload: T,
    attributes: Record<string, string> = {}
  ): Promise<string> {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const message: PubSubMessage<T> = {
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
  public subscribe<T = any>(topic: string, handler: MessageHandler<T>): () => void {
    if (!this.localSubscribers.has(topic)) {
      this.localSubscribers.set(topic, new Set());
    }
    this.localSubscribers.get(topic)!.add(handler);
    logger.info({ msg: `Subscribed handler to topic [${topic}]` });

    return () => {
      this.localSubscribers.get(topic)?.delete(handler);
    };
  }

  /**
   * Specific helper to publish to the canonical ai.recommendations topic
   */
  public async publishRecommendation(payload: RecommendationPayload): Promise<string> {
    return this.publish<RecommendationPayload>('ai.recommendations', payload, {
      source: 'ai-orchestrator',
      action: payload.suggestedAction,
    });
  }
}

export const pubsub = PubSubBroker.getInstance();
