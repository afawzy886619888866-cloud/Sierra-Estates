import EventEmitter from 'node:events';

export interface RecommendationMessage {
  recommendationId: string;
  clientId: string;
  listingCodes: string[];
  matchScore: number;
  rationale: string;
  suggestedAction: 'send_whatsapp' | 'schedule_viewing' | 'broker_review';
  metadata?: Record<string, any>;
  timestamp: string;
}

export class SharedPubSubBroker {
  private static instance: SharedPubSubBroker;
  private emitter = new EventEmitter();

  public static getInstance(): SharedPubSubBroker {
    if (!SharedPubSubBroker.instance) {
      SharedPubSubBroker.instance = new SharedPubSubBroker();
    }
    return SharedPubSubBroker.instance;
  }

  public async publishRecommendation(rec: Omit<RecommendationMessage, 'timestamp'>): Promise<string> {
    const fullMsg: RecommendationMessage = {
      ...rec,
      timestamp: new Date().toISOString(),
    };
    this.emitter.emit('ai.recommendations', fullMsg);
    return `rec-event-${Date.now()}`;
  }

  public onRecommendation(listener: (msg: RecommendationMessage) => void): () => void {
    this.emitter.on('ai.recommendations', listener);
    return () => {
      this.emitter.off('ai.recommendations', listener);
    };
  }
}

export const sharedPubSub = SharedPubSubBroker.getInstance();
