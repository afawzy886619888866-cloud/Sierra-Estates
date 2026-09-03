import { listRecords, upsertRecord, updateRecord } from '@sierra-estates/db';

/**
 * ImageLinkHub: The "Visual Glue" of Sierra Estates.
 * Mandate: Correlate WhatsApp media with Portal Listings (Stage 3).
 * Function: Stores image metadata and provides lookup logic to prevent media fragmentation.
 */
export class ImageLinkHub {
   static __initStatic() {this.TABLE = 'image_links'}

  /**
   * Registers a new image or media asset from WhatsApp.
   */
  static async registerWhatsAppMedia(mediaId, signalId, imageUrl) {
    console.log(`🖼️ [ImageLinkHub] Registering media ${mediaId} for signal ${signalId}`);
    
    // Keyed by the provider's media id, so a redelivered webhook upserts the
    // same row rather than creating a duplicate.
    await upsertRecord(this.TABLE, {
      id: mediaId,
      source: 'whatsapp',
      signalId,
      imageUrl,
      createdAt: new Date().toISOString(),
      status: 'pending_correlation'
    });

    return mediaId;
  }

  /**
   * Links a WhatsApp image to a specific portal listing (Stage 5 Sync).
   */
  static async linkToPortalListing(mediaId, portalListingId, portal) {
    console.log(`🔗 [ImageLinkHub] Linking media ${mediaId} to ${portal} listing ${portalListingId}`);
    
    await updateRecord(this.TABLE, mediaId, {
      portalId: portalListingId,
      portalType: portal,
      status: 'correlated',
      correlatedAt: new Date().toISOString()
    });
  }

  /**
   * Finds media associated with a specific inbound signal.
   */
  static async getMediaForSignal(signalId) {
    return await listRecords(this.TABLE, {
      where: [{ column: 'signalId', value: signalId }],
    });
  }
} ImageLinkHub.__initStatic();
