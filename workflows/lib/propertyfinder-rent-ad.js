function generateCanonicalRentCode(unit) {
  const compound = unit.compound || '';
  const prefix = COMPOUND_CODES[compound] || 'SE';

  const beds = Math.max(1, Number(unit.bedrooms) || 3);
  const furnRaw = String(unit.furnished || unit.furnishing || '').toLowerCase();
  const descRaw = String(unit.description || '');

  const isUnfurnished = furnRaw.includes('unfurn') || descRaw.includes('غير مفروش') || descRaw.includes('بدون فرش');
  const isFurnished = !isUnfurnished && (furnRaw.includes('furn') || descRaw.includes('مفروش') || descRaw.includes('بالفرش'));
  const furn = isFurnished ? 'F' : 'U';

  const price = Number(unit.price) || 0;
  let priceTag = 'P';
  if (price >= 1000000) {
    priceTag = `${Math.round(price / 1000000)}M`;
  } else if (price >= 1000) {
    priceTag = `${Math.round(price / 1000)}K`;
  } else if (price > 0) {
    priceTag = `${price}`;
  }

  return `${prefix}-${beds}${furn}-${priceTag}`;
}

/**
 * Builds Rent-specific institutional copy (Arabic & English).
 */
function generateRentMarketingScript(unit) {
  const code = unit.code || generateCanonicalRentCode(unit);
  const copy = generateInstitutionalCopy({
    ...unit,
    code,
    dealType: 'rent',
  });

  const compound = unit.compound || '';
  const priceFormatted = Number(unit.price) > 0 ? `${Number(unit.price).toLocaleString()} ج.م / شهرياً` : 'القيمة عند المعاينة';
  const phone = unit.ownerPhone || unit.phone || '01061399688';

  const whatsappBroadcast = [
    `💎 وحدة راقية للإيجار في ${compound} | كود: ${code}`,
    `─────────────────────────────`,
    `✨ مواصفات الوحدة:`,
    `• النوع: ${unit.propertyType || 'شقة فاخرة'}`,
    `• المساحة: ${unit.areaSqm || 'مساحة واسعة'} م²`,
    `• الغرف: ${unit.bedrooms || 3} غرف نوم | ${unit.bathrooms || 2} حمامات`,
