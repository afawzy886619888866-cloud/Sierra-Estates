/**
 * Sierra Estates Luxury Property Tear-Sheet & Investor Memo Generator
 * Creates executive single-page tear-sheets, financial summaries, and shareable WhatsApp copy.
 */

















































export class TearSheetGenerator {
  /**
   * Synthesize executive tear-sheet from listing parameters
   */
   static generateTearSheet(input) {
    const downPaymentEGP = Math.round((input.askingPriceEGP * input.downPaymentPercent) / 100);
    const remainingEGP = input.askingPriceEGP - downPaymentEGP;
    const totalQuarters = Math.max(1, input.installmentTenureYears * 4);
    const quarterlyInstallmentEGP = Math.round(remainingEGP / totalQuarters);

    // 5-Year forecast projections
    const appreciationRate = 18; // 18% CAGR
    const year5Value = Math.round(input.askingPriceEGP * Math.pow(1 + appreciationRate / 100, 5));
    const estimatedRent = Math.round(input.askingPriceEGP * 0.09); // 9% gross
    const netRentalYield = Number(((estimatedRent * 0.9) / input.askingPriceEGP * 100).toFixed(2));

    const millions = (input.askingPriceEGP / 1e6).toFixed(2);
    const downPaymentMillions = (downPaymentEGP / 1e6).toFixed(2);

    const whatsAppAr = `🏛️ *سييرا إستيتس | فرصة استثمارية حصرية*
📌 *المشروع:* ${input.compoundName}
🏡 *الوحدة:* ${input.unitType} (${input.buaSqm} م²)
💰 *السعر الإجمالي:* ${millions} مليون ج.م
💳 *المقدم (${input.downPaymentPercent}%):* ${downPaymentMillions} مليون ج.م
⏳ *الأقساط:* ${(quarterlyInstallmentEGP / 1e3).toFixed(0)} ألف ج.م ربع سنوي على ${input.installmentTenureYears} سنوات
🔑 *الاستلام:* ${input.deliveryYear}
📞 للتواصل مع مستشار الاستثمار: ${input.brokerName} (${input.brokerPhone})`;

    const whatsAppEn = `🏛️ *SIERRA ESTATES | LUXURY INVESTMENT TEAR-SHEET*
📌 *Compound:* ${input.compoundName}
🏡 *Unit:* ${input.unitType} (${input.buaSqm} sqm)
💰 *Total Valuation:* ${millions}M EGP
💳 *Down Payment (${input.downPaymentPercent}%):* ${downPaymentMillions}M EGP
⏳ *Quarterly Installment:* ${(quarterlyInstallmentEGP / 1e3).toFixed(0)}k EGP over ${input.installmentTenureYears} Years
🔑 *Delivery:* ${input.deliveryYear}
📞 Private Consultation: ${input.brokerName} (${input.brokerPhone})`;

    return {
      referenceId: input.referenceId,
      headline: `${input.unitType} in ${input.compoundName} · ${(input.askingPriceEGP / 1e6).toFixed(1)}M EGP`,
      compound: input.compoundName,
      unitSpecs: {
        bua: `${input.buaSqm} m²`,
        land: input.landSqm ? `${input.landSqm} m²` : undefined,
        rooms: `${input.bedrooms} Beds · ${input.bathrooms} Baths`,
        finishing: input.finishing.replace(/_/g, ' ').toUpperCase(),
        delivery: String(input.deliveryYear),
      },
      financialStructure: {
        totalPriceEGP: input.askingPriceEGP,
        totalPriceMillionsEGP: `${millions}M EGP`,
        downPaymentEGP,
        quarterlyInstallmentEGP,
        tenureYears: input.installmentTenureYears,
      },
      fiveYearForecast: {
        projectedAppreciationPercent: appreciationRate,
        estimatedValueYear5EGP: year5Value,
        estimatedAnnualRentEGP: estimatedRent,
        netRentalYieldPercent: netRentalYield,
      },
      whatsAppBroadcastCopy: {
        ar: whatsAppAr,
        en: whatsAppEn,
      },
    };
  }
}
