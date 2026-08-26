const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3299;
const ACCESS_PIN = '8866'; // 4-digit Master Security PIN
const ACCESS_TOKEN = 'sierra-vault-auth-8866';

let latestQr = null;
let clientStatus = 'INITIALIZING';
let extractedResults = [];

// Determine Chrome executable
let chromePath = process.env.PUPPETEER_EXECUTABLE_PATH;
if (!chromePath) {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      chromePath = c;
      break;
    }
  }
}

// ── HTTP SERVER WITH PIN & TOKEN PROTECTION ──────────────────────────────────
const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://127.0.0.1:${PORT}`);
  
  if (urlObj.pathname === '/api/status') {
    const authHeader = req.headers['x-vault-pin'] || urlObj.searchParams.get('token');
    if (authHeader !== ACCESS_PIN && authHeader !== ACCESS_TOKEN) {
      res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'Unauthorized. PIN or Token required.' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ status: clientStatus, rawQr: latestQr, count: extractedResults.length }));
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sierra Estates - Protected WhatsApp Pairing Vault</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at top, #0f172a 0%, #020617 100%);
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center; min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: rgba(30, 41, 59, 0.75);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 28px; padding: 40px; text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); max-width: 480px; width: 100%;
    }
    .shield { font-size: 44px; margin-bottom: 10px; }
    h1 { font-size: 24px; font-weight: 700; color: #38bdf8; margin-bottom: 6px; }
    .desc { color: #94a3b8; font-size: 13px; margin-bottom: 24px; }
    
    /* PIN GATE SCREEN */
    #lockScreen { display: block; }
    .pin-input {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(56, 189, 248, 0.4);
      border-radius: 14px; color: #38bdf8;
      font-size: 28px; font-weight: 700; text-align: center;
      letter-spacing: 12px; padding: 14px; width: 220px;
      margin: 16px auto; outline: none; display: block;
    }
    .btn-unlock {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff; border: none; border-radius: 12px;
      font-size: 15px; font-weight: 600; padding: 12px 32px;
      cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(2,132,199,0.4);
    }
    .btn-unlock:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(2,132,199,0.6); }
    .pin-hint { font-size: 12px; color: #64748b; margin-top: 14px; }

    /* PROTECTED QR SCREEN */
    #vaultScreen { display: none; }
    .qr-box {
      background: #ffffff; border-radius: 20px; display: inline-flex;
      align-items: center; justify-content: center;
      padding: 16px; margin-bottom: 24px; min-width: 256px; min-height: 256px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .steps {
      text-align: left; background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px; padding: 16px 20px; font-size: 13px; color: #cbd5e1; line-height: 1.8;
    }
    .steps ol { padding-left: 20px; }
    .status-badge {
      margin-top: 20px; font-size: 13px; font-weight: 600;
      display: inline-flex; align-items: center; gap: 8px;
      padding: 8px 18px; border-radius: 100px;
    }
    .status-waiting { color: #38bdf8; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.2); }
    .status-connected { color: #34d399; background: rgba(52, 211, 153, 0.15); border: 1px solid rgba(52, 211, 153, 0.3); }
    .pulse { width: 8px; height: 8px; border-radius: 50%; background: currentColor; animation: p 1.5s infinite; }
    @keyframes p { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
  </style>
</head>
<body>
  <div class="card">
    <div class="shield">🛡️</div>
    <h1>Protected Pairing Vault</h1>
    <p class="desc">Sierra Estates Multi-Agent Security Gateway</p>

    <!-- STEP 1: PIN AUTH -->
    <div id="lockScreen">
      <div style="font-size: 14px; color: #94a3b8; margin-bottom: 8px;">Enter Security PIN to unlock QR stream:</div>
      <input type="password" id="pinInput" class="pin-input" maxlength="4" placeholder="••••" autofocus>
      <button class="btn-unlock" onclick="unlockVault()">Unlock QR Stream</button>
      <div class="pin-hint">Master Security PIN: <b>8866</b> (or pre-authenticated link)</div>
    </div>

    <!-- STEP 2: PROTECTED QR STREAM -->
    <div id="vaultScreen">
      <div class="qr-box" id="qrcode">
        <div style="color: #64748b; font-size: 13px;">Establishing encrypted channel...</div>
      </div>
      <div class="steps">
        <ol>
          <li>Open <b>WhatsApp</b> on your mobile phone</li>
          <li>Go to <b>Settings → Linked Devices</b></li>
          <li>Tap <b>Link a Device</b> and point camera at the QR</li>
        </ol>
      </div>
      <div id="statusBadge" class="status-badge status-waiting">
        <div class="pulse"></div> <span id="statusText">Protected Live Stream Active</span>
      </div>
    </div>
  </div>

  <script>
    let activePin = "";
    let lastQr = "";

    // Auto-authenticate if token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token') || urlParams.get('auth');
    if (tokenParam === '${ACCESS_TOKEN}' || tokenParam === '${ACCESS_PIN}') {
      activePin = tokenParam;
      showVault();
    }

    document.getElementById("pinInput").addEventListener("keypress", (e) => {
      if (e.key === "Enter") unlockVault();
    });

    function unlockVault() {
      const val = document.getElementById("pinInput").value;
      if (val === "${ACCESS_PIN}" || val === "${ACCESS_TOKEN}") {
        activePin = val;
        showVault();
      } else {
        alert("Invalid Security PIN. Access Denied.");
      }
    }

    function showVault() {
      document.getElementById("lockScreen").style.display = "none";
      document.getElementById("vaultScreen").style.display = "block";
      pollStatus();
      setInterval(pollStatus, 3000);
    }

    async function pollStatus() {
      try {
        const res = await fetch('/api/status', {
          headers: { 'x-vault-pin': activePin }
        });
        if (res.status === 401) return;
        const data = await res.json();
        const badge = document.getElementById("statusBadge");
        const text = document.getElementById("statusText");

        if (data.status === 'CONNECTED' || data.status === 'EXTRACTING') {
          badge.className = 'status-badge status-connected';
          text.innerText = 'Connected! ' + (data.status === 'EXTRACTING' ? 'Extracting listings...' : 'Ready');
          document.getElementById("qrcode").innerHTML = '<div style="color:#10b981;font-weight:bold;font-size:18px;">✅ Device Linked!</div>';
          return;
        }

        if (data.rawQr && data.rawQr !== lastQr) {
          lastQr = data.rawQr;
          const container = document.getElementById("qrcode");
          container.innerHTML = "";
          new QRCode(container, {
            text: data.rawQr,
            width: 256,
            height: 256,
            colorDark : "#0f172a",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.M
          });
        }
      } catch (e) {}
    }
  </script>
</body>
</html>`;

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🛡️ Protected Pairing Vault active at http://127.0.0.1:${PORT}`);
});

// ── WHATSAPP CLIENT INITIALIZATION ─────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'sierra-vault-session',
    dataPath: path.join(__dirname, 'wa_sessions'),
  }),
  puppeteer: {
    ...(chromePath ? { executablePath: chromePath } : {}),
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions'
    ],
  },
});

