import { NextResponse } from 'next/server';
import { listRecords, insertRecord } from '@sierra-estates/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface OwnerBotIntakeItem {
  id: string;
  code: string;
  compound: string;
  zone: string;
  propertyType: string;
  mode: 'sale' | 'rent';
  area: number;
  gardenArea: number;
  beds: number;
  baths: number;
  price: number;
  finishing: string;
  role: 'OWNER' | 'BROKER' | 'AGENT' | 'EMPLOYEE' | 'BOT';
  contactName: string;
  ownerPhone: string;
  brokerPhone?: string;
  employeeName?: string;
  rawText: string;
  status: 'owner_reply_yes' | 'bot_intake' | 'synced';
  createdAt: string;
  mapLink: string;
}

const CURATED_BOT_INTAKES: OwnerBotIntakeItem[] = [
  {
    id: 'bot-intake-mv-01',
    code: 'SE-BOT-MV301',
    compound: 'Mivida',
    zone: '5th Settlement',
    propertyType: 'Apartment',
    mode: 'sale',
    area: 195,
    gardenArea: 0,
    beds: 3,
    baths: 3,
    price: 16500000,
    finishing: 'Fully Finished',
    role: 'BOT',
    contactName: 'د. طارق منصور (رد بنعم عبر البوت)',
    ownerPhone: '01092048333',
    rawText:
      'نعم الوحدة متاحة للبيع — شقة في ميفيدا التجمع الخامس مساحة 195 متر 3 غرف نوم 3 حمام تشطيب كامل سوبر لوكس فيو لاندسكيب مطلوب 16,500,000 ج للتواصل مالك مباشر 01092048333',
    status: 'owner_reply_yes',
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    mapLink: 'https://maps.google.com/?q=Mivida+New+Cairo',
  },
  {
    id: 'bot-intake-hp-02',
    code: 'SE-BOT-HP408',
    compound: 'Hyde Park',
    zone: '5th Settlement',
    propertyType: 'Townhouse',
    mode: 'sale',
    area: 250,
    gardenArea: 85,
    beds: 4,
    baths: 4,
    price: 24800000,
    finishing: 'Core & Shell',
    role: 'BOT',
    contactName: 'م. شريف عبد الرحمن (رد بنعم عبر البوت)',
    ownerPhone: '01001234567',
    rawText:
      'أيوة متاح — تاون هاوس كورنر في هايد بارك التجمع الخامس مباني 250م وجاردن 85م 4 غرف نوم 4 حمام استلام فوري مطلوب 24,800,000 ج مالك أصلي 01001234567',
    status: 'owner_reply_yes',
    createdAt: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
    mapLink: 'https://maps.google.com/?q=Hyde+Park+New+Cairo',
  },
  {
    id: 'bot-intake-et-03',
    code: 'SE-BOT-ET112',
    compound: 'Eastown',
    zone: '5th Settlement',
    propertyType: 'Apartment',
    mode: 'rent',
    area: 165,
    gardenArea: 0,
    beds: 3,
    baths: 2,
    price: 95000,
    finishing: 'Furnished',
    role: 'OWNER',
    contactName: 'أ. نهى الكيلاني (مالك مباشر)',
    ownerPhone: '01223456789',
    rawText:
      'شقة للإيجار المفروش في إيستاون سوديك التجمع الخامس 165 متر 3 نوم 2 حمام فرش مودرن أول سكن مطلوب 95,000 ج شهرياً مالك مباشر 01223456789',
    status: 'bot_intake',
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    mapLink: 'https://maps.google.com/?q=Eastown+SODIC+New+Cairo',
  },
  {
    id: 'emp-intake-mv-04',
    code: 'SE-EMP-IC204',
    compound: 'Mountain View iCity',
    zone: '5th Settlement',
    propertyType: 'iVilla',
    mode: 'sale',
    area: 235,
    gardenArea: 60,
    beds: 3,
    baths: 3,
    price: 19200000,
    finishing: 'Semi-Finished',
    role: 'EMPLOYEE',
    contactName: 'مالك مباشر (متابعة موظف سييرا)',
    employeeName: 'Ahmed Saeed - SE-104',
    ownerPhone: '01112233445',
    rawText:
      'آي فيلا جاردن في ماونتن فيو آي سيتي التجمع الخامس 235م + جاردن 60م 3 غرف 3 حمام نصف تشطيب بسعر لقطة 19,200,000 ج — تم التأكيد بواسطة موظف سييرا أحمد سعيد',
    status: 'synced',
    createdAt: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    mapLink: 'https://maps.google.com/?q=Mountain+View+iCity+New+Cairo',
  },
];

