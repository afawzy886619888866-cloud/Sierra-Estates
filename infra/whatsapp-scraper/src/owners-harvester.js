/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Sierra Estates — Direct WhatsApp Owners Harvester & Media Sync
 * ═══════════════════════════════════════════════════════════════════════════
 */

import baileysPkg, {
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
} from '@whiskeysockets/baileys';
const makeWASocket = baileysPkg.default || baileysPkg.makeWASocket || baileysPkg;
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = pino({ level: 'info', name: 'sierra-wa-owners' });

const OUTPUT_DIR = process.env.OUTPUT_DIR || 'H:\\Sheets';
const MEDIA_DIR = path.join(OUTPUT_DIR, 'Owners_Media');
const INVENTORY_FILE = path.join(OUTPUT_DIR, 'Owners_Inventory.json');

if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

const COMPOUNDS_MAP = {
  'Madinaty': [/مدينت[يى]/i, /madinat/i],
  'Al Rehab': [/الرحاب/i, /rehab/i],
  'Mivida': [/ميفيدا/i, /mivida/i],
  'Hyde Park': [/هايد\s*بارك/i, /hyde\s*park/i],
  'Mountain View': [/ماونتن\s*فيو/i, /mountain\s*view/i],
  'Villette': [/فيليت/i, /villette/i],
  'Palm Hills': [/بالم\s*هيلز/i, /palm\s*hills/i],
  'Eastown': [/ايست\s*تاون/i, /eastown/i],
  'Swan Lake': [/سوان\s*ليك/i, /swan\s*lake/i],
  'Katameya Dunes': [/ديونز/i, /dunes/i],
  'Beit El Watan': [/بيت\s*الوطن/i, /beit\s*el\s*watan/i],
  'El Shorouk': [/الشروق/i, /shorouk/i],
  'Cairo Festival': [/فستيفال/i, /\bcfc\b/i],
  'Fifth Square': [/فيفت\s*سكوير/i, /fifth\s*square/i],
  'Sodic': [/سوديك/i, /sodic/i],
  'New Cairo': [/التجمع/i, /new\s*cairo/i],
  'Sheikh Zayed': [/الشيخ\s*زايد/i, /zayed/i],
  'North Coast': [/الساحل\s*الشمالي/i, /north\s*coast/i],
};

function normalizePhone(v) {
  if (!v) return null;
  const d = String(v).replace(/\D/g, '');
  if (!d) return null;
  let p = d;
  if (p.startsWith('20') && p.length >= 12) p = p.slice(2);
  if (p.length === 10 && p.startsWith('1')) p = '0' + p;
  return p.length === 11 && p.startsWith('01') ? p : (d.length >= 8 ? d : null);
}

function extractCompound(text) {
  for (const [name, regexes] of Object.entries(COMPOUNDS_MAP)) {
    if (regexes.some((r) => r.test(text))) return name;
  }
  return 'New Cairo General';
}

function parsePrice(text) {
  const m = text.match(/(\d+(?:[.,]\d+)*)\s*(?:مليون|ملون|million|الف|ألف|k\b|جنيه|egp|usd|\$|دولار)/i);
  if (m) {
    let num = parseFloat(m[1].replace(/,/g, ''));
    if (/مليون|ملون|million/i.test(m[0])) num *= 1_000_000;
    else if (/الف|ألف|k\b/i.test(m[0])) num *= 1_000;
    return num;
  }
  const nums = text.match(/\b\d{4,8}\b/g);
  if (nums) {
    const valid = nums.map(Number).filter((n) => n < 1990 || n > 2035);
    if (valid.length > 0) return valid[0];
  }
  return null;
}

function parseDealType(text) {
  if (/ايجار|إيجار|rent/i.test(text)) return 'Rent';
  if (/بيع|sale|sell|resale|تنازل/i.test(text)) return 'Sale';
  return 'Unknown';
}

