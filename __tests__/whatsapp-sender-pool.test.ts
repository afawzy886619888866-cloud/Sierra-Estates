/**
 * 4-line sender pool — gateway-client.js rotation contract tests.
 *
 * Spins a local stub of the OpenWA gateway:
 *   GET  /api/sessions                       → session registry (name → uuid)
 *   GET  /api/sessions/:uuid                 → status
 *   POST /api/sessions/:uuid/messages/send-text → per-session scripted outcome
 *
 * Contract under test (verified gateway API: UUID-addressed send endpoints):
 *   1. Round-robin across healthy pool sessions
 *   2. A session answering 400 "not active" is benched; the next line carries
 *   3. Unresolvable pool names are dropped (never guessed)
 *   4. Permanent chatId 4xx aborts WITHOUT burning the rest of the pool
 *   5. Empty pool + no OPENWA_SESSION_ID → explicit error
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { GatewayClient } from '../workflows/lib/gateway-client';

const UUID = {
  line1: '11111111-1111-4111-8111-111111111111',
  line2: '22222222-2222-4222-8222-222222222222',
  line3: '33333333-3333-4333-8333-333333333333',
};

type Stub = {
  server: http.Server;
  url: string;
  hits: string[]; // "POST <uuid>" / "LIST"
  script: (uuid: string, method: string) => { status: number; body: unknown };
};

function startStub(script: Stub['script']): Promise<Stub> {
  return new Promise((resolve) => {
    const hits: string[] = [];
    const state = { server: null as unknown as http.Server, url: '', hits, script };
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (d) => (body += d));
      req.on('end', () => {
        const m = req.url!.match(/^\/api\/sessions\/([^/]+)(\/messages\/send-text)?$/);
        if (req.url === '/api/sessions' && req.method === 'GET') {
          hits.push('LIST');
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify([
            { id: UUID.line1, name: 'line1' },
            { id: UUID.line2, name: 'line2' },
            { id: UUID.line3, name: 'line3' },
          ]));
          return;
        }
        if (m && req.method === 'GET') {
          hits.push(`STATUS ${m[1]}`);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'ready', phone: '201000000001' }));
          return;
        }
        if (m && req.method === 'POST') {
          hits.push(`POST ${m[1]}`);
          const { status, body: b } = state.script(m[1], req.method);
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(b));
          return;
        }
        res.statusCode = 404;
        res.end('{}');
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      state.server = server;
      state.url = `http://127.0.0.1:${port}`;
      resolve(state);
    });
  });
}

const OK = (uuid: string) => ({ status: 200, body: { id: `sid-${uuid.slice(0, 4)}` } });
const NOT_ACTIVE = { status: 400, body: { message: 'session not active' } };
const BAD_CHAT = { status: 404, body: { message: 'chat not found' } };

let stub: Stub;

beforeEach(async () => {
  stub = await startStub(() => OK('default'));
});
afterEach(async () => {
  await new Promise<void>((r) => stub.server.close(() => r()));
});

function client(pool: string, sessionId = '') {
  return new GatewayClient({
    baseUrl: stub.url,
    operatorKey: 'op-key',
    adminKey: 'admin-key',
    sessionPool: pool,
    sessionId,
  });
}

describe('gateway-client 4-line sender pool', () => {
  it('resolves pool names to UUIDs and round-robins across healthy sessions', async () => {
    stub.script = (uuid) => OK(uuid);
    const gw = client('line1,line2,line3');
    const r1 = await gw.sendText('201012345678@c.us', 'hi');
    const r2 = await gw.sendText('201012345678@c.us', 'hi');
    const r3 = await gw.sendText('201012345678@c.us', 'hi');
    expect(r1.ok && r2.ok && r3.ok).toBe(true);
    expect([r1.session, r2.session, r3.session]).toEqual(['line1', 'line2', 'line3']);
  });

  it('benches a 400 "not active" session and the next line takes the send', async () => {
    stub.script = (uuid) => (uuid === UUID.line1 ? NOT_ACTIVE : OK(uuid));
    const gw = client('line1,line2');
    const r = await gw.sendText('201012345678@c.us', 'hi');
    expect(r.ok).toBe(true);
    expect(r.session).toBe('line2');
    // line1 was benched: next send goes straight to line2 (no new line1 attempt)
    stub.hits.length = 0;
    await gw.sendText('201012345678@c.us', 'hi again');
    expect(stub.hits.filter((h) => h === `POST ${UUID.line1}`)).toHaveLength(0);
    expect(stub.hits.filter((h) => h === `POST ${UUID.line2}`)).toHaveLength(1);
  });

  it('drops unresolvable pool names instead of guessing', async () => {
    stub.script = (uuid) => OK(uuid);
    const gw = client('line1,ghost-line');
    const r = await gw.sendText('201012345678@c.us', 'hi');
    expect(r.ok).toBe(true);
    expect(r.session).toBe('line1');
    expect(stub.hits.filter((h) => h.startsWith('POST'))).toHaveLength(1);
  });

  it('a permanent chatId 4xx aborts without burning the pool', async () => {
    stub.script = () => BAD_CHAT;
    const gw = client('line1,line2,line3');
    await expect(gw.sendText('201012345678@c.us', 'hi')).rejects.toThrow(/404/);
    expect(stub.hits.filter((h) => h.startsWith('POST'))).toHaveLength(1);
  });

  it('empty pool and no session id fails loudly', async () => {
    const gw = client('');
    await expect(gw.sendText('201012345678@c.us', 'hi')).rejects.toThrow();
  });

  it('legacy single-session path still works with retries when no pool is set', async () => {
    let n = 0;
    stub.script = () => (n++ < 2 ? { status: 503, body: { message: 'gw busy' } } : OK(UUID.line1));
    const gw = client('', UUID.line1);
    const r = await gw.sendText('201012345678@c.us', 'hi', { retries: 2 });
    expect(r.ok).toBe(true);
    expect(stub.hits.filter((h) => h.startsWith('POST'))).toHaveLength(3);
  });

  it('status() still works against the stub registry (pre-flight contract)', async () => {
    const gw = client('', UUID.line1);
    const st = await gw.status();
    expect(st.status).toBe('ready');
    expect(st.phone).toBe('201000000001');
  });
});
