import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import * as path from 'node:path';

const require = createRequire(import.meta.url);

describe('09-owner-outreach — 10:00-22:00 Cairo, 25 msgs/slot, 30-min rotating sender', () => {
  // Ensure clean env before requiring outreach module defaults
  const savedBatch = process.env.WF_SLOT_BATCH;
  const savedHours = process.env.WF_OUTREACH_ACTIVE_HOURS;
  const savedRotate = process.env.WF_ROTATE_SINGLE_LINE;
  delete process.env.WF_SLOT_BATCH;
  delete process.env.WF_OUTREACH_ACTIVE_HOURS;
  delete process.env.WF_ROTATE_SINGLE_LINE;

  const outreach = require('../09-owner-outreach/outreach.js');

  if (savedBatch !== undefined) process.env.WF_SLOT_BATCH = savedBatch;
  if (savedHours !== undefined) process.env.WF_OUTREACH_ACTIVE_HOURS = savedHours;
  if (savedRotate !== undefined) process.env.WF_ROTATE_SINGLE_LINE = savedRotate;

  it('defaults to 25 msgs per 30-min slot, 10:00–22:00 Cairo window, and single-line rotation ON', () => {
    expect(outreach.BATCH_CAP).toBe(25);
    expect(outreach.ACTIVE_HOURS).toEqual([10, 22]);
    expect(outreach.ROTATE_SINGLE_LINE).toBe(true);
  });

  it('rotates strictly round-robin across all ready WhatsApp numbers every 30-min slot', () => {
    const pool = [
      { name: 'line-1', uuid: 'u1' },
      { name: 'line-2', uuid: 'u2' },
      { name: 'line-3', uuid: 'u3' },
      { name: 'line-4', uuid: 'u4' },
    ];

    const slot1 = outreach.selectNextRotatedLane(pool, { lastSessionName: null, slotIndex: 0 }, 'split');
    expect(slot1.lane.name).toBe('line-1');
    expect(slot1.lane.direction).toBe('top');

    const slot2 = outreach.selectNextRotatedLane(pool, slot1.nextState, 'split');
    expect(slot2.lane.name).toBe('line-2');
    expect(slot2.lane.direction).toBe('bottom');

    const slot3 = outreach.selectNextRotatedLane(pool, slot2.nextState, 'split');
    expect(slot3.lane.name).toBe('line-3');
    expect(slot3.lane.direction).toBe('top');

    const slot4 = outreach.selectNextRotatedLane(pool, slot3.nextState, 'split');
    expect(slot4.lane.name).toBe('line-4');
    expect(slot4.lane.direction).toBe('bottom');

    // Wraps back to line-1 on slot 5 (after 2 hours)
    const slot5 = outreach.selectNextRotatedLane(pool, slot4.nextState, 'split');
    expect(slot5.lane.name).toBe('line-1');
  });

  it('configures runner.js for 10:00-22:00 30-min slots and inbox.js for >=6 PF photo harvest', () => {
    const runnerSrc = fs.readFileSync(path.resolve(__dirname, '..', 'runner.js'), 'utf8');
    expect(runnerSrc).toContain('cairoHour >= 10 && cairoHour < 22');
    expect(runnerSrc).toContain("schedule: '*/30 10-21 * * *'");
    expect(runnerSrc).toContain("'30m-window'");

    const inboxSrc = fs.readFileSync(path.resolve(__dirname, '..', 'lib', 'inbox.js'), 'utf8');
    expect(inboxSrc).toContain('const PF_AD_MIN_PHOTOS = 6;');
    expect(inboxSrc).toContain('800×600');
  });

  it('mergeSupabaseOwners unifies active DB listings with candidates and dedupes historical outreach logs', async () => {
    const mockListings = [
      {
        id: '1',
        code: 'SE-TEST-01',
        owner_name: 'Owner One',
        owner_phone: '01012345678',
        compound: 'Oriana',
        price: 15000000,
        bedrooms: 3,
        status: 'available',
        availability: 'available',
      },
      {
        id: '2',
        code: 'SE-TEST-02',
        owner_name: 'Sold Owner',
        owner_phone: '01123456789',
        compound: 'Mivida',
        price: 20000000,
        bedrooms: 4,
        status: 'sold',
        availability: 'sold',
      },
      {
        id: '3',
        code: 'SE-TEST-03',
        owner_name: 'Prior Log Owner',
        owner_phone: '01234567890',
        compound: 'Eastown',
        price: 12000000,
        bedrooms: 2,
        status: 'available',
        availability: 'available',
      },
    ];

    const mockLogs = [
      { phone: '201234567890' }, // corresponds to SE-TEST-03
    ];

    const mockClient = {
      from(table: string) {
        if (table === 'owner_outreach_log') {
          return {
            select() {
              return {
                async limit() {
                  return { data: mockLogs, error: null };
                },
              };
            },
          };
        }
        if (table === 'listings') {
          return {
            select() {
              return {
                not() {
                  return {
                    neq() {
                      return {
                        order() {
                          return {
                            async range() {
                              return { data: mockListings, error: null };
                            },
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    };

    const candidates: any[] = [];
    const contacted = new Set<string>();
    const phoneFirstIdx = new Map<string, number>();
    const summary: Record<string, number> = { supabaseCandidates: 0, supabaseDeduped: 0 };

    const added = await outreach.mergeSupabaseOwners({
      candidates,
      contacted,
      phoneFirstIdx,
      summary,
      client: mockClient,
    });

    // 2 listings had valid phones, but SE-TEST-02 is sold (skipped) -> exactly 2 non-sold processed
    expect(added).toBe(2);
    // SE-TEST-03 phone should have been deduped into contacted set
    expect(contacted.has('201234567890')).toBe(true);
    expect(summary.supabaseDeduped).toBe(1);
    expect(candidates).toHaveLength(2);
    expect(candidates[0].phone).toBe('201012345678');
    expect(candidates[0].code).toBe('SE-TEST-01');
    expect(candidates[0].dupOf).toBeNull();
  });
});
