'use strict';

/**
 * Sierra Estates — Real-Time WhatsApp Broker Groups RAG Harvester
 * ───────────────────────────────────────────────────────────────
 * Ingests and parses property offers dropped into WhatsApp broker groups
 * across all 8 lines in real-time.
 * 
 * Capabilities:
 *  1. Compound extraction & New Cairo Gazetteer geocoding (lat, lng, zone)
 *  2. Deal type classification (Sale vs Rent)
 *  3. Price normalization (EGP / USD) & Area (m²) extraction
 *  4. Broker contact deduplication
 *  5. Server-Sent Events (SSE) live push to the interactive web map
 */

const fs = require('fs');
const path = require('path');

// New Cairo Compound Gazetteer
const GAZETTEER = [
  { keys: ['ميفيدا', 'mivida', 'mevida'], label: 'Mivida', zone: '5th Settlement', lat: 30.007, lng: 31.589 },
  { keys: ['ماونتن فيو هايد بارك', 'ماونتن فيو هيد بارك', 'mv hp', 'mountain view hyde park'], label: 'Mountain View Hyde Park', zone: '5th Settlement', lat: 30.008, lng: 31.645 },
  { keys: ['هايد بارك', 'هايدبارك', 'hyde park', 'hydepark'], label: 'Hyde Park', zone: '5th Settlement', lat: 30.015, lng: 31.635 },
  { keys: ['فيفث سكوير', 'المراسم', 'fifth square', 'marasem', '5th square'], label: 'Fifth Square', zone: '5th Settlement', lat: 30.025, lng: 31.578 },
  { keys: ['بالم هيلز', 'palm hills', 'palm hills new cairo', 'pk1', 'pk2'], label: 'Palm Hills New Cairo', zone: '5th Settlement', lat: 30.012, lng: 31.615 },
  { keys: ['مدينتي', 'madinaty'], label: 'Madinaty', zone: 'Madinaty', lat: 30.101, lng: 31.664 },
  { keys: ['الرحاب', 'rehab', 'al rehab'], label: 'Al Rehab', zone: 'Al Rehab', lat: 30.058, lng: 31.514 },
  { keys: ['بيت الوطن', 'بيت وطن', 'beit el watan', 'beit watan'], label: 'Beit El Watan', zone: 'Beit El Watan', lat: 30.045, lng: 31.585 },
  { keys: ['جنوب الاكاديمية', 'جنوب الأكاديمية', 'south academy'], label: 'South Academy', zone: '5th Settlement', lat: 30.038, lng: 31.488 },
  { keys: ['الشويفات', 'شويفات', 'choueifat'], label: 'Choueifat', zone: '5th Settlement', lat: 30.012, lng: 31.468 },
  { keys: ['قطامية ديونز', 'katameya dunes'], label: 'Katameya Dunes', zone: 'Golf Zones', lat: 29.985, lng: 31.515 },
  { keys: ['ايست تاون', 'ايستاون', 'eastown'], label: 'Eastown Sodic', zone: '5th Settlement', lat: 30.018, lng: 31.505 },
  { keys: ['فيليت', 'villette'], label: 'Villette Sodic', zone: '5th Settlement', lat: 30.010, lng: 31.555 },
  { keys: ['سراي', 'sarai'], label: 'Sarai', zone: 'Suez Road', lat: 30.085, lng: 31.695 },
  { keys: ['البروج', 'al burouj', 'burouj'], label: 'Al Burouj', zone: 'Suez Road', lat: 30.155, lng: 31.725 },
  { keys: ['البوسكو سيتي', 'il bosco city', 'bosco city'], label: 'Il Bosco City', zone: 'Mostakbal City', lat: 30.045, lng: 31.710 },
  { keys: ['سوان ليك', 'swan lake', 'swanlake'], label: 'Swan Lake', zone: '1st Settlement', lat: 30.052, lng: 31.475 },
  { keys: ['اب تاون كايرو', 'uptown cairo', 'uptown'], label: 'Uptown Cairo', zone: 'Mokattam', lat: 30.011, lng: 31.297 },
  { keys: ['واتر واي', 'waterway', 'the waterway'], label: 'The Waterway', zone: 'Northern 90', lat: 30.042, lng: 31.508 },
  { keys: ['ازار', 'azzar'], label: 'Azzar', zone: 'Golden Square', lat: 30.035, lng: 31.565 },
  { keys: ['التسعين الشمالي', '90 north', 'north 90'], label: 'North 90 St', zone: 'Northern 90', lat: 30.032, lng: 31.495 },
  { keys: ['التسعين الجنوبي', '90 south', 'south 90'], label: 'South 90 St', zone: 'Southern 90', lat: 30.020, lng: 31.490 },
  { keys: ['المربع الذهبي', 'golden square'], label: 'Golden Square', zone: 'Golden Square', lat: 30.022, lng: 31.580 },
  { keys: ['النرجس', 'narges'], label: 'Al Narges', zone: '5th Settlement', lat: 30.005, lng: 31.475 },
  { keys: ['الياسمين', 'yasmeen'], label: 'Al Yasmeen', zone: '1st Settlement', lat: 30.045, lng: 31.465 },
  { keys: ['البنفسج', 'banafsaj'], label: 'Al Banafsaj', zone: '1st Settlement', lat: 30.055, lng: 31.485 }
];

