/**
 * Sierra Estates — USB Phone WhatsApp Scraper & Date-Parsing Engine
 * ──────────────────────────────────────────────────────────────────
 * Extracts units from WhatsApp chat logs (.txt/.zip), groups consecutive
 * photos and price followups, parses the exact posted date/time, codes
 * each unit with institutional SE-WA-XXXXXX codes, classifies advertiser
 * and deal type, and filters out buyer requests.
 */

import crypto from 'node:crypto';

export const GAZETTEER = [
  { keys: ['ميفيدا', 'mivida', 'mevida'], label: 'Mivida', code: 'MVD', zone: '5th Settlement', lat: 30.007, lng: 31.589 },
  { keys: ['ماونتن فيو هايد بارك', 'ماونتن فيو هيد بارك', 'mv hp', 'mountain view hyde park'], label: 'Mountain View Hyde Park', code: 'MVH', zone: '5th Settlement', lat: 30.008, lng: 31.645 },
  { keys: ['هايد بارك', 'هايدبارك', 'hyde park', 'hydepark'], label: 'Hyde Park', code: 'HYD', zone: '5th Settlement', lat: 30.015, lng: 31.635 },
  { keys: ['فيفث سكوير', 'المراسم', 'fifth square', 'marasem', '5th square'], label: 'Fifth Square', code: 'FSQ', zone: '5th Settlement', lat: 30.025, lng: 31.578 },
  { keys: ['بالم هيلز', 'palm hills', 'palm hills new cairo', 'pk1', 'pk2'], label: 'Palm Hills New Cairo', code: 'PLM', zone: '5th Settlement', lat: 30.012, lng: 31.615 },
  { keys: ['مدينتي', 'madinaty'], label: 'Madinaty', code: 'MAD', zone: 'Madinaty', lat: 30.101, lng: 31.664 },
  { keys: ['الرحاب', 'rehab', 'al rehab'], label: 'Al Rehab', code: 'RHB', zone: 'Al Rehab', lat: 30.058, lng: 31.514 },
  { keys: ['بيت الوطن', 'بيت وطن', 'beit el watan', 'beit watan'], label: 'Beit El Watan', code: 'BTW', zone: 'Beit El Watan', lat: 30.045, lng: 31.585 },
  { keys: ['ايست تاون', 'ايستاون', 'eastown'], label: 'Eastown Sodic', code: 'EST', zone: '5th Settlement', lat: 30.018, lng: 31.505 },
  { keys: ['فيليت', 'villette'], label: 'Villette Sodic', code: 'VIL', zone: '5th Settlement', lat: 30.010, lng: 31.555 },
  { keys: ['سراي', 'sarai'], label: 'Sarai', code: 'SAR', zone: 'Suez Road', lat: 30.085, lng: 31.695 },
  { keys: ['البروج', 'al burouj', 'burouj'], label: 'Al Burouj', code: 'BUR', zone: 'Suez Road', lat: 30.155, lng: 31.725 },
  { keys: ['سوان ليك', 'swan lake', 'swanlake'], label: 'Swan Lake', code: 'SWN', zone: '1st Settlement', lat: 30.052, lng: 31.475 },
  { keys: ['اوريانا', 'oriana'], label: 'Oriana', code: 'ORI', zone: 'Cairo Festival City', lat: 30.028, lng: 31.408 },
  { keys: ['كايرو فيستيفال', 'cfc', 'cairo festival city'], label: 'Cairo Festival City', code: 'CFC', zone: '5th Settlement', lat: 30.030, lng: 31.405 },
  { keys: ['ووتر واي', 'waterway', 'the waterway'], label: 'The Waterway', code: 'WTW', zone: 'Northern 90', lat: 30.042, lng: 31.508 },
  { keys: ['ازار', 'azzar'], label: 'Azzar', code: 'AZR', zone: 'Golden Square', lat: 30.035, lng: 31.565 },
  { keys: ['النرجس', 'narges'], label: 'Al Narges', code: 'NRG', zone: '5th Settlement', lat: 30.005, lng: 31.475 },
  { keys: ['الياسمين', 'yasmeen'], label: 'Al Yasmeen', code: 'YSM', zone: '1st Settlement', lat: 30.045, lng: 31.465 },
  { keys: ['البنفسج', 'banafsaj'], label: 'Al Banafsaj', code: 'BNF', zone: '1st Settlement', lat: 30.055, lng: 31.485 },
  { keys: ['the address', 'ذا ادرس', 'الادرس'], label: 'The Address', code: 'ADR', zone: '5th Settlement', lat: 30.022, lng: 31.488 },
  { keys: ['lake view', 'lake view residence', 'ليك فيو'], label: 'Lake View Residence', code: 'LKV', zone: 'Golden Square', lat: 30.019, lng: 31.535 },
  { keys: ['ميدتاون', 'midtown', 'mid town'], label: 'Midtown', code: 'MDT', zone: '5th Settlement', lat: 30.023, lng: 31.512 },
  { keys: ['ازاد', 'azad'], label: 'Azad', code: 'AZD', zone: '5th Settlement', lat: 30.021, lng: 31.520 },
  { keys: ['سيلفر بالم', 'silver palm'], label: 'Silver Palm', code: 'SLV', zone: '5th Settlement', lat: 30.018, lng: 31.525 },
  { keys: ['ليلة', 'layla', 'laila'], label: 'Layla Compound', code: 'LYL', zone: '5th Settlement', lat: 30.022, lng: 31.530 }
];

