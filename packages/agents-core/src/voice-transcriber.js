/**
 * Sierra Estates Egyptian-Arabic Broker Voice Note Transcription Pipeline
 * Normalizes spoken Egyptian Arabic dialect and voice audio into structured real estate listing signals.
 */




















export class VoiceTranscriberEngine {
  /**
   * Convert Arabic-Indic numerals (٠-٩) to standard ASCII (0-9)
   */
   static normalizeDigits(str) {
    return str.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
  }

  /**
   * Parse Egyptian spoken Arabic transcript into structured inventory data
   */
   static parseSpokenTranscript(input) {
    const text = this.normalizeDigits(input.spokenTranscriptAr);
    let confidence = 70;

    // Detect Compound
    let detectedCompound;
    if (/ميفيدا|mivida/i.test(text)) detectedCompound = 'Mivida';
    else if (/هايد بارك|hyde park/i.test(text)) detectedCompound = 'Hyde Park';
    else if (/بالم هيلز|palm hills/i.test(text)) detectedCompound = 'Palm Hills';
    else if (/سوان ليك|swan lake/i.test(text)) detectedCompound = 'Swan Lake';
    else if (/اب تاون|uptown/i.test(text)) detectedCompound = 'Uptown Cairo';

    if (detectedCompound) confidence += 10;

    // Detect Unit Type
    let detectedUnitType;
    if (/فيلا مستقلة|ستاند الون|standalone/i.test(text)) detectedUnitType = 'Standalone Villa';
    else if (/توين هاوس|twin house/i.test(text)) detectedUnitType = 'Twin House';
    else if (/تاون هاوس|town house/i.test(text)) detectedUnitType = 'Townhouse';
    else if (/بنتهاوس|penthouse/i.test(text)) detectedUnitType = 'Penthouse';
    else if (/شقة|apartment/i.test(text)) detectedUnitType = 'Apartment';

    if (detectedUnitType) confidence += 10;

    // Detect Price (e.g. "مليون ونص", "٣٥ مليون", "١٥ مليون")
    let extractedPriceEGP;
    const millionMatch = text.match(/(\d+(?:\.\d+)?)\s*مليون/);
    if (millionMatch) {
      extractedPriceEGP = Math.round(parseFloat(millionMatch[1]) * 1e6);
    } else if (/مليون ونص/.test(text)) {
      extractedPriceEGP = 1500000;
    } else if (/اتنين مليون/.test(text)) {
      extractedPriceEGP = 2000000;
    } else if (/عشرين مليون/.test(text)) {
      extractedPriceEGP = 20000000;
    }

    // Detect Down Payment %
    let extractedDownPaymentPercent;
    const downMatch = text.match(/مقدم\s*(\d+)\s*%/);
    if (downMatch) {
      extractedDownPaymentPercent = parseInt(downMatch[1], 10);
    } else if (/مقدم\s*١٠%/i.test(text) || /عشرة في المية مقدم/.test(text)) {
      extractedDownPaymentPercent = 10;
    }

    // Detect Tenure Years
    let extractedTenureYears;
    const yearsMatch = text.match(/(\d+)\s*(?:سنين|سنوات)/);
    if (yearsMatch) {
      extractedTenureYears = parseInt(yearsMatch[1], 10);
    }

    // Detect Delivery
    const isImmediateDelivery = /استلام فوري|جاهزة للسكن|ready to move/i.test(text);

    return {
      rawTranscript: text,
      detectedCompound,
      detectedUnitType,
      extractedPriceEGP,
      extractedDownPaymentPercent,
      extractedTenureYears,
      isImmediateDelivery,
      confidenceScore: Math.min(100, confidence),
    };
  }
}
