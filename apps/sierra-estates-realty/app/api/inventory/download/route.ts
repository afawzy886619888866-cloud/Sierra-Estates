import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import snapshot from '@/lib/inventory/snapshot.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function loadDataset(datasetName: string): any[] {
  if (datasetName === 'owners' || datasetName === 'verified' || datasetName === '585') {
    const snapshotData = snapshot as unknown;
    return Array.isArray(snapshotData)
      ? (snapshotData as any[])
      : ((snapshotData as { units?: any[] })?.units || []);
  }

  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (datasetName === '9k') {
      const p9k = path.join(dataDir, 'master-inventory-9k.json');
      if (fs.existsSync(p9k)) {
        return JSON.parse(fs.readFileSync(p9k, 'utf-8'));
      }
    }
    const pConsolidated = path.join(dataDir, 'consolidated-master-inventory.json');
    if (fs.existsSync(pConsolidated)) {
      return JSON.parse(fs.readFileSync(pConsolidated, 'utf-8'));
    }
    const pReal = path.join(dataDir, 'real-listings.json');
    if (fs.existsSync(pReal)) {
      return JSON.parse(fs.readFileSync(pReal, 'utf-8'));
    }
  } catch {
    // Fallback to embedded snapshot
  }

  const snapshotData = snapshot as unknown;
  return Array.isArray(snapshotData)
    ? (snapshotData as any[])
    : ((snapshotData as { units?: any[] })?.units || []);
}

