import 'server-only';

/**
 * WhatsApp language routing.
 *
 * Business rule (owner-specified):
 *   - Clients whose phone number is Egyptian (+20) or Saudi (+966) are
 *     greeted and conversed with in ARABIC by default.
 *   - Every other country code defaults to ENGLISH.
 *   - In 1:1 conversation the agent ALWAYS mirrors the language the client
 *     actually writes in (see WhatsAppConversationalService.SYSTEM_PROMPT) —
 *     this helper only decides the language of the FIRST outbound greeting,
 *     where no client text exists to mirror yet.
 */

export type GreetingLanguage = 'ar' | 'en';

/**
 * Resolves the greeting language from the recipient phone number.
 *
 * Accepted shapes: "+201002345678", "201002345678", "00201002345678",
 * Egyptian local mobile "01002345678", Saudi local mobile "0500123456".
 * Unparseable/empty numbers fall back to English (the safer default for an
 * international Property Finder audience).
 */
export function resolveGreetingLanguage(phone: string | null | undefined): GreetingLanguage {
  const digits = (phone ?? '').replace(/\D/g, '');

  // Egypt (20) / Saudi (966) country codes, optionally 00- or 0-prefixed.
  if (/^0{0,2}(20|966)/.test(digits)) return 'ar';
  // Egyptian local mobile: 010/011/012/015 + 8 digits (11 total).
  if (/^01[0125]\d{8}$/.test(digits)) return 'ar';
  // Saudi local mobile: 05 + 8 digits (10 total).
  if (/^05\d{8}$/.test(digits)) return 'ar';

  return 'en';
}

/**
 * The first-touch greeting queued when a Property Finder lead arrives.
 * The Arabic template is the proven production copy; English is its exact
 * structural mirror so both variants carry the same offer.
 */
export function greetingFor(
  language: GreetingLanguage,
  clientName: string,
  listingRef: string,
): string {
  if (language === 'ar') {
    return `مرحباً بك يا ${clientName} في سييرا إستيتس! 🌟\nوصلنا استفسارك عبر Property Finder بخصوص العقار (مرجع: ${listingRef || 'المميز'}).\nيسعدنا تزويدك بكافة تفاصيل الوحدة، المخططات الهندسية، وخطط السداد المتاحة.\n\nهل تود التواصل هنا عبر واتساب أو تحديد موعد لزيارة ومعاينة العقار؟\n\n*Sierra Estates — Beyond Brokerage*`;
  }

  return `Welcome to Sierra Estates, ${clientName}! 🌟\nWe've received your Property Finder inquiry about the property (Ref: ${listingRef || 'our featured listing'}).\nWe'd be glad to share the full unit details, floor plans, and available payment plans.\n\nWould you like to continue the conversation here on WhatsApp, or book a viewing appointment?\n\n*Sierra Estates — Beyond Brokerage*`;
}
