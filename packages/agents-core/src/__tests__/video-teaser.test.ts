import { describe, it, expect } from 'vitest';
import { VideoTeaserEngine } from '../video-teaser';

describe('VideoTeaserEngine Suite', () => {
  it('generates multi-scene video storyboard with ordered scenes and durations', () => {
    const storyboard = VideoTeaserEngine.generateStoryboard({
      sierraCode: 'SE-MIV-101',
      compound: 'Mivida',
      unitType: 'Standalone Villa',
      priceEGP: 32000000,
      areaSqm: 280,
      bedrooms: 4,
      subfeatures: ['Crystal Lagoon', 'Clubhouse'],
    });

    expect(storyboard).toHaveLength(4);
    expect(storyboard[0].visualType).toBe('hero_facade');
    expect(storyboard[0].captionAr).toContain('Mivida');
    expect(storyboard[1].visualType).toBe('masterplan_drone');
    expect(storyboard[1].captionAr).toContain('Crystal Lagoon');
    expect(storyboard[2].visualType).toBe('financial_yield');
    expect(storyboard[3].visualType).toBe('call_to_action');
    expect(storyboard[3].captionAr).toContain('+201092048333');
  });

  it('assembles vertical 9:16 teaser with WhatsApp share payload', async () => {
    const teaser = await VideoTeaserEngine.createTeaser({
      sierraCode: 'SE-HYD-505',
      compound: 'Hyde Park',
      unitType: 'Twin House',
      priceEGP: 22000000,
      areaSqm: 220,
      targetChannel: 'whatsapp',
    });

    expect(teaser.teaserId).toMatch(/^vt-/);
    expect(teaser.aspectRatio).toBe('9:16');
    expect(teaser.videoDurationSeconds).toBe(12);
    expect(teaser.videoStreamUrl).toContain('https://media.sierra-estates.net/videos/teasers/');
    expect(teaser.whatsAppSharePayload.caption).toContain('SE-HYD-505');
    expect(teaser.whatsAppSharePayload.caption).toContain('Hyde Park');
    expect(teaser.whatsAppSharePayload.caption).toContain('https://wa.me/201092048333');
  });

  it('selects 16:9 widescreen format for portal channel', async () => {
    const teaser = await VideoTeaserEngine.createTeaser({
      sierraCode: 'SE-PAL-202',
      compound: 'Palm Hills',
      unitType: 'Penthouse',
      priceEGP: 18000000,
      areaSqm: 190,
      targetChannel: 'portal',
    });

    expect(teaser.aspectRatio).toBe('16:9');
  });
});