function normalizeUnitRow(u: any) {
  const priceNum = Number(u.price || u.priceEgp || u.price_egp || 0) || 0;
  const areaNum = Number(u.area_sqm || u.areaSqm || u.area || 0) || 0;
  const bedroomsNum = Number(u.bedrooms || u.beds || 0) || 0;
  const bathroomsNum = Number(u.bathrooms || u.baths || 0) || 0;

  const dealType =
    u.mode === 'rent'
      ? 'Rent'
      : u.mode === 'resale'
      ? 'Re-sale'
      : u.operation || u.dealType || u.deal_type || 'Sale';

  return {
    'Listing ID': u.id || u.sierraCode || u.code || '',
    'Sierra Code': u.code || u.sierraCode || u.id || '',
    'Compound / Project': u.compound || u.location || 'New Cairo',
    'Location': u.location || u.rawLocation || u.compound || 'New Cairo, Cairo',
    'Unit Type': u.propertyType || u.type || u.unit_type || 'Apartment',
    'Deal Type': dealType,
    'Price (EGP)': priceNum,
    'Price Formatted': u.priceLabel || u.priceFormatted || (priceNum > 0 ? `${priceNum.toLocaleString()} EGP` : 'Price on Request'),
    'Currency': u.currency || 'EGP',
    'Area (m²)': areaNum,
    'Bedrooms': bedroomsNum,
    'Bathrooms': bathroomsNum,
    'Finishing Status': u.finishing || u.finishingStatus || 'Standard',
    'Owner Contact Name': u.contactName || '',
    'Owner Phone': u.contactPhone || '',
    'WhatsApp Direct': u.whatsappDirect || '',
    'Description': u.description || '',
    'Channel Source': u.source || u.sourceGroup || u.sourceType || 'Master Inventory',
    'Owner / Broker Type': u.sourceType || 'Owner Direct',
    'Listing Status': u.statusLabel || u.status || 'Available',
    'Is New': u.isNewListing ? 'Yes' : 'No',
    'Date Added': u.listedAt || u.dateAdded || new Date().toISOString().slice(0, 10),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get('format') || 'xlsx').toLowerCase();
  const datasetParam = searchParams.get('dataset') || 'consolidated';
  const filterCompound = searchParams.get('compound')?.toLowerCase();
  const filterDealType = searchParams.get('dealType')?.toLowerCase();

  let rawUnits = loadDataset(datasetParam);

  if (filterCompound) {
    rawUnits = rawUnits.filter((u) =>
      String(u.compound || u.location || '').toLowerCase().includes(filterCompound),
    );
  }

  if (filterDealType) {
    rawUnits = rawUnits.filter((u) => {
      const d = String(u.mode || u.operation || u.dealType || u.deal_type || '').toLowerCase();
      if (filterDealType === 'rent') return d.includes('rent') || d.includes('إيجار');
      if (filterDealType === 'resale' || filterDealType === 'sale') return d.includes('resale') || d.includes('sale') || d.includes('بيع');
      return d.includes(filterDealType);
    });
  }

  const tableRows = rawUnits.map(normalizeUnitRow);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // 1. Format JSON
  if (format === 'json') {
    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        dataset: datasetParam,
        count: tableRows.length,
        units: tableRows,
      },
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Disposition': 'inline; filename="sierra-estates-inventory.json"',
        },
      },
    );
  }

  // 2. Format CSV (Compatible with Google Sheets =IMPORTDATA and Excel Web Connector)
  if (format === 'csv') {
    const ws = XLSX.utils.json_to_sheet(tableRows);
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'inline; filename="sierra-estates-master-inventory.csv"',
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      },
    });
  }

  // 3. Format Excel Workbook (.xlsx)
  const wb = XLSX.utils.book_new();

  // Tab 1: All Units
  const wsAll = XLSX.utils.json_to_sheet(tableRows);
  XLSX.utils.book_append_sheet(wb, wsAll, 'All_Master_Units');

  // Tab 2: Sale / Resale Units
  const saleRows = tableRows.filter((r) => {
    const t = String(r['Deal Type'] || '').toLowerCase();
    return t.includes('sale') || t.includes('بيع') || t.includes('resale') || !t.includes('rent');
  });
  if (saleRows.length > 0) {
    const wsSale = XLSX.utils.json_to_sheet(saleRows);
    XLSX.utils.book_append_sheet(wb, wsSale, 'Owners_Sale_Resale');
  }

  // Tab 3: Luxury Rentals
  const rentRows = tableRows.filter((r) => {
    const t = String(r['Deal Type'] || '').toLowerCase();
    return t.includes('rent') || t.includes('إيجار') || t.includes('ايجار');
  });
  if (rentRows.length > 0) {
    const wsRent = XLSX.utils.json_to_sheet(rentRows);
    XLSX.utils.book_append_sheet(wb, wsRent, 'Luxury_Rentals');
  }

  // Tab 4: Cairo Plaza & Prime Waterfront
  const cpRows = tableRows.filter((r) => {
    const c = String(r['Compound / Project'] || '').toLowerCase();
    return c.includes('cairo plaza') || c.includes('كايرو بلازا') || c.includes('nile');
  });
  if (cpRows.length > 0) {
    const wsCp = XLSX.utils.json_to_sheet(cpRows);
    XLSX.utils.book_append_sheet(wb, wsCp, 'Cairo_Plaza_Towers');
  }

  // Tab 5: Market Intelligence & Compound Price Index
  const compoundStats = [
    { Compound: 'Mivida (Emaar)', AvgPriceSqmEGP: '115,000', YieldPercentage: '8.5%', PrimaryZones: 'Golden Square / 5th Settlement', Liquidity: 'High' },
    { Compound: 'Hyde Park New Cairo', AvgPriceSqmEGP: '75,000', YieldPercentage: '7.8%', PrimaryZones: '90th South / Park Avenue', Liquidity: 'Very High' },
    { Compound: 'Mountain View iCity', AvgPriceSqmEGP: '70,000', YieldPercentage: '8.2%', PrimaryZones: 'New Cairo Club Side', Liquidity: 'High' },
    { Compound: 'Palm Hills New Cairo', AvgPriceSqmEGP: '125,000', YieldPercentage: '9.0%', PrimaryZones: 'Golden Square Extension', Liquidity: 'Prime Luxury' },
    { Compound: 'Cairo Plaza Towers', AvgPriceSqmEGP: '145,000', YieldPercentage: '19.5%', PrimaryZones: 'Nile Corniche, Downtown', Liquidity: 'Institutional' },
    { Compound: 'Villette by SODIC', AvgPriceSqmEGP: '95,000', YieldPercentage: '8.0%', PrimaryZones: 'Golden Square', Liquidity: 'High' },
    { Compound: 'Uptown Cairo (Emaar)', AvgPriceSqmEGP: '130,000', YieldPercentage: '9.4%', PrimaryZones: 'Mokattam Hills', Liquidity: 'High' },
    { Compound: 'Madinaty & Rehab', AvgPriceSqmEGP: '50,000', YieldPercentage: '7.2%', PrimaryZones: 'East Cairo Gated', Liquidity: 'Maximum Resale' },
  ];
  const wsIndex = XLSX.utils.json_to_sheet(compoundStats);
  XLSX.utils.book_append_sheet(wb, wsIndex, 'Compound_Price_Index');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

  return new NextResponse(excelBuffer, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="sierra-estates-master-inventory.xlsx"',
    },
  });
}

