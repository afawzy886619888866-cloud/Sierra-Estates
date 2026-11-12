import fs from 'node:fs';
import path from 'node:path';

const BASE_AUTH = 'h:/Sierra Estates/apps/agents/whatsapp-multi-session/whatsapp-auth';
const OUT_FILE = 'h:/Sierra Estates/data/sierra-community-scraped-raw.json';

const SIERRA_COMMUNITY_PARENT = '120363399254642581@g.us';
const SIERRA_COMMUNITY_GROUPS = [
  '120363399254642581@g.us', // Sierra-Estates Community Root
  '120363401965989396@g.us', // Owners  Units
  '120363412518130365@g.us', // Owners August 2026
  '120363421765053541@g.us', // Owners Inventory project
  '120363424259756648@g.us', // Owners Project inventory
  '120363427150259939@g.us', // Data
  '120363425437585177@g.us', // داتا ايمان
  '120363427582483973@g.us', // Brokars uints
  '120363418223456180@g.us', // Sierra Blue Realty
  '120363401624952942@g.us', // معاينات سييرا بلو
  '120363319486949132@g.us', // Planning & Discussion
  '120363401152486619@g.us', // Requests
  '120363411055781071@g.us', // Sierra-Estates ✅
  '120363429346958202@g.us', // Sierra Estates New Batch 025
  '120363424778141898@g.us', // 🏡Availability Unit's For Sierra Blue Realty
  '120363332470232476@g.us', // New Cairo Trusted Brokers 🤝 (Sierra Blue Realty)
];

