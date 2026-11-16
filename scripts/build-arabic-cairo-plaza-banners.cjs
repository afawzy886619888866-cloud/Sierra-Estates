const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SITE_PHOTOS = path.join(ROOT, 'apps/sierra-estates-realty/public/cairo-plaza/site-photos');
const ASSETS_DIR = path.join(ROOT, 'apps/sierra-estates-realty/public/assets');
const SOCIAL_DIR = path.join(ROOT, 'apps/sierra-estates-realty/public/cairo-plaza/social');
const ADS_DIR = path.join(ROOT, 'apps/sierra-estates-realty/public/cairo-plaza/ads');

function toDataUri(filePath, mimeType = 'image/jpeg') {
  const buf = fs.readFileSync(filePath);
  return `data:${mimeType};base64,${buf.toString('base64')}`;
}

// Pre-polish photo with sharp to ensure perfect brightness, vibrancy and clarity
async function getPolishedPhotoDataUri(filePath, width, height) {
  const buf = await sharp(filePath)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .modulate({ brightness: 1.15, saturation: 1.12 })
    .linear(1.06, -6)
    .sharpen({ sigma: 1.1 })
    .jpeg({ quality: 96 })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

// Generate the HTML for an Arabic Square Banner (1080x1080)
function getSquareHtml(config) {
  const {
    bgUri,
    logoUri,
    inset1Uri,
    inset2Uri,
    inset3Uri,
    calligraphyTag,
    mainTitle,
    dealType,
    locationText,
    features,
    topBadgeTitle,
    topBadgeSub,
    priceLabel,
    priceValue,
    pricePill,
    bottomNote,
  } = config;

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@1,700&family=Cairo:wght@600;700;800;900&family=Tajawal:wght@500;700;800;900&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    body {
      width: 1080px;
      height: 1080px;
      overflow: hidden;
      font-family: 'Cairo', 'Tajawal', sans-serif;
      position: relative;
      background: #050c17;
    }

    /* Background Real Photo */
    .bg-photo {
      position: absolute;
      top: 0;
      left: 0;
      width: 1080px;
      height: 1080px;
      background-image: url('${bgUri}');
      background-size: cover;
      background-position: center;
      z-index: 1;
    }

    /* Cinematic Gradient Vignette */
    .bg-vignette {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(3,9,18,0.45) 0%, rgba(3,9,18,0.15) 40%, rgba(3,9,18,0.7) 80%, rgba(3,9,18,0.95) 100%),
                  linear-gradient(270deg, rgba(3,9,18,0.96) 0%, rgba(3,9,18,0.92) 36%, rgba(3,9,18,0.4) 62%, transparent 85%);
      z-index: 2;
    }

    /* Right Sweeping Luxury Curved Frame */
    .curved-frame-svg {
      position: absolute;
      top: 0;
      right: 0;
      width: 780px;
      height: 1080px;
      z-index: 3;
      pointer-events: none;
    }

    .content-layer {
      position: absolute;
      inset: 0;
      z-index: 4;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 50px 60px 40px 60px;
    }

    /* Header Strip */
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .brand-box {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .brand-logo {
      height: 64px;
      width: auto;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.6));
    }
    .brand-text {
      display: flex;
      flex-direction: column;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 900;
      color: #FFFFFF;
      letter-spacing: 0.5px;
    }
    .brand-sub {
      font-size: 13px;
      font-weight: 700;
      color: #E9C176;
      letter-spacing: 1px;
    }

    /* Top Left Badge */
    .top-badge {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: #071422;
      border: 4px solid #D4A234;
      box-shadow: 0 10px 30px rgba(0,0,0,0.8), inset 0 0 20px rgba(212,162,52,0.25);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      position: relative;
    }
    .top-badge::after {
      content: '';
      position: absolute;
      inset: 5px;
      border-radius: 50%;
      border: 1.5px solid rgba(255,255,255,0.7);
    }
    .top-badge-icon {
      font-size: 24px;
      line-height: 1;
      margin-bottom: 4px;
    }
    .top-badge-title {
      font-size: 16px;
      font-weight: 900;
      color: #FFFFFF;
      line-height: 1.2;
    }
    .top-badge-sub {
      font-size: 13px;
      font-weight: 800;
      color: #FFEAA7;
    }

    /* Main Typography Block */
    .hero-text-block {
      margin-top: 15px;
      max-width: 680px;
    }
    .calligraphy-tag {
      font-family: 'Amiri', serif;
      font-style: italic;
      font-size: 38px;
      font-weight: 700;
      color: #E9C176;
      background: linear-gradient(135deg, #FFEAB0 0%, #D4A234 60%, #FFF5D6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 2px;
      display: inline-block;
    }
    .main-title {
      font-size: 52px;
      font-weight: 900;
      color: #FFFFFF;
      line-height: 1.15;
      text-shadow: 0 4px 16px rgba(0,0,0,0.8);
      margin-bottom: 6px;
    }
    .deal-type {
      font-size: 40px;
      font-weight: 900;
      color: #D4A234;
      background: linear-gradient(135deg, #FFFFFF 0%, #FFEAB0 35%, #D4A234 80%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.2;
      margin-bottom: 16px;
    }
    .location-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(7, 20, 34, 0.95);
      border: 2px solid #D4A234;
      border-radius: 30px;
      padding: 8px 24px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.5);
    }
    .location-pill-text {
      font-size: 17px;
      font-weight: 800;
      color: #FFEAB0;
    }

    /* Feature Pills List */
    .features-list {
      margin-top: 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-width: 480px;
    }
    .feature-item {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .feature-circle {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: #071422;
      border: 2.5px solid #D4A234;
      box-shadow: 0 4px 12px rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }
    .feature-text {
      font-size: 19px;
      font-weight: 800;
      color: #FFFFFF;
      text-shadow: 0 2px 8px rgba(0,0,0,0.8);
    }

    /* Real Site Verification Badge */
    .real-stamp {
      position: absolute;
      top: 230px;
      left: 60px;
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(7, 20, 34, 0.92);
      border: 1.8px solid #00E676;
      border-radius: 20px;
      padding: 8px 20px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6);
    }
    .real-stamp-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #00E676;
      box-shadow: 0 0 10px #00E676;
    }
    .real-stamp-text {
      font-size: 14px;
      font-weight: 800;
      color: #FFFFFF;
    }

    /* Bottom Row: Insets + Price Card */
    .bottom-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 20px;
    }

    /* 3 Circular Insets */
    .insets-group {
      display: flex;
      gap: 16px;
    }
    .inset-circle {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      border: 5px solid #D4A234;
      box-shadow: 0 10px 25px rgba(0,0,0,0.8);
      background-size: cover;
      background-position: center;
      position: relative;
    }
    .inset-circle::after {
      content: '';
      position: absolute;
      inset: 2px;
      border-radius: 50%;
      border: 1.5px solid rgba(255,255,255,0.7);
    }
    .inset-label {
      position: absolute;
      bottom: -10px;
      left: 50%;
      transform: translateX(-50%);
      background: #071422;
      border: 1.5px solid #D4A234;
      border-radius: 12px;
      padding: 2px 10px;
      font-size: 11px;
      font-weight: 800;
      color: #FFEAB0;
      white-space: nowrap;
    }

    /* Price / Payment Terms Card */
    .price-card {
      background: #050E1A;
      border: 4px solid #D4A234;
      border-radius: 26px;
      padding: 18px 28px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.85);
      text-align: center;
      min-width: 380px;
      position: relative;
    }
    .price-card::after {
      content: '';
      position: absolute;
      inset: 6px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.3);
      pointer-events: none;
    }
    .price-card-label {
      font-size: 15px;
      font-weight: 800;
      color: #FFEAB0;
      margin-bottom: 4px;
    }
    .price-card-val {
      font-size: 42px;
      font-weight: 900;
      color: #FFFFFF;
      line-height: 1.1;
      margin-bottom: 10px;
      text-shadow: 0 2px 10px rgba(0,0,0,0.8);
    }
    .price-card-pill {
      background: linear-gradient(135deg, #D4A234 0%, #FFEAB0 50%, #B37C11 100%);
      border-radius: 20px;
      padding: 8px 16px;
      font-size: 15px;
      font-weight: 900;
      color: #071422;
    }

    /* Footer Contact Strip */
    .footer-strip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(7, 20, 34, 0.95);
      border: 2px solid rgba(212, 162, 52, 0.5);
      border-radius: 18px;
      padding: 12px 28px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.7);
    }
    .whatsapp-badge {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .wa-icon-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #25D366;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: #FFFFFF;
    }
    .wa-number {
      font-size: 22px;
      font-weight: 900;
      color: #25D366;
      letter-spacing: 1px;
      direction: ltr;
    }
    .wa-label {
      font-size: 14px;
      font-weight: 800;
      color: #FFFFFF;
    }
    .web-link {
      font-size: 18px;
      font-weight: 800;
      color: #FFEAB0;
      direction: ltr;
    }
    .footer-note {
      font-size: 13px;
      font-weight: 700;
      color: #D4A234;
    }
  </style>
