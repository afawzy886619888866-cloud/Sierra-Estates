/**
 * sierra estatesE — الورك فلوز الخارجية
 * ─────────────────────────────────────────────────────────────────────
 * المجلد ده يروح في:
 * H:\Sierra Estates SaaS Program Locally V2\workflows\
 *
 * الهيكل:
 *   workflows/
 *     ├── 01-whatsapp-scraper/    ← سكرابر الواتساب
 *     ├── 02-owner-search/        ← بحث وحدات الملاك
 *     ├── 03-owner-contact/       ← التواصل مع الملاك
 *     ├── 04-email-sender/        ← إرسال الإيميلات
 *     └── 05-unit-adder/          ← إضافة وحدة للشيت
 *
 * كلهم بيكتبوا في Google Sheets
 * الموقع بيقراه من الشيت كل فترة
 * ─────────────────────────────────────────────────────────────────────
 */

// ════════════════════════════════════════════════════════════════════════
// الورك فلو ① — سكرابر الواتساب
// ════════════════════════════════════════════════════════════════════════

/**
 * الملف: workflows/01-whatsapp-scraper/index.js
 *
 * المهمة: يقرا مجموعات الواتساب ويكتب الرسايل في الشيت
 *
 * كيفية التشغيل:
 *   node workflows/01-whatsapp-scraper/index.js
 *
 * المطلوب في .env:
 *   BROKER_INBOX_SHEET_ID=   ← ID جدول الإكسيل
 *   GOOGLE_SERVICE_ACCOUNT_KEY=  ← JSON مفتاح الخدمة
 */

/*
const { Client, LocalAuth } = require('whatsapp-web.js');
const { google } = require('googleapis');

const GROUPS_TO_WATCH = [
  'مجموعة وسطاء التجمع',
  'عقارات القاهرة الجديدة',
  // أضف أسماء المجموعات هنا
];

const client = new Client({ authStrategy: new LocalAuth() });

client.on('message', async (msg) => {
  if (!GROUPS_TO_WATCH.some(g => msg.from.includes(g))) return;
  await appendToSheet('raw_messages', [
    new Date().toISOString(),
    msg.from,
    msg.fromMe ? 'broker' : 'unknown',
    msg.body,
    msg.hasMedia ? 'YES' : 'NO',
    'PENDING',
  ]);
});

client.initialize();
*/


// ════════════════════════════════════════════════════════════════════════
// الورك فلو ② — بحث وحدات الملاك
// ════════════════════════════════════════════════════════════════════════

/**
 * الملف: workflows/02-owner-search/search.js
 *
 * المهمة: يدور على وحدات معروضة من الملاك مباشرة (مش وسطاء)
 *         في بروبرتي فايندر وأوليكس
 *         ويكتبهم في شيت "owner_leads"
 *
 * كيفية التشغيل:
 *   node workflows/02-owner-search/search.js
 *   أو Cron: كل يوم الساعة 9 صباحاً
 */

/*
async function searchPropertyFinder() {
  const params = new URLSearchParams({
    category_id: '1',         // سكني
    location_id: 'cairo',
    purpose: 'for-sale',
    owner_only: 'true',       // ملاك فقط
    sort_by: 'date',
    page: '1',
    rows_per_page: '50',
  });

  const res = await fetch(
    `${process.env.PROPERTY_FINDER_API_GATEWAY}/properties?${params}`,
    { headers: { Authorization: `Bearer ${process.env.PROPERTY_FINDER_CLIENT_ID}` } }
  );
  const data = await res.json();

  for (const unit of data.properties || []) {
    await appendToSheet('owner_leads', [
      new Date().toISOString(),
      unit.id,
      unit.title,
      unit.price,
      unit.location?.city,
      unit.contact?.phone || '',
      unit.contact?.email || '',
      'NEW',
    ]);
  }
}
*/


// ════════════════════════════════════════════════════════════════════════
// الورك فلو ③ — التواصل مع الملاك
// ════════════════════════════════════════════════════════════════════════

/**
 * الملف: workflows/03-owner-contact/contact.js
 *
 * المهمة: بيقرا الصفوف اللي status = NEW في شيت owner_leads
 *         وبيبعتلهم رسالة واتساب أو تيليجرام
 *         وبيغير status لـ CONTACTED
 *
 * رسالة نموذجية للمالك:
 *   "مرحباً، أنا [اسم المستشار] من سييرا إستيتس العقارية.
 *    شايف إن عندك وحدة في [الكمباوند] معروضة للبيع.
 *    هل ممكن نتكلم عن إمكانية التسويق المشترك؟"
 */

