import { NextRequest, NextResponse } from 'next/server';
import {
  buildSierraCodeMetadata,
  parseSierraCode,
  type PropertyCodeInput,
} from '@sierra-estates/agents';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'parse' || (body.code && !body.compound)) {
      const parsed = parseSierraCode(body.code);
      return NextResponse.json({
        success: true,
        action: 'parse',
        code: body.code,
        parsed,
      });
    }

    const params: PropertyCodeInput = {
      compound: body.compound || body.locationArea || 'New Cairo',
      rooms: Number(body.rooms || body.beds || 0),
      furnishingStatus: body.furnishingStatus || body.furnishing || 'unfurnished',
      price: Number(body.price || 0),
      currency: body.currency || 'EGP',
      features: Array.isArray(body.features) ? body.features : [],
    };

    const metadata = buildSierraCodeMetadata(params);

    return NextResponse.json({
      success: true,
      action: 'generate',
      code: metadata.code,
      metadata,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Code parameter is required' }, { status: 400 });
  }

  const parsed = parseSierraCode(code);
  return NextResponse.json({ success: true, code, parsed });
}
