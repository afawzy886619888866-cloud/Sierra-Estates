import { describe, it, expect } from 'vitest';

describe('Conflicts, Concurrency & Race Condition Protection Test Suite', () => {
  describe('Viewing Schedule Slot Conflict Resolution', () => {
    interface ViewingBooking {
      bookingId: string;
      propertyId: string;
      agentId: string;
      slotIso: string; // ISO 8601 string
      leadName: string;
    }

    class BookingManager {
      private bookings: ViewingBooking[] = [];

      public attemptBooking(booking: ViewingBooking): { success: boolean; reason?: string } {
        // Prevent double booking for same property at same time
        const propertyConflict = this.bookings.find(
          (b) => b.propertyId === booking.propertyId && b.slotIso === booking.slotIso
        );
        if (propertyConflict) {
          return { success: false, reason: 'PROPERTY_ALREADY_BOOKED_FOR_SLOT' };
        }

        // Prevent agent conflict (agent cannot be at two viewings simultaneously)
        const agentConflict = this.bookings.find(
          (b) => b.agentId === booking.agentId && b.slotIso === booking.slotIso
        );
        if (agentConflict) {
          return { success: false, reason: 'AGENT_UNAVAILABLE_SLOT_CONFLICT' };
        }

        this.bookings.push(booking);
        return { success: true };
      }
    }

    it('should successfully book non-conflicting viewing slots', () => {
      const manager = new BookingManager();

      const res1 = manager.attemptBooking({
        bookingId: 'book-1',
        propertyId: 'prop-mivida-101',
        agentId: 'agent-tarek',
        slotIso: '2026-09-01T10:00:00Z',
        leadName: 'Karim',
      });
      expect(res1.success).toBe(true);

      const res2 = manager.attemptBooking({
        bookingId: 'book-2',
        propertyId: 'prop-hyde-park-202',
        agentId: 'agent-sarah',
        slotIso: '2026-09-01T10:00:00Z',
        leadName: 'Mona',
      });
      expect(res2.success).toBe(true);
    });

    it('should reject simultaneous double booking on the same property', () => {
      const manager = new BookingManager();

      manager.attemptBooking({
        bookingId: 'book-1',
        propertyId: 'prop-mivida-101',
        agentId: 'agent-tarek',
        slotIso: '2026-09-01T14:00:00Z',
        leadName: 'Karim',
      });

      const conflictRes = manager.attemptBooking({
        bookingId: 'book-3',
        propertyId: 'prop-mivida-101',
        agentId: 'agent-sarah',
        slotIso: '2026-09-01T14:00:00Z',
        leadName: 'Omar',
      });

      expect(conflictRes.success).toBe(false);
      expect(conflictRes.reason).toBe('PROPERTY_ALREADY_BOOKED_FOR_SLOT');
    });
  });

  describe('Inventory State Machine & Valid Transitions', () => {
    type InventoryState = 'draft' | 'available' | 'under_offer' | 'sold' | 'archived';

    const VALID_TRANSITIONS: Record<InventoryState, InventoryState[]> = {
      draft: ['available', 'archived'],
      available: ['under_offer', 'archived'],
      under_offer: ['available', 'sold', 'archived'],
      sold: ['archived'], // Cannot transition directly back to available without explicit relisting workflow
      archived: ['draft'],
    };

    function canTransition(current: InventoryState, target: InventoryState): boolean {
      return VALID_TRANSITIONS[current]?.includes(target) || false;
    }

    it('should allow normal sales cycle transitions', () => {
      expect(canTransition('draft', 'available')).toBe(true);
      expect(canTransition('available', 'under_offer')).toBe(true);
      expect(canTransition('under_offer', 'sold')).toBe(true);
    });

    it('should block invalid race condition transitions (e.g. sold directly back to available)', () => {
      expect(canTransition('sold', 'available')).toBe(false);
      expect(canTransition('sold', 'under_offer')).toBe(false);
    });
  });

  describe('Webhook Event Idempotency & Deduplication Keys', () => {
    class IdempotencyCache {
      private seenKeys = new Set<string>();

      public processEvent(idempotencyKey: string, handler: () => void): boolean {
        if (this.seenKeys.has(idempotencyKey)) {
          return false; // Duplicate event ignored
        }
        this.seenKeys.add(idempotencyKey);
        handler();
        return true;
      }
    }

    it('should process webhook event exactly once and deduplicate rapid retries', () => {
      const cache = new IdempotencyCache();
      let executionCount = 0;

      const eventKey = 'wa-webhook-msg-9988123';
      const handler = () => {
        executionCount++;
      };

      // 1st delivery
      const first = cache.processEvent(eventKey, handler);
      expect(first).toBe(true);
      expect(executionCount).toBe(1);

      // 2nd delivery (Meta retry)
      const second = cache.processEvent(eventKey, handler);
      expect(second).toBe(false);
      expect(executionCount).toBe(1); // Not executed twice
    });
  });

  describe('Optimistic Locking & Concurrency Control', () => {
    interface VersionedPropertyListing {
      id: string;
      priceEgp: number;
      version: number;
      updatedAt: string;
    }

    class OptimisticListingStore {
      private listings = new Map<string, VersionedPropertyListing>();

      public setListing(item: VersionedPropertyListing) {
        this.listings.set(item.id, { ...item });
      }

      public updatePrice(id: string, expectedVersion: number, newPrice: number): { success: boolean; conflict?: boolean } {
        const current = this.listings.get(id);
        if (!current) return { success: false };

        if (current.version !== expectedVersion) {
          return { success: false, conflict: true }; // Conflict: Stale version
        }

        current.priceEgp = newPrice;
        current.version += 1;
        current.updatedAt = new Date().toISOString();
        return { success: true };
      }
    }

    it('rejects stale price update when another broker has committed a newer version', () => {
      const store = new OptimisticListingStore();
      store.setListing({
        id: 'prop-101',
        priceEgp: 15_000_000,
        version: 1,
        updatedAt: '2026-08-28T00:00:00Z',
      });

      // Broker A fetches version 1 and updates price to 14.5M
      const updateA = store.updatePrice('prop-101', 1, 14_500_000);
      expect(updateA.success).toBe(true);

      // Broker B attempts update using stale version 1 (which was already incremented to 2)
      const updateB = store.updatePrice('prop-101', 1, 14_000_000);
      expect(updateB.success).toBe(false);
      expect(updateB.conflict).toBe(true);
    });
  });

  describe('Lead Claim Locks with TTL Expiration', () => {
    class LeadLockManager {
      private locks = new Map<string, { claimedBy: string; expiresAt: number }>();

      public claimLead(leadId: string, agentId: string, ttlMs: number, now = Date.now()): boolean {
        const existing = this.locks.get(leadId);
        if (existing && existing.expiresAt > now) {
          return existing.claimedBy === agentId; // Locked by someone else
        }
        this.locks.set(leadId, { claimedBy: agentId, expiresAt: now + ttlMs });
        return true;
      }
    }

    it('prevents simultaneous lead claiming but allows reclaiming after lock expiry', () => {
      const lockManager = new LeadLockManager();
      const startTime = 1000000;

      // Agent 1 claims lead for 10 minutes (600,000 ms)
      expect(lockManager.claimLead('lead-55', 'agent-ahmed', 600000, startTime)).toBe(true);

      // Agent 2 attempts to claim within lock window -> blocked
      expect(lockManager.claimLead('lead-55', 'agent-sara', 600000, startTime + 100000)).toBe(false);

      // Agent 2 attempts after lock has expired (startTime + 700,000 ms) -> granted
      expect(lockManager.claimLead('lead-55', 'agent-sara', 600000, startTime + 700000)).toBe(true);
    });
  });
});

