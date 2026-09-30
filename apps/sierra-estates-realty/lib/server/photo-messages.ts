/**
 * PHOTO-REQUEST MESSAGES — shared WhatsApp copy.
 *
 * The WhatsApp bot ACCEPTS CONVERSATIONS (text / voice transcripts) but does
 * NOT ACCEPT IMAGES: media is never parsed and never stored from the bot.
 * Photos reach a unit through the admin portal instead (upload button or a
 * re-request to the owner/broker). These builders keep that contract's copy
 * consistent across the three senders: the easy-listing route, the admin
 * photos route, and the webhook media decline.
 */

/** Admin-triggered photo re-request for a specific listing (owner or broker). */
export function adminPhotoRequestMessage(name: string, code: string): string {
  return [
    `مرحباً ${name} 👋`,
    `معاك بوت Sierra Blu Realty بخصوص الوحدة ${code}.`,
    ``,
    `محتاجين منك صور الوحدة لاستكمال الاعلان:`,
    `📷 3 صور على الأقل (واجهة + داخل)`,
    ``,
    `ملحوظة مهمة: البوت بيستقبل النصوص فقط 📝 — الصور مش بتيجي عن طريق واتساب.`,
    `فريقنا هيضيف الصور من لوحة التحكم مباشرة على الوحدة بمجرد استلامها منك.`,
    ``,
    `شكراً لتعاونك 🙏`,
  ].join('\n');
}

/** Polite decline when someone sends an image (or any media) to the bot. */
export function botMediaDeclineMessage(): string {
  return [
    `وصلتنا رسالتك، شكراً لتواصلك 🙏`,
    ``,
    `البوت هنا بيستقبل المحادثة نصياً فقط 📝 — الصور مش بتستقبل على الواتساب.`,
    `لو عندك تفاصيل وحدة (المكان، المساحة، السعر، عدد الغرف) اكتبها نص وهنتسجلها فوراً على النظام.`,
    `أما الصور ففريق سييرا بيرفعها على الوحدة مباشرة من لوحة التحكم بعد طلبها منك.`,
  ].join('\n');
}
