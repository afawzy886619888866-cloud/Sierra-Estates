/**
 * Google Sheet Webhook Bridge
 * 
 * Connects WhatsApp Parser & Conversational Bots directly to Google Apps Script Web App (/exec).
 * Enables bi-directional sync:
 *  1. POST: Appends newly parsed WhatsApp listings with uploaded photo URLs to Sheet (gid: 341562911).
 *  2. GET: Queries live available units with photos for Leila, Lola, and Stage-9 Closer Bot.
 */

export interface SheetUnitPayload {
  code?: string;
  compound: string;
  propertyType?: string;
  mode: 'Rent' | 'Sale';
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  space?: number;
  furnished?: boolean | string;
  availability?: string;
  mediaUrls?: string[];
  phone?: string;
  groupName?: string;
  notes?: string;
}

export interface SheetSearchFilter {
  compound?: string;
  mode?: 'Rent' | 'Sale';
  maxPrice?: number;
  minPrice?: number;
  bedrooms?: number;
  limit?: number;
}

export class GoogleSheetBridge {
  private static getWebhookUrl(): string {
    return (
      process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL ||
      process.env.INVENTORY_SHEET_WEBHOOK_URL ||
      ''
    );
  }

  /**
   * Push a newly parsed unit and its photo URLs directly to Google Sheet
   */
  static async pushUnitToSheet(unit: SheetUnitPayload): Promise<{ success: boolean; code?: string; error?: string }> {
    const webhookUrl = this.getWebhookUrl();
    if (!webhookUrl) {
      console.warn('[GoogleSheetBridge] No GOOGLE_APPS_SCRIPT_WEBHOOK_URL set. Skipping sheet append.');
      return { success: false, error: 'WEBHOOK_URL_NOT_CONFIGURED' };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add_unit',
          unit: {
            ...unit,
            mediaUrls: unit.mediaUrls?.join(', ') || '',
            furnished: typeof unit.furnished === 'boolean' ? (unit.furnished ? 'مفروش' : 'غير مفروش') : unit.furnished,
            availability: unit.availability || 'Available',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Apps Script returned HTTP ${response.status}`);
      }

      const result = await response.json();
      return {
        success: result.success === true,
        code: result.code,
        error: result.error,
      };
    } catch (err: any) {
      console.error('[GoogleSheetBridge] Failed to push unit to Google Sheet:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Query units with images directly from the Google Apps Script Web App
   */
  static async searchUnits(filter: SheetSearchFilter): Promise<SheetUnitPayload[]> {
    const webhookUrl = this.getWebhookUrl();
    if (!webhookUrl) return [];

    try {
      const params = new URLSearchParams({
        action: 'search',
        compound: filter.compound || '',
        mode: filter.mode || '',
        maxPrice: filter.maxPrice ? String(filter.maxPrice) : '',
        minPrice: filter.minPrice ? String(filter.minPrice) : '',
        bedrooms: filter.bedrooms ? String(filter.bedrooms) : '',
        limit: filter.limit ? String(filter.limit) : '10',
      });

      const response = await fetch(`${webhookUrl}?${params.toString()}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data.units) ? data.units : [];
    } catch (err: any) {
      console.error('[GoogleSheetBridge] Failed to search units from sheet:', err.message);
      return [];
    }
  }

  /**
   * Update the status of a unit (e.g. mark as Under Offer / Rented / Sold)
   */
  static async updateStatus(code: string, status: string): Promise<boolean> {
    const webhookUrl = this.getWebhookUrl();
    if (!webhookUrl) return false;

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_status',
          code,
          status,
        }),
      });

      const result = await response.json();
      return result.success === true;
    } catch {
      return false;
    }
  }
}
