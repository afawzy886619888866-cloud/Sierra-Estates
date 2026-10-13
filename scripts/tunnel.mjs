import { spawn } from 'node:child_process';
import fs from 'node:fs';

const port = process.env.PORT || process.argv[2] || 3000;

// Resolve cloudflared binary
const candidates = [
  'cloudflared',
  'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
  'C:\\Program Files\\cloudflared\\cloudflared.exe',
];

let binary = null;
for (const cand of candidates) {
  if (cand === 'cloudflared') {
    // Will test if in PATH or use absolute path
    continue;
  }
  if (fs.existsSync(cand)) {
    binary = cand;
    break;
  }
}

if (!binary) {
  binary = 'cloudflared';
}

console.log(`\x1b[36m[Tunnel]\x1b[0m Starting Cloudflare quick tunnel for http://localhost:${port}...`);

const child = spawn(binary, ['tunnel', '--url', `http://localhost:${port}`], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

let foundUrl = false;

function inspectLine(line) {
  // Look for https://*.trycloudflare.com
  const match = line.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  if (match && !foundUrl) {
    foundUrl = true;
    const tunnelUrl = match[0];
    console.log('\n\x1b[32m' + '='.repeat(70) + '\x1b[0m');
    console.log(`\x1b[32m✔ PUBLIC TUNNEL ACTIVE:\x1b[0m \x1b[1m\x1b[33m${tunnelUrl}\x1b[0m`);
    console.log('\x1b[32m' + '='.repeat(70) + '\x1b[0m');
    console.log(`\n\x1b[36mWebhook Endpoints:\x1b[0m`);
    console.log(`  • Telegram Setup:   ${tunnelUrl}/api/telegram/setup?url=${tunnelUrl}`);
    console.log(`  • Telegram Webhook: ${tunnelUrl}/api/telegram/webhook`);
    console.log(`  • WhatsApp Inbound: ${tunnelUrl}/api/webhooks/whatsapp`);
    console.log(`  • Twilio Inbound:   ${tunnelUrl}/api/webhooks/twilio-inbound`);
    console.log(`  • Property Finder:  ${tunnelUrl}/api/webhooks/property-finder`);
    console.log('\x1b[90m' + '-'.repeat(70) + '\x1b[0m\n');
  }
}

child.stdout.on('data', (d) => {
  const str = d.toString();
  str.split('\n').forEach(inspectLine);
});

child.stderr.on('data', (d) => {
  const str = d.toString();
  str.split('\n').forEach(inspectLine);
});

child.on('close', (code) => {
  console.log(`\x1b[31m[Tunnel]\x1b[0m Tunnel exited with code ${code}`);
});

process.on('SIGINT', () => {
  child.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  child.kill();
  process.exit(0);
});
