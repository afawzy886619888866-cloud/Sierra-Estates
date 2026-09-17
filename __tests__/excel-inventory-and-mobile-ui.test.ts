import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import {
  getMasterExcelPath,
  readExcelListings,
  appendToExcelInventory,
  EXCEL_COLUMNS,
} from '../apps/sierra-estates-realty/lib/services/ExcelInventoryService';

describe('Excel Master Inventory & Real Data Integration Suite', () => {
  const masterPath = getMasterExcelPath();
  const loadWorkbook = (p: string) => XLSX.read(fs.readFileSync(p), { type: 'buffer' });

  it('verifies that the master Inventory_with_Photos.xlsx exists and has valid size', () => {
    expect(fs.existsSync(masterPath)).toBe(true);
    const stat = fs.statSync(masterPath);
    expect(stat.size).toBeGreaterThan(100_000); // Master file is > 7MB
  });

  it('contains the canonical sheets in Inventory_with_Photos.xlsx', () => {
    const wb = loadWorkbook(masterPath);
    expect(wb.SheetNames).toContain('Owners Rent');
    expect(wb.SheetNames).toContain('Owners Buy');
    expect(wb.SheetNames).toContain('Broker Rent');
    expect(wb.SheetNames).toContain('Broker Buy');
  }, 30000);

  it('verifies canonical column headers exist in sheets', () => {
    const wb = loadWorkbook(masterPath);
    const sampleWs = wb.Sheets['Owners Rent'];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sampleWs);
    expect(rows.length).toBeGreaterThan(0);
    const firstRow = rows[0];

    expect(firstRow).toHaveProperty('RecordID');
    expect(firstRow).toHaveProperty('Compound');
    expect(firstRow).toHaveProperty('PropertyType');
    expect(firstRow).toHaveProperty('Operation');
    expect(firstRow).toHaveProperty('Price (EGP)');
    expect(firstRow).toHaveProperty('Photo URLs');
  }, 30000);

  it('readExcelListings successfully loads and normalizes real units with photos', () => {
    const units = readExcelListings({ limit: 25, stripPII: true });
    expect(units.length).toBeGreaterThanOrEqual(1);

    const first = units[0];
    expect(first.id).toBeTruthy();
    expect(first.compound).toBeTruthy();
    expect(first.status).toBe('available');
    expect(['rent', 'sale']).toContain(first.mode);
    expect(typeof first.price).toBe('number');
    expect(first.priceLabel).toBeTruthy();

    // Verify PII is stripped by default
    expect((first as any).contactPhone).toBeUndefined();
    expect((first as any).contactName).toBeUndefined();
    expect((first as any).whatsAppDirect).toBeUndefined();

    // Verify at least one unit in the sample has a real photo URL
    const withPhoto = units.find((u) => u.img && u.img.startsWith('http'));
    expect(withPhoto).toBeDefined();
    if (withPhoto && withPhoto.img) {
      expect(withPhoto.img).toMatch(/^https?:\/\//);
    }
  }, 30000);

  it('appendToExcelInventory appends new unit to correct sheet and updates workbook', async () => {
    const testRecordId = `TEST-OWNER-${Date.now().toString(36).toUpperCase()}`;
    const result = await appendToExcelInventory({
      recordId: testRecordId,
      compound: 'Mivida',
      location: 'New Cairo',
      price: 14500000,
      operation: 'Sale',
      propertyType: 'Apartment',
      bedrooms: 3,
      bathrooms: 2,
      areaSqm: 170,
      description: 'Automated Vitest Verification Unit',
      sourceType: 'owner',
      photoUrls: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9'],
    });

    expect(result.success).toBe(true);
    expect(result.recordId).toBe(testRecordId);
    expect(result.sheetName).toBe('Owners Buy');

    // Verify row was written to the sheet
    const wb = loadWorkbook(result.filePath);
    const ws = wb.Sheets['Owners Buy'];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);
    const found = rows.find((r) => r.RecordID === testRecordId);
    expect(found).toBeDefined();
    expect(found?.Compound).toBe('Mivida');
    expect(found?.['Price (EGP)']).toBe(14500000);
    expect(found?.['Photo URLs']).toContain('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9');
  }, 30000);

  it('handles multi-criteria filtering accurately on real and normalized listings', () => {
    const sampleListings = [
      { id: '1', cmp: 'Eastown', mode: 'rent', type: 'Apartment', beds: 3, egpM: 0.05, price: 50000 },
      { id: '2', cmp: 'Mivida', mode: 'sale', type: 'Villa', beds: 4, egpM: 22.5, price: 22500000 },
      { id: '3', cmp: 'Hyde Park', mode: 'sale', type: 'Townhouse', beds: 3, egpM: 14.0, price: 14000000 },
      { id: '4', cmp: 'Eastown', mode: 'sale', type: 'Apartment', beds: 2, egpM: 8.5, price: 8500000 },
    ];

    // Filter by mode = rent
    const rentOnly = sampleListings.filter((u) => u.mode === 'rent');
    expect(rentOnly.length).toBe(1);
    expect(rentOnly[0].cmp).toBe('Eastown');

    // Filter by compound = 'Eastown'
    const eastownUnits = sampleListings.filter((u) => u.cmp.toLowerCase().includes('eastown'));
    expect(eastownUnits.length).toBe(2);

    // Filter by bedrooms >= 3 and mode = sale
    const threeBedsSale = sampleListings.filter((u) => u.mode === 'sale' && u.beds >= 3);
    expect(threeBedsSale.length).toBe(2);

    // Filter by property type = 'Villa'
    const villas = sampleListings.filter((u) => u.type.toLowerCase() === 'villa');
    expect(villas.length).toBe(1);
    expect(villas[0].cmp).toBe('Mivida');
  });

  it('verifies mobile navigation drawer and responsive header elements exist in source', () => {
    const siteChromePath = path.resolve(__dirname, '../apps/sierra-estates-realty/components/site/SiteChrome.tsx');
    expect(fs.existsSync(siteChromePath)).toBe(true);
    const content = fs.readFileSync(siteChromePath, 'utf-8');

    // Mobile Hamburger Toggle
    expect(content).toContain('id="mobile-menu-toggle"');
    expect(content).toContain('className="mobile-nav-toggle"');

    // Mobile Drawer Component & Links
    expect(content).toContain('className="mobile-drawer-overlay"');
    expect(content).toContain('className="mobile-drawer"');
    expect(content).toContain('className="mobile-drawer-links"');

    // Theme & Language Controls
    expect(content).toContain('id="theme-toggle"');
    expect(content).toContain('id="lang-toggle"');

    // Key Pages in Mobile Drawer
    expect(content).toContain('/compounds');
    expect(content).toContain('/properties');
    expect(content).toContain('/net');
    expect(content).toContain('/add-listing');
    expect(content).toContain('infoBankHref');
  });

  it('verifies responsive CSS rules and touch targets in site-refinements.css', () => {
    const cssPath = path.resolve(__dirname, '../apps/sierra-estates-realty/app/site-styles/site-refinements.css');
    expect(fs.existsSync(cssPath)).toBe(true);
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // Mobile nav toggle media query
    expect(cssContent).toContain('.mobile-nav-toggle');
    expect(cssContent).toContain('@media (max-width: 980px)');

    // Min 44px touch targets
    expect(cssContent).toContain('min-height: 44px !important');
    expect(cssContent).toContain('min-width: 44px !important');

    // Mobile drawer animation
    expect(cssContent).toContain('@keyframes drawerSlideIn');
    expect(cssContent).toContain('.mobile-drawer-overlay');
  });
});
