'use client';

/**
 * ExcelMergerView — Admin Portal Tool
 * Picks a folder of .xlsx/.xls files, merges + deduplicates them in-browser
 * using SheetJS, and downloads a Final_RealEstate_Database.xlsx whose columns
 * match the consolidated-master-inventory.json schema (used by ListingsView).
 *
 * Works entirely client-side — no API, no Python, no server.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  FolderOpen,
  Download,
  Play,
  RotateCcw,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Table2,
  Users,
  Building2,
  Banknote,
  Copy,
  TrendingDown,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MasterRow {
  id: string;
  sierraCode: string | null;
  type: string;
  compound: string;
  location: string;
  operation: 'Sale' | 'Rent' | 'Unknown';
  price: number;
  currency: 'EGP' | 'USD';
  priceFormatted: string;
  area_sqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  finishing: string;
  sourceType: 'owner' | 'broker' | 'unknown';
  sourceGroup: string;
  contact_info: string;
  ownerName: string;
  status: 'Available' | 'Sold' | 'Rented';
  isNewListing: boolean;
  listedAt: string;
  description: string;
  origin: 'excel_import';
  // dedup tracking
  _dedupKey: string;
  listings_count: number;
  all_codes: string;
}

interface Stats {
  totalFiles: number;
  totalRows: number;
  droppedNoPhone: number;
  duplicatesRemoved: number;
  uniqueRows: number;
  saleCount: number;
  rentCount: number;
  ownerCount: number;
  brokerCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const USD_TO_EGP = 48;

const COLUMN_SYNONYMS: Record<string, string[]> = {
  Unit_Code: ['code', 'كود', 'unit code', 'رقم الوحدة', 'ref', 'unit_code'],
  Phone: ['mobile', 'phone', 'تليفون', 'موبايل', 'رقم الهاتف', 'broker phone', 'contact', 'whatsapp'],
  Price_Raw: ['price', 'السعر', 'الإيجار', 'ايجار', 'المطلوب', 'unit price', 'total price'],
  Owner_Name: ['owner name', 'اسم المالك', 'الاسم', 'name'],
  Contact_Name: ['broker name', 'اسم البروكر', 'المعلن', 'contact person'],
  Listing_Date: ['timestamp', 'listing date', 'تاريخ العرض', 'تاريخ الإعلان', 'date'],
  Availability: ['availability', 'avail', 'الحالة', 'المتاحية', 'status'],
  Rooms: ['bedrooms', 'عدد الغرف', 'الغرف', 'rooms', 'نوم', 'beds'],
  Bathrooms: ['bathrooms', 'baths', 'الحمامات', 'حمام'],
  Location: ['location', 'المنطقة والكمبوند', 'الكمبوند', 'الموقع', 'compound'],
  Sub_Area: ['sub area', 'المنطقة الفرعية', 'المجاورة'],
  Furnishing: ['furnishing', 'حالة التأثيث', 'التأثيث', 'مفروش'],
  Finishing: ['finishing', 'تشطيب', 'حالة التشطيب'],
  Unit_Type: ['property type', 'unit type', 'نوع الوحدة', 'النوع', 'type'],
  Deal: ['transaction', 'نوع المعاملة', 'deal', 'بيع/ايجار', 'operation'],
  Advertiser_Type: ['advertiser type', 'نوع المعلن', 'owner/broker', 'المعلن', 'source type'],
  Area: ['space', 'area', 'المساحة', 'مساحه', 'area_sqm'],
  Notes: ['notes', 'ملاحظات', 'تفاصيل', 'الوصف', 'description', 'comment'],
};

const COMPOUNDS: Record<string, RegExp[]> = {
  Madinaty: [/مدينت[يى]/i, /madinat/i],
  'Al Rehab': [/الرحاب/i, /rehab/i],
  Mivida: [/ميفيدا/i, /mivida/i],
  'Hyde Park': [/هايد\s*بارك/i, /hyde\s*park/i],
  'Mountain View': [/ماونتن\s*فيو/i, /mountain\s*view/i],
  Villette: [/فيليت/i, /villette/i],
  'Palm Hills': [/بالم\s*هيلز/i, /palm\s*hills/i],
  Eastown: [/ايست\s*تاون/i, /eastown/i],
  'Swan Lake': [/سوان\s*ليك/i, /swan\s*lake/i],
  'Katameya Dunes': [/ديونز/i, /dunes/i],
  'Beit El Watan': [/بيت\s*الوطن/i, /beit\s*el\s*watan/i],
  'El Shorouk': [/الشروق/i, /shorouk/i],
  'Cairo Festival': [/فستيفال/i, /\bcfc\b/i],
  'Fifth Square': [/فيفت\s*سكوير/i, /fifth\s*square/i],
  Sodic: [/سوديك/i, /sodic/i],
  'New Cairo': [/التجمع/i, /new\s*cairo/i],
  'Sheikh Zayed': [/الشيخ\s*زايد/i, /zayed/i],
  'North Coast': [/الساحل\s*الشمالي/i, /north\s*coast/i],
};

const UNKNOWN_SET = new Set(['*', '', 'nan', 'none', 'null', '-', 'n/a', 'unknown', 'غير مذكور']);

// ─── Parsers ──────────────────────────────────────────────────────────────────

function cleanVal(v: any): string {
  if (v === null || v === undefined) return 'Unknown';
  const s = String(v).trim();
  return UNKNOWN_SET.has(s.toLowerCase()) ? 'Unknown' : s;
}

function normalizePhone(v: any): string | null {
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  if (s.endsWith('.0')) s = s.slice(0, -2);
  let d = s.replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('20') && d.length >= 12) d = d.slice(2);
  if (d.length === 10 && d.startsWith('1')) d = '0' + d;
  return d.length >= 7 ? d : null;
}

function getLast7(v: string | null): string {
  if (!v) return '';
  const d = v.replace(/\D/g, '');
  return d.length >= 7 ? d.slice(-7) : '';
}

function parsePrice(v: any): { amount: number; currency: 'EGP' | 'USD' } {
  const nan = { amount: NaN, currency: 'EGP' as const };
  if (v === null || v === undefined) return nan;
  const s = String(v).trim();
  if (UNKNOWN_SET.has(s.toLowerCase())) return nan;
  const currency: 'EGP' | 'USD' = /\$|usd|dollar|دولار/i.test(s) ? 'USD' : 'EGP';
  const m = s.match(/\d+(?:[.,]\d+)*/);
  if (!m) return { amount: NaN, currency };
  let t = m[0];
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(t)) t = t.replace(/[.,]/g, '');
  else t = t.replace(/,/g, '');
  let n = parseFloat(t);
  if (isNaN(n)) return { amount: NaN, currency };
  const tail = s.slice(m.index! + m[0].length, m.index! + m[0].length + 12);
  if (/مليون|ملون|million/i.test(tail) || /m(?![2²0-9])/i.test(tail)) n *= 1_000_000;
  else if (/الف|ألف|thousand/i.test(tail) || /k(?![a-z0-9])/i.test(tail)) n *= 1_000;
  return { amount: n, currency };
}

function parseNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().toLowerCase();
  if (UNKNOWN_SET.has(s)) return null;
  const m = s.match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function normalizeDeal(v: any): 'Sale' | 'Rent' | 'Unknown' {
  const s = String(v ?? '').trim().toLowerCase();
  if (/ايجار|إيجار|rent/i.test(s)) return 'Rent';
  if (/بيع|sale|sell|resale|تنازل/i.test(s)) return 'Sale';
  return 'Unknown';
}

function normalizeCompound(loc: string, notes: string): string {
  const comb = `${loc} ${notes}`.toLowerCase();
  for (const [name, pats] of Object.entries(COMPOUNDS)) {
    if (pats.some((p) => p.test(comb))) return name;
  }
  return cleanVal(loc);
}

function normalizeSourceType(v: any, ctx: string): 'owner' | 'broker' | 'unknown' {
  const s = String(v ?? '').toLowerCase();
  if (/مالك|owner|اونر/i.test(s) || /مالك|owner|اونر/i.test(ctx)) return 'owner';
  if (/بروكر|broker|وسيط|شركة/i.test(s) || /بروكر|broker|وسيط|شركة/i.test(ctx)) return 'broker';
  return 'unknown';
}

function normalizeStatus(v: any): 'Available' | 'Sold' | 'Rented' {
  const s = String(v ?? '').toLowerCase();
  if (/sold|تم البيع|اتباعت/i.test(s)) return 'Sold';
  if (/rented|تم الايجار|تم التأجير/i.test(s)) return 'Rented';
  return 'Available';
}

// ─── Column Mapper ────────────────────────────────────────────────────────────

