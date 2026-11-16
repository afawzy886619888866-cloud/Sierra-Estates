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

export interface HarvesterOpportunityEvent {
  id: string;
  compound: string;
  type: string;
  price: number;
  areaSqm?: number;
  pricePerSqm?: number;
  mode: 'sale' | 'rent';
  discountPct?: number;
  hotDeal?: boolean;
  notes?: string;
  lat?: number;
  lng?: number;
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

  public async publishHarvesterEvent(evt: Omit<HarvesterOpportunityEvent, 'timestamp'>): Promise<string> {
    const fullEvt: HarvesterOpportunityEvent = {
      ...evt,
      timestamp: new Date().toISOString(),
    };
    this.emitter.emit('harvester.opportunity', fullEvt);
    return `harv-event-${Date.now()}`;
  }

  public onHarvesterEvent(listener: (evt: HarvesterOpportunityEvent) => void): () => void {
    this.emitter.on('harvester.opportunity', listener);
    return () => {
      this.emitter.off('harvester.opportunity', listener);
    };
  }
}

export const sharedPubSub = SharedPubSubBroker.getInstance();

