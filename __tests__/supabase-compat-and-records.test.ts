import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  snakeCaseKey,
  camelCaseKey,
  toColumns,
  toRecord,
} from '../packages/db/lib/records';
import {
  resolveTableName,
  TABLE_COLLECTION_MAP,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  createFirestoreCompat,
  createAuthCompat,
  createStorageCompat,
} from '../packages/db/lib/firebase-compat-supabase';
import {
  resolveSupabaseUrl,
  resolveSupabaseAnonKey,
  resolveSupabaseServiceRoleKey,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from '../packages/db/lib/supabase';

describe('Supabase Compatibility & Record Layer Test Suite', () => {
  describe('Casing & Record Transformation', () => {
    it('converts camelCase strings to snake_case correctly', () => {
      expect(snakeCaseKey('createdAt')).toBe('created_at');
      expect(snakeCaseKey('ownerName')).toBe('owner_name');
      expect(snakeCaseKey('monthlyInstallment')).toBe('monthly_installment');
      expect(snakeCaseKey('already_snake_case')).toBe('already_snake_case');
    });

    it('converts snake_case strings to camelCase correctly', () => {
      expect(camelCaseKey('created_at')).toBe('createdAt');
      expect(camelCaseKey('owner_name')).toBe('ownerName');
      expect(camelCaseKey('monthly_installment')).toBe('monthlyInstallment');
      expect(camelCaseKey('alreadyCamelCase')).toBe('alreadyCamelCase');
    });

    it('transforms nested object keys toColumns (snake_case) including dates', () => {
      const input = {
        listingId: 'unit-101',
        compoundName: 'Mivida',
        pricingDetails: {
          originalPrice: 15_000_000,
          downPayment: 1_500_000,
        },
        tagsList: ['luxury', 'lake-view'],
      };

      const columns: any = toColumns(input);
      expect(columns.listing_id).toBe('unit-101');
      expect(columns.compound_name).toBe('Mivida');
      expect(columns.pricing_details.original_price).toBe(15_000_000);
      expect(columns.pricing_details.down_payment).toBe(1_500_000);
      expect(columns.tags_list).toEqual(['luxury', 'lake-view']);
    });

    it('transforms database columns toRecord (camelCase)', () => {
      const dbRecord = {
        ref_id: 'REF-778',
        area_sqm: 245,
        owner_details: {
          primary_phone: '+201001234567',
          verified_owner: true,
        },
      };

      const record: any = toRecord(dbRecord);
      expect(record.refId).toBe('REF-778');
      expect(record.areaSqm).toBe(245);
      expect(record.ownerDetails.primaryPhone).toBe('+201001234567');
      expect(record.ownerDetails.verifiedOwner).toBe(true);
    });
  });

  describe('Firestore to Supabase Table Mapping', () => {
    it('resolves legacy Firestore collections to their Supabase counterparts', () => {
      expect(resolveTableName('listings')).toBe('listings');
      expect(resolveTableName('houyez_listings')).toBe('listings');
      expect(resolveTableName('properties')).toBe('listings');
      expect(resolveTableName('leads')).toBe('leads');
      expect(resolveTableName('stakeholders')).toBe('leads');
      expect(resolveTableName('users')).toBe('profiles');
      expect(resolveTableName('profiles')).toBe('profiles');
      expect(resolveTableName('compounds')).toBe('compounds');
      expect(resolveTableName('memories')).toBe('unified_memory');
      expect(resolveTableName('unified_memory')).toBe('unified_memory');
      expect(resolveTableName('whatsapp_queue')).toBe('whatsapp_queue');
      expect(resolveTableName('knowledge_base')).toBe('knowledge_base');
    });

    it('falls back to snake_cased collection name for unmapped collections', () => {
      expect(resolveTableName('customAnalyticsEvents')).toBe('custom_analytics_events');
    });
  });

  describe('Firestore Emulation Interface & Helpers', () => {
    it('evaluates Firestore field helper mock values', () => {
      const ts = serverTimestamp();
      expect(typeof ts).toBe('string');
      expect(!isNaN(Date.parse(ts))).toBe(true);

      expect(arrayUnion('a', 'b')).toEqual(['a', 'b']);
      expect(arrayRemove('x')).toEqual(['x']);
      expect(increment(5)).toBe(5);
    });

    it('creates Firestore compat client with doc, collection, and query methods', () => {
      const compat = createFirestoreCompat();

      const docRef = compat.doc('listings/unit-123');
      expect(docRef.id).toBe('unit-123');
      expect(docRef.path).toBe('listings/unit-123');
      expect(typeof docRef.get).toBe('function');
      expect(typeof docRef.set).toBe('function');
      expect(typeof docRef.update).toBe('function');
      expect(typeof docRef.delete).toBe('function');

      const colRef = compat.collection('leads');
      expect(colRef.id).toBe('leads');
      expect(colRef.path).toBe('leads');
      expect(typeof colRef.doc).toBe('function');
      expect(typeof colRef.add).toBe('function');
      expect(typeof colRef.where).toBe('function');
      expect(typeof colRef.orderBy).toBe('function');
      expect(typeof colRef.limit).toBe('function');
    });

    it('supports query chaining on collection references', () => {
      const compat = createFirestoreCompat();
      const q = compat
        .collection('listings')
        .where('dealType', '==', 'sale')
        .where('price', '<=', 20_000_000)
        .orderBy('price', 'desc')
        .limit(10);

      expect(typeof q.get).toBe('function');
    });

    it('supports batch and runTransaction interfaces', async () => {
      const compat = createFirestoreCompat();
      const batch = compat.batch();
      expect(typeof batch.set).toBe('function');
      expect(typeof batch.update).toBe('function');
      expect(typeof batch.delete).toBe('function');
      expect(typeof batch.commit).toBe('function');

      let txExecuted = false;
      const result = await compat.runTransaction(async (tx) => {
        expect(typeof tx.get).toBe('function');
        expect(typeof tx.set).toBe('function');
        expect(typeof tx.update).toBe('function');
        expect(typeof tx.delete).toBe('function');
        txExecuted = true;
        return 'success';
      });

      expect(txExecuted).toBe(true);
      expect(result).toBe('success');
    });

    it('provides auth compat mock fallback when admin client is not initialized', async () => {
      const auth = createAuthCompat();
      const user = await auth.getUser('mock-user-123');
      expect(user.uid).toBe('mock-user-123');
      expect(user.displayName).toBe('Mock User');

      const tokenRes = await auth.verifyIdToken('any-token');
      expect(tokenRes.role).toBe('admin');

      const createdUser = await auth.createUser({ email: 'client@example.com' });
      expect(createdUser.email).toBe('client@example.com');
    });

    it('provides storage compat mock fallback for bucket operations', async () => {
      const storage = createStorageCompat();
      const fileRef = storage.bucket('property-media').file('listings/photo.jpg');

      expect(typeof fileRef.save).toBe('function');
      expect(typeof fileRef.getSignedUrl).toBe('function');
      expect(typeof fileRef.getPublicUrl).toBe('function');

      const publicUrl = fileRef.getPublicUrl();
      expect(publicUrl).toContain('property-media/listings/photo.jpg');

      const [signedUrl] = await fileRef.getSignedUrl();
      expect(signedUrl).toContain('property-media/listings/photo.jpg');
    });
  });

  describe('Supabase Environment & Credential Resolution', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('resolves Supabase URL from environment variables', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://custom-proj.supabase.co';
      delete process.env.SUPABASE_URL;
      expect(resolveSupabaseUrl()).toBe('https://custom-proj.supabase.co');
    });

    it('falls back to placeholder URL in development if not provided', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_URL;
      delete process.env.POSTGRES_URL;

      expect(resolveSupabaseUrl()).toBe('https://placeholder.supabase.co');
    });

    it('refuses to fall back to placeholder in production and throws', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_URL;
      delete process.env.POSTGRES_URL;

      expect(() => resolveSupabaseUrl()).toThrow(/must be set in production/i);
    });

    it('resolves anon key from environment variables', () => {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'my-anon-key-123';
      expect(resolveSupabaseAnonKey()).toBe('my-anon-key-123');
    });

    it('refuses to fall back to placeholder anon key in production and throws', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.SUPABASE_ANON_KEY;

      expect(() => resolveSupabaseAnonKey()).toThrow(/must be set in production/i);
    });

    it('strictly requires SUPABASE_SERVICE_ROLE_KEY and never substitutes it', () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-role-key-999';
      expect(resolveSupabaseServiceRoleKey()).toBe('secret-role-key-999');

      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_SERVICE_KEY;
      expect(() => resolveSupabaseServiceRoleKey()).toThrow(/SUPABASE_SERVICE_ROLE_KEY is required/i);
    });

    it('correctly detects if Supabase is configured', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_SERVICE_KEY;

      expect(isSupabaseConfigured()).toBe(true);
      expect(isSupabaseAdminConfigured()).toBe(false);

      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
      expect(isSupabaseAdminConfigured()).toBe(true);
    });
  });
});