function mapColumns(headers: any[]): Record<string, number> {
  const lows = headers.map((h) => String(h ?? '').trim().toLowerCase());
  const result: Record<string, number> = {};
  const used = new Set<number>();
  for (const [std, syns] of Object.entries(COLUMN_SYNONYMS)) {
    for (const syn of syns) {
      const idx = lows.findIndex((h, i) => !used.has(i) && h.includes(syn));
      if (idx !== -1) {
        result[std] = idx;
        used.add(idx);
        break;
      }
    }
  }
  return result;
}

function findHeaderRow(rows: any[][]): { rowIdx: number; colMap: Record<string, number> } | null {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const colMap = mapColumns(rows[i]);
    if (Object.keys(colMap).length >= 2 && ('Phone' in colMap || 'Unit_Code' in colMap || 'Price_Raw' in colMap)) {
      return { rowIdx: i, colMap };
    }
  }
  return null;
}

// ─── Core Merge Engine ────────────────────────────────────────────────────────

async function mergeFiles(
  files: File[],
  onLog: (msg: string) => void,
): Promise<{ rows: MasterRow[]; stats: Stats }> {
  // Lazy-load SheetJS at runtime (avoids SSR issues)
  const XLSX = await import('xlsx');

  const allRaw: Array<{ fields: Record<string, any>; sourceName: string; sourceSheet: string }> = [];
  let totalFiles = 0;

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['xls', 'xlsx', 'xlsm', 'xlsb'].includes(ext)) continue;
    // Skip output files
    if (file.name.startsWith('Final_') || file.name.startsWith('~$') || file.name.startsWith('Missing_')) continue;
    totalFiles++;

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      for (const sheetName of wb.SheetNames) {
        if (/dashboard|summary|pivot|تعليمات/i.test(sheetName)) continue;
        const ws = wb.Sheets[sheetName];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
        if (raw.length < 2) continue;

        const found = findHeaderRow(raw);
        if (!found) {
          onLog(`  ⚠️  ${file.name} | ${sheetName}: No recognisable header — skipped`);
          continue;
        }
        const { rowIdx, colMap } = found;
        const dataRows = raw.slice(rowIdx + 1);
        const get = (row: any[], key: string) => (key in colMap ? row[colMap[key]] : null);

        for (const row of dataRows) {
          if (row.every((c) => c === null || c === undefined || String(c).trim() === '')) continue;
          allRaw.push({
            sourceName: file.name,
            sourceSheet: sheetName,
            fields: {
              Unit_Code: get(row, 'Unit_Code'),
              Phone: get(row, 'Phone'),
              Price_Raw: get(row, 'Price_Raw'),
              Owner_Name: get(row, 'Owner_Name'),
              Contact_Name: get(row, 'Contact_Name'),
              Listing_Date: get(row, 'Listing_Date'),
              Availability: get(row, 'Availability'),
              Rooms: get(row, 'Rooms'),
              Bathrooms: get(row, 'Bathrooms'),
              Location: get(row, 'Location'),
              Sub_Area: get(row, 'Sub_Area'),
              Furnishing: get(row, 'Furnishing'),
              Finishing: get(row, 'Finishing'),
              Unit_Type: get(row, 'Unit_Type'),
              Deal: get(row, 'Deal'),
              Advertiser_Type: get(row, 'Advertiser_Type'),
              Area: get(row, 'Area'),
              Notes: get(row, 'Notes'),
            },
          });
        }
        onLog(`  ✅  ${file.name} | ${sheetName}: ${dataRows.length} rows`);
      }
    } catch (e: any) {
      onLog(`  ❌  ${file.name}: ${e?.message ?? e}`);
    }
  }

  const totalRows = allRaw.length;
  onLog(`\n📊 Total rows loaded: ${totalRows}`);

  // Normalize + filter no-phone
  const normalized = allRaw
    .map(({ fields, sourceName, sourceSheet }) => {
      const phone = normalizePhone(fields.Phone);
      if (!phone) return null;

      const { amount: rawPrice, currency } = parsePrice(fields.Price_Raw);
      let price = rawPrice;
      const deal = normalizeDeal(fields.Deal);
      // Sanity-fix bare small numbers
      if (!isNaN(price) && price > 0 && price < 100) {
        price = deal === 'Sale' ? price * 1_000_000 : price * 1_000;
      }
      const priceEgp = currency === 'USD' && !isNaN(price) ? price * USD_TO_EGP : price;

      const loc = cleanVal(fields.Location);
      const notes = cleanVal(fields.Notes);
      const compound = normalizeCompound(loc, notes);
      const ctx = `${sourceName} ${sourceSheet}`.toLowerCase();

      const listingDate = fields.Listing_Date
        ? new Date(fields.Listing_Date).toISOString()
        : new Date().toISOString();

      const status = normalizeStatus(fields.Availability);
      const code = cleanVal(fields.Unit_Code);

      return {
        phone,
        phone_last7: getLast7(phone),
        price: isNaN(priceEgp) ? 0 : priceEgp,
        priceRaw: isNaN(price) ? 0 : price,
        currency,
        deal,
        compound,
        loc,
        code: code === 'Unknown' ? '' : code,
        area: parseNum(fields.Area),
        rooms: parseNum(fields.Rooms),
        bathrooms: parseNum(fields.Bathrooms),
        finishing: cleanVal(fields.Finishing),
        unitType: cleanVal(fields.Unit_Type),
        ownerName: cleanVal(fields.Owner_Name) !== 'Unknown' ? cleanVal(fields.Owner_Name) : cleanVal(fields.Contact_Name),
        advertiserType: normalizeSourceType(fields.Advertiser_Type, ctx),
        status,
        listingDate,
        notes: notes !== 'Unknown' ? notes : '',
        sourceName,
        sourceSheet,
      };
    })
    .filter(Boolean) as NonNullable<ReturnType<typeof normalizePhone extends infer T ? any : any>>;

  const droppedNoPhone = totalRows - normalized.length;
  onLog(`📞 With valid phone: ${normalized.length} (dropped ${droppedNoPhone} — no phone)`);

  // Deduplicate: phone_last7 + price_rounded + deal
  const dedupMap = new Map<string, typeof normalized[0][]>();
  for (const row of normalized) {
    const key = `${row.phone_last7}|${Math.round(row.price)}|${row.deal}`;
    if (!dedupMap.has(key)) dedupMap.set(key, []);
    dedupMap.get(key)!.push(row);
  }

  const unique: MasterRow[] = [];
  let idxCounter = 1;
  for (const [, group] of dedupMap) {
    // Keep first (most recent if we sort); aggregate codes
    const primary = group[0];
    const allCodes = [...new Set(group.map((r) => r.code).filter(Boolean))].join(', ');

    const priceFormatted =
      primary.price > 0
        ? `${primary.price.toLocaleString()} EGP${primary.deal === 'Rent' ? ' / Month' : ''}`
        : 'Price on Call';

    unique.push({
      id: `SB-${String(idxCounter++).padStart(4, '0')}`,
      sierraCode: primary.code || null,
      type: primary.unitType !== 'Unknown' ? primary.unitType : 'Apartment',
      compound: primary.compound,
      location: primary.loc !== 'Unknown' ? `${primary.compound} / ${primary.loc}` : primary.compound,
      operation: primary.deal === 'Unknown' ? 'Sale' : primary.deal,
      price: primary.price,
      currency: primary.currency,
      priceFormatted,
      area_sqm: primary.area,
      bedrooms: primary.rooms,
      bathrooms: primary.bathrooms,
      finishing: primary.finishing !== 'Unknown' ? primary.finishing : '',
      sourceType: primary.advertiserType,
      sourceGroup: `${primary.sourceName} / ${primary.sourceSheet}`,
      contact_info: primary.phone,
      ownerName: primary.ownerName !== 'Unknown' ? primary.ownerName : '',
      status: primary.status,
      isNewListing: true,
      listedAt: primary.listingDate,
      description: primary.notes,
      origin: 'excel_import',
      _dedupKey: `${primary.phone_last7}|${Math.round(primary.price)}|${primary.deal}`,
      listings_count: group.length,
      all_codes: allCodes,
    });
  }

  const duplicatesRemoved = normalized.length - unique.length;
  onLog(`✨ Unique units: ${unique.length} (removed ${duplicatesRemoved} duplicates)`);

  const stats: Stats = {
    totalFiles,
    totalRows,
    droppedNoPhone,
    duplicatesRemoved,
    uniqueRows: unique.length,
    saleCount: unique.filter((r) => r.operation === 'Sale').length,
    rentCount: unique.filter((r) => r.operation === 'Rent').length,
    ownerCount: unique.filter((r) => r.sourceType === 'owner').length,
    brokerCount: unique.filter((r) => r.sourceType === 'broker').length,
  };

  return { rows: unique, stats };
}