const DEFAULT_CENTER = { lat: 30.03, lng: 31.47, label: 'New Cairo Central', zone: 'New Cairo' };

const PHONE_REGEX = /(?:\+?20[\s\-.]?)?0?1[0125](?:[\s\-.]?\d){8}/g;

class BrokerHarvester {
  constructor() {
    this.recentUnits = [];
    this.maxRecent = 150;
    this.stats = {
      messagesProcessed: 0,
      unitsHarvested: 0,
      activeBrokers: new Set(),
      compoundsTracked: new Set(),
      lastHarvestTime: null
    };
    this.sseClients = new Set();
    this.dedupeMap = new Map(); // hash -> timestamp
    this.logFile = path.resolve(__dirname, 'whatsapp-auth', 'harvested_units.jsonl');
  }

  /**
   * Register an SSE client connection for live map updates
   */
  addSseClient(res) {
    this.sseClients.add(res);
    res.on('close', () => {
      this.sseClients.delete(res);
    });
  }

  /**
   * Broadcast real-time unit alert to all connected map pages
   */
  broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch (_) {
        this.sseClients.delete(client);
      }
    }
  }

  /**
   * Process an incoming WhatsApp message across any of the 8 lines
   */
  async handleIncomingMessage(sessionId, msg) {
    if (!msg || !msg.body) return null;
    this.stats.messagesProcessed++;

    const text = String(msg.body).trim();
    if (text.length < 25) return null; // Skip conversational noise / greetings

    // Check if message is a property listing
    if (!this.isPropertyListing(text)) return null;

    const parsed = this.parseListing(text, msg, sessionId);
    if (!parsed) return null;

    // Deduplication check
    const dedupeKey = `${parsed.dealType}_${parsed.compound}_${parsed.priceEgp || 0}_${parsed.areaSqm || 0}_${parsed.brokerPhone || ''}`;
    const now = Date.now();
    if (this.dedupeMap.has(dedupeKey) && now - this.dedupeMap.get(dedupeKey) < 24 * 3600 * 1000) {
      return null; // duplicate within 24h
    }
    this.dedupeMap.set(dedupeKey, now);

    // Save and track
    this.stats.unitsHarvested++;
    this.stats.lastHarvestTime = new Date().toISOString();
    if (parsed.brokerPhone) this.stats.activeBrokers.add(parsed.brokerPhone);
    if (parsed.compound) this.stats.compoundsTracked.add(parsed.compound);

    this.recentUnits.unshift(parsed);
    if (this.recentUnits.length > this.maxRecent) {
      this.recentUnits.pop();
    }

    // Persist to local JSONL
    try {
      fs.appendFileSync(this.logFile, JSON.stringify(parsed) + '\n');
    } catch (_) {}

    // Broadcast live alert to map station!
    console.log(`\n🔥 [HARVESTER] New Unit Grabbed from Line ${sessionId}:`);
    console.log(`   Compound: ${parsed.compound} (${parsed.zone})`);
    console.log(`   Type: ${parsed.unitType} · ${parsed.dealType} · ${parsed.priceText}`);
    console.log(`   Broker: ${parsed.brokerPhone || 'Unknown'}\n`);

    this.broadcast('NEW_UNIT', {
      unit: parsed,
      stats: this.getStatsSummary()
    });

    return parsed;
  }

  isPropertyListing(text) {
    const t = text.toLowerCase();
    const keywords = [
      'للبيع', 'للايجار', 'للإيجار', 'ايجار', 'إيجار', 'بيع',
      'شقة', 'فيلا', 'توين هاوس', 'تاون هاوس', 'دوبلكس', 'بنتهاوس', 'روف',
      'مساحة', 'مساحه', 'مطلوب', 'متاح', 'كمبوند', 'كود', 'استلام',
      'أقساط', 'اقساط', 'مقدم', 'over', 'resale', 'sqm'
    ];
    let count = 0;
    for (const kw of keywords) {
      if (t.includes(kw)) count++;
      if (count >= 2) return true;
    }
    return false;
  }

  parseListing(text, msg, sessionId) {
    const t = text.toLowerCase();

    // 1. Resolve Compound & Geo
    let location = DEFAULT_CENTER;
    let compound = 'New Cairo';
    for (const entry of GAZETTEER) {
      if (entry.keys.some(k => t.includes(k))) {
        location = entry;
        compound = entry.label;
        break;
      }
    }

    // 2. Deal Type
    const isRent = t.includes('للايجار') || t.includes('إيجار') || t.includes('ايجار') || t.includes('مفروش');
    const isSale = t.includes('للبيع') || t.includes('بيع') || t.includes('كاش') || t.includes('اقساط') || t.includes('resale');
    const dealType = (isRent && !isSale) ? 'Rent' : 'Sale';

    // 3. Unit Type
    let unitType = 'Apartment';
    if (t.includes('فيلا مستقلة') || t.includes('standalone') || t.includes('فيلا')) unitType = 'Standalone Villa';
    else if (t.includes('توين هاوس') || t.includes('twin house')) unitType = 'Twin House';
    else if (t.includes('تاون هاوس') || t.includes('town house')) unitType = 'Townhouse';
    else if (t.includes('دوبلكس') || t.includes('duplex')) unitType = 'Duplex';
    else if (t.includes('بنتهاوس') || t.includes('penthouse') || t.includes('روف')) unitType = 'Penthouse';
    else if (t.includes('استوديو') || t.includes('studio')) unitType = 'Studio';
    else if (t.includes('اداري') || t.includes('تجاري') || t.includes('مكتب') || t.includes('عيادة')) unitType = 'Commercial/Admin';

    // 4. Price Extraction
    let priceEgp = 0;
    let priceText = 'Contact for Price';
    const mMatch = t.match(/(\d+(?:[.,]\d+)?)\s*(?:مليون|ملون|million|\bm\b)/i);
    if (mMatch) {
      const num = parseFloat(mMatch[1].replace(',', '.'));
      if (num > 0) {
        priceEgp = Math.round(num * 1_000_000);
        priceText = `${num} Million EGP`;
      }
    }
    if (!priceEgp) {
      const kMatch = t.match(/(\d+(?:[.,]\d+)?)\s*(?:الف|ألف|الاف|k\b)/i);
      if (kMatch) {
        const num = parseFloat(kMatch[1].replace(',', '.'));
        if (num > 0) {
          priceEgp = Math.round(num * 1000);
          priceText = `${priceEgp.toLocaleString()} EGP`;
        }
      }
    }

    // 5. Area Extraction
    let areaSqm = 0;
    const areaMatch = t.match(/(\d{2,4})\s*(?:متر|م²|م2|م\b|sqm)/i);
    if (areaMatch) {
      areaSqm = parseInt(areaMatch[1], 10);
    }

    // 6. Bedrooms Extraction
    let bedrooms = 0;
    const bedMatch = t.match(/(\d)\s*(?:غرف|نوم|غرفه|غرفة|beds|bed)/i);
    if (bedMatch) {
      bedrooms = parseInt(bedMatch[1], 10);
    }

    // 7. Broker Phone Number
    const phones = [];
    const matches = text.match(PHONE_REGEX);
    if (matches) {
      for (const m of matches) {
        let clean = m.replace(/[^\d+]/g, '');
        if (clean.startsWith('01') && clean.length === 11) phones.push('2' + clean);
        else if (clean.startsWith('201') && clean.length === 12) phones.push(clean);
        else if (clean.startsWith('+201')) phones.push(clean.slice(1));
      }
    }
    const sender = msg.author || msg.from || '';
    const senderDigits = sender.replace(/[^\d]/g, '');
    const brokerPhone = phones[0] || (senderDigits.startsWith('20') ? senderDigits : null);

    return {
      id: `hw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      rawText: text,
      compound,
      zone: location.zone,
      lat: location.lat + (Math.random() - 0.5) * 0.003, // subtle jitter to separate overlapping compound pins
      lng: location.lng + (Math.random() - 0.5) * 0.003,
      dealType,
      unitType,
      priceEgp,
      priceText,
      areaSqm: areaSqm || null,
      bedrooms: bedrooms || null,
      brokerPhone,
      brokerName: msg.sender?.pushname || msg.notifyName || 'WhatsApp Broker',
      sourceChat: msg.chat?.name || (msg.isGroupMsg ? 'Broker Group' : 'Direct Message'),
      capturedByLine: sessionId,
      harvestedAt: new Date().toISOString()
    };
  }

  getStatsSummary() {
    return {
      messagesProcessed: this.stats.messagesProcessed,
      unitsHarvested: this.stats.unitsHarvested,
      activeBrokersCount: this.stats.activeBrokers.size,
      compoundsTrackedCount: this.stats.compoundsTracked.size,
      lastHarvestTime: this.stats.lastHarvestTime
    };
  }
}

module.exports = {
  BrokerHarvester,
  harvesterInstance: new BrokerHarvester()
};
