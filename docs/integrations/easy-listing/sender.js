/*********************************************************************
 * Sierra Estates — WhatsApp Multi-Line Sender v2.0
 * ------------------------------------------------------------------
 * - من 1 لـ 8 خطوط واتساب في نفس الوقت (QR مرة واحدة لكل خط)
 * - وحدات /add-listing ← جروبات البيع/الإيجار/العام (زي ما هو)
 * - حملات رسايل للملاك: تلزق الأرقام في تاب Easy_Outreach في الشيت
 *   وتحدد "خلّصهم في كام دقيقة" — والسندر بيوزعهم على الخطوط
 *   ويخلصهم في الوقت المحدد بالظبط.
 *
 * التشغيل:
 *   1) عدّل الإعدادات تحت (لينك الويب آب + التوكن + الجروبات + عدد الخطوط)
 *   2) npm install          (مرة واحدة)
 *   3) node sender.js       → هيطلب مسح QR لكل خط واحد ورا التاني
 *
 * للتجربة من غير واتساب:   DRY_RUN=1 node sender.js
 * عدد خطوط مختلف:          LINES=6 node sender.js
 ********************************************************************/

// ---- الإعدادات (عدّل دول بس) ----
var SCRIPT_URL = process.env.SCRIPT_URL || 'ضع_لينك_الويب_آب_هنا';
var POLL_TOKEN = process.env.POLL_TOKEN || 'ضع_توكن_السندر_هنا';

var GROUPS_SALE = ['سييرا بيع'];      // وحدات البيع
var GROUPS_RENT = ['سييرا إيجار'];    // وحدات الإيجار
var GROUPS_ALL  = ['سييرا إستيتس'];   // كل وحدة + الجروب العام
var GROUPS_LINE = 0;                   // 0 = أي خط فاضي يبعت في الجروبات
                                      // (لازم كل الأرقام تكون أعضاء في الجروبات)
                                      // أو حط رقم خط واحد بس (مثال: 1)

var LINES_COUNT = Number(process.env.LINES || 4);   // عدد خطوط الواتساب: من 1 لـ 8

var LISTING_EVERY_MS = Number(process.env.EVERY_MS || 30000); // فحص الوحدات كل 30 ث
var OUT_TICK_MS      = 3000;   // نبضة جدولة الحملات
var OUT_REFRESH_MS   = 20000;  // إعادة قراءة تاب الحملة من الشيت
var DRY              = process.env.DRY_RUN === '1';
// --------------------------------

var lines = [];
function log(m) { console.log('[' + new Date().toLocaleTimeString('ar-EG') + '] ' + m); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

/* ================== تشغيل الخطوط ================== */
function mkLine(i) {
  return { id: i, name: 'خط ' + i, client: null, ready: false,
           nextAt: 0, chats: null, chatsAt: 0 };
}

async function startLine(ln) {
  if (DRY) { ln.ready = true; return; }
  var wa = require('whatsapp-web.js');
  var qrcode = require('qrcode-terminal');
  ln.client = new wa.Client({
    authStrategy: new wa.LocalAuth({ dataPath: 'auth/line' + ln.id }),
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] }
  });
  await new Promise(function (res) {
    var done = false;
    ln.client.on('qr', function (qr) {
      if (done) return;
      console.log('\n📞 ' + ln.name + ' — امسح الـ QR ده من واتساب الرقم ده (مرة واحدة بس):');
      qrcode.generate(qr, { small: true });
    });
    ln.client.on('ready', function () {
      done = true; ln.ready = true;
      log('✅ ' + ln.name + ' جاهز');
      res();
    });
    ln.client.on('disconnected', function () {
      ln.ready = false;
      log('⚠️ ' + ln.name + ' انقطع — هرجع أوصّله...');
      ln.client.initialize().catch(function () {});
    });
    setTimeout(function () {
      if (!done) { log('⚠️ ' + ln.name + ' معملتش مسح QR — كمّل، وترجع تشغّله أي وقت'); res(); }
    }, 180000);
    ln.client.initialize().catch(function (e) { log('خطأ ' + ln.name + ': ' + e); res(); });
  });
}

