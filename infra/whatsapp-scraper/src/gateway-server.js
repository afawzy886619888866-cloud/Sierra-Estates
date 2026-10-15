import http from 'http';
import { URL } from 'url';

const PORT = parseInt(process.env.PORT || '2785', 10);
const API_KEY = process.env.WHATSAPP_API_TOKEN || process.env.OPENWA_ADMIN_API_KEY || 'dev-admin-key';

const sessions = [
  {
    id: 'c1f7a012-9b24-4f81-a6b1-987654321001',
    name: 'session-default',
    status: 'ready',
    phone: '201031622600',
    pushName: 'Sierra Estates Line 1 (01031622600)',
    engineLoaded: true,
  },
  {
    id: 'c2f7a012-9b24-4f81-a6b1-987654321002',
    name: 'line-2',
    status: 'ready',
    phone: '201092048333',
    pushName: 'Sierra Estates Line 2 (01092048333)',
    engineLoaded: true,
  },
  {
    id: 'c3f7a012-9b24-4f81-a6b1-987654321003',
    name: 'line-3',
    status: 'ready',
    phone: '201061399688',
    pushName: 'Sierra Estates Line 3 (01061399688)',
    engineLoaded: true,
  },
  {
    id: 'c4f7a012-9b24-4f81-a6b1-987654321004',
    name: 'line-4',
    status: 'ready',
    phone: '201032206443',
    pushName: 'Sierra Estates Line 4 (01032206443)',
    engineLoaded: true,
  },
];

const webhooks = [];

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';

  // Health route
  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
  }

  // Auth check
  const providedKey = req.headers['x-api-key'] || (req.headers['authorization'] || '').replace(/^Bearer\s+/, '');
  if (providedKey !== API_KEY) {
    return sendJson(res, 401, { message: 'Invalid API key', error: 'Unauthorized', statusCode: 401 });
  }

  // Sessions list
  if (pathname === '/api/sessions' && req.method === 'GET') {
    return sendJson(res, 200, sessions);
  }

  // Session details by ID or Name
  const sessionDetailMatch = pathname.match(/^\/api\/sessions\/([^/]+)$/);
  if (sessionDetailMatch && req.method === 'GET') {
    const s = sessions.find((item) => item.id === sessionDetailMatch[1] || item.name === sessionDetailMatch[1]);
    if (s) return sendJson(res, 200, s);
    return sendJson(res, 200, sessions[0]);
  }

  // Create session
  if (pathname === '/api/sessions' && req.method === 'POST') {
    const body = await parseBody(req);
    const existing = sessions.find((s) => s.name === body.name);
    if (existing) {
      return sendJson(res, 200, existing);
    }
    const newSession = {
      id: `c${Date.now()}-9b24-4f81-a6b1-000000000000`,
      name: body.name || `line-${sessions.length + 1}`,
      status: 'ready',
      phone: body.name === 'line-2' ? '201092048333' : '201031622600',
      pushName: 'Sierra WhatsApp',
      engineLoaded: true,
    };
    sessions.push(newSession);
    return sendJson(res, 201, newSession);
  }

  // Session start
  const startMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/start$/);
  if (startMatch && req.method === 'POST') {
    const s = sessions.find((item) => item.id === startMatch[1] || item.name === startMatch[1]);
    if (s) s.status = 'ready';
    return sendJson(res, 200, { ok: true, status: 'ready' });
  }

  // Send text message
  const sendMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/messages\/send-text$/);
  if (sendMatch && req.method === 'POST') {
    const body = await parseBody(req);
    console.log(`[Gateway 2785] Session ${sendMatch[1]} -> sending to ${body.chatId}: ${body.text?.slice(0, 60)}...`);
    return sendJson(res, 200, {
      ok: true,
      messageId: `BAE5${Date.now().toString(16).toUpperCase()}`,
      status: 'sent',
    });
  }

  // Webhooks
  if (pathname === '/api/webhooks' && req.method === 'POST') {
    const body = await parseBody(req);
    webhooks.push(body);
    console.log('[Gateway 2785] Registered webhook:', body);
    return sendJson(res, 200, { ok: true, webhook: body });
  }

  // Pairing code & QR
  const codeMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/pairing-code$/);
  if (codeMatch) {
    return sendJson(res, 200, { ok: true, code: '1234-5678' });
  }

  const qrMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/qr$/);
  if (qrMatch) {
    return sendJson(res, 200, { ok: true, qr: 'mock-qr-code' });
  }

  return sendJson(res, 404, { error: 'Not found', path: pathname });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Sierra WhatsApp Gateway] Listening on http://127.0.0.1:${PORT}`);
  console.log(`[Sierra WhatsApp Gateway] Sessions active: session-default (201031622600), line-2 (201092048333)`);
});
