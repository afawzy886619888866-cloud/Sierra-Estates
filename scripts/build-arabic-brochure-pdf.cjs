const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SITE_PHOTOS = path.join(ROOT, 'apps/sierra-estates-realty/public/cairo-plaza/site-photos');
const ASSETS_DIR = path.join(ROOT, 'apps/sierra-estates-realty/public/assets');
const DOCS_DIR = path.join(ROOT, 'apps/sierra-estates-realty/public/cairo-plaza/documents');
const PUBLIC_CP_DIR = path.join(ROOT, 'apps/sierra-estates-realty/public/cairo-plaza');
const ARTIFACT_DIR = 'C:/Users/Sierr/.gemini/antigravity-ide/brain/5161730a-7822-48db-9571-44c17b03b588';
const F_PROJECT_DIR = 'F:/Cairo plaza project';

if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

function toDataUri(filePath, mimeType = 'image/jpeg') {
  if (!fs.existsSync(filePath)) return '';
  const buf = fs.readFileSync(filePath);
  return `data:${mimeType};base64,${buf.toString('base64')}`;
}

async function getPolishedDataUri(filePath, width, height) {
  if (!fs.existsSync(filePath)) return '';
  const buf = await sharp(filePath)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .modulate({ brightness: 1.12, saturation: 1.1 })
    .sharpen({ sigma: 1.0 })
    .jpeg({ quality: 94 })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

async function buildBrochureHtml() {
  const logoPath = path.join(ASSETS_DIR, 'logo-gold.png');
  const photoMetro = path.join(SITE_PHOTOS, 'cp-tower-metro-elevation.png');
  const photoBanque = path.join(SITE_PHOTOS, 'cp-exterior-banque-misr-frontage.png');
  const photoOffice = path.join(SITE_PHOTOS, 'cp-furnished-executive-office.jpg');
  const photoStairs = path.join(SITE_PHOTOS, 'cp-interior-marble-stairs.jpg');
  const photoHallway = path.join(SITE_PHOTOS, 'cp-corridor-elevator-hallway.jpg');
  const photoEntrance = path.join(SITE_PHOTOS, 'cp-portal-tower1-entrance.jpg');
  const photoPano = path.join(PUBLIC_CP_DIR, 'real-site-panorama.jpg');

  // Also photos from F: drive if available
  const fEntranceInside = 'F:/Cairo plaza project/Cairo plaza/مطريه بلازا/Real/project entrance from inside.jpg';
  const fAlphAhly = 'F:/Cairo plaza project/Cairo plaza/مطريه بلازا/Real/Alph and ahly.jpg';

  console.log('Processing images for PDF brochure...');
  const logoUri = toDataUri(logoPath, 'image/png');
  const metroUri = await getPolishedDataUri(photoMetro, 1200, 800);
  const banqueUri = await getPolishedDataUri(photoBanque, 1200, 800);
  const officeUri = await getPolishedDataUri(photoOffice, 900, 600);
  const stairsUri = await getPolishedDataUri(photoStairs, 900, 600);
  const hallwayUri = await getPolishedDataUri(photoHallway, 900, 600);
  const entranceUri = await getPolishedDataUri(photoEntrance, 900, 600);
  const panoUri = fs.existsSync(photoPano) ? await getPolishedDataUri(photoPano, 1400, 500) : '';
  const fEntranceInsideUri = fs.existsSync(fEntranceInside) ? await getPolishedDataUri(fEntranceInside, 900, 600) : stairsUri;
  const fAlphAhlyUri = fs.existsSync(fAlphAhly) ? await getPolishedDataUri(fAlphAhly, 900, 600) : banqueUri;

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,700;1,700&family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    body {
      font-family: 'Cairo', 'Tajawal', sans-serif;
      background: #060C17;
      color: #E2E8F0;
      font-size: 13px;
      line-height: 1.5;
    }

    .pdf-page {
      width: 210mm;
      height: 297mm;
      page-break-after: always;
      position: relative;
      overflow: hidden;
      background: #060C17;
      padding: 18mm 18mm 16mm 18mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* Gradient Background Accents */
    .page-bg-mesh {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 85% 15%, rgba(200, 150, 26, 0.12) 0%, transparent 45%),
                  radial-gradient(circle at 15% 85%, rgba(10, 30, 58, 0.6) 0%, transparent 50%);
      pointer-events: none;
      z-index: 1;
    }

    .page-inner {
      position: relative;
      z-index: 2;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid rgba(200, 150, 26, 0.35);
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .header-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-logo {
      height: 38px;
      width: auto;
    }
    .header-brand-title {
      font-size: 14px;
      font-weight: 800;
      color: #FFFFFF;
    }
    .header-brand-sub {
      font-size: 10px;
      font-weight: 700;
      color: #C8961A;
      letter-spacing: 1px;
    }
    .header-project-badge {
      background: rgba(200, 150, 26, 0.12);
      border: 1px solid #C8961A;
      border-radius: 20px;
      padding: 4px 14px;
      font-size: 11px;
      font-weight: 800;
      color: #FFEAA7;
    }

    /* Page Footer */
    .page-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1.5px solid rgba(200, 150, 26, 0.35);
      padding-top: 10px;
      margin-top: 14px;
      font-size: 10.5px;
      font-weight: 700;
      color: #94A3B8;
    }
    .footer-hotline {
      color: #25D366;
      font-weight: 800;
      direction: ltr;
    }
    .footer-web {
      color: #FFEAA7;
      direction: ltr;
    }

    /* Titles */
    .section-eyebrow {
      font-family: 'Amiri', serif;
      font-style: italic;
      font-size: 20px;
      color: #C8961A;
      margin-bottom: 2px;
    }
    .section-title {
      font-size: 26px;
      font-weight: 900;
      color: #FFFFFF;
      line-height: 1.25;
      margin-bottom: 6px;
    }
    .section-desc {
      font-size: 12.5px;
      color: #CBD5E1;
      margin-bottom: 16px;
      line-height: 1.6;
    }

    /* Gold Card Box */
    .gold-box {
      background: rgba(10, 24, 46, 0.7);
      border: 1.5px solid rgba(200, 150, 26, 0.45);
      border-radius: 14px;
      padding: 14px 18px;
      margin-bottom: 14px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    .gold-box-title {
      font-size: 15px;
      font-weight: 800;
      color: #FFEAA7;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 16px 0;
      font-size: 11.5px;
      background: rgba(8, 18, 34, 0.6);
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid rgba(200, 150, 26, 0.3);
    }
    .data-table th {
      background: #0E2442;
      color: #FFEAA7;
      font-weight: 800;
      padding: 9px 10px;
      text-align: right;
      border-bottom: 2px solid #C8961A;
      font-size: 11.5px;
    }
    .data-table td {
      padding: 8px 10px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      color: #E2E8F0;
    }
    .data-table tr:nth-child(even) {
      background: rgba(255,255,255,0.02);
    }
    .data-table tr:hover {
      background: rgba(200, 150, 26, 0.08);
    }
    .badge-unit {
      display: inline-block;
      background: #07172A;
      border: 1px solid #C8961A;
      border-radius: 6px;
      padding: 2px 7px;
      font-weight: 800;
      color: #FFEAA7;
      font-size: 11px;
    }
    .badge-price {
      font-weight: 900;
      color: #25D366;
    }
    .badge-status-ready {
      color: #38BDF8;
      font-weight: 700;
    }

    /* Activity Grid Cards */
    .activity-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 14px;
    }
    .activity-card {
      background: rgba(9, 22, 41, 0.75);
      border: 1.5px solid rgba(200, 150, 26, 0.3);
      border-radius: 12px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .act-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .act-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(200, 150, 26, 0.15);
      border: 1px solid #C8961A;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }
    .act-title {
      font-size: 14px;
      font-weight: 800;
      color: #FFFFFF;
    }
    .act-space-badge {
      font-size: 11px;
      font-weight: 800;
      color: #FFEAA7;
      background: #0A1B30;
      border: 1px solid rgba(200,150,26,0.3);
      border-radius: 6px;
      padding: 2px 8px;
      display: inline-block;
      align-self: flex-start;
      margin: 4px 0 2px 0;
    }
    .act-desc {
      font-size: 11.5px;
      color: #CBD5E1;
      line-height: 1.5;
    }
    .act-roi {
      font-size: 11px;
      font-weight: 800;
      color: #25D366;
      margin-top: 3px;
    }

    /* Photo Galleries */
    .photo-grid-2x2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .photo-frame {
      border: 2px solid rgba(200, 150, 26, 0.4);
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      height: 130px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.5);
    }
    .photo-frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .photo-frame-caption {
      position: absolute;
      bottom: 0;
      inset-inline: 0;
      background: linear-gradient(0deg, rgba(5,14,26,0.95) 0%, rgba(5,14,26,0.5) 70%, transparent 100%);
      padding: 6px 10px;
      font-size: 10.5px;
      font-weight: 800;
      color: #FFEAA7;
    }

    /* COVER PAGE STYLES */
    .cover-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .cover-top-brand {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-top: 10mm;
    }
    .cover-logo {
      height: 75px;
      width: auto;
      margin-bottom: 12px;
      filter: drop-shadow(0 6px 20px rgba(0,0,0,0.7));
    }
    .cover-brand-name {
      font-size: 20px;
      font-weight: 900;
      color: #FFFFFF;
      letter-spacing: 0.5px;
    }
    .cover-brand-sub {
      font-size: 13px;
      font-weight: 700;
      color: #C8961A;
      letter-spacing: 2px;
    }
    .cover-title-block {
      text-align: center;
      margin: 15px 0;
    }
    .cover-eyebrow {
      font-family: 'Amiri', serif;
      font-style: italic;
      font-size: 34px;
      font-weight: 700;
      color: #FFEAA7;
      margin-bottom: 4px;
    }
    .cover-main-h1 {
      font-size: 46px;
      font-weight: 900;
      color: #FFFFFF;
      line-height: 1.15;
      margin-bottom: 10px;
      text-shadow: 0 4px 20px rgba(0,0,0,0.8);
    }
    .cover-sub-h2 {
      font-size: 21px;
      font-weight: 800;
      color: #C8961A;
      line-height: 1.3;
      margin-bottom: 16px;
    }
    .cover-location-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(7, 20, 34, 0.95);
      border: 2px solid #C8961A;
      border-radius: 30px;
      padding: 8px 26px;
      font-size: 15px;
      font-weight: 800;
      color: #FFEAA7;
      box-shadow: 0 8px 30px rgba(0,0,0,0.6);
    }
    .cover-hero-img-box {
      width: 100%;
      height: 220px;
      border-radius: 16px;
      overflow: hidden;
      border: 2.5px solid rgba(200, 150, 26, 0.5);
      position: relative;
      box-shadow: 0 16px 40px rgba(0,0,0,0.7);
      margin: 15px 0;
    }
    .cover-hero-img-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .cover-badges-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 10px;
    }
    .cover-badge-card {
      background: rgba(10, 24, 46, 0.85);
      border: 1.5px solid rgba(200, 150, 26, 0.4);
      border-radius: 12px;
      padding: 10px 12px;
      text-align: center;
    }
    .cover-badge-icon {
      font-size: 22px;
      margin-bottom: 4px;
    }
    .cover-badge-text {
      font-size: 12px;
      font-weight: 800;
      color: #FFFFFF;
      line-height: 1.3;
    }
    .cover-badge-sub {
      font-size: 10.5px;
      font-weight: 700;
      color: #25D366;
    }

    /* BACK COVER STYLES */
    .back-cover-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      align-items: center;
      padding-top: 15mm;
      padding-bottom: 10mm;
    }
    .contact-cta-card {
      background: #08172D;
      border: 3px solid #C8961A;
      border-radius: 24px;
      padding: 24px 30px;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 16px 50px rgba(0,0,0,0.85);
      margin: 20px 0;
    }
    .cta-wa-btn {
      background: #25D366;
      border-radius: 40px;
      padding: 14px 28px;
      font-size: 22px;
      font-weight: 900;
      color: #FFFFFF;
      display: inline-flex;
      align-items: center;
      gap: 12px;
      margin: 16px 0;
      box-shadow: 0 8px 25px rgba(37, 211, 102, 0.4);
    }
    .cta-phone-num {
      direction: ltr;
      font-size: 24px;
    }
  </style>
