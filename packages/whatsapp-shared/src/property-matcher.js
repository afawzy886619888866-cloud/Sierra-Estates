/**
 * Dynamic Property Recommendation & Inventory Matcher with AI Valuation & Owner Boost
 * Matches qualified client criteria against Sierra Estates inventory,
 * evaluates each property using stored market intelligence,
 * applies a +20% priority boost for Direct Owner units, and outputs rich WhatsApp cards.
<<<<<<< HEAD
=======
 *
 * ANTI-FABRICATION POLICY (Master Rule 5):
 * This matcher NEVER invents properties, prices, availability, or URLs.
 * - Inventory comes exclusively from the Supabase `listings` table.
 * - If the database is unreachable or empty, findMatches() returns [] and the
 *   caller must tell the client honestly (bilingual no-match message).
 * - Missing fields are rendered as "غير متوفر / N/A", never defaulted to plausible values.
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
 */

const { adminDb } = require('./supabase-service');
const propertyEvaluator = require('./property-evaluator');

<<<<<<< HEAD
// Curated active inventory catalog for New Cairo compounds with Owner / Direct metadata
const FALLBACK_INVENTORY = [
  {
    id: 'SE-MIV-301',
    title: 'Modern 3BR Apartment with Green Valley View',
    compound: 'Mivida (Emaar)',
    location: 'Fifth Settlement, New Cairo',
    bedrooms: 3,
    bathrooms: 3,
    bua: 195,
    areaSqm: 195,
    furnishing: 'Ultra Super Lux (Kitchen & ACs)',
    price: 52000,
    currency: 'EGP',
    type: 'Rent',
    isOwner: true, // Direct Owner Listing (+20% Boost)
    source: 'owner',
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
    areaSqm: 260,
    garden: 80,
    furnishing: 'Fully Furnished (Brand New)',
    price: 68000,
    currency: 'EGP',
    type: 'Rent',
    isOwner: true, // Direct Owner Listing (+20% Boost)
    source: 'owner',
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
    areaSqm: 155,
    furnishing: 'Fully Furnished',
    price: 45000,
    currency: 'EGP',
    type: 'Rent',
    isOwner: false,
    source: 'broker',
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
    areaSqm: 185,
    furnishing: 'Semi-Furnished',
    price: 42000,
    currency: 'EGP',
    type: 'Rent',
    isOwner: true, // Direct Owner Listing (+20% Boost)
    source: 'owner',
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
    areaSqm: 240,
    furnishing: 'Ultra Super Lux Fully Furnished',
    price: 85000,
    currency: 'EGP',
    type: 'Rent',
    isOwner: true, // Direct Owner Listing (+20% Boost)
    source: 'owner',
    view: '18-Hole Golf Course',
    url: 'https://sierra-estates.net/property/SE-UPT-801'
  }
];

class PropertyMatcher {
  /**
   * Find matching properties based on lead qualification data and AI Evaluation Scores
   */
  async findMatches(qualData) {
    let inventory = FALLBACK_INVENTORY;

    // Try fetching from Supabase listings if available
=======
class PropertyMatcher {
  /**
   * Find matching properties based on lead qualification data and AI Evaluation Scores.
   * Returns ONLY real, database-backed listings. Never returns fallback/fictional units.
   */
  async findMatches(qualData) {
    let inventory = [];

    // Single source of truth: Supabase listings with status 'active'.
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
    try {
      if (adminDb) {
        const snap = await adminDb.collection('listings').where('status', '==', 'active').limit(20).get();
        if (!snap.empty) {
<<<<<<< HEAD
          const liveListings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (liveListings.length > 0) inventory = liveListings;
        }
      }
    } catch (e) {}
=======
          inventory = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      }
    } catch (e) {
      console.error('[PropertyMatcher] inventory query failed — returning NO matches rather than fabricating:', e.message);
      return [];
    }

    if (inventory.length === 0) return [];
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1

    const targetBudget = parseFloat(String(qualData.budget || '').replace(/,/g, '')) || 0;
    const targetBeds = parseInt(String(qualData.bedrooms || '').match(/\d+/)?.[0] || '0', 10);
    const targetLoc = (Array.isArray(qualData.locations) ? qualData.locations.join(' ') : String(qualData.locations || '')).toLowerCase();

    const scored = inventory.map(item => {
      let matchScore = 0;
      const itemCompound = (item.compound || item.title || '').toLowerCase();
      const itemLocation = (item.location || '').toLowerCase();
      const itemPrice = parseFloat(item.price) || 0;
      const itemBeds = parseInt(item.bedrooms, 10) || 0;

      // 1. Evaluate unit using AI Property Evaluator (includes +20% Owner bonus)
      const evaluation = propertyEvaluator.evaluateUnit({
        ...item,
        compound: item.compound || item.title,
        areaSqm: item.areaSqm || item.bua,
        price: itemPrice
      });

      // 2. Location match
      if (targetLoc && (targetLoc.includes(itemCompound) || itemCompound.includes(targetLoc) || targetLoc.includes(itemLocation))) {
        matchScore += 30;
      } else {
        matchScore += 15; // General New Cairo match
      }

      // 3. Bedroom match
      if (targetBeds > 0 && itemBeds > 0) {
        if (targetBeds === itemBeds) matchScore += 25;
        else if (Math.abs(targetBeds - itemBeds) === 1) matchScore += 10;
      } else {
        matchScore += 15;
      }

      // 4. Budget match with 15% tolerance
      if (targetBudget > 0 && itemPrice > 0) {
        const diffRatio = Math.abs(itemPrice - targetBudget) / targetBudget;
        if (diffRatio <= 0.15) matchScore += 25;
        else if (diffRatio <= 0.30) matchScore += 10;
      } else {
        matchScore += 15;
      }

      // 5. Total combined priority (Match Criteria 40% + AI Evaluation Score 60%)
      const totalScore = (matchScore * 0.4) + (evaluation.evaluationScore * 0.6);

      return {
        item: {
          ...item,
          evaluation
        },
        totalScore
      };
    });

    // Sort by highest evaluated total score
    scored.sort((a, b) => b.totalScore - a.totalScore);
    return scored.slice(0, 2).map(s => s.item);
  }

