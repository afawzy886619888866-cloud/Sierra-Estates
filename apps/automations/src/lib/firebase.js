import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, } from 'firebase-admin/firestore';

/**
 * Single owner of Firebase Admin init for the automation scripts. Previously
 * each script (01-whatsapp-scraper, 03-owner-contact, 04-email-sender,
 * 05-unit-adder) copy-pasted this block independently, with warning messages
 * that had already started to drift between copies.
 *
 * Uses GOOGLE_APPLICATION_CREDENTIALS by default, or an explicitly configured
 * service account.
 */
export function getDb(label) {
  if (!getApps().length) {
    try {
      initializeApp();
    } catch (error) {
      console.warn(
        `[${label}] Firebase admin could not be initialized automatically. Please set GOOGLE_APPLICATION_CREDENTIALS.`
      );
    }
  }
  return getFirestore();
}
