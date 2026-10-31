import { describe, it, expect } from 'vitest';
import {
  stripQualificationTags,
  extractQualificationPayload,
  processBotResponse,
  SIERRA_SYSTEM_PROMPT,
} from '../lib/lead-qualifier.js';
import {
  extractClientNeeds,
  getConversationalSkillsGuide,
  TARGET_COMPOUNDS,
} from '../lib/customer-chat-learner.js';

describe('Lead Qualifier Middleware', () => {
  it('should export the consultative SIERRA_SYSTEM_PROMPT with key principles', () => {
    expect(SIERRA_SYSTEM_PROMPT).toContain('البياع مستشار والمستشار مؤتمن');
    expect(SIERRA_SYSTEM_PROMPT).toContain('<lead_qualification>');
    expect(SIERRA_SYSTEM_PROMPT).toContain('Stage 1: Lead Acknowledgment & Viewing Availability');
    expect(SIERRA_SYSTEM_PROMPT).toContain('Stage 2: Preferences Gathering for Alternatives');
    expect(SIERRA_SYSTEM_PROMPT).toContain('Stage 3: Structured Lead Payload Generation');
  });

  it('should strip <lead_qualification> tags completely from customer-facing text', () => {
    const rawReply = `تمام يا فندم، بنرتب لحضرتك المعاينة غداً في ميفيدا الساعة ٥ مساءً.
<lead_qualification>
{
  "lead_ready": true,
  "preferred_viewing": "Tomorrow 5pm",
  "budget": "50000",
  "currency": "EGP",
  "locations": ["Mivida"]
}
</lead_qualification>`;

    const clean = stripQualificationTags(rawReply);
    expect(clean).toBe('تمام يا فندم، بنرتب لحضرتك المعاينة غداً في ميفيدا الساعة ٥ مساءً.');
    expect(clean).not.toContain('<lead_qualification>');
    expect(clean).not.toContain('Tomorrow 5pm');
  });

  it('should correctly extract and parse structured JSON from <lead_qualification> tags', () => {
    const rawReply = `Welcome Mr. Jason! We will coordinate gate access at CFC.
<lead_qualification>
{
  "lead_ready": true,
  "client_name": "Jason",
  "preferred_viewing": "Saturday 2pm",
  "move_in_date": "Next Month",
  "lease_duration": "2 years",
  "budget": "65000",
  "currency": "EGP",
  "locations": ["Cairo Festival City", "Lake View"],
  "bedrooms": "3",
  "furnishing_status": "Semi-Furnished"
}
</lead_qualification>`;

    const payload = extractQualificationPayload(rawReply);
    expect(payload).not.toBeNull();
    expect(payload?.lead_ready).toBe(true);
    expect(payload?.client_name).toBe('Jason');
    expect(payload?.locations).toEqual(['Cairo Festival City', 'Lake View']);
    expect(payload?.budget).toBe('65000');
    expect(payload?.furnishing_status).toBe('Semi-Furnished');
  });

  it('should return null when no tag is present or JSON is invalid', () => {
    expect(extractQualificationPayload('Hello, how can I help you?')).toBeNull();
    expect(extractQualificationPayload('<lead_qualification>{invalid-json}</lead_qualification>')).toBeNull();
  });

  it('should process bot response and return clean text with qualification status', async () => {
    const rawAiReply = `شكراً لحضرتك، جاري التواصل مع المالك.
<lead_qualification>
{
  "lead_ready": true,
  "preferred_viewing": "الأحد القادم",
  "budget": "45000",
  "currency": "EGP",
  "locations": ["Villette"]
}
</lead_qualification>`;

    const res = await processBotResponse({
      clientPhone: '+201000000000',
      clientName: 'مهندس مفيدا',
      rawAiReply,
    });

    expect(res.cleanMessage).toBe('شكراً لحضرتك، جاري التواصل مع المالك.');
    expect(res.isQualified).toBe(true);
    expect(res.qualificationData?.locations).toEqual(['Villette']);
    expect(res.qualificationData?.budget).toBe('45000');
  });
});

describe('Customer Chat Learner Enhancements', () => {
  it('should recognize newly added target compounds (Uptown Cairo, Shorouk, CFC)', () => {
    const uptownNeed = extractClientNeeds('عايز شقة للايجار في ابتاون كايرو في الفورتين');
    expect(uptownNeed.compound).toBe('Uptown Cairo');
    expect(uptownNeed.dealIntent).toBe('rent');

    const shoroukNeed = extractClientNeeds('متاح فيلا مستقلة في الشروق سبرنجز للبيع؟');
    expect(shoroukNeed.compound).toBe('Al Shorouk Springs');
    expect(shoroukNeed.dealIntent).toBe('buy');
    expect(shoroukNeed.propertyType).toBe('villa');

    const cfcNeed = extractClientNeeds('Looking for a corporate 3 bedroom flat in CFC near the mall');
    expect(cfcNeed.compound).toBe('Cairo Festival City');
    expect(cfcNeed.propertyType).toBe('apartment');
  });

  it('should include target compounds in the registered catalog', () => {
    const labels = TARGET_COMPOUNDS.map((c: { label: string }) => c.label);
    expect(labels).toContain('Uptown Cairo');
    expect(labels).toContain('Al Shorouk Springs');
    expect(labels).toContain('Cairo Festival City');
    expect(labels).toContain('Mivida');
    expect(labels).toContain('Villette');
    expect(labels).toContain('Eastown');
  });
});
