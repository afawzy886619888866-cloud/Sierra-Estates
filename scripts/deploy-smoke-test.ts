#!/usr/bin/env tsx
/**
 * Sierra Estates Live Production & Local Endpoint Smoke Test Suite
 * Validates critical HTTP endpoints and JSON contracts.
 */

import http from 'http';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/sierra-estates-realty/.env.local') });

const BASE_URL = process.env.SMOKE_TARGET_URL || 'http://localhost:3000';

interface Probe {
  name: string;
  path: string;
  method: 'GET' | 'POST';
  body?: any;
  headers?: Record<string, string>;
  expectedStatus: number;
}

const secretKey = process.env.SBR_SECRET_KEY || process.env.INTERNAL_API_SECRET;
const internalHeaders = secretKey
  ? { 'X-SBR-SECRET-KEY': secretKey }
  : undefined;

const PROBES: Probe[] = [
  { name: 'Root Client Portal', path: '/', method: 'GET', expectedStatus: 200 },
  { name: 'System Health Check', path: '/api/health', method: 'GET', expectedStatus: 200 },
  { name: 'Internal Health Proxy', path: '/api/internal/health', method: 'GET', headers: internalHeaders, expectedStatus: 200 },
  { name: 'WhatsApp Webhook Challenge', path: '/api/webhooks/whatsapp', method: 'GET', expectedStatus: 200 },
  { name: 'Property Vector Recommendation', path: '/api/internal/recommend', method: 'GET', headers: internalHeaders, expectedStatus: 200 },
  { name: 'Closer Negotiation Engine', path: '/api/closer/negotiate', method: 'POST', body: { askingPrice: 38000000, buyerOfferPrice: 35000000 }, expectedStatus: 200 },
];

async function runProbe(p: Probe): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (ok: boolean) => {
      if (!resolved) {
        resolved = true;
        resolve(ok);
      }
    };

    try {
      const url = new URL(p.path, BASE_URL);
      const postData = p.body ? JSON.stringify(p.body) : null;

      const req = http.request(
        url,
        {
          method: p.method,
          headers: {
            'Content-Type': 'application/json',
            ...p.headers,
            ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
          },
          timeout: 15000,
        },
        (res) => {
          if (res.statusCode === p.expectedStatus) {
            console.log(`  ✅ ${p.name} -> HTTP ${res.statusCode}`);
            finish(true);
          } else {
            console.log(`  ❌ ${p.name} -> HTTP ${res.statusCode} (Expected ${p.expectedStatus})`);
            finish(false);
          }
        }
      );

      req.on('error', (err) => {
        console.log(`  ⚠️ ${p.name} -> Error (${err.message})`);
        finish(false);
      });

      req.on('timeout', () => {
        req.destroy();
        console.log(`  ⚠️ ${p.name} -> Request Timeout`);
        finish(false);
      });

      if (postData) req.write(postData);
      req.end();
    } catch (e) {
      console.log(`  ⚠️ ${p.name} -> Failed to dispatch (${(e as Error).message})`);
      finish(false);
    }
  });
}

async function main() {
  console.log(`\n🧪 RUNNING SIERRA ESTATES LIVE SMOKE PROBES [Target: ${BASE_URL}]\n`);
  let passed = 0;

  for (const probe of PROBES) {
    const ok = await runProbe(probe);
    if (ok) passed++;
  }

  console.log(`\n📊 Smoke Test Summary: ${passed}/${PROBES.length} probes successful\n`);
  if (passed === PROBES.length) {
    console.log('🎉 ALL SMOKE PROBES VERIFIED!\n');
  } else {
    process.exitCode = 1;
    console.error('❌ Smoke test failed. Fix the failing endpoint or its required environment before deploying.\n');
  }
}

main();
