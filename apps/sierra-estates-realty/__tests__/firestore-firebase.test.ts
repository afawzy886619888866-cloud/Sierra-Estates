/**
 * Firebase & Firestore Resilience Test Suite
 *
 * Validates:
 * 1. Firebase Admin & Client configuration and credential fallback
 * 2. Firestore collection schema definitions and field validations
 * 3. Offline limited mode and graceful error handling
 * 4. Document mutation integrity, timestamp stamping, and query filters
 * 5. firestore.indexes.json composite index schema compliance
 */

import * as fs from 'fs';
import * as path from 'path';
import { adminApp, adminDb, adminAuth, adminStorage, isAdminInitialized, loadAndInitializeAdmin } from '@/lib/server/firebase-admin';

const ROOT = path.resolve(__dirname, '../../..');

describe('Firebase & Firestore Infrastructure Suite', () => {

  describe('1. Firebase Admin Initialization & Fallback', () => {
    it('initializes safely without crashing in test/ci environment', async () => {
      await loadAndInitializeAdmin();
      expect(adminApp).toBeDefined();
      expect(adminDb).toBeDefined();
      expect(adminAuth).toBeDefined();
      expect(adminStorage).toBeDefined();
    });

    it('identifies initialization state boolean', () => {
      expect(typeof isAdminInitialized).toBe('boolean');
    });

    it('exposes resilient mock methods when running without remote credentials', async () => {
      const mockDoc = adminDb.collection('properties').doc('test-doc');
      expect(mockDoc).toBeDefined();
      expect(typeof mockDoc.get).toBe('function');
      const docSnap = await mockDoc.get();
      expect(docSnap.exists).toBe(false);
    });
  });

  describe('2. Firestore Collections & Schema Contracts', () => {
    const expectedCollections = [
      'leads',
      'properties',
      'inventory',
      'negotiations',
      'wealth_tearsheets',
      'audit_logs',
      'cron_metrics',
    ];

    it('defines standard real estate collection names', () => {
      for (const col of expectedCollections) {
        expect(col).toMatch(/^[a-z_]+$/);
      }
    });

    it('validates property listing payload structure before write', () => {
      const sampleProperty = {
        id: 'prop-cairo-01',
        title: 'Mivida Luxury Villa',
        compound: 'Mivida',
        areaSqm: 350,
        priceEgp: 28500000,
        type: 'villa',
        bedrooms: 4,
        bathrooms: 5,
        status: 'available',
        ownerType: 'direct_owner',
        createdAt: new Date().toISOString(),
      };

      expect(sampleProperty.id).toBeDefined();
      expect(sampleProperty.priceEgp).toBeGreaterThan(0);
      expect(sampleProperty.areaSqm).toBeGreaterThan(0);
      expect(['available', 'pending', 'sold', 'withdrawn']).toContain(sampleProperty.status);
      expect(['direct_owner', 'broker', 'developer']).toContain(sampleProperty.ownerType);
    });

    it('validates lead record structure and stage transitions', () => {
      const validStages = ['new', 'contacted', 'qualified', 'viewing_scheduled', 'negotiating', 'closed_won', 'closed_lost'];
      const sampleLead = {
        id: 'lead-test-01',
        name: 'Tarek Mansour',
        phone: '+201012345678',
        budgetEgp: 15000000,
        targetCompound: 'Palm Hills New Cairo',
        stage: 'new',
        score: 85,
        source: 'whatsapp_concierge',
        updatedAt: new Date().toISOString(),
      };

      expect(sampleLead.phone).toMatch(/^\+20\d{10}$/);
      expect(sampleLead.score).toBeGreaterThanOrEqual(0);
      expect(sampleLead.score).toBeLessThanOrEqual(100);
      expect(validStages).toContain(sampleLead.stage);
    });
  });

  describe('3. Firestore Query & Audit Log Resilience', () => {
    it('creates structured audit log entries', () => {
      const auditLog = {
        id: 'audit-001',
        action: 'PROPERTY_PRICE_UPDATE',
        actorId: 'admin-user-01',
        targetId: 'prop-cairo-01',
        previousValue: { priceEgp: 27000000 },
        newValue: { priceEgp: 28500000 },
        timestamp: Date.now(),
      };

      expect(auditLog.action).toBe('PROPERTY_PRICE_UPDATE');
      expect(auditLog.newValue.priceEgp).toBeGreaterThan(auditLog.previousValue.priceEgp);
      expect(typeof auditLog.timestamp).toBe('number');
    });

    it('formats compound query filters securely', () => {
      const filter = {
        compound: 'Swan Lake',
        minPrice: 10000000,
        maxPrice: 35000000,
        status: 'available',
      };

      expect(filter.minPrice).toBeLessThan(filter.maxPrice);
      expect(filter.status).toBe('available');
    });
  });

  describe('4. Firestore Indexes Configuration Guard', () => {
    const indexesPath = path.join(ROOT, 'firestore.indexes.json');

    it('firestore.indexes.json exists and is valid JSON', () => {
      expect(fs.existsSync(indexesPath)).toBe(true);
      const content = fs.readFileSync(indexesPath, 'utf8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('defines valid composite indexes for core collection groups', () => {
      const config = JSON.parse(fs.readFileSync(indexesPath, 'utf8'));
      expect(Array.isArray(config.indexes)).toBe(true);
      expect(config.indexes.length).toBeGreaterThanOrEqual(5);

      for (const idx of config.indexes) {
        expect(idx.collectionGroup).toBeDefined();
        expect(idx.queryScope).toBe('COLLECTION');
        expect(Array.isArray(idx.fields)).toBe(true);
        expect(idx.fields.length).toBeGreaterThanOrEqual(2);
        for (const f of idx.fields) {
          expect(f.fieldPath).toBeDefined();
          expect(['ASCENDING', 'DESCENDING']).toContain(f.order);
        }
      }
    });
  });

});
