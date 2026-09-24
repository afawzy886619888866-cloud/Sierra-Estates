import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min timeout for heavy inventory processing

interface ScanResponse {
  success: boolean;
  message: string;
  targetDir?: string;
  stats?: {
    totalExtracted?: number;
    duplicatesRemoved?: number;
    uniqueListings?: number;
    withPhotos?: number;
    withoutPhotos?: number;
  };
  outputFiles?: {
    masterExcel?: string;
    airtableCsv?: string;
  };
  durationSeconds?: number;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<ScanResponse>> {
  try {
    const body = await req.json().catch(() => ({}));
    const targetDir = body.targetDir || 'I:\\supabase\\Sheets';

    const rootDir = path.resolve(process.cwd(), '..', '..');
    const scriptPath = path.resolve(rootDir, 'scripts', 'scan-and-merge-inventory.py');

    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json(
        {
          success: false,
          message: `Scanner script not found at ${scriptPath}`,
        },
        { status: 500 }
      );
    }

    const startTime = Date.now();

    return new Promise((resolve) => {
      const pyProcess = spawn('python', [scriptPath, targetDir], {
        cwd: rootDir,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      });

      let stdout = '';
      let stderr = '';

      pyProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pyProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pyProcess.on('close', (code) => {
        const durationSeconds = Math.round((Date.now() - startTime) / 1000);

        if (code !== 0) {
          resolve(
            NextResponse.json(
              {
                success: false,
                message: `Scanner failed with exit code ${code}`,
                error: stderr || stdout,
                durationSeconds,
              },
              { status: 500 }
            )
          );
          return;
        }

        // Parse stats from stdout
        const totalMatch = stdout.match(/Total records read:\s*([\d,]+)/);
        const dupMatch = stdout.match(/Duplicates resolved:\s*([\d,]+)/);
        const uniqueMatch = stdout.match(/Unique inventory units:\s*([\d,]+)/);
        const photosMatch = stdout.match(/Units with photos:\s*([\d,]+)/);
        const noPhotosMatch = stdout.match(/Units without photos:\s*([\d,]+)/);

        const parseNum = (m: RegExpMatchArray | null) => (m ? parseInt(m[1].replace(/,/g, ''), 10) : 0);

        const stats = {
          totalExtracted: parseNum(totalMatch),
          duplicatesRemoved: parseNum(dupMatch),
          uniqueListings: parseNum(uniqueMatch),
          withPhotos: parseNum(photosMatch),
          withoutPhotos: parseNum(noPhotosMatch),
        };

        const masterExcel = path.join(targetDir, 'Final_RealEstate_Master_Unified.xlsx');
        const airtableCsv = path.join(targetDir, 'Unified_Airtable_Inventory.csv');

        resolve(
          NextResponse.json({
            success: true,
            message: 'Local inventory scanned, deduplicated, and merged successfully.',
            targetDir,
            stats,
            outputFiles: {
              masterExcel: fs.existsSync(masterExcel) ? masterExcel : undefined,
              airtableCsv: fs.existsSync(airtableCsv) ? airtableCsv : undefined,
            },
            durationSeconds,
          })
        );
      });

      pyProcess.on('error', (err) => {
        resolve(
          NextResponse.json(
            {
              success: false,
              message: `Failed to spawn scanner process: ${err.message}`,
              durationSeconds: Math.round((Date.now() - startTime) / 1000),
            },
            { status: 500 }
          )
        );
      });
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  const targetDir = 'I:\\supabase\\Sheets';
  const masterExcel = path.join(targetDir, 'Final_RealEstate_Master_Unified.xlsx');
  const airtableCsv = path.join(targetDir, 'Unified_Airtable_Inventory.csv');

  const exists = fs.existsSync(targetDir);
  const excelExists = fs.existsSync(masterExcel);
  const csvExists = fs.existsSync(airtableCsv);

  let excelStat = null;
  if (excelExists) {
    const s = fs.statSync(masterExcel);
    excelStat = {
      sizeBytes: s.size,
      sizeMb: (s.size / (1024 * 1024)).toFixed(2),
      lastModified: s.mtime.toISOString(),
    };
  }

  return NextResponse.json({
    configuredPath: targetDir,
    pathAccessible: exists,
    masterExcelGenerated: excelExists,
    airtableCsvGenerated: csvExists,
    excelStat,
  });
}
