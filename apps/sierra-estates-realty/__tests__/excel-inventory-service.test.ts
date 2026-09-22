import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import * as XLSX from 'xlsx';
import {
  getMasterExcelPath,
  readExcelListings,
  appendToExcelInventory,
  EXCEL_COLUMNS,
} from '../lib/services/ExcelInventoryService';
import { escapeTelegramHtml } from '../lib/telegram';

describe('ExcelInventoryService & Telegram Sync', () => {
  let tempDir: string;
  let tempFilePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sierra-excel-test-'));
    tempFilePath = path.join(tempDir, 'Inventory_with_Photos.xlsx');

    // Create a minimal test workbook with 'Owners Rent' sheet
    const wb = XLSX.utils.book_new();
    const headers = [...EXCEL_COLUMNS];
    const sampleData = [
      {
        RecordID: 'TEST-001',
        UnitCode: 'SE-MIV-001',
        Compound: 'Mivida',
        Location: 'New Cairo',
        Zone: 'Fifth Settlement',
        PropertyType: 'Apartment',
        Operation: 'Rent',
        'Price (EGP)': 45000,
        'Price Formatted': '45,000 EGP / mo',
        'Area (sqm)': 180,
        Bedrooms: 3,
        Bathrooms: 2,
        Furnishing: 'Fully Finished',
        'Contact Name': 'Owner Mohamed',
        'Contact Phone': '01011223344',
        'Inventory Status': 'Available',
        'Photo Match Status': 'high-confidence',
        'Photo URLs': 'https://sierra.net/photos/1.jpg, https://sierra.net/photos/2.jpg',
        Description: 'Luxury Mivida unit',
        Source: 'Direct Owner',
        'Updated At': new Date().toISOString(),
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    XLSX.utils.book_append_sheet(wb, ws, 'Owners Rent');
    XLSX.writeFile(wb, tempFilePath);
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
  });

  describe('Telegram HTML Escaper', () => {
    it('properly escapes ampersand, less-than, and greater-than', () => {
      expect(escapeTelegramHtml('Villa <Mivida> & Hyde Park')).toBe('Villa &lt;Mivida&gt; &amp; Hyde Park');
      expect(escapeTelegramHtml('')).toBe('');
      expect(escapeTelegramHtml(null)).toBe('');
    });
  });

  describe('Master Excel Workbook Operations', () => {
    it('returns a resolved path string from getMasterExcelPath', () => {
      const resolved = getMasterExcelPath();
      expect(typeof resolved).toBe('string');
      expect(resolved.length).toBeGreaterThan(0);
    });

    it('successfully appends a new listing to an Excel sheet', async () => {
      const result = await appendToExcelInventory(
        {
          recordId: 'TEST-AUG-002',
          code: 'SE-AUG-002',
          compound: 'Eastown',
          propertyType: 'Duplex',
          operation: 'Sale',
          price: 9500000,
          areaSqm: 240,
          bedrooms: 4,
          bathrooms: 3,
          furnishing: 'Ultra Super Lux',
          contactName: 'Eng. Ahmed',
          contactPhone: '01099887766',
          inventoryStatus: 'Available',
          sourceType: 'owner',
          description: 'Prime location duplex in Eastown',
        },
        tempFilePath
      );

      expect(result.success).toBe(true);
      expect(result.recordId).toBe('TEST-AUG-002');
      expect(result.sheetName).toBe('Owners Buy');

      // Verify row exists in the updated file
      const wb = XLSX.readFile(tempFilePath);
      expect(wb.SheetNames).toContain('Owners Buy');
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets['Owners Buy']);
      expect(rows.length).toBe(1);
      expect(rows[0].Compound).toBe('Eastown');
      expect(rows[0]['Price (EGP)']).toBe(9500000);
      expect(rows[0]['Inventory Status']).toBe('Available');
      expect(rows[0]['Contact Phone']).toBe('01099887766');
    });

    it('safely handles non-existent file path fallback during read', () => {
      const listings = readExcelListings({ sheetName: 'NonExistentSheet' });
      expect(Array.isArray(listings)).toBe(true);
    });
  });
});
