import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!token) return NextResponse.json({ error: 'No token' });
  if (!url) return NextResponse.json({ error: 'Provide url param' });

  try {
    const webhookUrl = `${url}/api/telegram/webhook`;
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
