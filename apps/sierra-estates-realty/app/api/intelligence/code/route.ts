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

    // §21 no-fabrication: a property code encodes the compound — inventing a
    // default compound would fabricate listing data. Require the caller to
    // state it explicitly.
    const compound = body.compound || body.locationArea;
    if (!compound || typeof compound !== 'string' || !compound.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            'compound or locationArea is required to generate a property code — no default compound is invented (§21 no-fabrication policy)',
        },
        { status: 400 }
      );
    }

    const params: PropertyCodeInput = {
      compound,
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
