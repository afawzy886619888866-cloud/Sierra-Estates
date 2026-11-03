# Sierra Estates — Easy Listing 🏡

أداة الليستينج السريعة لفريق Sierra Estates: الصق وصف الوحدة (عربي أو English) →
استخراج البيانات تلقائيًا → كود داخلي (`MI-3F-10.5M`) → محتوى جاهز لـ
WhatsApp / Facebook / Property Finder → رابط Google Maps → حفظ في Google Sheets
مع رفع الصور على Google Drive.

**البانك العام:** <https://sierra-easy-listing.vercel.app>

**Google Sheet (قاعدة البيانات):** <https://docs.google.com/spreadsheets/d/1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk/edit>

## طريقة الاستخدام اليومية (للموظفين)

1. افتح اللينك، الصق وصف الوحدة زي ما اتبعت لك، واكتب تليفون المالك.
2. اضغط **«استخرج البيانات وولّد المحتوى»** — راجع التفاصيل وعدّل لو فيه حاجة ناقصة.
3. انسخ محتوى الواتساب / الفيسبوك / بروبيرتي فايندر من التبويبات — كله جاهز.
4. اضغط **«احفظ الوحدة في Google Sheets»** — الصف بيتكتب في الشيت والصور بتترفع على Drive.

## الربط مع Google Sheets (مرة واحدة)

الأداة بتتكلم مع الشيت عن طريق **Google Apps Script Web App** — مجاني ١٠٠٪،
مفيش API Keys ولا Service Accounts:

1. افتح الشيت → **Extensions ← Apps Script**.
2. امسح أي كود قديم والصق محتوى `src/lib/appsscript.ts` (نبدّل — مش نضيف).
3. **Deploy ← New deployment ← Web app** → Execute as: **Me**، Who has access: **Anyone**.
4. انسخ الـ Web App URL والصقه في **الإعدادات** داخل الأداة واضغط «اختبر الاتصال».

السكريبت بيضيف كل وحدة كصف في تاب `Listings` بالأعمدة:
Code, Compound, Bedrooms, Bathrooms, Area (sqm), Price, Currency, Furnished,
Owner Phone, WhatsApp Content, Facebook Content, Property Finder Content,
Map Link, Images (URLs), Created At — والصور بتتخزن في مجلد
`Easy Listing Images` على Google Drive.

## التشغيل محليًا

```bash
bun install
bun run dev
```

## النشر على Vercel (مجاني)

```bash
npx vercel deploy --prod
```

## البنية التقنية

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui
- استخراج البيانات: AI (لو متاح) مع fallback هيوريستي بالـ regex بيشتغل في أي مكان
- الصور: بتتضغط في البراوزر وبتترفع base64 للـ Apps Script اللي بيخزنها على Drive
- مفيش قاعدة بيانات سيرفر: الشيت هو مصدر الحقيقة، والإعدادات بتتحفظ localStorage
