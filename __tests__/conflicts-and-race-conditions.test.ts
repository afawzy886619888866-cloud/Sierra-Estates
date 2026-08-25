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
});