async function boot() {
  log('شغال بعدد خطوط: ' + LINES_COUNT + (DRY ? ' (تجربة DRY)' : ''));
  for (var i = 1; i <= LINES_COUNT; i++) {
    var ln = mkLine(i);
    lines.push(ln);
    if (!DRY) { log('جهّز ' + ln.name + ' ...'); await startLine(ln); }
    else ln.ready = true;
  }
}

/* ================== أدوات الإرسال ================== */
async function post(body) {
  var r = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  });
  return r.json();
}

function busy(ln, sec) { ln.nextAt = Date.now() / 1000 + sec; }

function pickLine(pref) {
  var nowSec = Date.now() / 1000;
  var cand = lines.filter(function (l) { return l.ready && nowSec >= l.nextAt; });
  if (!cand.length) return null;
  if (pref) {
    var p = cand.find(function (l) { return l.id === pref; });
    if (p) return p;
  }
  cand.sort(function (a, b) { return a.nextAt - b.nextAt; });
  return cand[0];
}

async function freeLine(maxWaitSec) {
  var dl = Date.now() + maxWaitSec * 1000;
  var l = pickLine(GROUPS_LINE || null);
  while (!l && Date.now() < dl) { await sleep(1000); l = pickLine(GROUPS_LINE || null); }
  return l;
}

async function waSend(ln, chatId, text) {
  if (DRY) { await sleep(150); log('[DRY] ' + ln.name + ' → ' + chatId); return true; }
  try {
    await Promise.race([
      ln.client.sendMessage(chatId, text),
      new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 45000); })
    ]);
    return true;
  } catch (e) { return false; }
}

async function findGroup(ln, name) {
  try {
    if (!ln.chats || Date.now() - ln.chatsAt > 60000) {
      ln.chats = await ln.client.getChats();
      ln.chatsAt = Date.now();
    }
    return ln.chats.find(function (c) {
      return c.isGroup && String(c.name || '').indexOf(name) !== -1;
    }) || null;
  } catch (e) { return null; }
}

// تحويل الرقم المصري لـ JID واتساب: 01012345678 → 201012345678@c.us
function toJid(raw) {
  var p = String(raw || '').replace(/\D/g, '');
  if (!p) return null;
  if (p.indexOf('20') === 0 && p.length === 12) return p + '@c.us';
  if (p.charAt(0) === '0' && p.length === 11) return '20' + p.slice(1) + '@c.us';
  if (p.length === 10 && p.charAt(0) === '1') return '20' + p + '@c.us';
  return null;
}

/* ================== وحدات /add-listing → الجروبات ================== */
var listingQueue = [], lastListingPoll = 0;

async function tickListings() {
  try {
    if (Date.now() - lastListingPoll > LISTING_EVERY_MS) {
      lastListingPoll = Date.now();
      var res = await post({ action: 'easy_poll', token: POLL_TOKEN });
      if (res.ok) listingQueue = res.items || [];
    }
    if (!listingQueue.length) return;

    var it = listingQueue[0];
    var targets = (it.deal === 'إيجار' ? GROUPS_RENT : GROUPS_SALE).concat(GROUPS_ALL);
    var seen = {};
    for (var j = 0; j < targets.length; j++) {
      var gn = targets[j];
      if (!gn || seen[gn]) continue;
      seen[gn] = true;

      var ln = await freeLine(30);
      if (!ln) { log('كل الخطوط مشغولة — هرجع للوحدة دي بعدين'); return; }

      if (DRY) { log('📤 [DRY] ' + it.ref + ' → جروب: ' + gn + ' (' + ln.name + ')'); busy(ln, 2); continue; }

      var g = await findGroup(ln, gn);
      if (!g) { log('⚠️ الجروب مش موجود في واتساب: ' + gn + ' (اتأكد من الاسم)'); continue; }
      var ok = await waSend(ln, g.id, it.text);
      busy(ln, 90); // مش نضغط على نفس الخط في الجروبات
      log((ok ? '📤 اتبعتت' : '⚠️ فشلت') + ': ' + g.name + ' (' + ln.name + ')');
    }
    listingQueue.shift();
    var s = await post({ action: 'easy_sent', token: POLL_TOKEN, ref: it.ref });
    if (s.ok) log('✓ ' + it.ref + ' خلصت');
  } catch (e) {
    log('خطأ listings: ' + String(e && e.message || e));
  }
}

