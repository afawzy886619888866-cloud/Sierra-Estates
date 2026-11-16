/**
 * SharedPubSubBroker — Unit Tests
 * Covers: singleton pattern, publish, subscribe, unsubscribe.
 */
import { SharedPubSubBroker, RecommendationMessage } from '../../../packages/shared/src/messaging/pubsub';

const baseRec = {
  recommendationId: 'rec-001',
  clientId: 'client-42',
  listingCodes: ['SE-HYP-VLA-0040-2026', 'SE-MVD-APT-0041-2026'],
  matchScore: 0.96,
  rationale: 'High match score based on 3-bed + pool preference',
  suggestedAction: 'send_whatsapp' as const,
};

describe('SharedPubSubBroker', () => {
  it('returns the same singleton instance every time', () => {
    const a = SharedPubSubBroker.getInstance();
    const b = SharedPubSubBroker.getInstance();
    expect(a).toBe(b);
  });

  it('publishRecommendation resolves to a string ID', async () => {
    const broker = SharedPubSubBroker.getInstance();
    const id = await broker.publishRecommendation(baseRec);
    expect(typeof id).toBe('string');
    expect(id.startsWith('rec-event-')).toBe(true);
  });

  it('listener receives full message with timestamp', async () => {
    const broker = SharedPubSubBroker.getInstance();
    const received: RecommendationMessage[] = [];
    const unsub = broker.onRecommendation((msg) => received.push(msg));

    await broker.publishRecommendation(baseRec);
    unsub();

    expect(received).toHaveLength(1);
    expect(received[0].recommendationId).toBe('rec-001');
    expect(received[0].clientId).toBe('client-42');
    expect(received[0].matchScore).toBe(0.96);
    expect(typeof received[0].timestamp).toBe('string');
    // timestamp is a valid ISO date
    expect(() => new Date(received[0].timestamp)).not.toThrow();
  });

  it('unsubscribe stops listener from receiving further messages', async () => {
    const broker = SharedPubSubBroker.getInstance();
    const received: RecommendationMessage[] = [];
    const unsub = broker.onRecommendation((msg) => received.push(msg));
    unsub(); // immediate unsubscribe

    await broker.publishRecommendation(baseRec);
    expect(received).toHaveLength(0);
  });

  it('multiple listeners all receive the same message', async () => {
    const broker = SharedPubSubBroker.getInstance();
    const r1: RecommendationMessage[] = [];
    const r2: RecommendationMessage[] = [];
    const u1 = broker.onRecommendation((m) => r1.push(m));
    const u2 = broker.onRecommendation((m) => r2.push(m));

    await broker.publishRecommendation(baseRec);
    u1(); u2();

    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(1);
    expect(r1[0].recommendationId).toBe(r2[0].recommendationId);
  });

  it('message contains correct listingCodes array', async () => {
    const broker = SharedPubSubBroker.getInstance();
    let captured: RecommendationMessage | null = null;
    const unsub = broker.onRecommendation((msg) => { captured = msg; });
    await broker.publishRecommendation(baseRec);
    unsub();

    expect(captured).not.toBeNull();
    expect(captured!.listingCodes).toEqual(['SE-HYP-VLA-0040-2026', 'SE-MVD-APT-0041-2026']);
    expect(captured!.suggestedAction).toBe('send_whatsapp');
  });
});
