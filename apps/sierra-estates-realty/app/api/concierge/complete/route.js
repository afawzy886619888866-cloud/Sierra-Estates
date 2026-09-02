import { NextResponse } from 'next/server';
import { generateCloserHandoff } from '@/lib/services/handoff-service';
import { escapeTelegramHtml } from '@/lib/telegram';

export async function POST(req) {
  try {
    const { leadId } = await req.json().catch(() => ({}));
    if (typeof leadId !== 'string' || leadId.length === 0 || leadId.length > 200) {
      return NextResponse.json({ error: 'Missing or invalid leadId' }, { status: 400 });
    }

    // 1. Generate the High-Fidelity Executive Summary
    const summary = await generateCloserHandoff(leadId);

    // 2. Notify Admin via Telegram (The Handoff Notification)
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const adminChatId = process.env.TELEGRAM_CHAT_ID;

    if (token && adminChatId) {
      const message = `<b>🏆 STAGE 9: HANDOFF RECEIVED</b>\n\nStakeholder <b>${escapeTelegramHtml(summary.leadName)}</b> has finalized their selection.\n\n<b>Intelligence Profile:</b>\n${escapeTelegramHtml(summary.intelligenceProfile)}\n\n<b>High Interest:</b>\n${summary.highInterestAssets.map(a => `• ${escapeTelegramHtml(a.code)}`).join('\n')}\n\n<b>Strategic Intent:</b>\n${escapeTelegramHtml(summary.strategicIntent)}\n\n<i>Use the /ag handover command for full lead context.</i>`;
      
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: message,
          parse_mode: 'HTML'
        }),
      });
    }

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("Handoff API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
