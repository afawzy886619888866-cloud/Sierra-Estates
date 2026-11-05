const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const QRCode = require('qrcode');

const root = path.resolve(__dirname, '../apps/sierra-estates-realty/public/assets');
const waUrl = 'https://wa.me/201092048333?text=Hello%20Sierra%20Estates';

async function generate() {
  console.log('Generating QR code buffer...');
  // 1. Generate base QR code as PNG buffer with Error Correction Level H (30%)
  const qrBuffer = await QRCode.toBuffer(waUrl, {
    errorCorrectionLevel: 'H',
    type: 'png',
    margin: 3,
    scale: 14,
    color: {
      dark: '#071523', // Deep Obsidian Navy
      light: '#FAF8F5' // Royal Alabaster
    }
  });

  const qrMeta = await sharp(qrBuffer).metadata();
  const qrSize = qrMeta.width;
  console.log('Base QR size:', qrSize);

  // 2. Load shield emblem and resize for center
  // Center emblem size is ~22% of QR size (within safe 30% H-level margin)
  const emblemSize = Math.round(qrSize * 0.22);
  const shieldPath = path.join(root, 'logo-shield.png');

  // Create circular gold backdrop for emblem
  const circleSvg = Buffer.from(`
    <svg width="${emblemSize}" height="${emblemSize}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${emblemSize / 2}" cy="${emblemSize / 2}" r="${emblemSize / 2 - 2}" fill="#FAF8F5" stroke="#C9A84C" stroke-width="4" />
    </svg>
  `);

  const emblemInnerSize = Math.round(emblemSize * 0.78);
  const emblemInner = await sharp(shieldPath)
    .resize(emblemInnerSize, emblemInnerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const centerBadge = await sharp(circleSvg)
    .composite([{
      input: emblemInner,
      left: Math.round((emblemSize - emblemInnerSize) / 2),
      top: Math.round((emblemSize - emblemInnerSize) / 2)
    }])
    .png()
    .toBuffer();

  // Composite center badge onto QR code
  await sharp(qrBuffer)
    .composite([{
      input: centerBadge,
      left: Math.round((qrSize - emblemSize) / 2),
      top: Math.round((qrSize - emblemSize) / 2)
    }])
    .png()
    .toFile(path.join(root, 'whatsapp-business-qr.png'));

  console.log('Saved whatsapp-business-qr.png (' + qrSize + ' x ' + qrSize + ')');

  // 3. Create the Luxury Presentation Card (800 x 1040)
  const cardW = 800;
  const cardH = 1040;
  const cardQrSize = 460;

  const resizedQr = await sharp(path.join(root, 'whatsapp-business-qr.png'))
    .resize(cardQrSize, cardQrSize)
    .toBuffer();

  const cardSvg = Buffer.from(`
    <svg width="${cardW}" height="${cardH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#060B13" />
          <stop offset="50%" stop-color="#0A1628" />
          <stop offset="100%" stop-color="#04080F" />
        </linearGradient>
        <linearGradient id="goldLine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="rgba(201,168,76,0.1)" />
          <stop offset="50%" stop-color="#C9A84C" />
          <stop offset="100%" stop-color="rgba(201,168,76,0.1)" />
        </linearGradient>
      </defs>
      
      <!-- Card background with gold border -->
      <rect x="4" y="4" width="${cardW - 8}" height="${cardH - 8}" rx="28" fill="url(#cardBg)" stroke="#C9A84C" stroke-width="2" />
      <rect x="16" y="16" width="${cardW - 32}" height="${cardH - 32}" rx="20" fill="none" stroke="rgba(201,168,76,0.25)" stroke-width="1" stroke-dasharray="6 4" />

      <!-- Gold header line -->
      <line x1="80" y1="200" x2="${cardW - 80}" y2="200" stroke="url(#goldLine)" stroke-width="1.5" />

      <!-- Text Elements -->
      <text x="${cardW / 2}" y="135" text-anchor="middle" fill="#FFFFFF" font-family="Georgia, serif" font-size="28" font-weight="bold" letter-spacing="4">SIERRA ESTATES</text>
      <text x="${cardW / 2}" y="166" text-anchor="middle" fill="#C9A84C" font-family="system-ui, sans-serif" font-size="13" font-weight="600" letter-spacing="3">OFFICIAL WHATSAPP BUSINESS PLATFORM</text>
      <text x="${cardW / 2}" y="188" text-anchor="middle" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="12">Verified Direct Line · 24/7 AI-Assisted Concierge</text>

      <!-- QR Code Outer Frame with glow -->
      <rect x="${(cardW - cardQrSize - 28) / 2}" y="236" width="${cardQrSize + 28}" height="${cardQrSize + 28}" rx="20" fill="#FAF8F5" stroke="#C9A84C" stroke-width="3" />

      <!-- Footer Elements -->
      <line x1="80" y1="760" x2="${cardW - 80}" y2="760" stroke="url(#goldLine)" stroke-width="1.5" />
      
      <!-- Phone Badge -->
      <rect x="${(cardW - 360) / 2}" y="790" width="360" height="52" rx="26" fill="rgba(16, 185, 129, 0.15)" stroke="#10B981" stroke-width="1.5" />
      <text x="${cardW / 2}" y="824" text-anchor="middle" fill="#10B981" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" letter-spacing="1">+20 109 204 8333</text>

      <text x="${cardW / 2}" y="885" text-anchor="middle" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="16" font-weight="600">Scan with camera to start instant conversation</text>
      <text x="${cardW / 2}" y="915" text-anchor="middle" fill="#64748B" font-family="system-ui, sans-serif" font-size="13">امسح الرمز بكاميرا الهاتف لبدء المحادثة الفورية مع المستشار العقاري</text>

      <text x="${cardW / 2}" y="985" text-anchor="middle" fill="#C9A84C" font-family="system-ui, sans-serif" font-size="11" letter-spacing="2">CAIRO FESTIVAL CITY · HYDE PARK · MIVIDA · NEW CAPITAL</text>
    </svg>
  `);

  const topShield = await sharp(shieldPath)
    .resize(60, 60, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp(cardSvg)
    .composite([
      {
        input: topShield,
        left: Math.round((cardW - 60) / 2),
        top: 38
      },
      {
        input: resizedQr,
        left: Math.round((cardW - cardQrSize) / 2),
        top: 250
      }
    ])
    .png()
    .toFile(path.join(root, 'sierra-whatsapp-business-card.png'));

  console.log('Saved sierra-whatsapp-business-card.png (' + cardW + ' x ' + cardH + ')');
}

generate().catch(console.error);
