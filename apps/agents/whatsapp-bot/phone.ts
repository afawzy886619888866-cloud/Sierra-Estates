/**
 * Single owner of WhatsApp phone-number canonicalization for this bot.
 * Previously reimplemented independently in index.ts, import-whitelist.ts,
 * and router.ts, each slightly differently.
 */

/** Strips the WhatsApp JID suffix ("201012345678@c.us" -> "201012345678"). */
export function stripWhatsAppSuffix(jid: string): string {
  return jid.replace('@c.us', '').replace('@g.us', '');
}

/** Digits-only form, e.g. for whitelist storage and admin-phone matching. */
export function normalizePhone(phoneStr: string): string {
  return stripWhatsAppSuffix(phoneStr).replace(/\D/g, '');
}

/**
 * All plausible stored-phone forms for a digits-only Egyptian number, to
 * cover the formats leads may have been stored under historically:
 * exact digits, "+"-prefixed, and local "0"-prefixed (country code 20
 * replaced with a leading 0).
 */
export function phoneLookupVariants(cleanPhone: string): string[] {
  const variants = [cleanPhone, `+${cleanPhone}`];
  if (cleanPhone.startsWith('20')) {
    variants.push('0' + cleanPhone.slice(2));
  }
  return variants;
}
