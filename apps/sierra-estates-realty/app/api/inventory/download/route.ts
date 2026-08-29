import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'xlsx';

  const baseDir = path.join(process.cwd(), 'apps', 'sierra-estates-realty', 'data');
  const fallbackDir = path.join(process.cwd(), 'data');

  if (format === 'csv') {
    let csvPath = path.join(baseDir, 'sierra-estates-master-inventory.csv');
    if (!fs.existsSync(csvPath)) csvPath = path.join(fallbackDir, 'sierra-estates-master-inventory.csv');

    if (fs.existsSync(csvPath)) {
      const buffer = fs.readFileSync(csvPath);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="sierra-estates-master-inventory.csv"',
        },
      });
    }
  }

  // Default: Excel .xlsx
  let xlsxPath = path.join(baseDir, 'sierra-estates-master-inventory.xlsx');
  if (!fs.existsSync(xlsxPath)) xlsxPath = path.join(fallbackDir, 'sierra-estates-master-inventory.xlsx');

  if (fs.existsSync(xlsxPath)) {
    const buffer = fs.readFileSync(xlsxPath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="sierra-estates-master-inventory.xlsx"',
      },
    });
  }

  return NextResponse.json({ error: 'Inventory spreadsheet file not found' }, { status: 404 });
}