const PHONE_REGEX = /(?:\+?20[\s\-.]?)?0?1[0125](?:[\s\-.]?\d){8}/g;
const ATTACH_REGEX = /([\w-]+\.(?:jpg|jpeg|png|webp))\s*\((?:file attached|ملف مرفق)\)/i;

export function toWesternDigits(str) {
  if (!str) return '';
  return String(str)
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}

export function normalizePhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('0020') && digits.length === 14) return '+20' + digits.slice(4);
  if (digits.startsWith('20') && digits.length === 12) return '+20' + digits.slice(2);
  if (digits.startsWith('01') && digits.length === 11) return '+20' + digits.slice(1);
  if (digits.startsWith('1') && digits.length === 10) return '+20' + digits;
  if (digits.length >= 7) return digits;
  return digits;
}

export function extractLast7(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 7 ? digits.slice(-7) : digits;
}

/**
 * Standardizes any WhatsApp timestamp into { iso, day, readable, timestamp }
 */
export function parsePostedDate(raw) {
  if (!raw) return null;
  let s = toWesternDigits(raw).trim();
  s = s.replace(/^[\[\s]+|[\]\s\-]+$/g, '');
  s = s.replace(/[\u202F\u00A0]/g, ' ');

  const parts = s.split(/[,\s]+/);
  if (parts.length < 2) return null;

  const datePart = parts[0];
  const timePart = parts.slice(1).join(' ');

  const dateTokens = datePart.split(/[-/.]/).map((n) => parseInt(n, 10));
  if (dateTokens.length !== 3 || dateTokens.some(isNaN)) return null;

  let day, month, year;
  if (dateTokens[0] > 1000) {
    year = dateTokens[0];
    month = dateTokens[1];
    day = dateTokens[2];
  } else {
    let y = dateTokens[2];
    if (y < 100) y += 2000;
    year = y;

    if (dateTokens[0] > 12) {
      day = dateTokens[0];
      month = dateTokens[1];
    } else if (dateTokens[1] > 12) {
      month = dateTokens[0];
      day = dateTokens[1];
    } else {
      // Default Egyptian WhatsApp locale is DD/MM/YYYY
      day = dateTokens[0];
      month = dateTokens[1];
    }
  }

  const timeMatch = timePart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([APap][Mm]|م|ص)?/);
  if (!timeMatch) return null;

  let hour = parseInt(timeMatch[1], 10);
  const min = parseInt(timeMatch[2], 10);
  const sec = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
  const ampm = timeMatch[4] ? timeMatch[4].toLowerCase() : null;

  if (ampm) {
    if ((ampm.includes('p') || ampm === 'م') && hour < 12) hour += 12;
    if ((ampm.includes('a') || ampm === 'ص') && hour === 12) hour = 0;
  }

  const pad = (n) => String(n).padStart(2, '0');
  const isoDay = `${year}-${pad(month)}-${pad(day)}`;
  const isoTime = `${pad(hour)}:${pad(min)}:${pad(sec)}`;
  const readable = `${isoDay} ${pad(hour)}:${pad(min)}`;

  const parsedDate = new Date(Date.UTC(year, month - 1, day, hour - 2, min, sec)); // Cairo is UTC+2
  const timestamp = isNaN(parsedDate.getTime()) ? Date.now() : parsedDate.getTime();

  return {
    iso: `${isoDay}T${isoTime}Z`,
    day: isoDay,
    readable,
    timestamp
  };
}