// In-memory harvested listings store
const harvestedOwners = new Map();
let unitSeq = 1;

async function processIncomingListing(msg, sock) {
  const jid = msg.key.remoteJid;
  const senderJid = msg.key.participant || jid;
  const senderPhone = normalizePhone(senderJid.split('@')[0]);

  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    '';

  const isOwnerIndicator = /مالك|من المالك|اونر|owner|direct owner|بدون وسيط/i.test(text) ||
    /owner|ملاك|مالك/i.test(jid);

  const phoneMatch = text.match(/(?<!\d)(?:\+?20[\s\-.]?)?0?1[0125](?:[\s\-.]?\d){8}(?!\d)/);
  const contactPhone = phoneMatch ? normalizePhone(phoneMatch[0]) : senderPhone;

  if (!contactPhone) return;

  const hasImage = !!(msg.message?.imageMessage || msg.message?.documentMessage?.mimetype?.startsWith('image/'));
  let savedPhotoPath = '';
  let photoCode = '';

  const unitCode = `SE-OWN-${String(unitSeq++).padStart(4, '0')}`;

  if (hasImage) {
    try {
      photoCode = `${unitCode}-IMG`;
      const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger });
      const photoFileName = `${unitCode}_${Date.now()}.jpg`;
      const fullPhotoPath = path.join(MEDIA_DIR, photoFileName);
      fs.writeFileSync(fullPhotoPath, buffer);
      savedPhotoPath = fullPhotoPath;
      logger.info({ unitCode, photoFileName }, '📸 Downloaded and tagged unit photo');
    } catch (err) {
      logger.error({ err: err.message }, 'Failed to download image attachment');
    }
  }

  const compound = extractCompound(text);
  const price = parsePrice(text);
  const deal = parseDealType(text);
  const areaMatch = text.match(/(\d{2,4})\s*(?:متر|م²|m2|sqm)/i);
  const roomsMatch = text.match(/(\d)\s*(?:غرف|غرفة|نوم|rooms?|beds?)/i);

  const listingRecord = {
    Unit_Code: unitCode,
    Owner_Phone: contactPhone,
    Compound: compound,
    Deal_Type: deal,
    Price_EGP: price,
    Area_m2: areaMatch ? Number(areaMatch[1]) : null,
    Rooms: roomsMatch ? Number(roomsMatch[1]) : null,
    Has_Photos: hasImage ? 'YES' : 'NO',
    Photo_Code: photoCode || null,
    Photo_Path: savedPhotoPath || null,
    Status: hasImage ? 'Ready / Complete' : 'Needs Revision (No Photos)',
    Advertiser_Type: isOwnerIndicator ? 'Owner' : 'Direct / Owner Group',
    Source_Channel: jid,
    Received_At: new Date().toISOString(),
    Description: text.slice(0, 500),
  };

  harvestedOwners.set(unitCode, listingRecord);
  logger.info({ unitCode, hasImage, compound, price }, '✅ Added to Owners Inventory queue');

  // Persist JSON cache for Excel exporter
  fs.writeFileSync(INVENTORY_FILE, JSON.stringify(Array.from(harvestedOwners.values()), null, 2));
}

export async function startOwnersHarvester() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, '../auth'));

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'warn' }),
    browser: ['Sierra Estates Harvester', 'Chrome', '1.0.0'],
    syncFullHistory: true,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n======================================================');
      console.log('📱 SCAN THIS QR CODE IN WHATSAPP MOBILE TO CONNECT:');
      console.log('Open WhatsApp > Linked Devices > Link a Device');
      console.log('======================================================\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('\n✅ WhatsApp Connected! Harvesting Owners Groups & Photos...\n');
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error instanceof Boom &&
        lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        setTimeout(() => startOwnersHarvester(), 3000);
      } else {
        console.log('Logged out. Re-run to scan new QR code.');
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      await processIncomingListing(msg, sock);
    }
  });

  return sock;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startOwnersHarvester();
}
