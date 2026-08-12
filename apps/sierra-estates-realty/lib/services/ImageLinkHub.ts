import { adminDb } from '../server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * ImageLinkHub: The "Visual Glue" of Sierra Estates.
 * Mandate: Correlate WhatsApp media with Portal Listings (Stage 3).
 * Function: Stores image metadata and provides lookup logic to prevent media fragmentation.
 */
export class ImageLinkHub {
  private static COLLECTION = 'image_links';

  /**
   * Registers a new image or media asset from WhatsApp.
   */
  static async registerWhatsAppMedia(mediaId: string, signalId: string, imageUrl: string) {
    console.log(`🖼️ [ImageLinkHub] Registering media ${mediaId} for signal ${signalId}`);
    
    const docRef = adminDb.collection(this.COLLECTION).doc(mediaId);
    await docRef.set({
      source: 'whatsapp',
      signalId,
      imageUrl,
      createdAt: Timestamp.now(),
      status: 'pending_correlation'
    });

    return mediaId;
  }

  /**
   * Links a WhatsApp image to a specific portal listing (Stage 5 Sync).
   */
  static async linkToPortalListing(mediaId: string, portalListingId: string, portal: 'PF' | 'BAYUT') {
    console.log(`🔗 [ImageLinkHub] Linking media ${mediaId} to ${portal} listing ${portalListingId}`);
    
    await adminDb.collection(this.COLLECTION).doc(mediaId).update({
      portalId: portalListingId,
      portalType: portal,
      status: 'correlated',
      correlatedAt: Timestamp.now()
    });
  }

  /**
   * Finds media associated with a specific inbound signal.
   */
  static async getMediaForSignal(signalId: string) {
    const snapshot = await adminDb.collection(this.COLLECTION)
      .where('signalId', '==', signalId)
      .get();
      
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  }
}