</head>
<body>
  <!-- Real Background Photograph -->
  <div class="bg-photo"></div>
  <div class="bg-vignette"></div>

  <!-- Real Site Evidence Stamp -->
  <div class="real-stamp">
    <div class="real-stamp-dot"></div>
    <span class="real-stamp-text">تصوير حقيقي ١٠٠٪ من الموقع</span>
  </div>

  <div class="content-layer">
    <!-- Header -->
    <div class="header-row">
      <div class="brand-box">
        <img class="brand-logo" src="${logoUri}" alt="Sierra Estates Logo">
        <div class="brand-text">
          <span class="brand-title">شركة سييرا للاستثمار والتطوير العقاري</span>
          <span class="brand-sub">SIERRA ESTATES REALTY</span>
        </div>
      </div>

      <div class="top-badge">
        <span class="top-badge-icon">🔑</span>
        <span class="top-badge-title">${topBadgeTitle}</span>
        <span class="top-badge-sub">${topBadgeSub}</span>
      </div>
    </div>

    <!-- Main Headline & Features Block -->
    <div>
      <div class="hero-text-block">
        <span class="calligraphy-tag">${calligraphyTag}</span>
        <h1 class="main-title">${mainTitle}</h1>
        <h2 class="deal-type">${dealType}</h2>
        <div class="location-pill">
          <span class="location-pill-text">${locationText}</span>
        </div>
      </div>

      <div class="features-list">
        ${features
          .map(
            (f) => `
          <div class="feature-item">
            <div class="feature-circle">${f.icon}</div>
            <span class="feature-text">${f.text}</span>
          </div>
        `
          )
          .join('')}
      </div>
    </div>

    <!-- Bottom Row: Insets + Price Card -->
    <div>
      <div class="bottom-row">
        <!-- 3 Circular Insets of Real Site Amenities -->
        <div class="insets-group">
          <div class="inset-circle" style="background-image: url('${inset1Uri}');">
            <span class="inset-label">مداخل رخامية</span>
          </div>
          <div class="inset-circle" style="background-image: url('${inset2Uri}');">
            <span class="inset-label">مصاعد سريعة</span>
          </div>
          <div class="inset-circle" style="background-image: url('${inset3Uri}');">
            <span class="inset-label">فرع بنك مصر</span>
          </div>
        </div>

        <!-- Price Card -->
        <div class="price-card">
          <div class="price-card-label">${priceLabel}</div>
          <div class="price-card-val">${priceValue}</div>
          <div class="price-card-pill">${pricePill}</div>
        </div>
      </div>

      <!-- Footer Contact Strip -->
      <div class="footer-strip">
        <div class="whatsapp-badge">
          <div class="wa-icon-circle">💬</div>
          <span class="wa-label">واتساب والمبيعات:</span>
          <span class="wa-number">01092048333</span>
        </div>
        <div class="footer-note">${bottomNote}</div>
        <div class="web-link">sierra-estates.net</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

