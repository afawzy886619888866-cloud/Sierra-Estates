 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }/**
 * Escapes text for Telegram's HTML parse mode.
 *
 * Every sendMessage here uses parse_mode: 'HTML', so any untrusted value
 * interpolated into a message body (a lead's name, a free-text enquiry) can
 * otherwise inject markup — or break the send outright, since Telegram rejects
 * malformed HTML. Telegram only needs these three escaped.
 *
 * Escape the VALUES, never the template: escaping the whole message would strip
 * the <b>/<i> tags the templates rely on.
 */
export function escapeTelegramHtml(value) {
  return String(_nullishCoalesce(value, () => ( '')))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendTelegramMessage(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("Telegram: Missing token or chatId. Skipping notification.");
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Telegram send error:", errorData);
    }
  } catch (error) {
    console.error("Telegram error:", error);
  }
}