async function hydrateAndScrapeLine(sessionId) {
  const portFile = path.join(BASE_AUTH, `profile-${sessionId}`, 'DevToolsActivePort');
  if (!fs.existsSync(portFile)) return [];
  const port = fs.readFileSync(portFile, 'utf8').split('\n')[0].trim();
  const list = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(4000) })
    .then((r) => r.json())
    .catch(() => []);
  const waPage = list.find((p) => p.url && p.url.includes('web.whatsapp.com'));
  if (!waPage) return [];

  const ws = new WebSocket(waPage.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
    setTimeout(rej, 4000);
  });

  const evalRes = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve([]), 120000);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.id === 303) {
          clearTimeout(timer);
          resolve(msg.result?.result?.value || []);
        }
      } catch (_) {}
    };
    ws.send(
      JSON.stringify({
        id: 303,
        method: 'Runtime.evaluate',
        params: {
          awaitPromise: true,
          returnByValue: true,
          expression: `(async () => {
            const prioritySet = new Set(${JSON.stringify(SIERRA_COMMUNITY_GROUPS)});
            const parentTarget = ${JSON.stringify(SIERRA_COMMUNITY_PARENT)};
            const allChats = window.Store?.Chat?.getModelsArray
              ? window.Store.Chat.getModelsArray()
              : (window.Store?.Chat?._models || []);
            const contactStore = window.Store?.Contact;
            const cmd = (() => {
              try { return require('WAWebCmd')?.Cmd || window.Store?.Cmd; } catch (_) { return window.Store?.Cmd; }
            })();
            const loadMsgsMod = (() => {
              try { return require('WAWebChatLoadMessages'); } catch (_) { return null; }
            })();

            const resolveAuthorInfo = (rawAuthor, senderObj) => {
              let jid = typeof rawAuthor === 'string' ? rawAuthor : (rawAuthor?._serialized || '');
              let phone = '';
              let name = senderObj?.pushname || senderObj?.name || senderObj?.shortName || '';
              if (jid.endsWith('@c.us')) {
                phone = jid.split('@')[0];
              }
              try {
                const c = contactStore?.get ? contactStore.get(jid) : null;
                if (c) {
                  if (!name) name = c.pushname || c.name || c.formattedName || c.verifiedName || '';
                  const pn = c.phoneNumber?._serialized || c.phoneNumber?.user || c.id?.user || '';
                  const digits = String(pn).replace(/\\D/g, '');
                  if (/^(?:20)?0?1[0125]\\d{8}$/.test(digits)) {
                    phone = digits.startsWith('20') ? digits : (digits.startsWith('0') ? '20' + digits.slice(1) : '20' + digits);
                  }
                }
              } catch (_) {}
              return { jid, phone, name };
            };

            const NON_RE_GROUP_RE = /fc\s*26|fc\s*27|game\s*level|elostora\s*store|jomaika|nono\s*store|nada\s*store|story\s*bag|hana\s*store|food\s*corner|رحلات|سافروا|النايل\s*لوتس|marsa\s*alam|العائله|عائلة|اخواتي|آل\s*الكتاتني|tls\s*kg|دورات\s*مجانية|ربح\s*من\s*الانترنت|كيف\s*تحترف\s*التصميم|accessories|sakura\s*vibes|gathering|سفرة\s*الخير|online\s*mba/i;
            const RE_GROUP_HINT_RE = /owner|ملاك|مالك|broker|بروكر|عقار|شقق|فيلات|فيلا|مدينت|الرحاب|تجمع|زايد|شروق|بدر|ساحل|ميفيدا|هايد|كمبوند|resale|rent|sale|inventory|availability|available|data|داتا|request|ريكوست|طلبات|معاينات|sierra|إيجار|ايجار|تمليك|مفروش|villas|apartments|penthouse|duplex|studio|compound|realty|real\s*estate|property|properties|deals|investment|تسويق|سيلز|sales|arqa|sodic|emaar|uptown|cfc|festival|marassi|azad|villette|marasem|palm\s*hills|mountain\s*view|taj\s*city|sarai|burouj|waterway|lake\s*view|banafseg|narges|yasmeen|lotus|andalus|beit|koronfel|izone|i-zone|rcm|nuzul|home\s*way|golden\s*gate|treasure|merak|manazil|alpha|selective|evolve|darcom|diyar|katatney|planet|greeny/i;

            const matchedChats = allChats.filter((c) => {
              if (!c) return false;
              const id = String(c.id?._serialized || '');
              const pId = c.groupMetadata?.parentGroup?._serialized || '';
              const name = String(c.name || c.formattedTitle || id);
              const isGroup = Boolean(c.isGroup || id.endsWith('@g.us'));
              if (prioritySet.has(id) || pId === parentTarget) return true;
              if (isGroup) {
                if (NON_RE_GROUP_RE.test(name)) return false;
                const msgLen = c.msgs?.getModelsArray ? c.msgs.getModelsArray().length : (c.msgs?._models?.length || 0);
                return msgLen > 0 && RE_GROUP_HINT_RE.test(name);
              }
              // Also include Direct DMs that have loaded messages
              if (id.endsWith('@c.us') || id.endsWith('@lid')) {
                const msgLen = c.msgs?.getModelsArray ? c.msgs.getModelsArray().length : (c.msgs?._models?.length || 0);
                return msgLen > 0;
              }
              return false;
            });

            const out = [];
            for (const chat of matchedChats) {
              const gid = chat.id?._serialized || '';
              const gName = chat.name || chat.formattedTitle || gid;
              const isGroup = Boolean(chat.isGroup || String(gid).endsWith('@g.us'));
              const pGroup = chat.groupMetadata?.parentGroup?._serialized || null;
              const isPriority = prioritySet.has(gid) || pGroup === parentTarget;

              if (isPriority) {
                try {
                  if (cmd && typeof cmd.openChatBottom === 'function') {
                    await Promise.resolve(cmd.openChatBottom({ chat })).catch(() => Promise.resolve(cmd.openChatBottom(chat)).catch(() => null));
                    await new Promise((r) => setTimeout(r, 500));
                  }
                } catch (_) {}

                try {
                  for (let i = 0; i < 8; i++) {
                    const beforeLen = chat.msgs?.getModelsArray ? chat.msgs.getModelsArray().length : (chat.msgs?._models?.length || 0);
                    if (loadMsgsMod && typeof loadMsgsMod.loadEarlierMsgs === 'function') {
                      await Promise.race([
                        loadMsgsMod.loadEarlierMsgs(chat),
                        new Promise((r) => setTimeout(r, 1200))
                      ]).catch(() => null);
                    } else if (typeof chat.loadEarlierMsgs === 'function') {
                      await Promise.race([
                        chat.loadEarlierMsgs(),
                        new Promise((r) => setTimeout(r, 1200))
                      ]).catch(() => null);
                    }
                    await new Promise((r) => setTimeout(r, 250));
                    const afterLen = chat.msgs?.getModelsArray ? chat.msgs.getModelsArray().length : (chat.msgs?._models?.length || 0);
                    if (afterLen <= beforeLen) break;
                  }
                } catch (_) {}
              }

              const msgs = chat.msgs?.getModelsArray
                ? chat.msgs.getModelsArray()
                : (chat.msgs?._models || []);

              const extractedMsgs = [];
              for (const m of msgs) {
                if (!m) continue;
                const rawBody = String(m.body || '').trim();
                const isThumb = rawBody.startsWith('/9j/') || rawBody.startsWith('iVBOR');
                const body = String((isThumb ? m.caption : (m.caption || m.body)) || '').trim();
                const hasMedia = Boolean(m.type === 'image' || m.type === 'video' || isThumb || m.mediaData);
                if (!body && !hasMedia) continue;
                // For DMs, skip outgoing messages from our own bot lines unless it's a forwarded listing
                if (!isGroup && m.fromMe && body.length < 40) continue;
                const authorRaw = m.author || m.from || (isGroup ? '' : gid);
                const info = resolveAuthorInfo(authorRaw, m.senderObj || m.sender);
                extractedMsgs.push({
                  id: m.id?._serialized || '',
                  t: m.t || 0,
                  isoTime: m.t ? new Date(m.t * 1000).toISOString() : null,
                  type: m.type || 'chat',
                  body,
                  authorJid: info.jid,
                  authorPhone: info.phone,
                  authorName: info.name || m.notifyName || (isGroup ? '' : gName),
                  hasMedia,
                });
              }

              if (extractedMsgs.length > 0) {
                out.push({
                  sessionId: ${JSON.stringify(sessionId)},
                  groupId: gid,
                  groupName: isGroup ? gName : ('DM: ' + gName),
                  isGroup,
                  parentGroup: pGroup,
                  messageCount: extractedMsgs.length,
                  messages: extractedMsgs,
                });
              }
            }
            return out;
          })()`,
        },
      })
    );
  });

  ws.close();
  return evalRes;
}

async function main() {
  const allResults = [];
  for (const sid of ['line-2', 'line-1', 'line-3', 'line-6']) {
    console.log(`Hydrating & scraping mobile WhatsApp groups & DMs on ${sid}...`);
    const res = await hydrateAndScrapeLine(sid);
    let lineMsgs = 0;
    let lineTextMsgs = 0;
    for (const g of res) {
      const textCount = g.messages.filter((m) => m.body && m.body.length > 0).length;
      lineMsgs += g.messageCount;
      lineTextMsgs += textCount;
      allResults.push(g);
    }
    console.log(`  [${sid}] Scraped ${res.length} chats/groups -> ${lineMsgs} total msgs (${lineTextMsgs} with text/caption)`);
  }
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(allResults, null, 2), 'utf8');
  console.log(`\nSaved ${allResults.length} hydrated group/DM snapshots to ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