export function parseWhatsAppExport(text) {
  if (!text) return [];
  const cleaned = text.replace(/[\u200E\u200F\u202A-\u202E\uFEFF]/g, '');

  const linePattern = /^(?:\[?(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}[,\s]+\d{1,2}:\d{2}(?::\d{2})?(?:[\s\u202F\u00A0]*[APap][Mm]|[\s\u202F\u00A0]*[مص])?)\]?[\s\-:]+)([^:]+?):\s*(.*)$/;

  const rawLines = cleaned.split(/\r?\n/);
  const messages = [];
  let currentMsg = null;

  for (const line of rawLines) {
    const match = line.match(linePattern);
    if (match) {
      if (currentMsg) messages.push(currentMsg);
      currentMsg = {
        timestampRaw: match[1].replace(/[\u202F\u00A0]/g, ' ').trim(),
        sender: match[2].trim(),
        text: match[3]
      };
    } else if (currentMsg) {
      currentMsg.text += '\n' + line;
    }
  }
  if (currentMsg) messages.push(currentMsg);

  return messages;
}

/**
 * Checks if a message is a buyer/client request rather than an available unit
 */
export function isClientRequest(text) {
  const lower = toWesternDigits(text || '').toLowerCase();
  const requestClues = [
    'مطلوب للشراء', 'مطلوب للايجار', 'مطلوب للإيجار', 'مطلوب فورا', 'مطلوب فوراً',
    'مطلوب كود', 'طلب عميل', 'مطلوب شقة', 'مطلوب فيلا', 'مطلوب دوبلكس',
    'مطلوب تاون', 'مطلوب توين', 'مطلوب ستوديو', 'مطلوب ارض', 'مطلوب مقر',
    'مطلوب صيدلية', 'مطلوب محل', 'مطلوب من المالك', 'محتاج شقة', 'محتاج فيلا',
    'محتاجه ضروري', 'محتاج ضروري', 'محتاجه', 'محتاج', 'زبون جاهز', 'معايا مشتري',
    'looking for', 'buyer request', 'client request', 'urgent request'
  ];

  for (const clue of requestClues) {
    if (lower.includes(clue)) return true;
  }
  if (/^مطلوب\s+(?:شقة|فيلا|دوبلكس|مقر|محل|أرض|ارض|توين|تاون)/.test(lower)) return true;
  return false;
}

/**
 * Checks explicit owner evidence per Rule 1 of real-estate-excel-processor
 */
export function isDirectOwner(text, sender) {
  const combined = `${sender || ''} ${text || ''}`.toLowerCase();
  const ownerClues = [
    'من المالك مباشرة', 'من المالك مباشر', 'من المالك', 'أنا المالك', 'انا المالك',
    'المالك مباشر', 'المالك نفسه', 'صاحب الشقة', 'صاحب الوحدة', 'صاحب العقار',
    'مالك الوحدة', 'مالك الشقة', 'صاحب الشأن', 'direct owner', 'from owner',
    'by owner', 'direct from owner', 'owner directly', 'fsbo'
  ];
  return ownerClues.some((c) => combined.includes(c));
}

