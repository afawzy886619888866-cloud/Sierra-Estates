const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SITE_PHOTOS = path.join(ROOT, 'apps/sierra-estates-realty/public/cairo-plaza/site-photos');
const SOCIAL_DIR = path.join(ROOT, 'apps/sierra-estates-realty/public/cairo-plaza/social');
const ADS_DIR = path.join(ROOT, 'apps/sierra-estates-realty/public/cairo-plaza/ads');

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Helper to polish real photos (brighten, enrich color, sharpen)
async function polishRealPhoto(inputPath, width, height, position = 'center') {
  return await sharp(inputPath)
    .resize(width, height, { fit: 'cover', position })
    .modulate({
      brightness: 1.15,
      saturation: 1.12,
    })
    .linear(1.06, -6) // boost contrast slightly
    .sharpen({ sigma: 1.1 })
    .toBuffer();
}

// Helper to make circular photo badge with gold rings
async function makeCircularInset(inputPath, size) {
  const radius = Math.floor(size / 2);
  const innerRadius = radius - 6;

  const polished = await sharp(inputPath)
    .resize(size, size, { fit: 'cover', position: 'center' })
    .modulate({ brightness: 1.12, saturation: 1.1 })
    .sharpen({ sigma: 1.0 })
    .toBuffer();

  const circleMask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${radius}" cy="${radius}" r="${innerRadius}" fill="#fff"/></svg>`
  );

  const croppedPhoto = await sharp(polished)
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const goldRingSvg = Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#BF8A1A"/>
          <stop offset="30%" stop-color="#FFEBB3"/>
          <stop offset="60%" stop-color="#D49B24"/>
          <stop offset="85%" stop-color="#FFF5D6"/>
          <stop offset="100%" stop-color="#996500"/>
        </linearGradient>
      </defs>
      <circle cx="${radius}" cy="${radius}" r="${radius - 3}" fill="none" stroke="url(#gold)" stroke-width="6"/>
      <circle cx="${radius}" cy="${radius}" r="${radius - 6}" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.8"/>
      <circle cx="${radius}" cy="${radius}" r="${radius - 7.5}" fill="none" stroke="#8C5C00" stroke-width="1"/>
    </svg>
  `);

  return await sharp(croppedPhoto)
    .composite([{ input: goldRingSvg, blend: 'over' }])
    .png()
    .toBuffer();
}

// Generate the Danube-Style SVG Overlay for 1080x1080 Square Banner
function buildSquareSvgOverlay(rawConfig) {
  const scriptWord = escapeXml(rawConfig.scriptWord);
  const mainTitle = escapeXml(rawConfig.mainTitle);
  const dealType = escapeXml(rawConfig.dealType);
  const locationCapsule = escapeXml(rawConfig.locationCapsule);
  const topBadgeText = escapeXml(rawConfig.topBadgeText);
  const topBadgeSub = escapeXml(rawConfig.topBadgeSub);
  const priceLabel = escapeXml(rawConfig.priceLabel);
  const priceValue = escapeXml(rawConfig.priceValue);
  const pricePill = escapeXml(rawConfig.pricePill);
  const bottomNoteAr = escapeXml(rawConfig.bottomNoteAr);

  const badges = rawConfig.badges.map((b) => ({
    icon: b.icon,
    category: escapeXml(b.category),
    label: escapeXml(b.label),
  }));

  const badgesSvg = badges
    .map((b, idx) => {
      const y = idx * 95;
      return `
      <g transform="translate(0, ${y})">
        <circle cx="34" cy="34" r="33" fill="#071422" stroke="url(#goldGrad)" stroke-width="3.5"/>
        <circle cx="34" cy="34" r="28" fill="none" stroke="#FFEAB0" stroke-width="1.2" stroke-opacity="0.7"/>
        <text x="34" y="42" text-anchor="middle" font-family="'Segoe UI Symbol', Arial" font-size="22" fill="url(#goldGrad)">${b.icon}</text>
        <text x="82" y="28" font-family="'Segoe UI', Arial, sans-serif" font-size="12" font-weight="700" fill="#D4A234" letter-spacing="1.5">${b.category}</text>
        <text x="82" y="48" font-family="'Segoe UI Black', Arial, sans-serif" font-size="16" font-weight="900" fill="#FFFFFF" letter-spacing="0.5">${b.label}</text>
      </g>
    `;
    })
    .join('');

  return Buffer.from(`
  <svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#B8861B"/>
        <stop offset="25%" stop-color="#FFEAA7"/>
        <stop offset="50%" stop-color="#DDA126"/>
        <stop offset="75%" stop-color="#FFF2CE"/>
        <stop offset="100%" stop-color="#9E6800"/>
      </linearGradient>

      <linearGradient id="navyDark" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#050C17" stop-opacity="0.98"/>
        <stop offset="60%" stop-color="#0A182E" stop-opacity="0.96"/>
        <stop offset="100%" stop-color="#040912" stop-opacity="0.94"/>
      </linearGradient>
    </defs>

    <!-- Sweeping Frame (Midnight Navy) -->
    <path d="M 0,0 L 760,0 C 660,110 520,180 430,280 C 330,390 280,560 300,780 C 315,920 370,1030 420,1080 L 0,1080 Z"
          fill="url(#navyDark)"/>

    <!-- Dual Gold Trim Beziers -->
    <path d="M 760,0 C 660,110 520,180 430,280 C 330,390 280,560 300,780 C 315,920 370,1030 420,1080"
          fill="none" stroke="url(#goldGrad)" stroke-width="7" stroke-linecap="round"/>
    <path d="M 772,0 C 672,110 532,180 442,280 C 342,390 292,560 312,780 C 327,920 382,1030 432,1080"
          fill="none" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="1.8"/>

    <!-- Top & Bottom Soft Vignette -->
    <rect x="0" y="0" width="1080" height="90" fill="#000000" opacity="0.3"/>
    <rect x="0" y="960" width="1080" height="120" fill="#000000" opacity="0.5"/>

    <!-- Brand Header -->
    <g transform="translate(60, 52)">
      <circle cx="16" cy="16" r="16" fill="url(#goldGrad)"/>
      <polygon points="16,6 23,23 9,23" fill="#071422"/>
      <text x="44" y="22" font-family="'Segoe UI', Arial, sans-serif" font-size="16" font-weight="800" letter-spacing="3" fill="#FFFFFF">SIERRA ESTATES</text>
      <text x="235" y="22" font-family="'Segoe UI', Arial, sans-serif" font-size="12" font-weight="600" letter-spacing="1" fill="#D4A234">| REAL SITE EVIDENCE</text>
    </g>

    <!-- Headline Typography -->
    <g transform="translate(60, 140)">
      <text x="0" y="0" font-family="'Brush Script MT', 'Palatino Linotype', 'Georgia', serif" font-style="italic" font-size="48" fill="url(#goldGrad)">
        ${scriptWord}
      </text>

      <text x="0" y="65" font-family="'Segoe UI Black', Arial Black, Impact, sans-serif" font-size="64" font-weight="900" fill="#FFFFFF" letter-spacing="1">
        ${mainTitle}
      </text>

      <text x="0" y="125" font-family="'Segoe UI Black', Arial Black, Impact, sans-serif" font-size="52" font-weight="900" fill="url(#goldGrad)" letter-spacing="2">
        ${dealType}
      </text>

      <g transform="translate(0, 150)">
        <circle cx="12" cy="12" r="12" fill="#D4A234"/>
        <circle cx="12" cy="12" r="4" fill="#071422"/>
        <text x="32" y="18" font-family="'Segoe UI', Arial, sans-serif" font-size="20" font-weight="800" fill="#FFFFFF" letter-spacing="1.5">CAIRO PLAZA</text>

        <g transform="translate(0, 32)">
          <rect width="320" height="38" rx="19" fill="#081525" stroke="url(#goldGrad)" stroke-width="2.5"/>
          <text x="160" y="25" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="14" font-weight="800" fill="#FFEAB0" letter-spacing="1.2">
            ${locationCapsule}
          </text>
        </g>
      </g>
    </g>

    <!-- 4 Left Badges -->
    <g transform="translate(60, 400)">
      ${badgesSvg}
    </g>

    <!-- Top Right Circular Badge -->
    <g transform="translate(860, 85)">
      <circle cx="80" cy="80" r="76" fill="#071422" stroke="url(#goldGrad)" stroke-width="6"/>
      <circle cx="80" cy="80" r="68" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.8"/>
      <circle cx="80" cy="80" r="66" fill="#0A1C33"/>

      <polygon points="80,34 104,54 56,54" fill="url(#goldGrad)"/>
      <rect x="63" y="54" width="34" height="26" fill="url(#goldGrad)"/>
      <rect x="74" y="64" width="12" height="16" fill="#0A1C33"/>

      <text x="80" y="105" text-anchor="middle" font-family="'Segoe UI Black', Arial, sans-serif" font-size="15" font-weight="900" fill="#FFFFFF" letter-spacing="1">
        ${topBadgeText}
      </text>
      <text x="80" y="125" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="13" font-weight="800" fill="url(#goldGrad)" letter-spacing="0.5">
        ${topBadgeSub}
      </text>
    </g>

    <!-- Real Site Verification Badge -->
    <g transform="translate(730, 260)">
      <rect width="290" height="38" rx="19" fill="#071422" fill-opacity="0.9" stroke="url(#goldGrad)" stroke-width="2"/>
      <circle cx="20" cy="19" r="6" fill="#00E676"/>
      <text x="36" y="25" font-family="'Segoe UI', Arial, sans-serif" font-size="13" font-weight="800" fill="#FFFFFF" letter-spacing="1">100% REAL SITE PHOTO</text>
      <text x="210" y="25" font-family="'Segoe UI', Arial, sans-serif" font-size="12" font-weight="700" fill="#FFEAB0">· تصوير حقيقي</text>
    </g>

    <!-- Bottom Right Price / Terms Card -->
    <g transform="translate(620, 830)">
      <rect width="400" height="190" rx="30" fill="#050E1A" stroke="url(#goldGrad)" stroke-width="5"/>
      <rect x="8" y="8" width="384" height="174" rx="22" fill="none" stroke="#FFFFFF" stroke-width="1.2" stroke-opacity="0.4"/>

      <text x="200" y="44" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="15" font-weight="800" fill="url(#goldGrad)" letter-spacing="2">
        ${priceLabel}
      </text>

      <text x="200" y="105" text-anchor="middle" font-family="'Segoe UI Black', Arial Black, sans-serif" font-size="44" font-weight="900" fill="#FFFFFF" letter-spacing="1">
        ${priceValue}
      </text>

      <g transform="translate(30, 126)">
        <rect width="340" height="42" rx="21" fill="url(#goldGrad)"/>
        <text x="170" y="27" text-anchor="middle" font-family="'Segoe UI Black', Arial, sans-serif" font-size="16" font-weight="900" fill="#071422" letter-spacing="1">
          ${pricePill}
        </text>
      </g>
    </g>

    <!-- Bottom Strip -->
    <g transform="translate(60, 1045)">
      <text x="0" y="0" font-family="'Segoe UI', Arial, sans-serif" font-size="14" font-weight="800" fill="#FFEAB0" letter-spacing="1">
        📞 01092048333 · SIERRA-ESTATES.NET
      </text>
      <text x="480" y="0" font-family="'Segoe UI', Tahoma, Arial, sans-serif" font-size="14" font-weight="800" fill="#D4A234">
        ${bottomNoteAr}
      </text>
    </g>
  </svg>
  `);
}

// Build 1 Banner using a Real Background Photo and 3 Real Circular Insets
async function generateRealBanner(options) {
  const { heroPhotoPath, heroPosition = 'center', insetPhotos, overlayConfig, outputName } = options;

  console.log(`Generating real banner: ${outputName}...`);

  // 1. Polish real background photo
  const polishedHero = await polishRealPhoto(heroPhotoPath, 1080, 1080, heroPosition);

  // 2. Build 3 circular insets from REAL photos
  const inset1 = await makeCircularInset(insetPhotos[0], 170);
  const inset2 = await makeCircularInset(insetPhotos[1], 170);
  const inset3 = await makeCircularInset(insetPhotos[2], 170);

  // 3. Generate SVG graphics overlay
  const svgOverlay = buildSquareSvgOverlay(overlayConfig);

  // 4. Composite everything together
  const compositeLayers = [
    { input: svgOverlay, top: 0, left: 0 },
    { input: inset1, top: 820, left: 60 },
    { input: inset2, top: 820, left: 240 },
    { input: inset3, top: 820, left: 420 },
  ];

  const finalBuffer = await sharp(polishedHero)
    .composite(compositeLayers)
    .jpeg({ quality: 96, chromaSubsampling: '4:4:4' })
    .toBuffer();

  const socialOut = path.join(SOCIAL_DIR, outputName);
  const adsOut = path.join(ADS_DIR, outputName);

  fs.writeFileSync(socialOut, finalBuffer);
  fs.writeFileSync(adsOut, finalBuffer);

  console.log(`✓ Saved ${outputName} (${Math.round(finalBuffer.length / 1024)} KB)`);
  return socialOut;
}

// Generate Landscape 1200x630 Banner using Real Photo
async function generateLandscapeRealBanner(options) {
  const { heroPhotoPath, insetPhotos, overlayConfig, outputName } = options;

  console.log(`Generating landscape real banner: ${outputName}...`);
  const width = 1200;
  const height = 630;

  const polishedHero = await polishRealPhoto(heroPhotoPath, width, height, 'center');

  const inset1 = await makeCircularInset(insetPhotos[0], 130);
  const inset2 = await makeCircularInset(insetPhotos[1], 130);
  const inset3 = await makeCircularInset(insetPhotos[2], 130);

  const scriptWord = escapeXml(overlayConfig.scriptWord);
  const mainTitle = escapeXml(overlayConfig.mainTitle);
  const dealType = escapeXml(overlayConfig.dealType);
  const locationCapsule = escapeXml(overlayConfig.locationCapsule);
  const topBadgeText = escapeXml(overlayConfig.topBadgeText);
  const topBadgeSub = escapeXml(overlayConfig.topBadgeSub);
  const priceLabel = escapeXml(overlayConfig.priceLabel);
  const priceValue = escapeXml(overlayConfig.priceValue);
  const pricePill = escapeXml(overlayConfig.pricePill);

  const badges = overlayConfig.badges.slice(0, 3).map((b) => ({
    icon: b.icon,
    category: escapeXml(b.category),
    label: escapeXml(b.label),
  }));

  const badgesRow = badges
    .map((b, i) => {
      const x = i * 140;
      return `
      <g transform="translate(${x}, 0)">
        <circle cx="20" cy="20" r="20" fill="#071422" stroke="url(#goldGrad)" stroke-width="2.5"/>
        <text x="20" y="26" text-anchor="middle" font-family="'Segoe UI Symbol', Arial" font-size="14" fill="url(#goldGrad)">${b.icon}</text>
        <text x="48" y="16" font-family="'Segoe UI', Arial" font-size="10" font-weight="700" fill="#D4A234">${b.category}</text>
        <text x="48" y="30" font-family="'Segoe UI Black', Arial" font-size="12" font-weight="900" fill="#FFFFFF">${b.label}</text>
      </g>
    `;
    })
    .join('');

  const svg = Buffer.from(`
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#B8861B"/>
        <stop offset="25%" stop-color="#FFEAA7"/>
        <stop offset="50%" stop-color="#DDA126"/>
        <stop offset="75%" stop-color="#FFF2CE"/>
        <stop offset="100%" stop-color="#9E6800"/>
      </linearGradient>
      <linearGradient id="navyDark" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#050C17" stop-opacity="0.97"/>
        <stop offset="60%" stop-color="#0A182E" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#040912" stop-opacity="0.92"/>
      </linearGradient>
    </defs>

    <!-- Left Curved Frame -->
    <path d="M 0,0 L 580,0 C 500,160 420,380 480,630 L 0,630 Z" fill="url(#navyDark)"/>
    <path d="M 580,0 C 500,160 420,380 480,630" fill="none" stroke="url(#goldGrad)" stroke-width="6"/>

    <!-- Brand -->
    <g transform="translate(45, 35)">
      <circle cx="12" cy="12" r="12" fill="url(#goldGrad)"/>
      <text x="32" y="17" font-family="'Segoe UI', Arial" font-size="14" font-weight="900" letter-spacing="2" fill="#FFFFFF">SIERRA ESTATES</text>
      <text x="180" y="17" font-family="'Segoe UI', Arial" font-size="12" font-weight="700" fill="#D4A234">| REAL SITE BANNER</text>
    </g>

    <!-- Headline -->
    <g transform="translate(45, 95)">
      <text x="0" y="0" font-family="'Georgia', serif" font-style="italic" font-size="34" fill="url(#goldGrad)">${scriptWord}</text>
      <text x="0" y="46" font-family="'Segoe UI Black', Arial Black, sans-serif" font-size="44" font-weight="900" fill="#FFFFFF">${mainTitle}</text>
      <text x="0" y="90" font-family="'Segoe UI Black', Arial Black, sans-serif" font-size="34" font-weight="900" fill="url(#goldGrad)">${dealType}</text>

      <g transform="translate(0, 115)">
        <rect width="280" height="30" rx="15" fill="#081525" stroke="url(#goldGrad)" stroke-width="1.8"/>
        <text x="140" y="20" text-anchor="middle" font-family="'Segoe UI', Arial" font-size="12" font-weight="800" fill="#FFEAB0">
          ${locationCapsule}
        </text>
      </g>
    </g>

    <!-- Badges Row -->
    <g transform="translate(45, 290)">
      ${badgesRow}
    </g>

    <!-- Top Right Badge -->
    <g transform="translate(1040, 45)">
      <circle cx="55" cy="55" r="52" fill="#071422" stroke="url(#goldGrad)" stroke-width="4.5"/>
      <text x="55" y="52" text-anchor="middle" font-family="'Segoe UI Black', Arial" font-size="12" font-weight="900" fill="#FFFFFF">${topBadgeText}</text>
      <text x="55" y="70" text-anchor="middle" font-family="'Segoe UI', Arial" font-size="10" font-weight="800" fill="url(#goldGrad)">${topBadgeSub}</text>
    </g>

    <!-- Real Site Stamp -->
    <g transform="translate(860, 240)">
      <rect width="260" height="32" rx="16" fill="#071422" fill-opacity="0.9" stroke="url(#goldGrad)" stroke-width="1.8"/>
      <circle cx="16" cy="16" r="5" fill="#00E676"/>
      <text x="28" y="21" font-family="'Segoe UI', Arial" font-size="11" font-weight="800" fill="#FFFFFF">100% REAL SITE PHOTO</text>
    </g>

    <!-- Bottom Right Price Card -->
    <g transform="translate(850, 470)">
      <rect width="310" height="130" rx="20" fill="#050E1A" stroke="url(#goldGrad)" stroke-width="3.5"/>
      <text x="155" y="32" text-anchor="middle" font-family="'Segoe UI', Arial" font-size="12" font-weight="800" fill="url(#goldGrad)">${priceLabel}</text>
      <text x="155" y="72" text-anchor="middle" font-family="'Segoe UI Black', Arial" font-size="30" font-weight="900" fill="#FFFFFF">${priceValue}</text>
      <rect x="25" y="86" width="260" height="30" rx="15" fill="url(#goldGrad)"/>
      <text x="155" y="106" text-anchor="middle" font-family="'Segoe UI Black', Arial" font-size="12" font-weight="900" fill="#071422">${pricePill}</text>
    </g>

    <!-- Hotline -->
    <text x="45" y="605" font-family="'Segoe UI', Arial" font-size="13" font-weight="800" fill="#FFEAB0">
      📞 01092048333 · SIERRA-ESTATES.NET
    </text>
  </svg>
  `);

  const compositeLayers = [
    { input: svg, top: 0, left: 0 },
    { input: inset1, top: 460, left: 45 },
    { input: inset2, top: 460, left: 195 },
    { input: inset3, top: 460, left: 345 },
  ];

  const finalBuffer = await sharp(polishedHero)
    .composite(compositeLayers)
    .jpeg({ quality: 96 })
    .toBuffer();

  const socialOut = path.join(SOCIAL_DIR, outputName);
  const adsOut = path.join(ADS_DIR, outputName);

  fs.writeFileSync(socialOut, finalBuffer);
  fs.writeFileSync(adsOut, finalBuffer);

  console.log(`✓ Saved ${outputName} (${Math.round(finalBuffer.length / 1024)} KB)`);
}

async function run() {
  const photoOffice = path.join(SITE_PHOTOS, 'cp-furnished-executive-office.jpg');
  const photoStairs = path.join(SITE_PHOTOS, 'cp-interior-marble-stairs.jpg');
  const photoHallway = path.join(SITE_PHOTOS, 'cp-corridor-elevator-hallway.jpg');
  const photoBanque = path.join(SITE_PHOTOS, 'cp-exterior-banque-misr-frontage.png');
  const photoEntrance = path.join(SITE_PHOTOS, 'cp-portal-tower1-entrance.jpg');
  const photoMetro = path.join(SITE_PHOTOS, 'cp-tower-metro-elevation.png');

  // ================= BANNER 1: Real Executive Office Suite =================
  await generateRealBanner({
    heroPhotoPath: photoOffice,
    heroPosition: 'center',
    insetPhotos: [photoStairs, photoHallway, photoBanque],
    outputName: 'cairo-plaza-real-banner-office.jpg',
    overlayConfig: {
      scriptWord: 'Executive',
      mainTitle: 'OFFICE SUITE',
      dealType: 'FOR LEASE & SALE',
      locationCapsule: 'AL-MATARIA METRO STATION, CAIRO',
      badges: [
        { icon: '🛋️', category: 'FINISHING', label: 'TURNKEY FURNISHED' },
        { icon: '📐', category: 'SPACE', label: 'SIZE 75 SQM' },
        { icon: '🔑', category: 'DELIVERY', label: 'READY TO OPERATE' },
        { icon: '🚇', category: 'LOCATION', label: 'METRO FRONTAGE' },
      ],
      topBadgeText: 'READY NOW!',
      topBadgeSub: 'IMMEDIATE KEYS',
      priceLabel: 'ASKING RENT · إيجار فوري',
      priceValue: 'EGP 35K / MO',
      pricePill: 'FLEXIBLE INSTALLMENTS · تسهيلات',
      bottomNoteAr: 'تسليم فوري · تشطيب فندقي متكامل · أمام المترو مباشرة',
    },
  });

  // ================= BANNER 2: Real Banque Misr & Commercial Frontage =================
  await generateRealBanner({
    heroPhotoPath: photoBanque,
    heroPosition: 'center',
    insetPhotos: [photoOffice, photoStairs, photoEntrance],
    outputName: 'cairo-plaza-real-banner-commercial.jpg',
    overlayConfig: {
      scriptWord: 'Prime',
      mainTitle: 'COMMERCIAL HUB',
      dealType: 'FOR LEASE & SALE',
      locationCapsule: 'METRO CONCOURSE · CAIRO PLAZA',
      badges: [
        { icon: '👥', category: 'TRAFFIC', label: 'HIGH FOOTFALL' },
        { icon: '🏦', category: 'ANCHOR', label: 'BANQUE MISR' },
        { icon: '🏢', category: 'SUITES', label: 'CLINICS & RETAIL' },
        { icon: '📈', category: 'RETURNS', label: '22% ANNUAL ROI' },
      ],
      topBadgeText: 'OPERATIONAL!',
      topBadgeSub: 'BANQUE MISR ANCHOR',
      priceLabel: 'STARTING FROM · يبدأ من',
      priceValue: 'EGP 30K / MO',
      pricePill: 'OWN OR LEASE · تملك أو استئجار',
      bottomNoteAr: 'فرص تجارية وعيادات مميزة · ترافيك بشري استثنائي',
    },
  });

  // ================= BANNER 3: Real Emerald Marble Luxury Lobby =================
  await generateRealBanner({
    heroPhotoPath: photoStairs,
    heroPosition: 'center',
    insetPhotos: [photoOffice, photoHallway, photoBanque],
    outputName: 'cairo-plaza-real-banner-luxury-lobby.jpg',
    overlayConfig: {
      scriptWord: 'Hotel-Grade',
      mainTitle: 'LUXURY ENTRANCE',
      dealType: 'CAIRO PLAZA TOWER',
      locationCapsule: 'AL-MATARIA METRO, CAIRO',
      badges: [
        { icon: '🏛️', category: 'MATERIALS', label: 'EMERALD MARBLE' },
        { icon: '🛗', category: 'ELEVATORS', label: 'MITSUBISHI LIFTS' },
        { icon: '🛡️', category: 'SECURITY', label: '24/7 GATED' },
        { icon: '💎', category: 'STANDARD', label: 'VIP SUITES' },
      ],
      topBadgeText: 'DELIVERED!',
      topBadgeSub: 'HOTEL-GRADE FINISH',
      priceLabel: 'INVESTMENT FROM · استثمار يبدأ من',
      priceValue: 'EGP 2.8M',
      pricePill: 'CASH DISCOUNT OR 3 YRS · تسهيلات',
      bottomNoteAr: 'مداخل رخامية فندقية فاخرة · بوابات حديد مشغول',
    },
  });

  // ================= BANNER 4: Real Transit Elevation from Metro =================
  await generateRealBanner({
    heroPhotoPath: photoMetro,
    heroPosition: 'top',
    insetPhotos: [photoOffice, photoStairs, photoHallway],
    outputName: 'cairo-plaza-real-banner-tower-metro.jpg',
    overlayConfig: {
      scriptWord: 'Transit-Oriented',
      mainTitle: 'TWIN TOWERS',
      dealType: 'AT AL-MATARIA METRO',
      locationCapsule: 'ZERO METERS FROM STATION',
      badges: [
        { icon: '🚇', category: 'TRANSIT', label: 'DIRECT METRO EXIT' },
        { icon: '🏙️', category: 'SKYLINE', label: 'TWIN TOWERS' },
        { icon: '🏥', category: 'HEALTHCARE', label: 'ALFA LAB & ELITE' },
        { icon: '⚡', category: 'UTILITIES', label: 'FULLY POWERED' },
      ],
      topBadgeText: 'METRO FRONT!',
      topBadgeSub: 'MAXIMUM EXPOSURE',
      priceLabel: 'COMMERCIAL & CLINICS · وحدات',
      priceValue: 'EGP 25K - 60K',
      pricePill: 'FLEXIBLE CONTRACTS · عقود فورية',
      bottomNoteAr: 'أمام محطة المترو مباشرة · كبرى العلامات التجارية والطبية',
    },
  });

  // ================= LANDSCAPE BANNER 5: Real Office Landscape Banner =================
  await generateLandscapeRealBanner({
    heroPhotoPath: photoOffice,
    insetPhotos: [photoStairs, photoHallway, photoBanque],
    outputName: 'cairo-plaza-real-banner-landscape-office.jpg',
    overlayConfig: {
      scriptWord: 'Executive Turnkey',
      mainTitle: 'OFFICE SUITES',
      dealType: 'FOR LEASE & SALE',
      locationCapsule: 'CAIRO PLAZA · AL-MATARIA METRO',
      badges: [
        { icon: '🛋️', category: 'FINISH', label: 'TURNKEY' },
        { icon: '📐', category: 'SPACE', label: '75 SQM' },
        { icon: '🚇', category: 'LOCATION', label: 'METRO' },
      ],
      topBadgeText: 'READY!',
      topBadgeSub: 'TURNKEY',
      priceLabel: 'ASKING RENT · إيجار شهري',
      priceValue: 'EGP 35,000',
      pricePill: 'FLEXIBLE TERMS · تسهيلات',
    },
  });

  console.log('ALL REAL PHOTO BANNERS BUILT SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('Error generating banners:', err);
  process.exit(1);
});
