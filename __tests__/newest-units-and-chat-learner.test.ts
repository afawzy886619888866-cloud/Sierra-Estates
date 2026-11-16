import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { extractClientNeeds, getConversationalSkillsGuide } from '../workflows/lib/customer-chat-learner.js';

describe('Newest Units Priority & Dynamic Missing Info Outreach', () => {
  it('enforces that Supabase queries order by created_at DESC so newest units have priority leverage', () => {
    const outreachCode = fs.readFileSync(path.join(__dirname, '../workflows/09-owner-outreach/outreach.js'), 'utf8');
    expect(outreachCode).toContain(".order('created_at', { ascending: false })");
  });

  it('buildMessage asks for missing price when unit price is 0 or missing', () => {
    const outreachCode = fs.readFileSync(path.join(__dirname, '../workflows/09-owner-outreach/outreach.js'), 'utf8');
    expect(outreachCode).toContain('تأكيد السعر النهائي المطلوب حالياً');
  });

  it('buildMessage asks for 6 clear photos when unit has fewer than 6 photos', () => {
    const outreachCode = fs.readFileSync(path.join(__dirname, '../workflows/09-owner-outreach/outreach.js'), 'utf8');
    expect(outreachCode).toContain('إرسال');
    expect(outreachCode).toContain('صور');
    expect(outreachCode).toContain('Property Finder');
  });

  it('buildMessage asks for area confirmation when unit area_sqm is 0', () => {
    const outreachCode = fs.readFileSync(path.join(__dirname, '../workflows/09-owner-outreach/outreach.js'), 'utf8');
    expect(outreachCode).toContain('تأكيد المساحة الإجمالية بالمتر المربع (م²)');
  });
});

describe('Customer Chat Learner & Egyptian Real Estate Communication Skills', () => {
  it('extracts client compound, budget in millions, and urgent viewing request', () => {
    const text = 'صباح الخير باشمهندس بدور على دوبلكس في ميفيدا ميزانيتي 18 مليون وعايز اشوفها النهاردة ضروري';
    const result = extractClientNeeds(text);

    expect(result.hasActionableNeed).toBe(true);
    expect(result.compound).toBe('Mivida');
    expect(result.budgetEstimate).toBe(18000000);
    expect(result.propertyType).toBe('duplex');
    expect(result.urgent).toBe(true);
  });

  it('recognizes Egyptian real estate orientation & payment idioms (بحري صريح / تسهيلات أقساط)', () => {
    const text = 'محتاج شقة في فيفت سكوير المراسم تكون بحري صريح ويكون في تسهيلات في السداد';
    const result = extractClientNeeds(text);

    expect(result.compound).toBe('Fifth Square');
    expect(result.detectedIdioms.some(i => i.category === 'orientation')).toBe(true);
    expect(result.detectedIdioms.some(i => i.category === 'financial')).toBe(true);
  });

  it('provides high-end Egyptian conversational guidance for bots', () => {
    const guide = getConversationalSkillsGuide();

    expect(guide.tone).toContain('Egyptian High-End Real Estate Concierge');
    expect(guide.keyPhrasingTips.length).toBeGreaterThan(3);
    expect(guide.recommendedSalutations.some(s => s.includes('دكتور'))).toBe(true);
  });
});
