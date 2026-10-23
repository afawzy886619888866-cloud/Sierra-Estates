import { createFirestoreCompat, createAuthCompat, createStorageCompat } from '@sierra-estates/db';
import { MemoryPalace } from '@sierra-estates/memory-engine';
import fs from 'fs';
import path from 'path';

describe('Supabase - Firebase Compatibility Layer & Memory Transition', () => {
  describe('Firestore Compatibility Layer', () => {
    const db = createFirestoreCompat();

    it('should provide doc() and collection() interfaces matching Firestore SDK', () => {
      expect(typeof db.collection).toBe('function');
      expect(typeof db.doc).toBe('function');
    });

    it('should support chainable query operations (where, orderBy, limit)', async () => {
      const query = db
        .collection('properties')
        .where('type', '==', 'Apartment')
        .orderBy('price', 'desc')
        .limit(5);

      expect(typeof query.get).toBe('function');
      const snap = await query.get();
      expect(snap).toBeDefined();
      expect(Array.isArray(snap.docs)).toBe(true);
      expect(typeof snap.empty).toBe('boolean');
    });

    it('should support doc retrieval with snapshot interface', async () => {
      const docRef = db.doc('properties/prop-test-01');
      expect(typeof docRef.get).toBe('function');
      expect(typeof docRef.set).toBe('function');
      expect(typeof docRef.update).toBe('function');
      expect(typeof docRef.delete).toBe('function');

      const docSnap = await docRef.get();
      expect(docSnap).toBeDefined();
      expect(typeof docSnap.exists).toBe('boolean');
      expect(typeof docSnap.data).toBe('function');
    });

    it('should support collection.add() for inserting records', async () => {
      const collectionRef = db.collection('leads');
      const addedRef = await collectionRef.add({
        name: 'Test Client',
        phone: '+201000000000',
        channel: 'whatsapp',
      });

      expect(addedRef).toBeDefined();
      expect(typeof addedRef.id).toBe('string');
      expect(addedRef.id.length).toBeGreaterThan(0);
    });
  });

  describe('Auth Compatibility Layer', () => {
    const auth = createAuthCompat();

    it('should provide getUser and verifyIdToken compatibility methods', async () => {
      expect(typeof auth.getUser).toBe('function');
      expect(typeof auth.verifyIdToken).toBe('function');

      const mockUser = await auth.getUser('mock-user-123');
      expect(mockUser).toBeDefined();
      expect(mockUser.uid).toBe('mock-user-123');
    });
  });

  describe('Storage Compatibility Layer', () => {
    const storage = createStorageCompat();

    it('should provide bucket and file upload/signedUrl interfaces', async () => {
      expect(typeof storage.bucket).toBe('function');
      const bucket = storage.bucket();
      const file = bucket.file('properties/image.jpg');
      expect(typeof file.getSignedUrl).toBe('function');

      const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 3600 });
      expect(typeof url).toBe('string');
      expect(url).toContain('https://');
    });
  });

  describe('System Memory Verification (Supabase as Authoritative Backend)', () => {
    it('should have Supabase declared as primary authoritative backend in MemoryPalace', () => {
      const palace = new MemoryPalace();
      const entry = palace.get('system-backend-authoritative-supabase');
      expect(entry).toBeDefined();
      expect(entry?.metadata?.provider).toBe('supabase');
      expect(entry?.metadata?.status).toBe('active-primary');
      expect(entry?.metadata?.replaces).toBe('firebase');
      expect(entry?.content).toContain('Supabase is the primary authoritative backend');
    });

    it('should keep the Supabase declaration in system memory, not in a tracked data file', () => {
      // obsidian-store.json (142MB of tracked data) was removed from the repo
      // in the deep-hygiene pass — the authoritative declaration lives in the
      // MemoryPalace system memory above. This guards against the data file
      // sneaking back into git.
      const palace = new MemoryPalace();
      const entry = palace.get('system-backend-authoritative-supabase');
      expect(entry).toBeDefined();
      expect(entry?.metadata?.provider).toBe('supabase');
      expect(entry?.metadata?.status).toBe('active-primary');

      const storePath = path.resolve(__dirname, '../../../obsidian-store.json');
      expect(fs.existsSync(storePath)).toBe(false);
    });
  });
});