export function extractUnitDetails(msg, groupName = 'WhatsApp') {
  let text = msg.text || '';
  if (text.length < 15) return null;

  const westernText = toWesternDigits(text);
  const lower = westernText.toLowerCase();

  const isRequest = isClientRequest(westernText);

  // Compound detection
  let detectedCompound = null;
  for (const g of GAZETTEER) {
    if (g.keys.some((k) => lower.includes(k))) {
      detectedCompound = g;
      break;
    }
  }

  // Phone detection
  let phone = null;
  const phones = westernText.match(PHONE_REGEX);
  if (phones && phones.length > 0) {
    phone = normalizePhone(phones[0]);
  } else if (PHONE_REGEX.test(msg.sender)) {
    phone = normalizePhone(msg.sender);
  }

  // Price parsing
  let price = 0;
  const priceMatch = westernText.match(/(?:مطلوب|سعر|السعر|اجمالي|إجمالي|بـ|ب|price|total|rent|الايجار|الإيجار)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(مليون|الف|ألف|k|m|egp|جنيه)?/i)
    || westernText.match(/(\d+(?:[.,]\d+)?)\s*(مليون|الف|ألف|k|m|egp|جنيه)/i)
    || westernText.match(/(\d+)\s*k\b/i);
  if (priceMatch) {
    let num = parseFloat(priceMatch[1].replace(/,/g, '')) || 0;
    const unit = (priceMatch[2] || '').toLowerCase();
    if (unit.includes('مليون') || unit === 'm') num *= 1_000_000;
    else if (unit.includes('الف') || unit.includes('ألف') || unit === 'k' || priceMatch[0].toLowerCase().includes('k')) num *= 1_000;
    else if (num > 0 && num < 100) num *= 1_000_000;
    price = Math.round(num);
  }

  // Deal type: Rule 3 (400k threshold)
  let dealType = 'Sale';
  const isExplicitRent = lower.includes('ايجار') || lower.includes('إيجار') || lower.includes('للايجار') || lower.includes('للإيجار') || lower.includes('rent');
  if (price > 400_000) {
    dealType = 'Sale';
  } else if (price > 0 && price <= 400_000) {
    dealType = 'Rent';
  } else if (isExplicitRent) {
    dealType = 'Rent';
  }

  // Specs
  let area = null;
  const areaMatch = westernText.match(/(?:مساحة|مساحه|area)?\s*[:=]?\s*(\d+)\s*(?:متر|م|sqm|m2)/i);
  if (areaMatch) area = parseInt(areaMatch[1], 10);

  let bedrooms = 3;
  const bedMatch = westernText.match(/(\d+)\s*(?:غرف|غرفة|bedrooms|bedroom|beds|bed)/i);
  if (bedMatch) bedrooms = parseInt(bedMatch[1], 10);

  let bathrooms = 2;
  const bathMatch = westernText.match(/(\d+)\s*(?:حمام|حمامات|bathrooms|bathroom|baths|bath)/i);
  if (bathMatch) bathrooms = parseInt(bathMatch[1], 10);

  // Property type
  let propType = 'Apartment';
  if (lower.includes('فيلا مستقلة') || lower.includes('فيلا ستاند الون') || lower.includes('ستاند الون') || lower.includes('فيلا')) propType = 'Standalone Villa';
  else if (lower.includes('توين هاوس') || lower.includes('توين')) propType = 'Twin House';
  else if (lower.includes('تاون هاوس') || lower.includes('تاون')) propType = 'Townhouse';
  else if (lower.includes('بنتهاوس') || lower.includes('روف')) propType = 'Penthouse';
  else if (lower.includes('دوبلكس')) propType = 'Duplex';

  // Photos attached inside msg text
  const photoMatches1 = [...text.matchAll(/<(?:attached|ملف مرفق):\s*([^>]+)>/gi)].map((m) => m[1].trim());
  const photoMatches2 = [...text.matchAll(new RegExp(ATTACH_REGEX, 'gi'))].map((m) => m[1].trim());
  const attachedPhotos = Array.from(new Set([...photoMatches1, ...photoMatches2])).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));

  // Date parsing
  const parsedDate = parsePostedDate(msg.timestampRaw) || {
    iso: new Date().toISOString(),
    day: new Date().toISOString().slice(0, 10),
    readable: new Date().toISOString().slice(0, 16).replace('T', ' '),
    timestamp: Date.now()
  };

  const advertiser = isDirectOwner(westernText, msg.sender) ? 'Direct Owner' : 'Broker';
  const phoneLast7 = extractLast7(phone);

  const hashKey = `${detectedCompound?.label || 'New Cairo'}|${area || ''}|${price || ''}|${phoneLast7 || msg.sender || ''}`;
  const dupeHash = crypto.createHash('sha256').update(hashKey).digest('hex').slice(0, 16);
  
  // Sierra Estates Institutional Unit Code: SE-WA-XXXXXXXX
  const unitCode = `SE-WA-${dupeHash.slice(0, 8).toUpperCase()}`;

  return {
    unitCode,
    postedDate: parsedDate.readable,
    postedDay: parsedDate.day,
    postedIso: parsedDate.iso,
    timestampMs: parsedDate.timestamp,
    isRequest,
    advertiser,
    senderName: msg.sender,
    phoneNormalized: phone,
    phoneLast7,
    compound: detectedCompound?.label || 'New Cairo',
    compoundCode: detectedCompound?.code || 'NC',
    zone: detectedCompound?.zone || '5th Settlement',
    lat: detectedCompound?.lat || 30.03,
    lng: detectedCompound?.lng || 31.47,
    propertyType: propType,
    dealType,
    priceEgp: price,
    areaSqm: area,
    bedrooms,
    bathrooms,
    photosCount: attachedPhotos.length,
    attachedPhotos,
    sourceGroup: groupName,
    rawText: text.trim(),
    dupeHash
  };
}