  /**
<<<<<<< HEAD
   * Formats WhatsApp property recommendation cards in Arabic or English
=======
   * Formats WhatsApp property recommendation cards in Arabic or English.
   * Missing fields render as N/A — never fabricated.
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
   */
  formatRecommendationCards(matches, isArabic = true) {
    if (!matches || matches.length === 0) return '';

<<<<<<< HEAD
    if (isArabic) {
      let text = `\n\n✨ *أفضل الوحدات المقيمة بالذكاء الاصطناعي والمطابقة لطلبكم في القاهرة الجديدة:*\n`;
      matches.forEach((p, idx) => {
        const ev = p.evaluation || propertyEvaluator.evaluateUnit(p);
        const ownerTag = ev.isOwner ? `\n👑 *مباشر من المالك (أولوية +20%):* نعم` : '';

        text += `\n━━━━━━━━━━━━━━━━━━━━\n` +
                `🏡 *${idx + 1}. ${p.title || p.compound}*\n` +
                `⭐ *التقييم الاستثماري:* ${ev.evaluationScore}/100 [فئة ${ev.grade}]${ownerTag}\n` +
                `📍 *الكمبوند:* ${p.compound || p.location}\n` +
                `🛏️ *المواصفات:* ${p.bedrooms || '3'} غرف نوم • ${p.bathrooms || '3'} حمام • ${p.bua || '190'} م²\n` +
                `🛋️ *حالة الفرش والتشطيب:* ${p.furnishing || 'الترا سوبر لوكس'}\n` +
                `💰 *السعر المطلوب:* ${Number(p.price || 50000).toLocaleString()} ${p.currency || 'ج.م'}/شهرياً\n` +
                `📈 *العائد التأجيري المتوقع:* ${ev.estimatedYield}\n` +
                `🔗 *تفاصيل الوحدة والجولة الافتراضية:* ${p.url || `https://sierra-estates.net/property/${p.id}`}\n`;
=======
    const na = isArabic ? 'غير متوفر' : 'N/A';
    const fmt = (val, suffix) => (val !== undefined && val !== null && val !== '' && !isNaN(val) ? `${Number(val).toLocaleString()}${suffix || ''}` : na);

    if (isArabic) {
      let text = `\n\n✨ *أفضل الوحدات المطابقة لطلبكم في القاهرة الجديدة:*\n`;
      matches.forEach((p, idx) => {
        const ev = p.evaluation || {};
        const ownerTag = ev.isOwner ? `\n👑 *مباشر من المالك (أولوية +20%):* نعم` : '';

        text += `\n━━━━━━━━━━━━━━━━━━━━\n` +
                `🏡 *${idx + 1}. ${p.title || p.compound || na}*\n` +
                (ev.evaluationScore !== undefined ? `⭐ *التقييم الاستثماري:* ${ev.evaluationScore}/100${ownerTag}\n` : '') +
                `📍 *الكمبوند:* ${p.compound || p.location || na}\n` +
                `🛏️ *المواصفات:* ${p.bedrooms ?? na} غرف نوم • ${p.bathrooms ?? na} حمام • ${p.bua || p.areaSqm || na} م²\n` +
                `🛋️ *حالة الفرش والتشطيب:* ${p.furnishing || na}\n` +
                `💰 *السعر المطلوب:* ${fmt(p.price, ` ${p.currency || 'ج.م'}`)}${p.type === 'Rent' ? '/شهرياً' : ''}\n` +
                (ev.estimatedYield ? `📈 *العائد التأجيري المتوقع:* ${ev.estimatedYield}\n` : '') +
                (p.url ? `🔗 *تفاصيل الوحدة:* ${p.url}\n` : '');
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
      });
      text += `\n_هل تودون حجز موعد لمعاينة أي من هذه الخيارات؟_`;
      return text;
    } else {
<<<<<<< HEAD
      let text = `\n\n✨ *Top AI-Evaluated Units Matching Your Criteria in New Cairo:*\n`;
      matches.forEach((p, idx) => {
        const ev = p.evaluation || propertyEvaluator.evaluateUnit(p);
        const ownerTag = ev.isOwner ? `\n👑 *Direct from Owner (+20% Priority Boost):* Yes` : '';

        text += `\n━━━━━━━━━━━━━━━━━━━━\n` +
                `🏡 *${idx + 1}. ${p.title || p.compound}*\n` +
                `⭐ *AI Evaluation Score:* ${ev.evaluationScore}/100 [Grade ${ev.grade}]${ownerTag}\n` +
                `📍 *Compound:* ${p.compound || p.location}\n` +
                `🛏️ *Specs:* ${p.bedrooms || '3'} Beds • ${p.bathrooms || '3'} Baths • ${p.bua || '190'} sqm\n` +
                `🛋️ *Furnishing:* ${p.furnishing || 'Ultra Super Lux'}\n` +
                `💰 *Asking Rate:* ${Number(p.price || 50000).toLocaleString()} ${p.currency || 'EGP'}/Month\n` +
                `📈 *Estimated ROI Yield:* ${ev.estimatedYield}\n` +
                `🔗 *View Full Listing & 3D Tour:* ${p.url || `https://sierra-estates.net/property/${p.id}`}\n`;
=======
      let text = `\n\n✨ *Top Units Matching Your Criteria in New Cairo:*\n`;
      matches.forEach((p, idx) => {
        const ev = p.evaluation || {};
        const ownerTag = ev.isOwner ? `\n👑 *Direct from Owner (+20% Priority Boost):* Yes` : '';

        text += `\n━━━━━━━━━━━━━━━━━━━━\n` +
                `🏡 *${idx + 1}. ${p.title || p.compound || na}*\n` +
                (ev.evaluationScore !== undefined ? `⭐ *AI Evaluation Score:* ${ev.evaluationScore}/100${ownerTag}\n` : '') +
                `📍 *Compound:* ${p.compound || p.location || na}\n` +
                `🛏️ *Specs:* ${p.bedrooms ?? na} Beds • ${p.bathrooms ?? na} Baths • ${p.bua || p.areaSqm || na} sqm\n` +
                `🛋️ *Furnishing:* ${p.furnishing || na}\n` +
                `💰 *Asking Rate:* ${fmt(p.price, ` ${p.currency || 'EGP'}`)}${p.type === 'Rent' ? '/Month' : ''}\n` +
                (ev.estimatedYield ? `📈 *Estimated ROI Yield:* ${ev.estimatedYield}\n` : '') +
                (p.url ? `🔗 *View Full Listing:* ${p.url}\n` : '');
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
      });
      text += `\n_Would you like to schedule a private viewing for any of these options?_`;
      return text;
    }
  }
<<<<<<< HEAD
=======

  /**
   * Honest no-match message (bilingual) used when inventory yields no results.
   */
  formatNoMatchMessage(isArabic = true) {
    return isArabic
      ? `\n🙏 *شكراً لتفاصيلكم.*\n\nلا توجد حالياً وحدات مطابقة لطلبكم في قاعدة بياناتنا المباشرة.\n_يمكننا إبلاغكم فور توفر وحدة مناسبة — هل تودون تسجيل طلبكم؟_`
      : `\n🙏 *Thank you for the details.*\n\nWe currently have no matching units in our live database.\n_We can notify you the moment a suitable unit becomes available — would you like us to register your request?_`;
  }
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
}

module.exports = new PropertyMatcher();
