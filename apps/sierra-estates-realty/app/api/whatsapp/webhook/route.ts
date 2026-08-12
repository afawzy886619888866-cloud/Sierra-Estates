import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { WhatsAppParserService } from '@/lib/services/WhatsAppParserService';
import { COLLECTIONS, BrokerListing } from '@/lib/models/schema';
import { logger } from '@/lib/logger';

const SECRET_KEY = process.env.SBR_SECRET_KEY || '';

async function verifyWebhookSecret(req: NextRequest): Promise<boolean> {
  if (!SECRET_KEY) return true;
  const secretHeader = req.headers.get('x-sbr-secret-key');
  return secretHeader === SECRET_KEY;
}

export async function POST(req: NextRequest) {
  if (!await verifyWebhookSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Support various common webhook formats (Ultramsg, Wati, Generic)
    const rawMessage = body.message || body.text || body.data?.message?.text || body.Body || body.content;
    const sender = body.sender || body.from || body.From || body.senderName || 'Unknown';
    const group = body.groupName || body.group || body.To || 'Direct Message';

    if (!rawMessage || typeof rawMessage !== 'string') {
      return NextResponse.json({ error: 'No valid message content found' }, { status: 400 });
    }

    logger.info(`[WhatsApp Webhook] Processing message from ${sender} in ${group}`);

    // AI Parsing - Stage 1
    const parsedData = await WhatsAppParserService.parseMessage(rawMessage);

    // Prepare Document
    const listing: Partial<BrokerListing> = {
      rawMessage,
      sourceGroup: group,
      sourcePlatform: 'whatsapp',
      senderInfo: sender,
      extractedData: {
          compound: parsedData?.compound,
          propertyType: parsedData?.propertyType,
          bedrooms: parsedData?.bedrooms,
          price: parsedData?.price,
          area: parsedData?.area,
          finishingType: parsedData?.finishingType,
          phoneNumber: parsedData?.phoneNumber,
      },
      status: parsedData?.isListing ? 'parsed' : 'new',
      isVerified: false,
      createdAt: Timestamp.now() as any,
      updatedAt: Timestamp.now() as any,
    };

    // Save to Firestore
    const docRef = await adminDb.collection(COLLECTIONS.brokerListings).add(listing);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      isListing: parsedData?.isListing || false,
      orchestration: parsedData?.isListing ? 'Stage 1 Completed' : 'Ignored (Chatter)'
    });

  } catch (error: any) {
    logger.error('[WhatsApp Webhook Error]:', error);
    return NextResponse.json({
        success: false,
        error: 'Internal Server Error',
        details: error?.message
    }, { status: 500 });
  }
}

// Support GET for simple health check
export async function GET() {
    return NextResponse.json({ status: 'active', service: 'Sierra Estates WhatsApp Webhook Gateway' });
}
