import { VoiceTranscriberEngine, VoiceNoteInput } from '../../../packages/agents-core/src/voice-transcriber';

describe('VoiceTranscriberEngine Egyptian Broker NLP', () => {
  it('extracts compound, price, and tenure from spoken Egyptian Arabic note', () => {
    const input: VoiceNoteInput = {
      audioUrl: 'https://cdn.sierra-estates.net/voice/note-99.ogg',
      mimeType: 'audio/ogg',
      durationSeconds: 14,
      spokenTranscriptAr: 'معايا فيلا مستقلة في ميفيدا بسعر ٣٥ مليون ومقدم ١٠% وتقسيط على ٧ سنين استلام فوري',
      brokerPhone: '+201011112222',
    };

    const parsed = VoiceTranscriberEngine.parseSpokenTranscript(input);

    expect(parsed.detectedCompound).toBe('Mivida');
    expect(parsed.detectedUnitType).toBe('Standalone Villa');
    expect(parsed.extractedPriceEGP).toBe(35000000);
    expect(parsed.extractedDownPaymentPercent).toBe(10);
    expect(parsed.extractedTenureYears).toBe(7);
    expect(parsed.isImmediateDelivery).toBe(true);
    expect(parsed.confidenceScore).toBeGreaterThanOrEqual(80);
  });
});