// ─── Excel Writer ─────────────────────────────────────────────────────────────

async function downloadExcel(rows: MasterRow[], onLog: (msg: string) => void) {
  const XLSX = await import('xlsx');

  // Build output rows matching master inventory column order
  const output = rows.map((r) => ({
    'Unit ID': r.id,
    'Sierra Code': r.sierraCode ?? '',
    Type: r.type,
    Compound: r.compound,
    Location: r.location,
    Operation: r.operation,
    'Price (EGP)': r.price,
    Currency: r.currency,
    'Price Formatted': r.priceFormatted,
    'Area m²': r.area_sqm ?? '',
    Bedrooms: r.bedrooms ?? '',
    Bathrooms: r.bathrooms ?? '',
    Finishing: r.finishing,
    'Source Type': r.sourceType,
    'Source Group': r.sourceGroup,
    Phone: r.contact_info,
    'Owner / Contact': r.ownerName,
    Status: r.status,
    'Listed At': r.listedAt,
    Description: r.description,
    Origin: r.origin,
    'Listings Count': r.listings_count,
    'All Codes': r.all_codes,
  }));

  const wb = XLSX.utils.book_new();

  // ── Summary sheet ──
  const summaryData = [
    ['Metric', 'Value'],
    ['Total Files Processed', rows.length > 0 ? '—' : '0'],
    ['Unique Units', rows.length],
    ['For Sale', rows.filter((r) => r.operation === 'Sale').length],
    ['For Rent', rows.filter((r) => r.operation === 'Rent').length],
    ['Direct Owners', rows.filter((r) => r.sourceType === 'owner').length],
    ['Brokers', rows.filter((r) => r.sourceType === 'broker').length],
    ['Available', rows.filter((r) => r.status === 'Available').length],
    ['Generated At', new Date().toLocaleString()],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // ── All Units sheet ──
  const wsAll = XLSX.utils.json_to_sheet(output);
  // Style header row (SheetJS Pro only does full styling; basic column widths only here)
  wsAll['!cols'] = [
    { wch: 10 }, { wch: 18 }, { wch: 14 }, { wch: 20 }, { wch: 25 },
    { wch: 8 }, { wch: 16 }, { wch: 6 }, { wch: 22 }, { wch: 8 },
    { wch: 8 }, { wch: 8 }, { wch: 18 }, { wch: 10 }, { wch: 28 },
    { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 22 }, { wch: 40 },
    { wch: 14 }, { wch: 8 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsAll, 'All_Units');

  // ── Sub-sheets ──
  const subSheets: Array<[string, (r: MasterRow) => boolean]> = [
    ['Owners_Rent', (r) => r.sourceType === 'owner' && r.operation === 'Rent'],
    ['Owners_Sale', (r) => r.sourceType === 'owner' && r.operation === 'Sale'],
    ['Brokers_Rent', (r) => r.sourceType === 'broker' && r.operation === 'Rent'],
    ['Brokers_Sale', (r) => r.sourceType === 'broker' && r.operation === 'Sale'],
  ];
  for (const [name, pred] of subSheets) {
    const sub = output.filter((_, i) => pred(rows[i]));
    if (sub.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sub), name);
    }
  }

  XLSX.writeFile(wb, 'Final_RealEstate_Database.xlsx');
  onLog(`\n💾 Downloaded: Final_RealEstate_Database.xlsx (${rows.length} units)`);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExcelMergerView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [mergedRows, setMergedRows] = useState<MasterRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewPage, setPreviewPage] = useState(1);
  const PAGE_SIZE = 12;
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev, msg]);
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  const onFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const xlsFiles = files.filter((f) => /\.(xls|xlsx|xlsm|xlsb)$/i.test(f.name));
    setSelectedFiles(xlsFiles);
    setLogs([]);
    setMergedRows([]);
    setStats(null);
    setStatus('idle');
    setPreviewPage(1);
    if (xlsFiles.length > 0) {
      addLog(`📁 Found ${xlsFiles.length} Excel file(s) — click "Merge & Export" to process`);
      xlsFiles.forEach((f) => addLog(`   • ${f.name}`));
    }
  };

  const onRun = async () => {
    if (!selectedFiles.length) return;
    setStatus('processing');
    setLogs([]);
    setMergedRows([]);
    setStats(null);
    setPreviewPage(1);

    try {
      addLog(`🚀 Starting merge of ${selectedFiles.length} file(s)...\n`);
      const { rows, stats } = await mergeFiles(selectedFiles, addLog);
      setMergedRows(rows);
      setStats(stats);
      setStatus('done');
      addLog(`\n✅ Complete! ${rows.length} unique units ready to download.`);
    } catch (e: any) {
      addLog(`\n❌ Error: ${e?.message ?? e}`);
      setStatus('error');
    }
  };

  const onDownload = async () => {
    if (!mergedRows.length) return;
    await downloadExcel(mergedRows, addLog);
  };

  const onReset = () => {
    setStatus('idle');
    setLogs([]);
    setMergedRows([]);
    setStats(null);
    setSelectedFiles([]);
    setPreviewPage(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalPages = Math.ceil(mergedRows.length / PAGE_SIZE);
  const paginatedRows = mergedRows.slice((previewPage - 1) * PAGE_SIZE, previewPage * PAGE_SIZE);

  return (
    <div className="space-y-6 pb-8" data-testid="excel-merger-view">
      {/* ── Header ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            {isAr ? '🗂️ دمج ملفات الإكسل' : '🗂️ Excel Inventory Merger'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'اختر مجلد يحتوي على ملفات Excel — سيتم دمجها وتوحيدها تلقائياً'
              : 'Pick a folder of .xlsx files — they are merged, normalised & deduplicated in-browser. No upload needed.'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Hidden folder input */}
          <input
            ref={fileInputRef}
            type="file"
            // @ts-ignore — webkitdirectory is non-standard but universally supported
            webkitdirectory=""
            multiple
            accept=".xls,.xlsx,.xlsm,.xlsb"
            onChange={onFolderChange}
            className="hidden"
            id="folder-picker"
          />
          <label
            htmlFor="folder-picker"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold cursor-pointer flex items-center gap-2 transition-colors"
          >
            <FolderOpen className="w-4 h-4 text-amber-400" />
            {isAr ? 'اختر مجلد' : 'Select Folder'}
          </label>

          <button
            onClick={onRun}
            disabled={!selectedFiles.length || status === 'processing'}
            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            {status === 'processing' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isAr ? 'دمج وتصدير' : 'Merge & Export'}
          </button>

          {status === 'done' && (
            <button
              onClick={onDownload}
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg"
            >
              <Download className="w-4 h-4" />
              {isAr ? 'تحميل Excel' : 'Download Excel'}
            </button>
          )}

          <button
            onClick={onReset}
            className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isAr ? 'إعادة' : 'Reset'}
          </button>
        </div>
      </div>

      {/* ── Stats Cards (shown after processing) ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {[
            { icon: <Table2 className="w-4 h-4" />, label: isAr ? 'الكل' : 'Total Rows', val: stats.totalRows, color: 'text-slate-300' },
            { icon: <AlertCircle className="w-4 h-4" />, label: isAr ? 'بلا هاتف' : 'No Phone', val: stats.droppedNoPhone, color: 'text-red-400' },
            { icon: <Copy className="w-4 h-4" />, label: isAr ? 'مكرر' : 'Duplicates', val: stats.duplicatesRemoved, color: 'text-amber-400' },
            { icon: <CheckCircle2 className="w-4 h-4" />, label: isAr ? 'فريد' : 'Unique', val: stats.uniqueRows, color: 'text-emerald-400' },
            { icon: <Banknote className="w-4 h-4" />, label: isAr ? 'للبيع' : 'For Sale', val: stats.saleCount, color: 'text-cyan-400' },
            { icon: <Building2 className="w-4 h-4" />, label: isAr ? 'إيجار' : 'For Rent', val: stats.rentCount, color: 'text-blue-400' },
            { icon: <Users className="w-4 h-4" />, label: isAr ? 'ملاك' : 'Owners', val: stats.ownerCount, color: 'text-purple-400' },
          ].map((s) => (
            <div
              key={s.label}
              className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col gap-1"
            >
              <div className={`${s.color} flex items-center gap-1 text-xs font-semibold`}>
                {s.icon}
                {s.label}
              </div>
              <div className="text-xl font-bold text-white font-mono">{s.val.toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Log Panel ── */}
      {logs.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60">
            <span className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">
              {isAr ? 'سجل المعالجة' : 'Processing Log'}
            </span>
            {status === 'processing' && (
              <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            )}
            {status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            {status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
          </div>
          <div className="p-4 max-h-56 overflow-y-auto font-mono text-[11px] leading-5 space-y-0.5">
            {logs.map((line, i) => (
              <div
                key={i}
                className={
                  line.startsWith('❌')
                    ? 'text-red-400'
                    : line.startsWith('⚠️')
                    ? 'text-amber-400'
                    : line.startsWith('✅') || line.startsWith('✨') || line.startsWith('💾') || line.startsWith('✔')
                    ? 'text-emerald-400'
                    : line.startsWith('📊') || line.startsWith('📞') || line.startsWith('🚀')
                    ? 'text-cyan-400'
                    : 'text-slate-400'
                }
              >
                {line || '\u00A0'}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* ── Preview Table ── */}
      {mergedRows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              {isAr ? 'معاينة النتائج' : 'Preview'} ({mergedRows.length.toLocaleString()} {isAr ? 'وحدة' : 'units'})
            </h3>
            <button
              onClick={onDownload}
              className="px-3 py-1.5 rounded-lg bg-blue-700/80 hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {isAr ? 'تحميل' : 'Download Excel'}
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">{isAr ? 'الكود' : 'Code / Ref'}</th>
                  <th className="p-3">{isAr ? 'الكمبوند' : 'Compound'}</th>
                  <th className="p-3">{isAr ? 'النوع' : 'Type'}</th>
                  <th className="p-3">{isAr ? 'السعر' : 'Price'}</th>
                  <th className="p-3">{isAr ? 'العملية' : 'Deal'}</th>
                  <th className="p-3">{isAr ? 'المساحة' : 'Area m²'}</th>
                  <th className="p-3">{isAr ? 'الغرف' : 'Beds'}</th>
                  <th className="p-3">{isAr ? 'الهاتف' : 'Phone'}</th>
                  <th className="p-3">{isAr ? 'المالك/الوسيط' : 'Source'}</th>
                  <th className="p-3">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-center">{isAr ? 'ع' : '#'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono text-slate-500 text-[10px]">{row.id}</td>
                    <td className="p-3">
                      <span className="font-mono font-bold text-cyan-400 text-[11px]">
                        {row.sierraCode || '—'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-white">{row.compound}</span>
                    </td>
                    <td className="p-3 text-slate-300">{row.type}</td>
                    <td className="p-3">
                      <span className="font-bold text-white">{row.priceFormatted}</span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          row.operation === 'Rent'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                            : 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                        }`}
                      >
                        {row.operation}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">{row.area_sqm ?? '—'}</td>
                    <td className="p-3 text-slate-400">{row.bedrooms ?? '—'}</td>
                    <td className="p-3 font-mono text-slate-400 text-[10px]">{row.contact_info}</td>
                    <td className="p-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          row.sourceType === 'owner'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : 'bg-blue-950 text-blue-400 border border-blue-800/60'
                        }`}
                      >
                        {row.sourceType}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[10px]">
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3 text-center text-slate-500 text-[10px] font-mono">
                      {row.listings_count > 1 ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 text-[10px]">
                          {row.listings_count}x
                        </span>
                      ) : (
                        '1'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <button
                disabled={previewPage === 1}
                onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isAr ? '← السابق' : '← Previous'}
              </button>
              <span className="text-xs text-slate-400">
                {isAr ? `صفحة ${previewPage} من ${totalPages}` : `Page ${previewPage} of ${totalPages}`}
              </span>
              <button
                disabled={previewPage === totalPages}
                onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isAr ? 'التالي →' : 'Next →'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {status === 'idle' && !selectedFiles.length && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-3">
          <FolderOpen className="w-12 h-12 text-slate-700" />
          <p className="text-sm font-medium">
            {isAr ? 'اختر مجلداً يحتوي على ملفات Excel' : 'Select a folder containing Excel files to begin'}
          </p>
          <p className="text-xs text-slate-600">
            {isAr
              ? 'يدعم .xlsx · .xls · عربي + إنجليزي · يعمل بالكامل في المتصفح'
              : 'Supports .xlsx · .xls · Arabic + English headers · 100% in-browser'}
          </p>
        </div>
      )}
    </div>
  );
}
