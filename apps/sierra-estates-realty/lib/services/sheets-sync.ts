import fs from 'node:fs';
import { google } from 'googleapis';

function resolveServiceAccountCredentials(): Record<string, unknown> | null {
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyRaw) return null;
  try {
    return keyRaw.trim().startsWith('{')
      ? JSON.parse(keyRaw)
      : JSON.parse(Buffer.from(keyRaw, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * SIERRA ESTATES — GOOGLE SHEETS DUAL-INGESTION PROTOCOL
 */
export const GoogleSheetsSync = {
  /**
   * Appends a new lead or property to the master log.
   */
  async appendRow(sheetName: 'Leads' | 'Inventory', data: Record<string, any>) {
    console.log(`[GoogleSheetsSync] Syncing to ${sheetName}...`);

    try {
      const spreadsheetId = (process.env.MASTER_SHEET_ID || process.env.GOOGLE_SHEET_ID || '').trim();
      if (!spreadsheetId) {
        return { success: false, skipped: true, error: 'Google Sheets MASTER_SHEET_ID not configured' };
      }

      const credentials = resolveServiceAccountCredentials();
      const keyFile = './config/service_account.json';
      let auth: InstanceType<typeof google.auth.GoogleAuth>;
      if (credentials) {
        auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      } else if (fs.existsSync(keyFile)) {
        auth = new google.auth.GoogleAuth({
          keyFile,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      } else {
        return { success: false, skipped: true, error: 'Google Sheets credentials not configured' };
      }

      const sheets = google.sheets({ version: 'v4', auth });
      const values = [Object.values(data)];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });

      return {
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error(`[GoogleSheetsSync] Error:`, error.message);
      return { success: false, error: error.message };
    }
  },
};
