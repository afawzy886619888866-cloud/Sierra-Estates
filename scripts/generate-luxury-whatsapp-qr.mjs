import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import sharp from 'sharp';

const WA_NUMBER = '201092048333';
const WA_URL = `https://wa.me/${WA_NUMBER}?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D8%B3%D9%8A%D9%8A%D8%B1%D8%A7%20%D8%A5%D9%8A%D8%B3%D8%AA%D9%8A%D8%AA%D8%B3%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1%20%D8%B9%D9%86%20%D8%A7%D9%84%D8%B9%D9%82%D8%A7%D8%B1%D8%A7%D8%AA%20%D8%A7%D9%84%D9%85%D8%AA%D8%A7%D8%AD%D8%A9`;

const ROOT = process.cwd();
const ASSETS_DIR = path.join(ROOT, 'apps/sierra-estates-realty/public/assets');
const SHIELD_LOGO = path.join(ASSETS_DIR, 'logo-shield.png');
const QR_OUT = path.join(ASSETS_DIR, 'whatsapp-business-qr.png');
const CARD_OUT = path.join(ASSETS_DIR, 'sierra-whatsapp-business-card.png');

async function main() {
  console.log('Generating Luxury Sierra Estates WhatsApp Business Assets...');

  // 1. Generate high-resolution QR with Error Correction Level H (30%)
  const qrBuffer = await QRCode.toBuffer(WA_URL, {
    errorCorrectionLevel: 'H',
    type: 'png',
    margin: 3,
    width: 1024,
    color: {
      dark: '#061122', // Deep Obsidian Navy
      light: '#FAF8F5', // Warm Luxury Pearl Alabaster
    },
  });

  // 2. Prepare center emblem
  const emblemSize = 220;
  const emblemBorder = 240;

  // Create rounded shield center badge
  const shieldResized = await sharp(SHIELD_LOGO)
    .resize(emblemSize, emblemSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const centerBadgeSvg = Buffer.from(`
    <svg width="${emblemBorder}" height="${emblemBorder}" viewBox="0 0 ${emblemBorder} ${emblemBorder}" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="${emblemBorder - 4}" height="${emblemBorder - 4}" rx="28" fill="#FAF8F5" stroke="#D4AF37" stroke-width="4" />
    </svg>
  `);

  const centerEmblemComposite = await sharp(centerBadgeSvg)
    .composite([
      {
        input: shieldResized,
        gravity: 'center',
      },
    ])
    .png()
    .toBuffer();

  // Composite center emblem onto the QR code
  const finalQrBuffer = await sharp(qrBuffer)
    .composite([
      {
        input: centerEmblemComposite,
        gravity: 'center',
      },
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(QR_OUT, finalQrBuffer);
  console.log(`✅ Luxury QR Code generated at ${QR_OUT}`);

  // 3. Build Full Luxury VIP Digital Card (1200 x 1680)
  const cardWidth = 1200;
  const cardHeight = 1680;

  const qrInCardSize = 640;
  const qrInCard = await sharp(finalQrBuffer)
    .resize(qrInCardSize, qrInCardSize)
    .toBuffer();

  const shieldForCard = await sharp(SHIELD_LOGO)
    .resize(220, 220, { fit: 'contain' })
    .toBuffer();

  const cardSvgBackground = Buffer.from(`
    <svg width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#050C16" />
          <stop offset="50%" stop-color="#081426" />
          <stop offset="100%" stop-color="#040912" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F3E7C4" />
          <stop offset="50%" stop-color="#D4AF37" />
          <stop offset="100%" stop-color="#AA820A" />
        </linearGradient>
        <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <!-- Background -->
      <rect width="${cardWidth}" height="${cardHeight}" rx="48" fill="url(#cardGrad)" />

      <!-- Outer Gold Border -->
      <rect x="24" y="24" width="${cardWidth - 48}" height="${cardHeight - 48}" rx="36" fill="none" stroke="url(#goldGrad)" stroke-width="2.5" opacity="0.8" />
      <rect x="36" y="36" width="${cardWidth - 72}" height="${cardHeight - 72}" rx="28" fill="none" stroke="#D4AF37" stroke-width="1" opacity="0.3" stroke-dasharray="8 6" />

      <!-- Header Typography -->
      <text x="600" y="360" font-family="'Cinzel', 'Playfair Display', 'Times New Roman', serif" font-size="52" font-weight="800" fill="url(#goldGrad)" text-anchor="middle" letter-spacing="6">SIERRA ESTATES</text>
      <text x="600" y="415" font-family="'Inter', sans-serif" font-size="20" font-weight="600" fill="#E2E8F0" text-anchor="middle" letter-spacing="8">FUTURE OF REAL ESTATE</text>

      <!-- Subtitle badge -->
      <rect x="380" y="455" width="440" height="42" rx="21" fill="rgba(212, 175, 55, 0.12)" stroke="url(#goldGrad)" stroke-width="1" />
      <text x="600" y="483" font-family="'Inter', sans-serif" font-size="16" font-weight="700" fill="#F8FAFC" text-anchor="middle" letter-spacing="2">OFFICIAL WHATSAPP BUSINESS</text>

      <!-- QR Card Plinth -->
      <rect x="235" y="540" width="730" height="730" rx="36" fill="#FAF8F5" stroke="url(#goldGrad)" stroke-width="6" />

      <!-- Verification & Contact details -->
      <text x="600" y="1340" font-family="'Inter', sans-serif" font-size="28" font-weight="700" fill="#F8FAFC" text-anchor="middle" letter-spacing="1">Direct VIP Concierge &amp; Inquiries</text>
      <text x="600" y="1395" font-family="'Inter', sans-serif" font-size="36" font-weight="800" fill="url(#goldGrad)" text-anchor="middle" letter-spacing="2">+20 109 204 8333</text>

      <text x="600" y="1455" font-family="'Cairo', 'Inter', sans-serif" font-size="22" font-weight="500" fill="#94A3B8" text-anchor="middle">امسح الرمز للتواصل المباشر مع مستشارك العقاري المعتمد</text>
      <text x="600" y="1495" font-family="'Inter', sans-serif" font-size="18" font-weight="500" fill="#64748B" text-anchor="middle">New Cairo · Administrative Capital · Golden Square · Direct Developer &amp; Resale</text>
      <text x="600" y="1575" font-family="'Inter', sans-serif" font-size="15" font-weight="500" fill="#475569" text-anchor="middle">https://sierraestates.net · Powered by Sierra 4-Engine Machine</text>
    </svg>
  `);

  const finalCardBuffer = await sharp(cardSvgBackground)
    .composite([
      {
        input: shieldForCard,
        top: 80,
        left: 490,
      },
      {
        input: qrInCard,
        top: 585,
        left: 280,
      },
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(CARD_OUT, finalCardBuffer);
  console.log(`✅ Luxury Digital Business Card generated at ${CARD_OUT}`);
}

main().catch(console.error);
