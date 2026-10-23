/**
 * Brochure & Media Dispatcher Manager for Sierra Estates WhatsApp Agent
 * Resolves compound brochures, masterplans, and floor plans for New Cairo compounds.
 */

const path = require('path');
const fs = require('fs');
let MessageMedia = null;
try {
  MessageMedia = require('whatsapp-web.js').MessageMedia;
} catch (e) {}

const COMPOUND_ASSETS = {
  mivida: {
    name: 'Mivida (Emaar)',
    developer: 'Emaar Misr',
    description: 'Prime 5th Settlement community with green valleys, Santa Barbara architecture, and business park.',
    brochureUrl: 'https://sierra-estates.net/docs/brochures/mivida.pdf',
    priceRange: '48,000 – 70,000 EGP / Month',
    keywords: ['mivida', 'ميفيدا', 'ميڤيدا', 'emaar']
  },
  uptown: {
    name: 'Uptown Cairo (Emaar)',
    developer: 'Emaar Misr',
    description: 'Elevated luxury living in Mokattam/New Cairo border with 18-hole golf course.',
    brochureUrl: 'https://sierra-estates.net/docs/brochures/uptown-cairo.pdf',
    priceRange: '65,000 – 100,000 EGP / $1,500 – $2,200',
    keywords: ['uptown', 'اب تاون', 'أبتاون', 'مقطم']
  },
  villette: {
    name: 'Villette / Sky Condos (SODIC)',
    developer: 'SODIC',
    description: 'Signature pocket parks, contemporary architecture, and sports club in Golden Square.',
    brochureUrl: 'https://sierra-estates.net/docs/brochures/villette-sodic.pdf',
    priceRange: '45,000 – 65,000 EGP / Month',
    keywords: ['villette', 'فيليت', 'ڤيليت', 'sky condos', 'سكاي كوندوز', 'sodic']
  },
  eastown: {
    name: 'Eastown (SODIC)',
    developer: 'SODIC',
    description: 'Urban luxury residences directly on 90th Street and adjacent to AUC.',
    brochureUrl: 'https://sierra-estates.net/docs/brochures/eastown.pdf',
    priceRange: '45,000 – 75,000 EGP / Month',
    keywords: ['eastown', 'ايست تاون', 'إيستاون', 'auc', 'الجامعة الأمريكية']
  },
  icity: {
    name: 'Mountain View iCity',
    developer: 'Mountain View',
    description: 'Innovative 4D masterplan with car-free islands, central park, and smart living.',
    brochureUrl: 'https://sierra-estates.net/docs/brochures/mountain-view-icity.pdf',
    priceRange: '35,000 – 55,000 EGP / Month',
    keywords: ['icity', 'ماونتن فيو', 'اي سيتي', 'mountain view']
  },
  hydepark: {
    name: 'Hyde Park New Cairo',
    developer: 'Hyde Park Developments',
    description: 'Largest 141-acre central park in New Cairo with modern townhouses and apartments.',
    brochureUrl: 'https://sierra-estates.net/docs/brochures/hyde-park.pdf',
    priceRange: '40,000 – 65,000 EGP / Month',
    keywords: ['hyde park', 'هايد بارك', 'هايدبارك']
  },
  madinaty: {
    name: 'Madinaty (TMG)',
    developer: 'Talaat Moustafa Group',
    description: 'All-inclusive integrated master city with private golf, clubs, and standalone villas.',
    brochureUrl: 'https://sierra-estates.net/docs/brochures/madinaty.pdf',
    priceRange: '40,000 – 90,000 EGP (Villas: 70k–140k)',
    keywords: ['madinaty', 'مدينتي', 'مدينتى', 'tmg']
  },
  cfc: {
    name: 'Cairo Festival City (CFC)',
    developer: 'Al-Futtaim',
    description: 'Walking distance to CFC Mall, KidZania, and major multinational corporate headquarters.',
    brochureUrl: 'https://sierra-estates.net/docs/brochures/cairo-festival-city.pdf',
    priceRange: '55,000 – 90,000 EGP / $1,400 – $2,000',
    keywords: ['cfc', 'festival city', 'فستيفال', 'كايرو فيستيفال']
  }
};

class BrochureManager {
  /**
   * Detects if the user requested a brochure or compound details.
   */
  detectBrochureIntent(message) {
    const lower = message.toLowerCase();
    const isBrochureReq = lower.includes('brochure') || 
                          lower.includes('بروشور') || 
                          lower.includes('كتالوج') || 
                          lower.includes('floor plan') || 
                          lower.includes('floorplan') || 
                          lower.includes('بلان') || 
                          lower.includes('ماستر بلان') ||
                          lower.includes('master plan') || 
                          lower.includes('pdf') ||
                          lower.includes('تفاصيل الكمبوند');

    if (!isBrochureReq) return null;

    for (const [key, compound] of Object.entries(COMPOUND_ASSETS)) {
      if (compound.keywords.some(kw => lower.includes(kw))) {
        return { key, compound };
      }
    }

    return null;
  }

  /**
   * Formats a rich WhatsApp compound overview card with download link
   */
  formatBrochureCard(compound, isArabic = true) {
    if (isArabic) {
      return `📄 *ملف تفاصيل كمبوند ${compound.name}*\n\n` +
             `🏢 *المطور:* ${compound.developer}\n` +
             `📍 *المواصفات:* ${compound.description}\n` +
             `💰 *متوسط الأسعار:* ${compound.priceRange}\n\n` +
             `🔗 *رابط تحميل البروشور والمخطط:* ${compound.brochureUrl}\n\n` +
             `_يسعدنا تنسيق جولة معاينة خاصة داخل الكمبوند في أي وقت يناسبكم._`;
    } else {
      return `📄 *${compound.name} — Official Overview & Brochure*\n\n` +
             `🏢 *Developer:* ${compound.developer}\n` +
             `📍 *Overview:* ${compound.description}\n` +
             `💰 *Pricing Range:* ${compound.priceRange}\n\n` +
             `🔗 *Direct Brochure Download:* ${compound.brochureUrl}\n\n` +
             `_We can arrange an exclusive private viewing tour at your convenience._`;
    }
  }

  /**
   * Returns list of all indexed compounds
   */
  listCompounds() {
    return Object.entries(COMPOUND_ASSETS).map(([key, data]) => ({
      id: key,
      ...data
    }));
  }

  getCompound(key) {
    return COMPOUND_ASSETS[key.toLowerCase()] || null;
  }
}

module.exports = new BrochureManager();