// Generate the HTML for an Arabic 9:16 Vertical Story / Reel Ad (1080x1920)
function getStoryHtml(config) {
  const {
    bgUri,
    logoUri,
    inset1Uri,
    inset2Uri,
    inset3Uri,
    calligraphyTag,
    mainTitle,
    dealType,
    locationText,
    features,
    priceLabel,
    priceValue,
    pricePill,
    bottomNote,
  } = config;

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@1,700&family=Cairo:wght@600;700;800;900&family=Tajawal:wght@500;700;800;900&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    body {
      width: 1080px;
      height: 1920px;
      overflow: hidden;
      font-family: 'Cairo', 'Tajawal', sans-serif;
      position: relative;
      background: #050c17;
    }

    .bg-photo {
      position: absolute;
      top: 0;
      left: 0;
      width: 1080px;
      height: 1920px;
      background-image: url('${bgUri}');
      background-size: cover;
      background-position: center 30%;
      z-index: 1;
    }

    .bg-vignette {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(3,9,18,0.92) 0%, rgba(3,9,18,0.4) 25%, rgba(3,9,18,0.2) 50%, rgba(3,9,18,0.85) 75%, rgba(3,9,18,0.98) 100%);
      z-index: 2;
    }

    .content-layer {
      position: absolute;
      inset: 0;
      z-index: 3;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 90px 70px 80px 70px;
    }

    .brand-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      text-align: center;
    }
    .brand-logo {
      height: 90px;
      width: auto;
      filter: drop-shadow(0 6px 18px rgba(0,0,0,0.8));
    }
    .brand-title {
      font-size: 24px;
      font-weight: 900;
      color: #FFFFFF;
    }
    .brand-sub {
      font-size: 15px;
      font-weight: 700;
      color: #E9C176;
      letter-spacing: 2px;
    }

    .hero-center {
      text-align: center;
      margin-top: 40px;
    }
    .calligraphy-tag {
      font-family: 'Amiri', serif;
      font-style: italic;
      font-size: 56px;
      font-weight: 700;
      color: #E9C176;
      display: block;
      margin-bottom: 8px;
    }
    .main-title {
      font-size: 68px;
      font-weight: 900;
      color: #FFFFFF;
      line-height: 1.15;
      margin-bottom: 12px;
      text-shadow: 0 4px 20px rgba(0,0,0,0.9);
    }
    .deal-type {
      font-size: 50px;
      font-weight: 900;
      color: #D4A234;
      line-height: 1.2;
      margin-bottom: 24px;
    }
    .location-pill {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      background: rgba(7, 20, 34, 0.95);
      border: 3px solid #D4A234;
      border-radius: 40px;
      padding: 12px 36px;
      font-size: 22px;
      font-weight: 800;
      color: #FFEAB0;
      box-shadow: 0 8px 30px rgba(0,0,0,0.7);
    }

    .features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 50px 0;
    }
    .feature-card {
      background: rgba(7, 20, 34, 0.88);
      border: 2px solid rgba(212,162,52,0.4);
      border-radius: 20px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.5);
    }
    .feature-card-icon {
      font-size: 32px;
    }
    .feature-card-text {
      font-size: 20px;
      font-weight: 800;
      color: #FFFFFF;
      line-height: 1.3;
    }

    .insets-row {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-bottom: 40px;
    }
    .inset-item {
      width: 170px;
      height: 170px;
      border-radius: 50%;
      border: 6px solid #D4A234;
      box-shadow: 0 12px 30px rgba(0,0,0,0.8);
      background-size: cover;
      background-position: center;
      position: relative;
    }
    .inset-label {
      position: absolute;
      bottom: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: #071422;
      border: 2px solid #D4A234;
      border-radius: 14px;
      padding: 4px 14px;
      font-size: 13px;
      font-weight: 800;
      color: #FFEAB0;
      white-space: nowrap;
    }

    .price-box {
      background: #050E1A;
      border: 4px solid #D4A234;
      border-radius: 30px;
      padding: 24px 30px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0,0,0,0.9);
      margin-bottom: 30px;
    }
    .price-label {
      font-size: 18px;
      font-weight: 800;
      color: #FFEAB0;
      margin-bottom: 6px;
    }
    .price-val {
      font-size: 56px;
      font-weight: 900;
      color: #FFFFFF;
      margin-bottom: 12px;
    }
    .price-pill {
      background: linear-gradient(135deg, #D4A234 0%, #FFEAB0 50%, #B37C11 100%);
      border-radius: 24px;
      padding: 12px 24px;
      font-size: 20px;
      font-weight: 900;
      color: #071422;
      display: inline-block;
    }

    .cta-button {
      background: #25D366;
      border-radius: 30px;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      box-shadow: 0 12px 35px rgba(37, 211, 102, 0.4);
      margin-bottom: 20px;
    }
    .cta-text {
      font-size: 28px;
      font-weight: 900;
      color: #FFFFFF;
    }
    .cta-phone {
      font-size: 32px;
      font-weight: 900;
      color: #FFFFFF;
      direction: ltr;
    }

    .story-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 18px;
      font-weight: 800;
      color: #D4A234;
      padding: 0 10px;
    }
  </style>
