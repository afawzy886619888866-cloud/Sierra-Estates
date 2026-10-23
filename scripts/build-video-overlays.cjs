const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const OUT_DIR = path.resolve('scratch/video_overlays');
fs.mkdirSync(OUT_DIR, { recursive: true });

const logoPath = path.resolve('apps/sierra-estates-realty/public/assets/logo-gold.png');
const logoB64 = fs.existsSync(logoPath)
  ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
  : '';

const scenes = [
  {
    name: 'scene1_metro',
    badge: '📍 الموقع الاستراتيجي الأول',
    title: 'أمام محطة مترو المطرية مباشرة',
    subtitle: 'صفر متر من بوابة المترو · تدفق بشري يفوق 1.5 مليون نسمة يومياً',
    highlight: 'أقوى ترافيك تجاري واستثماري في قلب القاهرة'
  },
  {
    name: 'scene2_towers',
    badge: '🏛️ صرح كايرو بلازا المعماري',
    title: 'واجهة الأعمال والاستثمار الكبرى',
    subtitle: 'مجمع تجاري وإداري وطبي متكامل بأحدث المعايير الهندسية',
    highlight: 'أبراج شاهقة · ممشى تجاري واسع · واجهات بانورامية'
  },
  {
    name: 'scene3_real_site',
    badge: '🏢 تصوير حقيقي على أرض الواقع',
    title: 'فرع بنك مصر المتكامل ومعامل ألفا',
    subtitle: 'كيانات كبرى تعمل بكامل طاقتها التشغيلية داخل الصرح',
    highlight: 'نشاط مصرفي وطبي يضمن تدفق الزوار لعملك على مدار الساعة'
  },
  {
    name: 'scene4_marble',
    badge: '✨ تشطيبات فندقية VIP',
    title: 'مداخل فاخرة من الرخام الإيطالي',
    subtitle: 'مصاعد ميتسوبيشي سريعة · بوابات حديد مشغول · حراسة 24 ساعة',
    highlight: 'استقبال فخم يعكس هيبة ومكانة شركتك أو عيادتك'
  },
  {
    name: 'scene5_office',
    badge: '💼 تسليم واستلام فوري',
    title: 'مقرات إدارية وعيادات مفروشة بالكامل',
    subtitle: 'جاهزة للتشغيل والترخيص الفوري بدون مصاريف أو إهدار وقت',
    highlight: 'وفر تكاليف التشطيب وابدأ عملك اليوم مع كامل التجهيزات'
  },
  {
    name: 'scene6_pricing',
    badge: '💰 أسعار حصر 2026 الرسمية',
    title: 'فرص استثمارية وتجارية تبدأ من 77.5 ألف ج',
    subtitle: 'أعلى عائد إيجاري سنوي يصل إلى 22% مع أسرع فترة استرداد',
    pricingCards: [
      { label: '🏧 أكشاك وصراف آلي', price: 'تبدأ من 77,500 ج' },
      { label: '🛍️ محلات وتجاري', price: 'تبدأ من 511,000 ج' },
      { label: '🩺 مقرات وعيادات', price: 'تبدأ من 585,000 ج' }
    ],
    highlight: 'تسهيلات سداد بدون فوائد وخصومات حصرية للدفع الكاش'
  },
  {
    name: 'scene7_cta',
    isCloser: true,
    badge: '⚡ احجز وحدتك اليوم',
    title: 'كايرو بلازا — استثمارك الأضمن للمستقبل',
    subtitle: 'سييرا إستيتس · الوكيل والمستشار العقاري المعتمد',
    phone: '01092048333',
    website: 'sierra-estates.net',
    actionText: 'تواصل الآن عبر واتساب للمعاينة الميدانية'
  }
];