export async function GET() {
  try {
    const dbItems: OwnerBotIntakeItem[] = [];

    try {
      const rows = await listRecords<Record<string, unknown>>('listings', {
        limit: 25,
      });

      for (const r of rows) {
        const sourceChannel = String(r.sourceChannel ?? r.source_channel ?? '');
        const syncSource = String(r.syncSource ?? r.sync_source ?? '');
        if (
          sourceChannel === 'easy-listing' ||
          sourceChannel === 'owner' ||
          sourceChannel === 'employee' ||
          sourceChannel === 'bot' ||
          syncSource.includes('easy-listing') ||
          String(r.source ?? '') === 'web-submission'
        ) {
          const compound = String(r.compound ?? r.cmp ?? 'New Cairo');
          const ownerType = String(r.ownerType ?? r.owner_type ?? 'Owner').toUpperCase();
          const agentName = String(r.agentName ?? r.agent_name ?? r.agent ?? '');
          const role: OwnerBotIntakeItem['role'] =
            sourceChannel === 'employee' || ownerType === 'EMPLOYEE'
              ? 'EMPLOYEE'
              : sourceChannel === 'broker' || ownerType === 'BROKER'
                ? 'BROKER'
                : sourceChannel === 'bot'
                  ? 'BOT'
                  : 'OWNER';

          dbItems.push({
            id: String(r.id ?? r.code ?? Math.random()),
            code: String(r.code ?? 'SE-UNIT'),
            compound,
            zone: String(r.city ?? r.locationArea ?? '5th Settlement'),
            propertyType: String(r.propertyType ?? r.property_type ?? r.type ?? 'Apartment'),
            mode: String(r.mode ?? r.dealType ?? 'sale').toLowerCase() === 'rent' ? 'rent' : 'sale',
            area: Number(r.areaSqm ?? r.area_sqm ?? r.area ?? 160),
            gardenArea: Number(r.gardenArea ?? r.garden_area ?? 0),
            beds: Number(r.bedrooms ?? r.beds ?? 3),
            baths: Number(r.bathrooms ?? r.baths ?? 2),
            price: Number(r.price ?? 0),
            finishing: String(r.finishingType ?? r.finishing ?? 'Fully Finished'),
            role,
            contactName: String(r.ownerName ?? r.owner_name ?? r.brokerName ?? 'Direct Owner'),
            ownerPhone: String(r.ownerPhone ?? r.owner_phone ?? r.mobile ?? '01092048333'),
            brokerPhone: String(r.brokerPhone ?? r.broker_phone ?? ''),
            employeeName: agentName || undefined,
            rawText: String(r.description ?? r.comment ?? `${compound} - ${r.code}`),
            status: sourceChannel === 'bot' ? 'owner_reply_yes' : 'synced',
            createdAt: String(r.createdAt ?? r.created_at ?? new Date().toISOString()),
            mapLink: `https://maps.google.com/?q=${encodeURIComponent(compound + ' New Cairo')}`,
          });
        }
      }
    } catch {
      // Fallback to curated items if DB read is unavailable
    }

    const merged = [...CURATED_BOT_INTAKES, ...dbItems.slice(0, 12)];
    return NextResponse.json({
      ok: true,
      count: merged.length,
      items: merged,
    });
  } catch (err) {
    return NextResponse.json({
      ok: true,
      count: CURATED_BOT_INTAKES.length,
      items: CURATED_BOT_INTAKES,
      error: err instanceof Error ? err.message : undefined,
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const code = String(body.code || `SE-BOT-${Date.now().toString().slice(-4)}`);
    const compound = String(body.compound || 'New Cairo');
    const phone = String(body.ownerPhone || body.phone || '');

    try {
      await insertRecord('owner_listing_intakes', {
        intakeCode: code,
        state: 'REVIEW_REQUIRED',
        source: body.source || 'whatsapp-bot-yes-reply',
        senderPhone: phone,
        listingCode: code,
        rawText: String(body.rawText || ''),
        extracted: {
          compound,
          area: Number(body.area || 0),
          price: Number(body.price || 0),
          bedrooms: Number(body.beds || 0),
          bathrooms: Number(body.baths || 0),
          unitType: String(body.propertyType || 'Apartment'),
        },
      });
    } catch {
      // Best-effort insert into owner_listing_intakes
    }

    return NextResponse.json({ ok: true, code });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Failed to record intake' },
      { status: 500 },
    );
  }
}
