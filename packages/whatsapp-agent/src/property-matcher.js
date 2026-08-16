/**
 * Dynamic Property Recommendation & Inventory Matcher
 * Matches qualified client criteria against Sierra Estates inventory
 * and generates rich WhatsApp property cards.
 */

const { adminDb } = require('./firebase-service');

// Curated active inventory fallback catalog for New Cairo compounds
const FALLBACK_INVENTORY = [
  {
    id: 'SE-MIV-301',
    title: 'Modern 3BR Apartment with Green Valley View',
    compound: 'Mivida (Emaar)',
    location: 'Fifth Settlement, New Cairo',
    bedrooms: 3,
    bathrooms: 3,
    bua: 195,
    furnishing: 'Semi-Furnished (Kitchen & ACs)',
    price: 52000,
    currency: 'EGP',
    type: 'Rent',
    view: 'Central Park / Valley',
    url: 'https://sierra-estates.net/property/SE-MIV-301'
  },
  {
    id: 'SE-VIL-204',
    title: 'Luxury 4BR Townhouse with Private Garden',
    compound: 'Villette (SODIC)',
    location: 'Golden Square, New Cairo',
    bedrooms: 4,
    bathrooms: 4,
    bua: 260,
    garden: 80,
    furnishing: 'Fully Furnished (Brand New)',
    price: 68000,
    currency: 'EGP',
    type: 'Rent',
    view: 'Pocket Park',
    url: 'https://sierra-estates.net/property/SE-VIL-204'
  },
  {
    id: 'SE-EAS-102',
    title: 'Executive 2BR Residence on 90th Street',
    compound: 'Eastown (SODIC)',
    location: 'South 90th St / Adjacent to AUC',
    bedrooms: 2,
    bathrooms: 2,
    bua: 155,
    furnishing: 'Fully Furnished',
    price: 45000,
    currency: 'EGP',
    type: 'Rent',
    view: 'Clubhouse',
    url: 'https://sierra-estates.net/property/SE-EAS-102'
  },
  {
    id: 'SE-HYD-505',
    title: 'Contemporary 3BR Apartment overlooking Central Park',
    compound: 'Hyde Park',
    location: 'Fifth Settlement, New Cairo',
    bedrooms: 3,
    bathrooms: 3,
    bua: 185,
    furnishing: 'Semi-Furnished',
    price: 42000,
    currency: 'EGP',
    type: 'Rent',
    view: '141-Acre Central Park',
    url: 'https://sierra-estates.net/property/SE-HYD-505'
  },
  {
    id: 'SE-UPT-801',
    title: 'Golf View 3BR Luxury Penthouse with Terrace',
    compound: 'Uptown Cairo (Emaar)',
    location: 'Mokattam / New Cairo Axis',
    bedrooms: 3,
    bathrooms: 4,
    bua: 240,
    furnishing: 'Ultra Super Lux Fully Furnished',
    price: 85000,
    currency: 'EGP',
    type: 'Rent',
    view: '18-Hole Golf Course',
    url: 'https://sierra-estates.net/property/SE-UPT-801'
  }
];

class PropertyMatcher {
  /**
   * Find matching properties based on lead qualification data
   */
  async findMatches(qualData) {
    let inventory = FALLBACK_INVENTORY;

    // Try fetching from Firestore listings if available
    try {
      if (adminDb) {
        const snap = await adminDb.collection('listings').where('status', '==', 'active').limit(20).get();
        if (!snap.empty) {
          const liveListings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (liveListings.length > 0) inventory = liveListings;
        }
      }
    } catch (e) {}

    const targetBudget = parseFloat(String(qualData.budget || '').replace(/,/g, '')) || 0;
    const targetBeds = parseInt(String(qualData.bedrooms || '').match(/\d+/)?.[0] || '0', 10);
    const targetLoc = (Array.isArray(qualData.locations) ? qualData.locations.join(' ') : String(qualData.locations || '')).toLowerCase();

    const scored = inventory.map(item => {
      let score = 0;
      const itemCompound = (item.compound || item.title || '').toLowerCase();
      const itemLocation = (item.location || '').toLowerCase();
      const itemPrice = parseFloat(item.price) || 0;
      const itemBeds = parseInt(item.bedrooms, 10) || 0;

      // Location match
      if (targetLoc && (targetLoc.includes(itemCompound) || itemCompound.includes(targetLoc) || targetLoc.includes(itemLocation))) {
        score += 30;
      }

      // Bedroom match
      if (targetBeds > 0 && itemBeds > 0) {
        if (targetBeds === itemBeds) score += 25;
        else if (Math.abs(targetBeds - itemBeds) === 1) score += 10;
      }

      // Budget match with 15% tolerance
      if (targetBudget > 0 && itemPrice > 0) {
        const diffRatio = Math.abs(itemPrice - targetBudget) / targetBudget;
        if (diffRatio <= 0.15) score += 25;
        else if (diffRatio <= 0.30) score += 10;
      }

      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 2).map(s => s.item);
  }

  /**
   * Formats WhatsApp property recommendation cards in Arabic or English
   */
  formatRecommendationCards(matches, isArabic = true) {
    if (!matches || matches.length === 0) return '';

    if (isArabic) {
      let text = `\n\n✨ *وحدات مقترحة تناسب متطلباتكم في التجمع الخامس:*\n`;
      matches.forEach((p, idx) => {
        text += `\n━━━━━━━━━━━━━━━━━━━━\n` +
                `🏡 *${idx + 1}. ${p.title || p.compound}*\n` +
                `📍 *الكمبوند:* ${p.compound || p.location}\n` +
                `🛏️ *المواصفات:* ${p.bedrooms || '3'} غرف نوم • ${p.bathrooms || '3'} حمام • ${p.bua || '190'} م²\n` +
                `🛋️ *حالة الفرش:* ${p.furnishing || 'متشطبة بالكامل'}\n` +
                `💰 *السعر المطلوب:* ${Number(p.price || 50000).toLocaleString()} ${p.currency || 'ج.م'}/شهرياً\n` +
                `🔗 *تفاصيل الوحدة والجولة الافتراضية:* ${p.url || `https://sierra-estates.net/property/${p.id}`}\n`;
      });
      text += `\n_هل تودون حجز موعد لمعاينة أي من هذه الوحدات على الطبيعة؟_`;
      return text;
    } else {
      let text = `\n\n✨ *Recommended Units Matching Your Criteria in New Cairo:*\n`;
      matches.forEach((p, idx) => {
        text += `\n━━━━━━━━━━━━━━━━━━━━\n` +
                `🏡 *${idx + 1}. ${p.title || p.compound}*\n` +
                `📍 *Compound:* ${p.compound || p.location}\n` +
                `🛏️ *Specs:* ${p.bedrooms || '3'} Beds • ${p.bathrooms || '3'} Baths • ${p.bua || '190'} sqm\n` +
                `🛋️ *Furnishing:* ${p.furnishing || 'Fully Finished'}\n` +
                `💰 *Asking Rate:* ${Number(p.price || 50000).toLocaleString()} ${p.currency || 'EGP'}/Month\n` +
                `🔗 *View Full Listing & 3D Tour:* ${p.url || `https://sierra-estates.net/property/${p.id}`}\n`;
      });
      text += `\n_Would you like to schedule a private viewing for any of these options?_`;
      return text;
    }
  }
}

module.exports = new PropertyMatcher();