</head>
<body>
  <div class="bg-photo"></div>
  <div class="bg-vignette"></div>

  <div class="content-layer">
    <!-- Top Brand -->
    <div class="brand-box">
      <img class="brand-logo" src="${logoUri}" alt="Sierra Estates">
      <span class="brand-title">شركة سييرا للاستثمار والتطوير العقاري</span>
      <span class="brand-sub">SIERRA ESTATES REALTY · CAIRO PLAZA</span>
    </div>

    <!-- Center Hero Text -->
    <div class="hero-center">
      <span class="calligraphy-tag">${calligraphyTag}</span>
      <h1 class="main-title">${mainTitle}</h1>
      <h2 class="deal-type">${dealType}</h2>
      <div class="location-pill">${locationText}</div>
    </div>

    <!-- Features Grid -->
    <div class="features-grid">
      ${features
        .map(
          (f) => `
        <div class="feature-card">
          <span class="feature-card-icon">${f.icon}</span>
          <span class="feature-card-text">${f.text}</span>
        </div>
      `
        )
        .join('')}
    </div>

    <!-- 3 Real Insets -->
    <div class="insets-row">
      <div class="inset-item" style="background-image: url('${inset1Uri}');">
        <span class="inset-label">مداخل رخامية</span>
      </div>
      <div class="inset-item" style="background-image: url('${inset2Uri}');">
        <span class="inset-label">مصاعد سريعة</span>
      </div>
      <div class="inset-item" style="background-image: url('${inset3Uri}');">
        <span class="inset-label">فرع بنك مصر</span>
      </div>
    </div>

    <!-- Bottom Pricing & WhatsApp CTA -->
    <div>
      <div class="price-box">
        <div class="price-label">${priceLabel}</div>
        <div class="price-val">${priceValue}</div>
        <div class="price-pill">${pricePill}</div>
      </div>

      <div class="cta-button">
        <span style="font-size: 36px;">💬</span>
        <span class="cta-text">واتساب / حجز المعاينة:</span>
        <span class="cta-phone">01092048333</span>
      </div>

      <div class="story-footer">
        <span>📍 صفر متر من محطة مترو المطرية</span>
        <span>🌐 sierra-estates.net</span>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

