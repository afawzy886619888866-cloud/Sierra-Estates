import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AvailabilityVerificationService,
  type BatchAvailabilitySession,
} from '../apps/sierra-estates-realty/lib/services/AvailabilityVerificationService';
import { sharedMemory } from '@sierra-estates/memory-engine';

describe('Listing Net & Autonomous WhatsApp Availability Verification Engine', () => {
  beforeEach(async () => {
    // Clear in-memory session store before each test
    await sharedMemory.write('availability_batch_sessions', {}, { author: 'system' });
  });

  describe('Selection Quota (Maximum 40 Units)', () => {
    it('should reject batch requests with zero selected units', async () => {
      await expect(
        AvailabilityVerificationService.createBatchRequest({
          clientName: 'Karim Zaki',
          clientPhone: '+201001234567',
          unitIds: [],
        })
      ).rejects.toThrow(/Selection Net is empty/);
    });

    it('should reject batch requests exceeding the 40-unit maximum ceiling', async () => {
      // 41 simulated unit IDs
      const overQuotaIds = Array.from({ length: 41 }, (_, i) => `UNIT-${i + 1}`);

      await expect(
        AvailabilityVerificationService.createBatchRequest({
          clientName: 'Karim Zaki',
          clientPhone: '+201001234567',
          unitIds: overQuotaIds,
        })
      ).rejects.toThrow(/Maximum selection limit exceeded: 41 units selected/);
    });

    it('should successfully create a verification session when <= 40 units are marked', async () => {
      const validIds = ['INV-4F31AB8CB57C', 'INV-ABD03C2726AE', 'INV-MEM-0001'];

      const session = await AvailabilityVerificationService.createBatchRequest({
        clientName: 'Ahmed Mansour',
        clientPhone: '+201011223344',
        unitIds: validIds,
        notes: 'Interested in immediate cash deal',
      });

      expect(session).toBeDefined();
      expect(session.id).toMatch(/^req-net-/);
      expect(session.clientName).toBe('Ahmed Mansour');
      expect(session.clientPhone).toBe('+201011223344');
      expect(session.units.length).toBe(3);
      expect(session.status).toBe('active');

      // Check SLA window
      expect(session.expiresAt - session.createdAt).toBe(60 * 60 * 1000); // Exactly 1 hour
      for (const u of session.units) {
        expect(u.status).toBe('inquiry_sent');
        expect(u.expiresAt).toBe(session.expiresAt);
      }
    });
  });

  describe('1-Hour Availability SLA & Timeout Sweeper', () => {
    it('should automatically mark units as unavailable if owner does not reply within 1 hour', async () => {
      const validIds = ['INV-4F31AB8CB57C'];

      const session = await AvailabilityVerificationService.createBatchRequest({
        clientName: 'Laila Fawzy',
        clientPhone: '+201099887766',
        unitIds: validIds,
      });

      // Initially unit is inquiry_sent
      expect(session.units[0].status).toBe('inquiry_sent');

      // Simulate passage of time (> 1 hour)
      const sessions = await AvailabilityVerificationService.getSessions();
      sessions[session.id].units[0].expiresAt = Date.now() - 5000; // Expired 5 seconds ago
      await AvailabilityVerificationService.saveSessions(sessions);

      // Trigger SLA timeout sweeper
      const sweepResult = await AvailabilityVerificationService.sweepTimeouts();

      expect(sweepResult.expiredUnitsCount).toBe(1);
      expect(sweepResult.updatedSessions).toBe(1);

      // Verify updated status in session
      const updatedSessions = await AvailabilityVerificationService.getSessions();
      const updatedUnit = updatedSessions[session.id].units[0];
      expect(updatedUnit.status).toBe('unavailable');
      expect(updatedUnit.refinedNotes).toContain('لم يتم الرد');
      expect(updatedSessions[session.id].status).toBe('completed');
    });
  });

  describe('Inbound Owner/Broker Reply & Gemini Refinement', () => {
    it('should process owner confirmation, refine photos and details, and propose a viewing date to client', async () => {
      const validIds = ['INV-4F31AB8CB57C'];

      const session = await AvailabilityVerificationService.createBatchRequest({
        clientName: 'Nour El-Din',
        clientPhone: '+201055554444',
        unitIds: validIds,
      });

      const contactPhone = session.units[0].contactPhone;

      // Simulate owner replying via WhatsApp confirming unit is available with photos
      const replyResult = await AvailabilityVerificationService.handleOwnerReply({
        fromPhone: contactPhone,
        replyText: 'أهلاً بك، الوحدة متاحة والتشطيب ألترا سوبر لوكس والسعر قابل للتفاوض البسيط والمعاينة جاهزة اليوم',
        mediaUrls: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'],
      });

      expect(replyResult).toBeDefined();
      expect(replyResult?.clientNotified).toBe(true);
      expect(replyResult?.matchedUnitCode).toBe(session.units[0].unitCode);

      // Verify session updated with confirmed unit and viewing proposed
      const updatedSessions = await AvailabilityVerificationService.getSessions();
      const updatedUnit = updatedSessions[session.id].units[0];
      expect(updatedUnit.status).toBe('available');
      expect(updatedUnit.photoUrls.length).toBeGreaterThanOrEqual(1);
      expect(updatedSessions[session.id].viewingProposed).toBe(true);
    });

    it('should process owner reply when unit is sold/rented and notify client of unavailability', async () => {
      const validIds = ['INV-ABD03C2726AE'];

      const session = await AvailabilityVerificationService.createBatchRequest({
        clientName: 'Tarek Sherif',
        clientPhone: '+201033332222',
        unitIds: validIds,
      });

      const contactPhone = session.units[0].contactPhone;

      // Simulate owner replying that unit is already rented
      const replyResult = await AvailabilityVerificationService.handleOwnerReply({
        fromPhone: contactPhone,
        replyText: 'للأسف الوحدة اتأجرت الأسبوع الماضي وغير متاحة حالياً',
      });

      expect(replyResult).toBeDefined();
      expect(replyResult?.clientNotified).toBe(true);

      const updatedSessions = await AvailabilityVerificationService.getSessions();
      const updatedUnit = updatedSessions[session.id].units[0];
      expect(updatedUnit.status).toBe('unavailable');
    });
  });

  describe('Client Viewing Date Scheduling Proposal', () => {
    it('should register a site inspection viewing when client confirms inspection date', async () => {
      const validIds = ['INV-MEM-0001'];

      const session = await AvailabilityVerificationService.createBatchRequest({
        clientName: 'Hany Ramzy',
        clientPhone: '+201088776655',
        unitIds: validIds,
      });

      // Mark unit available first
      const sessions = await AvailabilityVerificationService.getSessions();
      sessions[session.id].units[0].status = 'available';
      await AvailabilityVerificationService.saveSessions(sessions);

      // Client replies asking to visit tomorrow
      const confirmationResult = await AvailabilityVerificationService.handleClientViewingConfirmation({
        clientPhone: '+201088776655',
        clientMessage: 'تمام عاجباني الوحدة، أحب نحدد موعد معاينة بكرة العصر لو سمحت',
      });

      expect(confirmationResult.scheduled).toBe(true);
      expect(confirmationResult.viewingId).toBeDefined();

      const finalSessions = await AvailabilityVerificationService.getSessions();
      expect(finalSessions[session.id].viewingScheduled).toBe(true);
      expect(finalSessions[session.id].scheduledViewingId).toBe(confirmationResult.viewingId);
    });
  });
});