/**
 * Groups consecutive media attachments and short followup messages from the same sender
 */
export function parseGroupedListings(messages, groupName = 'WhatsApp') {
  const units = [];
  const EN_AR_KEYWORDS = [
    'للبيع', 'للايجار', 'للإيجار', 'ايجار', 'إيجار', 'بيع', 'شقة', 'فيلا', 'توين هاوس',
    'تاون هاوس', 'دوبلكس', 'بنتهاوس', 'مساحة', 'مساحه', 'مطلوب', 'متاح', 'كمبوند', 'كود',
    'sqm', 'rent', 'sale', 'apartment', 'villa', 'penthouse', 'duplex', 'townhouse',
    'twinhouse', 'compound', 'furnished', 'unfurnished', 'bedroom', 'bedrooms', 'bathroom'
  ];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    let text = toWesternDigits(m.text || '');
    if (text.length < 20) continue;

    const lower = text.toLowerCase();
    let kwCount = 0;
    for (const kw of EN_AR_KEYWORDS) {
      if (lower.includes(kw)) kwCount++;
    }
    if (kwCount < 1) continue;

    const attachedPhotos = [];
    let combinedText = text;
    let j = i + 1;

    // Scan up to 40 consecutive messages from the same sender for attachments / followups
    while (j < messages.length && j <= i + 40) {
      const nextMsg = messages[j];
      if (nextMsg.sender !== m.sender) break;

      const nextText = nextMsg.text.trim();
      const attachMatch = nextText.match(ATTACH_REGEX);
      if (attachMatch) {
        attachedPhotos.push(attachMatch[1]);
        j++;
        continue;
      }

      // Short followup text (e.g. price/specs update)
      if (nextText.length < 80 && !nextText.includes('http')) {
        const hasPrice = /(?:\d+(?:[.,]\d+)?)\s*(?:مليون|الف|ألف|k|m|egp|جنيه|\$)/i.test(nextText);
        const hasArea = /\d+\s*(?:متر|م|sqm|m2)/i.test(nextText);
        const hasSpecs = /(?:غرف|غرفة|حمام|bath|bed)/i.test(nextText);
        if (hasPrice || hasArea || hasSpecs) {
          combinedText += '\n' + nextText;
          j++;
          continue;
        }
      }

      // If nextMsg looks like a separate new listing, break
      let nextKwCount = 0;
      for (const kw of EN_AR_KEYWORDS) {
        if (nextText.toLowerCase().includes(kw)) nextKwCount++;
      }
      if (nextKwCount >= 2 && nextText.length > 50) {
        break;
      }

      break;
    }

    const syntheticMsg = {
      timestampRaw: m.timestampRaw,
      sender: m.sender,
      text: combinedText
    };

    const parsed = extractUnitDetails(syntheticMsg, groupName);
    if (parsed) {
      parsed.attachedPhotos = Array.from(new Set([...(parsed.attachedPhotos || []), ...attachedPhotos]));
      parsed.photosCount = parsed.attachedPhotos.length;
      units.push(parsed);
    }

    i = j - 1;
  }

  return units;
}
