const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3099;
const HTML_FILE = path.join(__dirname, 'login.html');
const LOG_FILE = path.join('C:\\Users\\sierr\\.gemini\\antigravity-ide\\brain\\82c05b8d-a840-425c-8cb0-c6c3242f2e73\\.system_generated\\tasks\\task-381.log');

const server = http.createServer((req, res) => {
  if (req.url === '/api/qr') {
    let rawQr = '';
    try {
      if (fs.existsSync(LOG_FILE)) {
        const content = fs.readFileSync(LOG_FILE, 'utf8');
        const matches = [...content.matchAll(/RAW_QR:([^\r\n]+)/g)];
        if (matches.length > 0) {
          rawQr = matches[matches.length - 1][1].trim();
        }
      }
    } catch (e) {}
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ rawQr }));
  }

  // Serve login.html
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sierra Estates - WhatsApp QR Pairing</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at top, #0f172a 0%, #020617 100%);
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center; min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px; padding: 36px; text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); max-width: 440px; width: 100%;
    }
    .shield { font-size: 38px; margin-bottom: 8px; }
    h1 { font-size: 22px; font-weight: 700; color: #38bdf8; margin-bottom: 6px; }
    .desc { color: #94a3b8; font-size: 13px; margin-bottom: 20px; }
    .qr-box {
      background: #ffffff; border-radius: 16px; display: inline-flex;
      align-items: center; justify-content: center;
      padding: 16px; margin-bottom: 20px; min-width: 256px; min-height: 256px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    }
    .steps {
      text-align: left; background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 12px; padding: 14px 18px; font-size: 13px; color: #cbd5e1; line-height: 1.7;
    }
    .steps ol { padding-left: 20px; }
    .status {
      margin-top: 16px; font-size: 12px; color: #34d399; display: flex; align-items: center; justify-content: center; gap: 6px;
    }
    .pulse { width: 8px; height: 8px; border-radius: 50%; background: #34d399; animation: p 1.5s infinite; }
    @keyframes p { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
  </style>
</head>
<body>
  <div class="card">
    <div class="shield">📱</div>
    <h1>WhatsApp Pairing Gateway</h1>
    <p class="desc">Sierra Estates Multi-Agent Vault</p>
    <div class="qr-box" id="qrcode"></div>
    <div class="steps">
      <ol>
        <li>Open <b>WhatsApp</b> on your phone</li>
        <li>Go to <b>Settings → Linked Devices</b></li>
        <li>Tap <b>Link a Device</b> and point camera at the QR</li>
      </ol>
    </div>
    <div class="status"><div class="pulse"></div> Live Auto-Refreshing QR Stream</div>
  </div>
  <script>
    let qrcode = null;
    let lastQr = "";
    async function updateQR() {
      try {
        const res = await fetch('/api/qr');
        const data = await res.json();
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
    updateQR();
    setInterval(updateQR, 4000);
  </script>
</body>
</html>`;
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`QR Web Server running at http://127.0.0.1:${PORT}`);
});