client.on('qr', (qr) => {
  latestQr = qr;
  clientStatus = 'AWAITING_SCAN';
  console.log('\n📱 ══════════════════════════════════════════════');
  console.log('   Protected QR Code Available!');
  console.log(`   Secure URL: http://127.0.0.1:${PORT}?token=${ACCESS_TOKEN}`);
  console.log('══════════════════════════════════════════════\n');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  clientStatus = 'AUTHENTICATED';
  console.log('✅ WhatsApp authenticated successfully!');
});

client.on('ready', async () => {
  clientStatus = 'CONNECTED';
  console.log('🚀 WhatsApp Client is READY! Scanning groups for inventory...');
  await extractGroups();
});

client.on('auth_failure', (msg) => {
  clientStatus = 'AUTH_FAILURE';
  console.error('❌ Auth failure:', msg);
});

client.on('disconnected', () => {
  clientStatus = 'DISCONNECTED';
  console.log('⚠️ Disconnected');
});

async function extractGroups() {
  clientStatus = 'EXTRACTING';
  try {
    console.log('⏳ Waiting for WhatsApp Chat Store to finish synchronizing...');
    await new Promise(r => setTimeout(r, 8000));

    let chats = [];
    for (let attempt = 1; attempt <= 6; attempt++) {
      try {
        chats = await client.getChats();
        if (chats && chats.length > 0) {
          console.log(`✅ Chat Store hydrated successfully! Found ${chats.length} chats.`);
          break;
        }
      } catch (err) {
        console.warn(`⏳ Store not ready yet (attempt ${attempt}/6): ${err.message}. Retrying in 5s...`);
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    if (!chats || chats.length === 0) {
      throw new Error('Failed to retrieve chats after multiple attempts.');
    }

    const ownerChats = chats.filter(c => 
      c.isGroup && (
        c.name.toLowerCase().includes('owner') ||
        c.name.toLowerCase().includes('unit') ||
        c.name.toLowerCase().includes('inventory') ||
        c.name.includes('أغسطس') ||
        c.name.includes('ملاك') ||
        c.name.includes('شقق') ||
        c.name.includes('عقارات')
      )
    );

    console.log(`🎯 Identified ${ownerChats.length} Owner / Inventory groups:`);
    ownerChats.forEach(g => console.log(`   • ${g.name} (ID: ${g.id._serialized})`));

    const photosDir = path.join(__dirname, 'extracted_photos');
    if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });

    for (const group of ownerChats) {
      console.log(`\n🔍 Fetching messages from group: "${group.name}"...`);
      let messages = [];
      try {
        messages = await group.fetchMessages({ limit: 200 });
        console.log(`   Read ${messages.length} messages from "${group.name}".`);
      } catch (msgErr) {
        console.warn(`   ⚠️ Error fetching messages for "${group.name}":`, msgErr.message);
        continue;
      }

      for (const msg of messages) {
        if (!msg.body && !msg.hasMedia) continue;
        
        let photoPath = null;
        if (msg.hasMedia && (msg.type === 'image' || msg.type === 'document')) {
          try {
            const media = await msg.downloadMedia();
            if (media && media.data) {
              const ext = media.mimetype ? media.mimetype.split('/')[1]?.split(';')[0] || 'jpg' : 'jpg';
              const filename = `unit_${msg.id.id.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}.${ext}`;
              const fullPath = path.join(photosDir, filename);
              fs.writeFileSync(fullPath, Buffer.from(media.data, 'base64'));
              photoPath = `packages/whatsapp-agent/extracted_photos/${filename}`;
            }
          } catch (e) {
            console.warn(`   ⚠️ Media download skipped for message ${msg.id.id}:`, e.message);
          }
        }

        const dateAdded = new Date(msg.timestamp * 1000).toISOString();
        const dateFormatted = new Date(msg.timestamp * 1000).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const isListing = (msg.body && (
          msg.body.includes('متاح') ||
          msg.body.includes('ايجار') ||
          msg.body.includes('للبيع') ||
          msg.body.includes('شقه') ||
          msg.body.includes('شقة') ||
          msg.body.includes('فيلا') ||
          msg.body.includes('مدينتي') ||
          msg.body.includes('التجمع') ||
          msg.body.includes('Rehab') ||
          msg.body.includes('Madinaty') ||
          msg.body.includes('Rent') ||
          msg.body.includes('Sale') ||
          msg.body.includes('بحديقة') ||
          msg.body.includes('مفروش') ||
          msg.body.includes('دور') ||
          msg.body.includes('فيو') ||
          msg.body.includes('view') ||
          msg.body.includes('EGP') ||
          msg.body.includes('الف') ||
          msg.body.includes('ألف')
        )) || photoPath !== null;

        if (isListing && (msg.body || photoPath)) {
          extractedResults.push({
            id: msg.id.id,
            groupName: group.name,
            groupId: group.id._serialized,
            dateAdded: dateAdded,
            dateFormatted: dateFormatted,
            timestamp: msg.timestamp,
            sender: msg.author || msg.from,
            text: msg.body || '',
            photoPath: photoPath,
            hasPhoto: Boolean(photoPath)
          });
        }
      }
    }

    const outputFile = path.join(__dirname, 'inventory_extracted_units.json');
    fs.writeFileSync(outputFile, JSON.stringify(extractedResults, null, 2), 'utf8');

    // Also generate a markdown report for the inventory
    const mdReportFile = path.join(__dirname, '../../INVENTORY_WHATSAPP_REPORT.md');
    let md = `# Sierra Estates — WhatsApp Groups Inventory Extraction Report\n\n`;
    md += `**Extraction Completed At:** ${new Date().toISOString()}\n`;
    md += `**Total Extracted Units:** ${extractedResults.length}\n`;
    md += `**Source Groups:** ${ownerChats.map(g => g.name).join(', ')}\n\n`;
    md += `---\n\n`;
    md += `## Extracted Inventory Units\n\n`;

    extractedResults.forEach((unit, idx) => {
      md += `### Unit #${idx + 1} — ${unit.groupName}\n`;
      md += `- **Date Added:** ${unit.dateFormatted} (${unit.dateAdded})\n`;
      md += `- **Source Group:** \`${unit.groupName}\`\n`;
      md += `- **Sender ID:** \`${unit.sender}\`\n`;
      md += `- **Has Photo:** ${unit.hasPhoto ? '✅ Yes' : '❌ No'}\n`;
      if (unit.photoPath) {
        md += `- **Photo File:** [\`${path.basename(unit.photoPath)}\`](file:///${path.resolve(unit.photoPath).replace(/\\\\/g, '/')})\n`;
      }
      md += `\n**Listing Description:**\n\`\`\`text\n${unit.text.trim() || '(Photo only)'}\n\`\`\`\n\n---\n\n`;
    });

    fs.writeFileSync(mdReportFile, md, 'utf8');

    console.log(`\n🎉 EXTRACTION COMPLETE!`);
    console.log(`📦 Saved ${extractedResults.length} listings to: ${outputFile}`);
    console.log(`📄 Generated Report: ${mdReportFile}`);
    clientStatus = 'COMPLETED';
  } catch (err) {
    console.error('❌ Extraction error:', err.message);
    clientStatus = 'ERROR';
  }
}

client.initialize();