/*
async function contactNewOwners() {
  const rows = await getSheetRows('owner_leads', { status: 'NEW' });

  for (const row of rows) {
    if (!row.phone) continue;

    // WhatsApp message via Meta API
    await fetch('https://graph.facebook.com/v18.0/PHONE_NUMBER_ID/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WHATSAPP_META_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: row.phone,
        type: 'text',
        text: {
          body: `مرحباً، أنا من سييرا إستيتس. شايفين وحدتك في ${row.compound}. هل ممكن نتكلم؟`,
        },
      }),
    });

    await updateSheetRow('owner_leads', row.id, { status: 'CONTACTED' });
  }
}
*/


// ════════════════════════════════════════════════════════════════════════
// الورك فلو ④ — إرسال الإيميلات
// ════════════════════════════════════════════════════════════════════════

/**
 * الملف: workflows/04-email-sender/send.js
 *
 * المهمة: يقرا الصفوف اللي status = CONTACTED في owner_leads
 *         وبيبعتلهم إيميل follow-up بعد 48 ساعة
 *
 * المطلوب:
 *   GMAIL_USER=  أو SMTP credentials
 *
 * نموذج الإيميل:
 *   Subject: "سييرا إستيتس — متابعة طلب التسويق"
 *   Body:    رسالة احترافية عربي/إنجليزي
 */

/*
const nodemailer = require('nodemailer');

async function sendFollowUpEmails() {
  const rows = await getSheetRows('owner_leads', {
    status: 'CONTACTED',
    contacted_at_before: daysAgo(2),
  });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
  });

  for (const row of rows) {
    if (!row.email) continue;
    await transporter.sendMail({
      from: `سييرا إستيتس <${process.env.GMAIL_USER}>`,
      to: row.email,
      subject: 'سييرا إستيتس — متابعة طلب التسويق',
      html: buildEmailTemplate(row),
    });
    await updateSheetRow('owner_leads', row.id, { status: 'EMAIL_SENT' });
  }
}
*/


// ════════════════════════════════════════════════════════════════════════
// الورك فلو ⑤ — إضافة وحدة للشيت
// ════════════════════════════════════════════════════════════════════════

/**
 * الملف: workflows/05-unit-adder/add-unit.js
 *
 * المهمة: الوكيل بيشغّل السكريبت ده وبيدخل بيانات الوحدة
 *         السكريبت بيضيفها في شيت "units_pending"
 *         الكرون بتاع الموقع بيجيبها ويضيفها في Firestore
 *
 * طريقة الاستخدام (CLI):
 *   node workflows/05-unit-adder/add-unit.js
 *   ← بيسألك تدخل البيانات سؤال ورا سؤال
 *   ← أو تمرر JSON: node add-unit.js --json '{"title":"شقة ميفيدا",...}'
 *
 * أعمدة الشيت:
 *   timestamp | title | compound | type | bedrooms | price | area | finishing | phone | status
 */

/*
const readline = require('readline');

async function addUnit() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((r) => rl.question(q, r));

  logger.info('\n🏢 سييرا إستيتس — إضافة وحدة جديدة\n');

  const unit = {
    timestamp:  new Date().toISOString(),
    title:      await ask('اسم الوحدة: '),
    compound:   await ask('الكمباوند: '),
    type:       await ask('النوع (شقة/فيلا/دوبلكس): '),
    bedrooms:   await ask('عدد الغرف: '),
    price:      await ask('السعر (جنيه): '),
    area:       await ask('المساحة (م²): '),
    finishing:  await ask('التشطيب (كامل/نص/خام): '),
    phone:      await ask('رقم التواصل: '),
    status:     'PENDING',
  };

  await appendToSheet('units_pending', Object.values(unit));
  logger.info('\n✅ تمت الإضافة في قائمة الانتظار. السيستم سيضيفها تلقائياً خلال 24 ساعة.');
  rl.close();
}
*/


// ════════════════════════════════════════════════════════════════════════
// Google Sheets helper — مشترك بين الـ workflows كلها
// ════════════════════════════════════════════════════════════════════════

/**
 * الملف: workflows/shared/sheets.js
 * كل الـ workflows بتعمل require من هنا
 */

/*
const { google } = require('googleapis');

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function appendToSheet(tabName, values) {
  const auth   = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId:  process.env.MASTER_SHEET_ID,
    range:          `${tabName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody:    { values: [values] },
  });
}

async function getSheetRows(tabName, filters = {}) {
  const auth   = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.MASTER_SHEET_ID,
    range:         `${tabName}!A:Z`,
  });
  // ... filter and return
}

module.exports = { appendToSheet, getSheetRows };
*/

export {};
