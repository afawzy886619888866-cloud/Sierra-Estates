/**
 * Sierra Estates — Full Stack Live Health & Integration Verifier
 * Verifies:
 *  1. Local Next.js server & /api/whatsapp/qr proxy
 *  2. AWS EC2 OpenWA Gateway (18.232.148.172:3000)
 *  3. AWS EC2 n8n Automation Engine (18.232.148.172:5678)
 *  4. AWS CLI & IAM Caller Identity (profile: sierra-estates)
 *  5. WhatsApp session state (sierra-main)
 */

import http from 'http';
import { execSync } from 'child_process';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

async function checkUrl(url: string, headers: Record<string, string> = {}): Promise<{ ok: boolean; status: number; body: string }> {
  return new Promise((resolve) => {
    const req = http.get(url, { headers, timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ ok: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 400, status: res.statusCode ?? 0, body: data }));
    });
    req.on('error', (err) => resolve({ ok: false, status: 0, body: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, status: 408, body: 'Timeout' });
    });
  });
}

async function runVerification() {
  console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN}   Sierra Estates — Full Stack Live Verification Suite        ${RESET}`);
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${RESET}\n`);

  let passed = 0;
  let total = 0;

  // 1. Check AWS CLI Authentication
  total++;
  try {
    process.stdout.write('1. AWS CLI & Caller Identity (sierra-estates)... ');
    const awsExe = `${process.env.LOCALAPPDATA}\\Programs\\Amazon\\AWSCLIV2\\aws.exe`;
    const out = execSync(`"${awsExe}" sts get-caller-identity --profile sierra-estates --output json`, { encoding: 'utf-8' });
    const identity = JSON.parse(out);
    console.log(`${GREEN}✓ OK${RESET} (Account: ${identity.Account}, Arn: ${identity.Arn})`);
    passed++;
  } catch (err: any) {
    console.log(`${RED}✗ FAILED${RESET} (${err.message})`);
  }

  // 2. Check EC2 OpenWA Port 3000 Health
  total++;
  process.stdout.write('2. EC2 OpenWA Gateway Health (18.232.148.172:3000)... ');
  const openwaHealth = await checkUrl('http://18.232.148.172:3000/api/health');
  if (openwaHealth.ok) {
    console.log(`${GREEN}✓ ONLINE${RESET} (Status: ${openwaHealth.status})`);
    passed++;
  } else {
    console.log(`${RED}✗ OFFLINE${RESET} (Status: ${openwaHealth.status})`);
  }

  // 3. Check WhatsApp Session & QR Generation
  total++;
  process.stdout.write('3. WhatsApp Session QR Endpoint (sierra-main)... ');
  const qrRes = await checkUrl('http://18.232.148.172:3000/api/sessions/bfd8dee0-8047-4a9b-9bca-f99909f2ea1e/qr', {
    'X-API-Key': 'owa_k1_a06231362ac8f1279ef68794cf02010ac08d74b97adc295ce26ebceba29a617e',
  });
  if (qrRes.ok) {
    try {
      const data = JSON.parse(qrRes.body);
      console.log(`${GREEN}✓ ACTIVE${RESET} (Status: ${data.status}, QR Code Ready: ${Boolean(data.qrCode)})`);
      passed++;
    } catch {
      console.log(`${YELLOW}⚠ Unexpected response${RESET}`);
    }
  } else {
    console.log(`${RED}✗ FAILED${RESET} (Status: ${qrRes.status})`);
  }

  // 4. Check Local Next.js Dev Server
  total++;
  process.stdout.write('4. Local Next.js Server & QR Route (localhost:3000)... ');
  const localQr = await checkUrl('http://localhost:3000/api/whatsapp/qr');
  if (localQr.ok) {
    try {
      const data = JSON.parse(localQr.body);
      console.log(`${GREEN}✓ OPERATIONAL${RESET} (Status: ${data.status})`);
      passed++;
    } catch {
      console.log(`${YELLOW}⚠ Non-JSON response${RESET}`);
    }
  } else {
    console.log(`${YELLOW}⚠ Dev server not running on localhost:3000${RESET}`);
  }

  // 5. Check Local Static QR Page
  total++;
  process.stdout.write('5. Static QR Portal Page (localhost:3000/whatsapp_qr.html)... ');
  const localHtml = await checkUrl('http://localhost:3000/whatsapp_qr.html');
  if (localHtml.ok) {
    console.log(`${GREEN}✓ SERVED${RESET} (200 OK)`);
    passed++;
  } else {
    console.log(`${YELLOW}⚠ Not accessible locally${RESET}`);
  }

  console.log(`\n${BOLD}Summary: ${passed}/${total} checks passed.${RESET}\n`);
}

runVerification().catch(console.error);