/* ================== حملات رسايل الملاك ==================
 * الأرقام جاية من تاب Easy_Outreach في الشيت:
 *   A: الرقم | B: الاسم (اختياري) | C: الرسالة (اختياري = القالب)
 *   B1: مدة الخلوص بالدقايق | D1: أقل فاصل على نفس الخط بالثانية
 * الجدولة: interval = max(minGap, المدة × الخطوط ÷ الأرقام)
 * فمثلاً: 500 رقم في 240 دقيقة على 5 خطوط
 *   → كل خط يبعت رسالة كل ~2.4 دقيقة (آمن جدًا) → الخلوص في 4 ساعات ✅
 * ===================================================== */
var outQueue = [], outSettings = null, lastOutPoll = 0;

async function refreshOutreach() {
  var res = await post({ action: 'easy_campaign_poll', token: POLL_TOKEN });
  if (!res.ok) { log('حملة — استعلام غلط: ' + (res.msg || '')); return; }
  outSettings = res.settings;
  outQueue = res.items || [];
  if (outQueue.length)
    log('📣 حملة جديدة: ' + outQueue.length + ' رقم — الخلوص خلال ' +
        outSettings.minutes + ' دقيقة على ' + LINES_COUNT + ' خطوط');
}

async function tickOutreach() {
  try {
    if (Date.now() - lastOutPoll > OUT_REFRESH_MS) {
      lastOutPoll = Date.now();
      await refreshOutreach();
    }
    if (!outQueue.length || !outSettings) return;

    var act = lines.filter(function (l) { return l.ready; });
    if (!act.length) return;

    var nowSec = Date.now() / 1000;
    var W      = Number(outSettings.minutes) * 60;
    var minGap = Number(outSettings.minGap || 60);
    var interval = Math.max(minGap, (W * act.length) / Math.max(outQueue.length, 1));

    for (var i = 0; i < act.length; i++) {
      var ln = act[i];
      if (nowSec < ln.nextAt || !outQueue.length) continue;

      var it = outQueue.shift();
      var jid = toJid(it.phone), ok = false, note = '';
      if (!jid) note = 'رقم غلط';
      else {
        ok = await waSend(ln, jid, it.text);
        if (!ok) note = 'مبعتتش — غالبًا الرقم مش على واتساب';
      }
      // فاصل عشوائي ±15% عشان ميبقاش إرسال ميكانيكي
      ln.nextAt = nowSec + interval * (0.85 + Math.random() * 0.3);

      log((ok ? '📤' : '⚠️') + ' ' + ln.name + ' → ' + it.phone +
          (ok ? ' ✓' : ' (' + note + ')') + ' — باقي ' + outQueue.length);
      await post({ action: 'easy_campaign_sent', token: POLL_TOKEN,
                   row: it.row, ok: ok, line: ln.id, note: note });
    }
  } catch (e) {
    log('خطأ campaign: ' + String(e && e.message || e));
  }
}

/* ================== مين ================== */
boot()
  .then(async function () { await tickListings(); await tickOutreach(); })
  .catch(function (e) { console.error(String(e)); });

setInterval(function () { tickListings(); tickOutreach(); }, OUT_TICK_MS);