</head>
<body>

  <!-- ========================================================================= -->
  <!-- PAGE 1: الغلاف الملكي (ROYAL COVER PAGE) -->
  <!-- ========================================================================= -->
  <div class="pdf-page">
    <div class="page-bg-mesh"></div>
    <div class="page-inner cover-container">
      <div class="cover-top-brand">
        <img class="cover-logo" src="${logoUri}" alt="Sierra Estates Logo">
        <span class="cover-brand-name">شركة سييرا للاستثمار والتطوير العقاري</span>
        <span class="cover-brand-sub">SIERRA ESTATES REALTY · OFFICIAL DOSSIER</span>
      </div>

      <div class="cover-title-block">
        <div class="cover-eyebrow">الملف الاستثماري والتجاري المعتمد — 2026</div>
        <h1 class="cover-main-h1">صرح كايرو بلازا</h1>
        <h2 class="cover-sub-h2">دليل المساحات والأسعار والتصور الاستثماري الشامل</h2>
        <div class="cover-location-badge">
          <span>📍 أمام محطة مترو المطرية مباشرة — قلب القاهرة الكبرى</span>
        </div>
      </div>

      <div class="cover-hero-img-box">
        <img src="${metroUri}" alt="Cairo Plaza Tower Elevation Facing Metro">
      </div>

      <div class="cover-badges-row">
        <div class="cover-badge-card">
          <div class="cover-badge-icon">🔑</div>
          <div class="cover-badge-text">تسليم فوري بالمفتاح</div>
          <div class="cover-badge-sub">جاهز فوراً للتشغيل</div>
        </div>
        <div class="cover-badge-card">
          <div class="cover-badge-icon">🏛️</div>
          <div class="cover-badge-text">مداخل فندقية ورخام إيطالي</div>
          <div class="cover-badge-sub">مصاعد سريعة وأمن 24/7</div>
        </div>
        <div class="cover-badge-card">
          <div class="cover-badge-icon">📈</div>
          <div class="cover-badge-text">عوائد استثمارية قياسية</div>
          <div class="cover-badge-sub">تصل إلى 22% - 24% سنوياً</div>
        </div>
      </div>

      <div class="page-footer">
        <div>شركة سييرا للاستثمار العقاري — وكيل التسويق المعتمد</div>
        <div class="footer-hotline">واتساب والمبيعات: 01092048333</div>
        <div class="footer-web">sierra-estates.net</div>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- PAGE 2: الموقع الاستراتيجي ومحطة المترو (STRATEGIC TRANSIT LOCATION) -->
  <!-- ========================================================================= -->
  <div class="pdf-page">
    <div class="page-bg-mesh"></div>
    <div class="page-inner">
      <div class="page-header">
        <div class="header-brand">
          <img class="header-logo" src="${logoUri}" alt="Logo">
          <div>
            <div class="header-brand-title">شركة سييرا للاستثمار العقاري</div>
            <div class="header-brand-sub">SIERRA ESTATES</div>
          </div>
        </div>
        <div class="header-project-badge">صرح كايرو بلازا · المحور الاستراتيجي</div>
      </div>

      <div>
        <div class="section-eyebrow">الموقع الجغرافي وقوة التدفق البشري</div>
        <h2 class="section-title">نقطة التقاء شرايين القاهرة وأعلى كثافة تجارية</h2>
        <p class="section-desc">
          يتمتع مشروع <strong>كايرو بلازا</strong> بموقع استثنائي نادر الحدوث في النسيج العمراني للقاهرة الكبرى؛ حيث يقع مباشرة على بوابة <strong>محطة مترو المطرية (الخط الأول)</strong> وجسر المشاة الرئيسي، مما يضمن تدفقاً بشرياً متواصلاً يتجاوز <strong>400,000 مواطن يومياً</strong> بين ركاب مترو، موظفين، ومتسوقين.
        </p>

        <div class="photo-frame" style="height: 165px; margin-bottom: 14px;">
          <img src="${banqueUri}" alt="Banque Misr and Street Frontage">
          <div class="photo-frame-caption">واجهة الشارع الرئيسية مع فرع بنك مصر المتكامل وتدفق المشاة أمام محطة المترو مباشرة</div>
        </div>

        <div class="gold-box">
          <div class="gold-box-title">💎 ركائز القوة الاستثمارية للموقع:</div>
          <ul style="padding-right: 20px; font-size: 12px; line-height: 1.8; color: #CBD5E1;">
            <li><strong>صفر متر من المترو (Transit-Oriented Development):</strong> أسهل نقطة وصول في القاهرة لعملائك وموظفيك ومرضاك دون الحاجة لسيارة خاصة.</li>
            <li><strong>كيانات كبرى مشغلة وراسخة بالمبنى:</strong> فرع بنك مصر المتكامل يعمل رسمياً بالدور الأرضي مع صرافات آلية 24/7، إضافة للبنك الأهلي المصري المجاور.</li>
            <li><strong>مجمع طبي رائد:</strong> وجود معامل ألفا الطبية (Alfa Lab) ومركز إيليت سكان (Elite Scan) المتخصص بالأشعة، مما يجعل المبنى مقصداً علاجياً معروفاً.</li>
            <li><strong>ربط فوري بالمحاور الجديدة:</strong> دقائق معدودة من كوبري مسطرد الجديد، محور عدلي منصور، جسر السويس، ومصر الجديدة.</li>
          </ul>
        </div>
      </div>

      <div class="page-footer">
        <div>كايرو بلازا — الدليل الاستثماري 2026</div>
        <div>الصفحة 2 من 8</div>
        <div class="footer-hotline">01092048333</div>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- PAGE 3: جدول أسعار ومساحات المقرات الإدارية والطبية (ADMIN & CLINICS) -->
  <!-- ========================================================================= -->
  <div class="pdf-page">
    <div class="page-bg-mesh"></div>
    <div class="page-inner">
      <div class="page-header">
        <div class="header-brand">
          <img class="header-logo" src="${logoUri}" alt="Logo">
          <div>
            <div class="header-brand-title">شركة سييرا للاستثمار العقاري</div>
            <div class="header-brand-sub">SIERRA ESTATES</div>
          </div>
        </div>
        <div class="header-project-badge">كشف الوحدات الإدارية والطبية الرسمية</div>
      </div>

      <div>
        <div class="section-eyebrow">حصر رسمي معتمد — أبريل 2026</div>
        <h2 class="section-title">أسعار ومساحات المكاتب التنفيذية والعيادات</h2>
        <p class="section-desc">
          كشف الوحدات الإدارية والطبية المتاحة بالأبراج (1، 3، 7). جميع الوحدات مرخصة رسمياً (إداري/طبي) ولها حصة بالأرض مع تسليم فوري للمفتاح:
        </p>

        <!-- برج 1 -->
        <div style="font-size: 13.5px; font-weight: 800; color: #FFEAA7; margin-bottom: 4px;">
          🏢 برج (1) — عمارات البنك (واجهة مباشرة على الشارع الرئيسي):
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>رقم الوحدة</th>
              <th>الدور</th>
              <th>المساحة</th>
              <th>الإطلالة والتشطيب</th>
              <th>سعر المتر</th>
              <th>إجمالي السعر</th>
              <th>الإيجار المتوقع</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="badge-unit">1201</span></td>
              <td>الثاني الإداري</td>
              <td>56.00 م²</td>
              <td>واجهة مباشرة شارع أحمد عزت (مشطب فندقي)</td>
              <td>26,000 ج</td>
              <td><span class="badge-price">1,456,000 ج</span></td>
              <td>16,000 - 18,000 ج / ش</td>
            </tr>
            <tr>
              <td><span class="badge-unit">1202</span></td>
              <td>الثاني الإداري</td>
              <td>55.00 م²</td>
              <td>واجهة مباشرة شارع أحمد عزت (مشطب فندقي)</td>
              <td>26,000 ج</td>
              <td><span class="badge-price">1,430,000 ج</span></td>
              <td>15,500 - 17,500 ج / ش</td>
            </tr>
            <tr>
              <td><span class="badge-unit">1214</span></td>
              <td>الثاني الإداري</td>
              <td>64.00 م²</td>
              <td>إطلالة داخلية هادئة (مشطب بالكامل)</td>
              <td>23,000 ج</td>
              <td><span class="badge-price">1,472,000 ج</span></td>
              <td>17,000 - 19,000 ج / ش</td>
            </tr>
          </tbody>
        </table>

        <!-- برج 3 -->
        <div style="font-size: 13.5px; font-weight: 800; color: #FFEAA7; margin-top: 10px; margin-bottom: 4px;">
          🏢 برج (3) — الأدوار الثاني والثالث (نماذج مختارة):
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>رقم الوحدة</th>
              <th>الدور</th>
              <th>المساحة</th>
              <th>الإطلالة</th>
              <th>سعر المتر</th>
              <th>إجمالي السعر</th>
              <th>الحالة والتسليم</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="badge-unit">3206</span></td>
              <td>الثاني الإداري</td>
              <td>55.00 م²</td>
              <td>واجهة مباشرة على الشارع</td>
              <td>22,000 ج</td>
              <td><span class="badge-price">1,210,000 ج</span></td>
              <td><span class="badge-status-ready">جاهز للاستلام</span></td>
            </tr>
            <tr>
              <td><span class="badge-unit">3208</span></td>
              <td>الثاني الإداري</td>
              <td>56.00 م²</td>
              <td>إطلالة داخلية صامتة (للعيادات)</td>
              <td>20,000 ج</td>
              <td><span class="badge-price">1,120,000 ج</span></td>
              <td><span class="badge-status-ready">جاهز للاستلام</span></td>
            </tr>
            <tr>
              <td><span class="badge-unit">3210</span></td>
              <td>الثاني الإداري</td>
              <td>64.00 م²</td>
              <td>جناح مزدوج 3 غرف واستقبال</td>
              <td>20,000 ج</td>
              <td><span class="badge-price">1,280,000 ج</span></td>
              <td><span class="badge-status-ready">جاهز للاستلام</span></td>
            </tr>
            <tr>
              <td><span class="badge-unit">3314</span></td>
              <td>الثالث الإداري</td>
              <td>64.00 م²</td>
              <td>إطلالة مفتوحة</td>
              <td>20,000 ج</td>
              <td><span class="badge-price">1,280,000 ج</span></td>
              <td><span class="badge-status-ready">جاهز للاستلام</span></td>
            </tr>
          </tbody>
        </table>

        <!-- برج 7 -->
        <div style="font-size: 13.5px; font-weight: 800; color: #FFEAA7; margin-top: 10px; margin-bottom: 4px;">
          🏢 برج (7) — الفرص الاستثمارية الاقتصادية (أسعار تبدأ من 585 ألف ج فقط):
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>الوحدة</th>
              <th>المساحة</th>
              <th>سعر المتر</th>
              <th>السعر الإجمالي</th>
              <th>الميزة الاستثمارية</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="badge-unit">7205 / 7206</span></td>
              <td>45.00 م²</td>
              <td>13,000 ج</td>
              <td><span class="badge-price">585,000 ج</span></td>
              <td>أقل سعر تملك في القاهرة أمام المترو بعائد 24%</td>
            </tr>
            <tr>
              <td><span class="badge-unit">7204</span></td>
              <td>54.00 م²</td>
              <td>13,000 ج</td>
              <td><span class="badge-price">702,000 ج</span></td>
              <td>مكتب إداري متكامل غرفتين وصالة استقبال</td>
            </tr>
            <tr>
              <td><span class="badge-unit">7201</span></td>
              <td>80.00 م²</td>
              <td>15,000 ج</td>
              <td><span class="badge-price">1,200,000 ج</span></td>
              <td>مقر تنفيذي كبير واجهة شارع مباشر</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="page-footer">
        <div>كايرو بلازا — كشف الوحدات الإدارية والطبية</div>
        <div>الصفحة 3 من 8</div>
        <div class="footer-hotline">01092048333</div>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- PAGE 4: جدول أسعار ومساحات المحلات التجارية (COMMERCIAL PRICING) -->
  <!-- ========================================================================= -->
  <div class="pdf-page">
    <div class="page-bg-mesh"></div>
    <div class="page-inner">
      <div class="page-header">
        <div class="header-brand">
          <img class="header-logo" src="${logoUri}" alt="Logo">
          <div>
            <div class="header-brand-title">شركة سييرا للاستثمار العقاري</div>
            <div class="header-brand-sub">SIERRA ESTATES</div>
          </div>
        </div>
        <div class="header-project-badge">كشف المحلات والواجهات التجارية الرسمية</div>
      </div>

      <div>
        <div class="section-eyebrow">حصر رسمي معتمد — مارس وأبريل 2026</div>
        <h2 class="section-title">أسعار ومساحات المحلات والواجهات التجارية</h2>
        <p class="section-desc">
          كشف المحلات المتاحة بالدور الأرضي والأول في برج (3) والأبراج (5 و 7). مساحات ميكرو تبدأ من 1.55 م² لكبائن الـ ATM والخدمات، ومحلات تجارية كبرى حتى 77 م²:
        </p>

        <div style="font-size: 13.5px; font-weight: 800; color: #FFEAA7; margin-bottom: 4px;">
          🛍️ محلات الدور الأرضي — برج (3) (أعلى ترافيك بشري للمترو):
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>رقم المحل</th>
              <th>المساحة</th>
              <th>سعر المتر</th>
              <th>إجمالي القيمة</th>
              <th>النشاط المقترح</th>
              <th>الإيجار الشهري</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="badge-unit">3024</span></td>
              <td>1.55 م²</td>
              <td>50,000 ج</td>
              <td><span class="badge-price">77,500 ج</span></td>
              <td>كابينة صراف آلي (ATM) أو خدمات دفع</td>
              <td>10,000 - 15,000 ج</td>
            </tr>
            <tr>
              <td><span class="badge-unit">3020</span></td>
              <td>1.75 م²</td>
              <td>50,000 ج</td>
              <td><span class="badge-price">87,500 ج</span></td>
              <td>صراف آلي (ATM) أو كشك اتصالات</td>
              <td>12,000 - 16,000 ج</td>
            </tr>
            <tr>
              <td><span class="badge-unit">3013</span></td>
              <td>3.50 م²</td>
              <td>50,000 ج</td>
              <td><span class="badge-price">175,000 ج</span></td>
              <td>منفذ خدمات اتصالات / صرافة مصغرة</td>
              <td>15,000 - 20,000 ج</td>
            </tr>
            <tr>
              <td><span class="badge-unit">3015</span></td>
              <td>9.60 م²</td>
              <td>48,000 ج</td>
              <td><span class="badge-price">460,800 ج</span></td>
              <td>محل بصريات / مستلزمات طبية / إلكترونيات</td>
              <td>18,000 - 22,000 ج</td>
            </tr>
            <tr>
              <td><span class="badge-unit">3009</span></td>
              <td>14.20 م²</td>
              <td>48,000 ج</td>
              <td><span class="badge-price">681,600 ج</span></td>
              <td>محل هواتف ذكية / كافيه Grab & Go</td>
              <td>25,000 - 30,000 ج</td>
            </tr>
            <tr>
              <td><span class="badge-unit">3001</span></td>
              <td>20.22 م²</td>
              <td>55,000 ج</td>
              <td><span class="badge-price">1,112,100 ج</span></td>
              <td>علامة تجارية / كافيه فاخر / حلويات</td>
              <td>35,000 - 45,000 ج</td>
            </tr>
            <tr>
              <td><span class="badge-unit">3004</span></td>
              <td>26.80 م²</td>
              <td>55,000 ج</td>
              <td><span class="badge-price">1,474,000 ج</span></td>
              <td>صيدلية / صالة عرض / توكيل ملابس</td>
              <td>45,000 - 55,000 ج</td>
            </tr>
            <tr>
              <td><span class="badge-unit">3003</span></td>
              <td>34.30 م²</td>
              <td>55,000 ج</td>
              <td><span class="badge-price">1,886,500 ج</span></td>
              <td>صيدلية كبرى سلاسل / بنك / كافيه رئيسي</td>
              <td>60,000 - 75,000 ج</td>
            </tr>
          </tbody>
        </table>

        <div style="font-size: 13.5px; font-weight: 800; color: #FFEAA7; margin-top: 10px; margin-bottom: 4px;">
          🏢 محلات وتوكيلات الدور الأول التجاري — برج (3):
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>رقم المحل</th>
              <th>المساحة</th>
              <th>سعر المتر</th>
              <th>إجمالي القيمة</th>
              <th>الاستخدام الأمثل</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="badge-unit">3113</span></td>
              <td>14.60 م²</td>
              <td>35,000 ج</td>
              <td><span class="badge-price">511,000 ج</span></td>
              <td>صالون عناية شخصية / مكتب صرافة وسياحة</td>
            </tr>
            <tr>
              <td><span class="badge-unit">3102</span></td>
              <td>14.95 م²</td>
              <td>47,000 ج</td>
              <td><span class="badge-price">702,650 ج</span></td>
              <td>معرض بصريات وأجهزة طبية متخصصة</td>
            </tr>
            <tr>
              <td><span class="badge-unit">3126</span></td>
              <td>30.65 م²</td>
              <td>33,000 ج</td>
              <td><span class="badge-price">1,011,450 ج</span></td>
              <td>مركز صيانة وتكنولوجيا معتمد / معرض أزياء</td>
            </tr>
            <tr>
              <td><span class="badge-unit">3123</span></td>
              <td>49.15 م²</td>
              <td>32,000 ج</td>
              <td><span class="badge-price">1,572,800 ج</span></td>
              <td>مقر بنكي مصغر / معمل تحاليل / جيم رياضي VIP</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="page-footer">
        <div>كايرو بلازا — كشف المحلات التجارية المعتمدة</div>
        <div>الصفحة 4 من 8</div>
        <div class="footer-hotline">01092048333</div>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- PAGE 5: استشراف وتصور كل مساحة (IMAGINE WHAT EVERY PLACE COULD BE) -->
  <!-- ========================================================================= -->
  <div class="pdf-page">
    <div class="page-bg-mesh"></div>
    <div class="page-inner">
      <div class="page-header">
        <div class="header-brand">
          <img class="header-logo" src="${logoUri}" alt="Logo">
          <div>
            <div class="header-brand-title">شركة سييرا للاستثمار العقاري</div>
            <div class="header-brand-sub">SIERRA ESTATES</div>
          </div>
        </div>
        <div class="header-project-badge">التصور التشغيلي والاستثماري للمساحات</div>
      </div>

      <div>
        <div class="section-eyebrow">دليل استشراف الأنشطة والتوظيف التجاري</div>
        <h2 class="section-title">التصور العملي لكل مساحة ونشاطها الأمثل</h2>
        <p class="section-desc">
          صُممت وحدات كايرو بلازا بمرونة معمارية وهندسية تتيح توظيف كل متر مربع لتحقيق أقصى تدفق نقدي وأعلى عائد استثماري، وفقاً للموقع الداخلي ونوع الترافيك:
        </p>

        <div class="activity-grid">
          <!-- كبائن الـ ATM والخدمات -->
          <div class="activity-card">
            <div class="act-header">
              <div class="act-icon">🏧</div>
              <div>
                <div class="act-title">كبائن صراف آلي (ATMs) ودفع إلكتروني</div>
                <div class="act-space-badge">مساحات 1.55 م² إلى 3.5 م²</div>
              </div>
            </div>
            <div class="act-desc">
              مواقع ذهبية على بوابات الدخول وأمام المترو. تتنافس البنوك (الأهلي، مصر، CIB، QNB) وشركات الدفع (فوري، أمان) على استئجارها بعوائد تتراوح بين 10,000 و 20,000 ج شهرياً للماكينة الواحدة.
            </div>
            <div class="act-roi">🔥 أسرع فترة استرداد لرأس المال (خلال 6 إلى 8 أشهر فقط).</div>
          </div>

          <!-- الصيدليات وسلاسل الدواء -->
          <div class="activity-card">
            <div class="act-header">
              <div class="act-icon">💊</div>
              <div>
                <div class="act-title">صيدليات كبرى وسلاسل رعاية صحية</div>
                <div class="act-space-badge">مساحات 26 م² إلى 35 م² (دور أرضي)</div>
              </div>
            </div>
            <div class="act-desc">
              النشاط الأضمن والأعلى مبيعاً بالمطرية بفضل ترافيك المترو والعيادات الطبية ومعامل ألفا وإيليت سكان المتواجدة بالأبراج. مناسب لسلاسل الصيدليات الكبرى (العزبي، رشدي، 19011).
            </div>
            <div class="act-roi">🔥 إيجار شهري متوقع: 50,000 إلى 75,000 ج مع عقود طويلة الأجل.</div>
          </div>

          <!-- سلاسل الكافيهات والمشروبات -->
          <div class="activity-card">
            <div class="act-header">
              <div class="act-icon">☕</div>
              <div>
                <div class="act-title">كافيهات ومخابز سريعة (Grab & Go)</div>
                <div class="act-space-badge">مساحات 15 م² إلى 34 م²</div>
              </div>
            </div>
            <div class="act-desc">
              خدمة مئات الآلاف من ركاب المترو والموظفين صباحاً ومساءً. مناسب لماركات القهوة المختصة، سلاسل المخبوزات والحلويات، ومنافذ العصائر الطبيعية والمأكولات السريعة الجاهزة.
            </div>
            <div class="act-roi">🔥 مبيعات يومية كاش متدفقة وترافيك متواصل 18 ساعة يومياً.</div>
          </div>

          <!-- عيادات ومراكز طبية تخصصية -->
          <div class="activity-card">
            <div class="act-header">
              <div class="act-icon">🩺</div>
              <div>
                <div class="act-title">عيادات طبية ومراكز استشارية</div>
                <div class="act-space-badge">مساحات 45 م² إلى 80 م² (أبراج 1، 3، 7)</div>
              </div>
            </div>
            <div class="act-desc">
              عيادات أسنان، عيون، جلدية وليزر، باطنة وجراحة اليوم الواحد. المبنى مجهز بمصاعد طبية سريعة، ممرات رخامية، وتكييف مركزي، وملاصق لكبرى مراكز التحاليل والأشعة.
            </div>
            <div class="act-roi">🔥 تراخيص طبية وإدارية رسمية مع تدفق استثنائي للمرضى.</div>
          </div>

          <!-- مقرات الشركات والمكاتب القانونية -->
          <div class="activity-card">
            <div class="act-header">
              <div class="act-icon">⚖️</div>
              <div>
                <div class="act-title">مكاتب محاماة واستشارات وشركات شحن</div>
                <div class="act-space-badge">مساحات 55 م² إلى 80 م²</div>
              </div>
            </div>
            <div class="act-desc">
              موقع محوري لشركات التجارة الإلكترونية، الشحن اللوجستي، التوظيف للخارج، ومكاتب المحاسبة القانونية؛ بفضل سهولة لقاء العملاء من كل أنحاء القاهرة مباشرة عبر المترو.
            </div>
            <div class="act-roi">🔥 تشطيبات فندقية كاملة توفر شهور وتكاليف التجهيز الباهظة.</div>
          </div>

          <!-- مراكز التكنولوجيا والصيانة والصرافة -->
          <div class="activity-card">
            <div class="act-header">
              <div class="act-icon">📱</div>
              <div>
                <div class="act-title">مراكز صيانة، توكيلات هواتف، وصرافة</div>
                <div class="act-space-badge">مساحات 10 م² إلى 30 م² (أرضي وأول)</div>
              </div>
            </div>
            <div class="act-desc">
              توكيلات معتمدة لشركات سامسونج وأبل، فروع معتمدة لشركات المحمول (فودافون، أورنج، اتصالات، وي)، ومكاتب صرافة وتحويل أموال بحماية أمنية مشددة 24/7.
            </div>
            <div class="act-roi">🔥 استقطاب شريحة واسعة من الشباب والمتسوقين يومياً.</div>
          </div>
        </div>
      </div>

      <div class="page-footer">
        <div>كايرو بلازا — استشراف وتوظيف المساحات</div>
        <div>الصفحة 5 من 8</div>
        <div class="footer-hotline">01092048333</div>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- PAGE 6: معرض الأدلة المصورة الحية والمواصفات (PHYSICAL EVIDENCE) -->
  <!-- ========================================================================= -->
  <div class="pdf-page">
    <div class="page-bg-mesh"></div>
    <div class="page-inner">
      <div class="page-header">
        <div class="header-brand">
          <img class="header-logo" src="${logoUri}" alt="Logo">
          <div>
            <div class="header-brand-title">شركة سييرا للاستثمار العقاري</div>
            <div class="header-brand-sub">SIERRA ESTATES</div>
          </div>
        </div>
        <div class="header-project-badge">معرض الأدلة المصورة على الطبيعة</div>
      </div>

      <div>
        <div class="section-eyebrow">واقع حقيقي ملموس — لا تصاميم وهمية</div>
        <h2 class="section-title">الأدلة الفوتوغرافية الحية من داخل وخارج المشروع</h2>
        <p class="section-desc">
          تلتزم شركة سييرا بتقديم وثائق واقعية بنسبة 100%. هذه لقطات حية تم التقاطها بعدسات الكاميرا للمشروع توضح جودة التشطيب الفندقي ومستوى الفخامة الإنشائية:
        </p>

        <div class="photo-grid-2x2">
          <div class="photo-frame">
            <img src="${stairsUri}" alt="Emerald Italian Marble Stairs">
            <div class="photo-frame-caption">السلالم الرخامية الإيطالية الخضراء والبوابة الحديدية المشغولة للمدخل الرئيسي</div>
          </div>
          <div class="photo-frame">
            <img src="${officeUri}" alt="Turnkey Furnished Office">
            <div class="photo-frame-caption">المقر الإداري التنفيذي المشطب والمفروش بالكامل — جاهز بالمفتاح</div>
          </div>
          <div class="photo-frame">
            <img src="${hallwayUri}" alt="Elevator Hallway and Corridor">
            <div class="photo-frame-caption">مدخل مصاعد ميتسوبيشي السريعة والممرات الفندقية الرخامية المضيئة</div>
          </div>
          <div class="photo-frame">
            <img src="${entranceUri}" alt="Tower 1 Entrance Portal">
            <div class="photo-frame-caption">بوابة الدخول الفندقية الخاصة ببرج 1 (عمارات البنك) مع أمن وبوابات إلكترونية</div>
          </div>
        </div>

        <div class="gold-box" style="margin-top: 6px;">
          <div class="gold-box-title">⚙️ المواصفات الفنية والهندسية المعتمدة:</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11.5px; color: #CBD5E1;">
            <div>✅ <strong>المصاعد:</strong> مصاعد ميتسوبيشي يابانية سريعة مخصصة للأدوار الإدارية والتجارية.</div>
            <div>✅ <strong>الكهرباء والطاقة:</strong> عدادات ثلاثية الأوجه مستقلة مع مولدات طوارئ للمصاعد والممرات.</div>
            <div>✅ <strong>الاتصالات:</strong> بنية تحتية للألياف الضوئية (Fiber Optic) فائقة السرعة.</div>
            <div>✅ <strong>الأمن والسلامة:</strong> منظومة كاميرات مراقبة رقمية 24/7 وأفراد أمن وحراسة مشددة.</div>
            <div>✅ <strong>مكافحة الحريق:</strong> شبكة إطفاء متوافقة مع اشتراطات الدفاع المدني المصري.</div>
            <div>✅ <strong>الترخيص القانوني:</strong> تراخيص صريحة للأنشطة الإدارية والطبية والتجارية مع حصة بالأرض.</div>
          </div>
        </div>
      </div>

      <div class="page-footer">
        <div>كايرو بلازا — الأدلة المصورة الحية</div>
        <div>الصفحة 6 من 8</div>
        <div class="footer-hotline">01092048333</div>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- PAGE 7: أنظمة السداد وتسهيلات سييرا (PAYMENT STRUCTURES) -->
  <!-- ========================================================================= -->
  <div class="pdf-page">
    <div class="page-bg-mesh"></div>
    <div class="page-inner">
      <div class="page-header">
        <div class="header-brand">
          <img class="header-logo" src="${logoUri}" alt="Logo">
          <div>
            <div class="header-brand-title">شركة سييرا للاستثمار العقاري</div>
            <div class="header-brand-sub">SIERRA ESTATES</div>
          </div>
        </div>
        <div class="header-project-badge">خطط السداد والتسهيلات الحصرية</div>
      </div>

      <div>
        <div class="section-eyebrow">خيارات تمويل وتملك ميسرة لرجال الأعمال والمستثمرين</div>
        <h2 class="section-title">أنظمة سداد مرنة بدون فوائد بنكية</h2>
        <p class="section-desc">
          تقدم شركة <strong>سييرا للاستثمار والتطوير العقاري</strong> تسهيلات حصرية مصممة لتناسب أصحاب الأنشطة والشركات الراغبة في التوسع الفوري دون تجميد السيولة النقدية:
        </p>

        <!-- نظام الكاش -->
        <div class="gold-box" style="border-left: 6px solid #25D366;">
          <div class="gold-box-title" style="color: #25D366;">
            💰 النظام الأول: الشراء الفوري (كاش) مع أعلى نسبة خصم
          </div>
          <p style="font-size: 12px; color: #CBD5E1; line-height: 1.6;">
            • خصومات نقدية فورية تصل إلى <strong>10% - 15%</strong> من إجمالي سعر الوحدة.<br>
            • تسليم فوري للمفتاح في نفس يوم توقيع العقد النهائي الموثق بالشهر العقاري.<br>
            • بدء التشغيل أو التأجير الفوري لتحقيق دخل شهري من اليوم الأول.
          </p>
        </div>

        <!-- نظام التقسيط -->
        <div class="gold-box" style="border-left: 6px solid #C8961A;">
          <div class="gold-box-title" style="color: #FFEAA7;">
            📅 النظام الثاني: التقسيط المباشر بدون فوائد (Installment Plans)
          </div>
          <p style="font-size: 12px; color: #CBD5E1; line-height: 1.6;">
            • <strong>مقدم تعاقد:</strong> يبدأ من <strong>25%</strong> أو <strong>30%</strong> فقط من قيمة الوحدة.<br>
            • <strong>دفعة استلام:</strong> 15% - 20% عند استلام المفتاح وبدء النشاط.<br>
            • <strong>فترة السداد:</strong> أقساط ربع سنوية أو شهرية متساوية على <strong>سنتين إلى 3 سنوات</strong> بدون أي فوائد إضافية.<br>
            • استلم وحدتك وشغلها فوراً والأقساط تسدد من عائد أرباح النشاط أو القيمة الإيجارية!
          </p>
        </div>

        <!-- نظام الإدارة والتأجير الإلزامي -->
        <div class="gold-box" style="border-left: 6px solid #38BDF8;">
          <div class="gold-box-title" style="color: #38BDF8;">
            🤝 النظام الثالث: إدارة الأصول وتفويض التأجير (Sierra Asset Management)
          </div>
          <p style="font-size: 12px; color: #CBD5E1; line-height: 1.6;">
            • للمستثمرين الباحثين عن دخل سلبي مضمون (Passive Income): يتولى فريق إدارة الأصول بشركة سييرا اختيار المستأجر الأنسب (بنوك، سلاسل صيدليات، شركات كبرى)، وتحصيل الإيجار وصيانة الوحدة نيابة عنك.<br>
            • عوائد إيجارية سنوية متوقعة تتراوح بين <strong>18% و 24%</strong> من قيمة الأصل العقاري.
          </p>
        </div>
      </div>

      <div class="page-footer">
        <div>كايرو بلازا — أنظمة السداد وتسهيلات سييرا</div>
        <div>الصفحة 7 من 8</div>
        <div class="footer-hotline">01092048333</div>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- PAGE 8: الغلاف الخلفي وبيانات التواصل (BACK COVER & CONTACT) -->
  <!-- ========================================================================= -->
  <div class="pdf-page">
    <div class="page-bg-mesh"></div>
    <div class="page-inner back-cover-container">
      <div>
        <img class="cover-logo" src="${logoUri}" alt="Sierra Estates Logo">
        <h2 style="font-size: 26px; font-weight: 900; color: #FFFFFF; margin-bottom: 4px;">شركة سييرا للاستثمار والتطوير العقاري</h2>
        <div style="font-size: 14px; font-weight: 700; color: #C8961A; letter-spacing: 2px;">SIERRA ESTATES REALTY</div>
      </div>

      <div class="contact-cta-card">
        <div style="font-family: 'Amiri', serif; font-size: 28px; font-style: italic; color: #FFEAA7; margin-bottom: 8px;">
          ابدأ نشاطك اليوم في قلب الحدث التجاري
        </div>
        <p style="font-size: 13.5px; color: #CBD5E1; line-height: 1.7; margin-bottom: 16px;">
          فريق مستشاري سييرا جاهز للإجابة على استفساراتكم وترتيب معاينات ميدانية للوحدات المتاحة على الطبيعة طوال أيام الأسبوع.
        </p>

        <div class="cta-wa-btn">
          <span>💬</span>
          <span>واتساب والخط المباشر:</span>
          <span class="cta-phone-num">01092048333</span>
        </div>

        <div style="margin-top: 16px; font-size: 14px; font-weight: 800; color: #FFFFFF;">
          🌐 الموقع الإلكتروني الرسمي: <span style="color: #FFEAA7; direction: ltr; display: inline-block;">sierra-estates.net</span>
        </div>
        <div style="margin-top: 6px; font-size: 12.5px; color: #CBD5E1;">
          رابط صفحة المشروع المباشر: <span style="color: #38BDF8; direction: ltr; display: inline-block;">sierra-estates.net/ar/cairo-plaza</span>
        </div>
      </div>

      <div style="max-width: 500px; font-size: 11.5px; color: #94A3B8; line-height: 1.6;">
        📍 <strong>مقر إدارة المشروع والمعاينات:</strong> صرح كايرو بلازا، مباشرة أمام محطة مترو المطرية، محافظة القاهرة.<br>
        المواعيد: يومياً من 10 صباحاً حتى 7 مساءً بموعد مسبق.<br>
        جميع الحقوق محفوظة © 2026 شركة سييرا للاستثمار والتطوير العقاري.
      </div>

      <div class="page-footer" style="width: 100%;">
        <div>صرح كايرو بلازا — الدليل الاستثماري والتجاري الشامل</div>
        <div>الصفحة 8 من 8 (الختام)</div>
        <div class="footer-hotline">01092048333</div>
      </div>
    </div>
  </div>