async function renderBannerToFile(browser, html, outputPath, width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: outputPath, type: 'jpeg', quality: 96 });
  await page.close();
  console.log(`✓ Generated: ${path.basename(outputPath)} (${Math.round(fs.statSync(outputPath).size / 1024)} KB)`);
}

async function run() {
  console.log('Starting Arabic Luxury Real-Photo Banner Generation...');

  const photoOffice = path.join(SITE_PHOTOS, 'cp-furnished-executive-office.jpg');
  const photoStairs = path.join(SITE_PHOTOS, 'cp-interior-marble-stairs.jpg');
  const photoHallway = path.join(SITE_PHOTOS, 'cp-corridor-elevator-hallway.jpg');
  const photoBanque = path.join(SITE_PHOTOS, 'cp-exterior-banque-misr-frontage.png');
  const photoEntrance = path.join(SITE_PHOTOS, 'cp-portal-tower1-entrance.jpg');
  const photoMetro = path.join(SITE_PHOTOS, 'cp-tower-metro-elevation.png');
  const logoPath = path.join(ASSETS_DIR, 'logo-gold.png');

  // Convert assets to Data URIs with sharp pre-polishing
  console.log('Polishing real photos for banners...');
  const logoUri = toDataUri(logoPath, 'image/png');
  const officeUri = await getPolishedPhotoDataUri(photoOffice, 1080, 1080);
  const stairsUri = await getPolishedPhotoDataUri(photoStairs, 400, 400);
  const hallwayUri = await getPolishedPhotoDataUri(photoHallway, 400, 400);
  const banqueUri = await getPolishedPhotoDataUri(photoBanque, 1080, 1080);
  const entranceUri = await getPolishedPhotoDataUri(photoEntrance, 400, 400);
  const metroUri = await getPolishedPhotoDataUri(photoMetro, 1080, 1080);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // ================= BANNER 1: Executive Office (Arabic Square) =================
  const html1 = getSquareHtml({
    bgUri: officeUri,
    logoUri,
    inset1Uri: stairsUri,
    inset2Uri: hallwayUri,
    inset3Uri: toDataUri(photoBanque, 'image/png'),
    calligraphyTag: 'صرح كايرو بلازا',
    mainTitle: 'مقرات إدارية وتنفيذية فاخرة',
    dealType: 'للإيجار الفوري والتمليك',
    locationText: '📍 أمام محطة مترو المطرية مباشرة — قلب القاهرة',
    features: [
      { icon: '🛋️', text: 'تشطيب فندقي وأثاث تنفيذي راقي متكامل' },
      { icon: '📐', text: 'مساحات تبدأ من ٧٥ م² بتوزيع ذكي' },
      { icon: '🔑', text: 'جاهز فوراً للتشغيل والاستلام بالمفتاح' },
      { icon: '📈', text: 'عائد إيجاري استثماري سنوي يصل إلى ٢٢٪' },
    ],
    topBadgeTitle: 'تسليم فوري!',
    topBadgeSub: 'مفروش ومكيف',
    priceLabel: 'الإيجار الشهري يبدأ من',
    priceValue: '٣٥,٠٠٠ ج',
    pricePill: 'تسهيلات سداد بدون فوائد',
    bottomNote: 'معاينة فورية بدون أي عمولة من المالك مباشرة',
  });

  const out1Social = path.join(SOCIAL_DIR, 'cairo-plaza-arabic-banner-office.jpg');
  const out1Ads = path.join(ADS_DIR, 'cairo-plaza-arabic-banner-office.jpg');
  await renderBannerToFile(browser, html1, out1Social, 1080, 1080);
  fs.copyFileSync(out1Social, out1Ads);

  // ================= BANNER 2: Commercial & Banque Misr Hub (Arabic Square) =================
  const html2 = getSquareHtml({
    bgUri: banqueUri,
    logoUri,
    inset1Uri: officeUri,
    inset2Uri: stairsUri,
    inset3Uri: entranceUri,
    calligraphyTag: 'صرح كايرو بلازا',
    mainTitle: 'الواجهة التجارية الكبرى',
    dealType: 'محلات وشو روم وتوكيلات',
    locationText: '📍 المحور التجاري الرئيسي أمام المترو مباشرة',
    features: [
      { icon: '🏦', text: 'فرع بنك مصر متكامل يعمل رسمياً بالمبنى' },
      { icon: '👥', text: 'أعلى ترافيك بشري وكثافة مشاة بالمنطقة' },
      { icon: '✨', text: 'واجهات زجاجية عريضة بالدور الأرضي' },
      { icon: '📜', text: 'عقود موثقة وأنظمة تملك أو استئجار مرنة' },
    ],
    topBadgeTitle: 'واجهة بنك مصر',
    topBadgeSub: 'أعلى ترافيك',
    priceLabel: 'يبدأ الاستثمار التجاري من',
    priceValue: '٣٠,٠٠٠ ج / ش',
    pricePill: 'أو تملك تجاري بعائد استثماري فوري',
    bottomNote: 'فرص حصرية للشركات والعلامات التجارية الكبرى',
  });

  const out2Social = path.join(SOCIAL_DIR, 'cairo-plaza-arabic-banner-commercial.jpg');
  const out2Ads = path.join(ADS_DIR, 'cairo-plaza-arabic-banner-commercial.jpg');
  await renderBannerToFile(browser, html2, out2Social, 1080, 1080);
  fs.copyFileSync(out2Social, out2Ads);

  // ================= BANNER 3: Hotel-Grade Marble Entrance (Arabic Square) =================
  const html3 = getSquareHtml({
    bgUri: stairsUri,
    logoUri,
    inset1Uri: officeUri,
    inset2Uri: hallwayUri,
    inset3Uri: toDataUri(photoBanque, 'image/png'),
    calligraphyTag: 'صرح كايرو بلازا',
    mainTitle: 'مداخل واستقبال فندقي فاخر',
    dealType: 'مقرات كبرى وعيادات طبية',
    locationText: '📍 موقع استراتيجي نادر أمام محطة المترو',
    features: [
      { icon: '🏛️', text: 'رخام أخضر إيطالي وبوابات حديد مشغول' },
      { icon: '🛗', text: 'مصاعد ميتسوبيشي سريعة وأمن ٢٤ ساعة' },
      { icon: '🏥', text: 'جوار معامل ألفا وإيليت سكان الطبية' },
      { icon: '💎', text: 'استثمار مضمون بموقع لا يفقد قيمته أبداً' },
    ],
    topBadgeTitle: 'مدخل فندقي',
    topBadgeSub: 'VIP SUITES',
    priceLabel: 'فرص التملك تبدأ من',
    priceValue: '٢.٨ مليون ج',
    pricePill: 'خصم خاص للدفع الفوري أو تقسيط على ٣ سنوات',
    bottomNote: 'تسهيلات حصرية بدون فوائد من سييرا للاستثمار',
  });

  const out3Social = path.join(SOCIAL_DIR, 'cairo-plaza-arabic-banner-luxury-lobby.jpg');
  const out3Ads = path.join(ADS_DIR, 'cairo-plaza-arabic-banner-luxury-lobby.jpg');
  await renderBannerToFile(browser, html3, out3Social, 1080, 1080);
  fs.copyFileSync(out3Social, out3Ads);

  // ================= BANNER 4: Metro Elevation & Skyline (Arabic Square) =================
  const html4 = getSquareHtml({
    bgUri: metroUri,
    logoUri,
    inset1Uri: officeUri,
    inset2Uri: stairsUri,
    inset3Uri: hallwayUri,
    calligraphyTag: 'صرح كايرو بلازا',
    mainTitle: 'أقوى موقع تجاري بالقاهرة',
    dealType: 'البرجان التوأمان بالمطرية',
    locationText: '📍 صفر متر من بوابة محطة مترو المطرية',
    features: [
      { icon: '🚇', text: 'سهولة وصول فائقة لعملائك وموظفيك يومياً' },
      { icon: '🏢', text: 'واجهة إعلانية ضخمة تضمن أعلى شهرة لنشاطك' },
      { icon: '⚡', text: 'مرافق وعدادات مياه وكهرباء وتكييفات جاهزة' },
      { icon: '🤝', text: 'تعاقد واستلام في نفس اليوم مع المالك مباشرة' },
    ],
    topBadgeTitle: 'أمام المترو',
    topBadgeSub: 'ترافيك هائل',
    priceLabel: 'وحدات تجارية وطبية وإدارية من',
    priceValue: '٢٥ ألف - ٦٠ ألف ج',
    pricePill: 'عقود فورية جاهزة للمعاينة',
    bottomNote: 'اتصل بنا لمعاينة الوحدات على الطبيعة اليوم',
  });

  const out4Social = path.join(SOCIAL_DIR, 'cairo-plaza-arabic-banner-metro-tower.jpg');
  const out4Ads = path.join(ADS_DIR, 'cairo-plaza-arabic-banner-metro-tower.jpg');
  await renderBannerToFile(browser, html4, out4Social, 1080, 1080);
  fs.copyFileSync(out4Social, out4Ads);

  // ================= BANNER 5: Vertical Story / Reel Ad (1080x1920) =================
  const storyHtml = getStoryHtml({
    bgUri: officeUri,
    logoUri,
    inset1Uri: stairsUri,
    inset2Uri: hallwayUri,
    inset3Uri: toDataUri(photoBanque, 'image/png'),
    calligraphyTag: 'صرح كايرو بلازا',
    mainTitle: 'مقرات إدارية وتنفيذية فاخرة',
    dealType: 'للإيجار الفوري والتمليك',
    locationText: '📍 أمام محطة مترو المطرية مباشرة',
    features: [
      { icon: '🛋️', text: 'تشطيب فندقي وأثاث تنفيذي متكامل' },
      { icon: '🔑', text: 'استلام فوري بالمفتاح بدون أي تشطيب' },
      { icon: '🚇', text: 'موقع حيوي نادر على جسر محطة المترو' },
      { icon: '📈', text: 'عائد استثماري سنوي مجزي يصل إلى ٢٢٪' },
    ],
    priceLabel: 'يبدأ الإيجار الشهري من',
    priceValue: '٣٥,٠٠٠ ج / شهر',
    pricePill: 'تسهيلات سداد بدون فوائد من سييرا',
    bottomNote: 'معاينة فورية للمقر الإداري اليوم',
  });

  const storySocial = path.join(SOCIAL_DIR, 'cairo-plaza-arabic-story-office.jpg');
  const storyAds = path.join(ADS_DIR, 'cairo-plaza-arabic-story-office.jpg');
  await renderBannerToFile(browser, storyHtml, storySocial, 1080, 1920);
  fs.copyFileSync(storySocial, storyAds);

  await browser.close();
  console.log('✨ ALL ARABIC LUXURY REAL-PHOTO BANNERS GENERATED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('Fatal error during Arabic banner build:', err);
  process.exit(1);
});
