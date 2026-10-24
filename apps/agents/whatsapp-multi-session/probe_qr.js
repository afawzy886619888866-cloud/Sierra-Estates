const waAutomate = require('@open-wa/wa-automate');
const QRCode = require('qrcode');
const fs = require('fs');

const baseSink = waAutomate.createConsoleOutputSink();
waAutomate.setCliOutputSink({
  ...baseSink,
  status: (s) => console.log('[STATUS]', JSON.stringify(s)),
  write: (w) => console.log('[WRITE]', w.level, w.message),
  qr: async (payload) => {
    console.log('[QR RECEIVED!]', payload.sessionId, payload.qr.slice(0, 40) + '...');
    const buf = await QRCode.toBuffer(payload.qr, { scale: 6, margin: 2 });
    fs.writeFileSync('C:\\Users\\Sierr\\.gemini\\antigravity\\brain\\09c69f86-7eb2-4d7e-be4f-96d584a3b175\\qr_test.png', buf);
    console.log('Saved qr_test.png! Exiting test.');
    process.exit(0);
  }
});

waAutomate.create({
  sessionId: 'probe-1',
  multiDevice: true,
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  logConsole: false
}).catch(err => {
  console.error('[CREATE ERROR]:', err);
  process.exit(1);
});
