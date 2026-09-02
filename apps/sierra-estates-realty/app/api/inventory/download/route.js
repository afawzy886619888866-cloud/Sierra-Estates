 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import snapshot from '../../../../lib/inventory/snapshot.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'xlsx';

  const snapshotData = snapshot ;
  const isArray = Array.isArray(snapshotData);
  const units = isArray
    ? (snapshotData )
    : (_optionalChain([(snapshotData ), 'optionalAccess', _ => _.units]) || []);

  // Format CSV
  if (format === 'csv') {
    const ws = XLSX.utils.json_to_sheet(units);
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="sierra-estates-master-inventory.csv"',
      },
    });
  }

  // Format Excel Workbook (.xlsx)
  const wb = XLSX.utils.book_new();

  // 1. All Units
  const wsAll = XLSX.utils.json_to_sheet(units);
  XLSX.utils.book_append_sheet(wb, wsAll, 'All_Master_Units');

  // 2. Sale / Resale Units
  const saleRows = units.filter((u) => {
    const t = String(u.dealType || u.type || u.deal_type || '').toLowerCase();
    return t.includes('sale') || t.includes('بيع') || t.includes('resale') || !t.includes('rent');
  });
  if (saleRows.length > 0) {
    const wsSale = XLSX.utils.json_to_sheet(saleRows);
    XLSX.utils.book_append_sheet(wb, wsSale, 'Owners_Sale_Resale');
  }

  // 3. Rental Units
  const rentRows = units.filter((u) => {
    const t = String(u.dealType || u.type || u.deal_type || '').toLowerCase();
    return t.includes('rent') || t.includes('إيجار') || t.includes('ايجار');
  });
  if (rentRows.length > 0) {
    const wsRent = XLSX.utils.json_to_sheet(rentRows);
    XLSX.utils.book_append_sheet(wb, wsRent, 'Luxury_Rentals');
  }

  // 4. Cairo Plaza
  const cpRows = units.filter((u) => {
    const c = String(u.compound || u.title || '').toLowerCase();
    return c.includes('cairo plaza') || c.includes('كايرو بلازا') || c.includes('nile');
  });
  if (cpRows.length > 0) {
    const wsCp = XLSX.utils.json_to_sheet(cpRows);
    XLSX.utils.book_append_sheet(wb, wsCp, 'Cairo_Plaza_Towers');
  }

  // 5. Compound Price Index
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
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="sierra-estates-master-inventory.xlsx"',
    },
  });
}
