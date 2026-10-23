/**
 * Dynamic Property Recommendation & Inventory Matcher with AI Valuation & Owner Boost
 * Matches qualified client criteria against Sierra Estates inventory,
 * evaluates each property using stored market intelligence,
 * applies a +20% priority boost for Direct Owner units, and outputs rich WhatsApp cards.
 *
 * ANTI-FABRICATION POLICY (Master Rule 5):
 * This matcher NEVER invents properties, prices, availability, or URLs.
 * - Inventory comes exclusively from the Supabase `listings` table.
 * - If the database is unreachable or empty, findMatches() returns [] and the
 *   caller must tell the client honestly (bilingual no-match message).
 * - Missing fields are rendered as "غير متوفر / N/A", never defaulted to plausible values.
 */

const { adminDb } = require('./supabase-service');
const propertyEvaluator = require('./property-evaluator');

class PropertyMatcher {
  /**
   * Find matching properties based on lead qualification data and AI Evaluation Scores.
   * Returns ONLY real, database-backed listings. Never returns fallback/fictional units.
   */
  async findMatches(qualData) {
    let inventory = [];

    // Single source of truth: Supabase listings with status 'active'.
    try {
      if (adminDb) {
        const snap = await adminDb.collection('listings').where('status', '==', 'active').limit(20).get();
        if (!snap.empty) {
          inventory = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      }
    } catch (e) {
      console.error('[PropertyMatcher] inventory query failed — returning NO matches rather than fabricating:', e.message);
      return [];
    }

    if (inventory.length === 0) return [];

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
   * Formats WhatsApp property recommendation cards in Arabic or English.
   * Missing fields render as N/A — never fabricated.
   */
  formatRecommendationCards(matches, isArabic = true) {
    if (!matches || matches.length === 0) return '';

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
      });
      text += `\n_هل تودون حجز موعد لمعاينة أي من هذه الخيارات؟_`;
      return text;
    } else {
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
      });
      text += `\n_Would you like to schedule a private viewing for any of these options?_`;
      return text;
    }
  }

  /**
   * Honest no-match message (bilingual) used when inventory yields no results.
   */
  formatNoMatchMessage(isArabic = true) {
    return isArabic
      ? `\n🙏 *شكراً لتفاصيلكم.*\n\nلا توجد حالياً وحدات مطابقة لطلبكم في قاعدة بياناتنا المباشرة.\n_يمكننا إبلاغكم فور توفر وحدة مناسبة — هل تودون تسجيل طلبكم؟_`
      : `\n🙏 *Thank you for the details.*\n\nWe currently have no matching units in our live database.\n_We can notify you the moment a suitable unit becomes available — would you like us to register your request?_`;
  }
}

module.exports = new PropertyMatcher();
