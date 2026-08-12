/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Sierra Estates — WhatsApp Scraper Tests
 *  File: SE/infra/whatsapp-scraper/__tests__/scraper.test.ts
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Tests the Baileys WhatsApp scraper logic:
 *    - Message dedup cache
 *    - Phone number extraction from JID
 *    - n8n webhook forwarding payload structure
 *    - Firestore fallback payload structure
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRAPER_DIR = join(__dirname, '..');
const SCRAPER_SOURCE = readFileSync(join(SCRAPER_DIR, 'src/index.js'), 'utf-8');
const PACKAGE_JSON = JSON.parse(readFileSync(join(SCRAPER_DIR, 'package.json'), 'utf-8'));

/* ═══════════════════════════════════════════════════════════════════════════
 *  PACKAGE.JSON VALIDATION
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('package.json', () => {
  it('has correct name', () => {
    expect(PACKAGE_JSON.name).toBe('sierra-whatsapp-scraper');
  });

  it('has ESM module type', () => {
    expect(PACKAGE_JSON.type).toBe('module');
  });

  it('has Baileys dependency', () => {
    expect(PACKAGE_JSON.dependencies['@whiskeysockets/baileys']).toBeDefined();
  });

  it('has firebase-admin dependency', () => {
    expect(PACKAGE_JSON.dependencies['firebase-admin']).toBeDefined();
  });

  it('has qrcode-terminal dependency', () => {
    expect(PACKAGE_JSON.dependencies['qrcode-terminal']).toBeDefined();
  });

  it('has start script', () => {
    expect(PACKAGE_JSON.scripts.start).toBe('node src/index.js');
  });

  it('requires Node >= 18', () => {
    expect(PACKAGE_JSON.engines.node).toContain('18');
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 *  SOURCE CODE VALIDATION
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('Scraper source code (src/index.js)', () => {
  it('imports Baileys makeWASocket', () => {
    expect(SCRAPER_SOURCE).toContain("from '@whiskeysockets/baileys'");
  });

  it('imports useMultiFileAuthState for session persistence', () => {
    expect(SCRAPER_SOURCE).toContain('useMultiFileAuthState');
  });

  it('uses qrcode-terminal for QR display', () => {
    expect(SCRAPER_SOURCE).toContain("from 'qrcode-terminal'");
    expect(SCRAPER_SOURCE).toContain('qrcode.generate');
  });

  it('has message dedup cache', () => {
    expect(SCRAPER_SOURCE).toContain('processedMessages');
    expect(SCRAPER_SOURCE).toContain('isDuplicate');
    expect(SCRAPER_SOURCE).toContain('Set');
  });

  it('dedup cache has max size limit (prevents memory leak)', () => {
    expect(SCRAPER_SOURCE).toContain('MAX_CACHE_SIZE');
  });

  it('extracts phone from JID (strips @s.whatsapp.net)', () => {
    expect(SCRAPER_SOURCE).toContain("jid.split('@')[0]");
    expect(SCRAPER_SOURCE).toContain("'+' +");
  });

  it('forwards messages to n8n webhook', () => {
    expect(SCRAPER_SOURCE).toContain('forwardToN8n');
    expect(SCRAPER_SOURCE).toContain('N8N_WEBHOOK_URL');
  });

  it('has Firestore fallback (direct write if n8n down)', () => {
    expect(SCRAPER_SOURCE).toContain('writeClientToFirestore');
    expect(SCRAPER_SOURCE).toContain('createRequestInFirestore');
    expect(SCRAPER_SOURCE).toContain('n8n unavailable');
  });

  it('writes clients with lead_source = whatsapp_bot', () => {
    expect(SCRAPER_SOURCE).toContain("lead_source: 'whatsapp_bot'");
  });

  it('creates requests with bot_handling status', () => {
    expect(SCRAPER_SOURCE).toContain("status: 'bot_handling'");
  });

  it('appends chat history to requests', () => {
    expect(SCRAPER_SOURCE).toContain('bot_chat_history');
    expect(SCRAPER_SOURCE).toContain('sender: \'client\'');
  });

  it('sends bot reply back to client', () => {
    expect(SCRAPER_SOURCE).toContain('sendMessage');
    expect(SCRAPER_SOURCE).toContain('n8nResponse.reply');
  });

  it('has graceful shutdown (SIGINT + SIGTERM)', () => {
    expect(SCRAPER_SOURCE).toContain('SIGINT');
    expect(SCRAPER_SOURCE).toContain('SIGTERM');
    expect(SCRAPER_SOURCE).toContain('sock.logout');
  });

  it('handles reconnection on disconnect', () => {
    expect(SCRAPER_SOURCE).toContain('shouldReconnect');
    expect(SCRAPER_SOURCE).toContain('DisconnectReason.loggedOut');
  });

  it('skips status@broadcast messages', () => {
    expect(SCRAPER_SOURCE).toContain('status@broadcast');
  });

  it('skips own messages (fromMe)', () => {
    expect(SCRAPER_SOURCE).toContain('fromMe');
  });

  it('uses pino for structured logging', () => {
    expect(SCRAPER_SOURCE).toContain("from 'pino'");
  });

  it('has QR-only mode flag (--qr-only)', () => {
    expect(SCRAPER_SOURCE).toContain('--qr-only');
    expect(SCRAPER_SOURCE).toContain('QR_ONLY');
  });

  it('configures browser identity (BOT_NAME)', () => {
    expect(SCRAPER_SOURCE).toContain('BOT_NAME');
    expect(SCRAPER_SOURCE).toContain("browser: [BOT_NAME");
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 *  MESSAGE FLOW LOGIC
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('Message flow logic', () => {
  it('has correct event handler for incoming messages', () => {
    expect(SCRAPER_SOURCE).toContain("messages.upsert");
  });

  it('only handles notify type (real-time, not history sync)', () => {
    expect(SCRAPER_SOURCE).toContain("type !== 'notify'");
  });

  it('extracts text from multiple message types', () => {
    expect(SCRAPER_SOURCE).toContain('conversation');
    expect(SCRAPER_SOURCE).toContain('extendedTextMessage');
    expect(SCRAPER_SOURCE).toContain('imageMessage');
    expect(SCRAPER_SOURCE).toContain('videoMessage');
  });

  it('sends generic acknowledgment when n8n is down', () => {
    expect(SCRAPER_SOURCE).toContain("I'm the Sierra Estates assistant");
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 *  DOCKERFILE VALIDATION
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('Dockerfile', () => {
  const dockerfile = readFileSync(join(SCRAPER_DIR, 'Dockerfile'), 'utf-8');

  it('uses Node 20 slim base image', () => {
    expect(dockerfile).toContain('node:20-slim');
  });

  it('sets working directory to /app', () => {
    expect(dockerfile).toContain('WORKDIR /app');
  });

  it('creates auth directory for Baileys session', () => {
    expect(dockerfile).toContain('mkdir -p /app/auth');
  });

  it('has healthcheck', () => {
    expect(dockerfile).toContain('HEALTHCHECK');
  });

  it('runs the bot with CMD', () => {
    expect(dockerfile).toContain('CMD');
    expect(dockerfile).toContain('node');
    expect(dockerfile).toContain('src/index.js');
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 *  DOCKER-COMPOSE VALIDATION
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('docker-compose.yml', () => {
  const compose = readFileSync(join(SCRAPER_DIR, '..', 'docker-compose.yml'), 'utf-8');

  it('defines n8n service', () => {
    expect(compose).toContain('n8n:');
    expect(compose).toContain('n8nio/n8n');
  });

  it('defines whatsapp-scraper service', () => {
    expect(compose).toContain('whatsapp-scraper:');
  });

  it('n8n exposes port 5678', () => {
    // Compose uses ${N8N_PORT:-5678}:5678 format — check both parts
    expect(compose).toContain(':5678');
    expect(compose).toMatch(/N8N_PORT.*5678/);
  });

  it('has data persistence volumes', () => {
    expect(compose).toContain('./n8n-data:/data');
    expect(compose).toContain('./whatsapp-auth:/app/auth');
  });

  it('has network configuration', () => {
    expect(compose).toContain('sierra-net');
  });

  it('whatsapp-scraper depends on n8n', () => {
    expect(compose).toContain('depends_on');
    expect(compose).toContain('n8n');
  });

  it('has healthchecks for both services', () => {
    expect(compose).toContain('healthcheck');
  });

  it('mounts Firebase service account as read-only', () => {
    expect(compose).toContain('firebase-service-account.json');
    expect(compose).toContain(':ro');
  });
});