function buildHtml(scene) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@700&family=Cairo:wght@600;700;800;900&family=Tajawal:wght@500;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1080px;
      height: 1920px;
      background: transparent;
      font-family: 'Cairo', 'Tajawal', sans-serif;
      overflow: hidden;
      position: relative;
    }
    
    /* Top Header Bar */
    .top-bar {
      position: absolute;
      top: 60px;
      left: 60px;
      right: 60px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 28px;
      background: rgba(6, 12, 23, 0.85);
      backdrop-filter: blur(20px);
      border: 1.5px solid rgba(200, 150, 26, 0.4);
      border-radius: 18px;
      box-shadow: 0 12px 36px rgba(0,0,0,0.6);
    }
    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-logo {
      height: 48px;
      width: auto;
      filter: drop-shadow(0 2px 8px rgba(200,150,26,0.5));
    }
    .brand-text {
      color: #E9C176;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .contact-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(200, 150, 26, 0.2);
      border: 1px solid rgba(200, 150, 26, 0.5);
      padding: 8px 18px;
      border-radius: 12px;
      color: #FFF;
      font-size: 20px;
      font-weight: 800;
      font-family: 'JetBrains Mono', 'Cairo', monospace;
      direction: ltr;
    }

    /* Bottom Overlay Card */
    .card-wrap {
      position: absolute;
      bottom: 90px;
      left: 50px;
      right: 50px;
      background: linear-gradient(180deg, rgba(6, 12, 23, 0.92) 0%, rgba(4, 8, 16, 0.98) 100%);
      backdrop-filter: blur(24px);
      border: 2px solid rgba(200, 150, 26, 0.55);
      border-radius: 26px;
      padding: 34px 40px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.85), 0 0 40px rgba(200, 150, 26, 0.15);
      color: #F0EDE5;
      text-align: right;
    }

    .badge {
      display: inline-block;
      background: linear-gradient(135deg, rgba(200, 150, 26, 0.3) 0%, rgba(200, 150, 26, 0.1) 100%);
      border: 1.5px solid rgba(200, 150, 26, 0.6);
      color: #E9C176;
      padding: 6px 18px;
      border-radius: 30px;
      font-size: 19px;
      font-weight: 800;
      margin-bottom: 14px;
    }

    .title {
      font-size: 38px;
      font-weight: 900;
      color: #FFFFFF;
      line-height: 1.3;
      margin-bottom: 12px;
      text-shadow: 0 2px 10px rgba(0,0,0,0.5);
    }

    .subtitle {
      font-size: 21px;
      color: #CBD5E1;
      font-weight: 600;
      line-height: 1.5;
      margin-bottom: 16px;
    }

    .highlight-pill {
      background: rgba(200, 150, 26, 0.15);
      border-right: 4px solid #C8961A;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 19px;
      font-weight: 700;
      color: #34D399;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Pricing Grid */
    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin: 18px 0;
    }
    .price-box {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(200, 150, 26, 0.35);
      border-radius: 14px;
      padding: 14px 10px;
      text-align: center;
    }
    .price-box .lbl {
      font-size: 16px;
      color: #CBD5E1;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .price-box .val {
      font-size: 20px;
      font-weight: 900;
      color: #34D399;
    }

    /* Fullscreen Closer */
    .closer-box {
      text-align: center;
    }
    .closer-logo {
      height: 90px;
      margin-bottom: 16px;
      filter: drop-shadow(0 4px 16px rgba(200,150,26,0.6));
    }
    .closer-title {
      font-size: 42px;
      font-weight: 900;
      color: #FFFFFF;
      margin-bottom: 10px;
    }
    .closer-sub {
      font-size: 22px;
      color: #E9C176;
      font-weight: 700;
      margin-bottom: 24px;
    }
    .cta-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      background: linear-gradient(135deg, #C8961A 0%, #E9C176 100%);
      color: #071422;
      padding: 18px 36px;
      border-radius: 16px;
      font-size: 26px;
      font-weight: 900;
      box-shadow: 0 10px 30px rgba(200, 150, 26, 0.4);
      margin-bottom: 18px;
      width: 100%;
    }
    .closer-footer {
      display: flex;
      justify-content: space-around;
      font-size: 20px;
      font-weight: 700;
      color: #A0AEC0;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <!-- Top Branded Header -->
  <div class="top-bar">
    <div class="brand-wrap">
      ${logoB64 ? `<img src="${logoB64}" class="brand-logo" alt="Sierra Estates" />` : ''}
      <div class="brand-text">SIERRA ESTATES · CAIRO PLAZA</div>
    </div>
    <div class="contact-badge">
      <span>📞 01092048333</span>
    </div>
  </div>

  <!-- Main Card -->
  <div class="card-wrap">
    ${scene.isCloser ? `
      <div class="closer-box">
        ${logoB64 ? `<img src="${logoB64}" class="closer-logo" alt="Sierra" />` : ''}
        <div class="badge">${scene.badge}</div>
        <div class="closer-title">${scene.title}</div>
        <div class="closer-sub">${scene.subtitle}</div>
        <div class="cta-btn">
          <span>📲</span>
          <span>${scene.actionText}</span>
        </div>
        <div class="closer-footer">
          <div>🌐 ${scene.website}</div>
          <div>📞 واتساب: ${scene.phone}</div>
        </div>
      </div>
    ` : `
      <div class="badge">${scene.badge}</div>
      <div class="title">${scene.title}</div>
      <div class="subtitle">${scene.subtitle}</div>

      ${scene.pricingCards ? `
        <div class="pricing-grid">
          ${scene.pricingCards.map(c => `
            <div class="price-box">
              <div class="lbl">${c.label}</div>
              <div class="val">${c.price}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="highlight-pill">
        <span>✨</span>
        <span>${scene.highlight}</span>
      </div>
    `}
  </div>
</body>
</html>`;
}

async function run() {
  console.log('Launching browser to render 1080x1920 video overlays...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });

  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    console.log(`Generating overlay ${i + 1}/${scenes.length}: ${sc.name}.png...`);
    const html = buildHtml(sc);
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });
    try {
      await page.evaluate(() => document.fonts.ready);
    } catch (_) {}
    await new Promise(r => setTimeout(r, 400));
    const outPng = path.join(OUT_DIR, `${sc.name}.png`);
    await page.screenshot({ path: outPng, omitBackground: true });
    console.log(`✓ Saved ${outPng}`);
  }

  await browser.close();
  console.log('✨ All 7 transparent video overlay cards rendered successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