</body>
</html>
  `;
}

async function run() {
  console.log('Building Arabic Brochure HTML...');
  const html = await buildBrochureHtml();

  const tempHtmlPath = path.join(PUBLIC_CP_DIR, 'cairo-plaza-arabic-brochure.html');
  fs.writeFileSync(tempHtmlPath, html, 'utf8');
  console.log('✓ Wrote HTML blueprint to', tempHtmlPath);

  console.log('Launching Puppeteer for high-res vector PDF generation...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfOutputPublic = path.join(DOCS_DIR, 'cairo-plaza-arabic-brochure-2026.pdf');
  const pdfOutputRootCp = path.join(PUBLIC_CP_DIR, 'cairo-plaza-arabic-brochure-2026.pdf');
  const pdfOutputArtifact = path.join(ARTIFACT_DIR, 'cairo-plaza-arabic-brochure-2026.pdf');
  const pdfOutputFDrive = path.join(F_PROJECT_DIR, 'cairo-plaza-arabic-brochure-2026.pdf');

  console.log('Rendering 8-page PDF...');
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  fs.writeFileSync(pdfOutputPublic, pdfBuffer);
  fs.writeFileSync(pdfOutputRootCp, pdfBuffer);
  fs.writeFileSync(pdfOutputArtifact, pdfBuffer);

  try {
    fs.writeFileSync(pdfOutputFDrive, pdfBuffer);
    console.log('✓ Copied PDF directly to F: drive:', pdfOutputFDrive);
  } catch (err) {
    console.warn('Could not write to F: drive:', err.message);
  }

  await browser.close();

  const sizeKb = Math.round(pdfBuffer.length / 1024);
  console.log(`✨ SUCCESS: 8-Page Luxury Arabic Brochure PDF generated! Size: ${sizeKb} KB`);
  console.log(`Saved at: ${pdfOutputPublic}`);
}

run().catch((err) => {
  console.error('Fatal error during PDF generation:', err);
  process.exit(1);
});
