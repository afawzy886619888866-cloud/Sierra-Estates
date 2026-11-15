'use client';

/**
 * SIERRA ESTATES — PUBLIC ADD-LISTING FORM (Module 4)
 *
 * Owner / Co-Broker / Internal Agent submission form behind /add-listing.
 * Posts to POST /api/listings/add (lib/services/AddListingPipeline.ts):
 * dedup → official unit code → Supabase + Google Sheets dual write →
 * storage upload → Telegram alert.
 *
 * Features:
 *   - Submitter role cards (Direct Owner / Co-Broker / Internal Agent)
 *   - Egyptian phone normalization preview (+20…)
 *   - Transaction × Category × Compound/Zone selector (Hyde Park, Mountain
 *     View iCity and Fifth Settlement compounds, masterplan zone tagging)
 *   - Full specs incl. floor, finishing, down payment & installments,
 *     availability status
 *   - Multi-image upload with client-side compression + preview
 *   - Merge-aware success screen (shows the unit code and the merge outcome)
 *
 * Styled with the AddListingForm.module.css classes (self-contained dark
 * Sierra theme) shared with the Easy Listing studio.
 */

import React, { useRef, useState } from 'react';
import {
  CheckCircle2, Loader2, UploadCloud, X, AlertCircle, MapPin, Home,
} from 'lucide-react';
import styles from './AddListingForm.module.css';

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const COMPOUND_LIST = [
  'Hyde Park',
  'Mountain View iCity',
  'Mountain View Hyde Park',
  'Mountain View Executive',
  'Mivida',
  'Palm Hills New Cairo',
  'Katameya Heights',
  'Katameya Dunes',
  'Eastown',
  'Villette',
  'ZED East',
  'Cairo Festival City',
  'Taj City',
  'Fifth Square',
  'The Waterway',
  'Swan Lake Residence',
  'Stone Residence',
  'District 5',
  'Al Rehab',
  'Madinaty',
  'Uptown Cairo',
  'Other (specify)',
];

/** Masterplan zones (SVG overlay names) per compound. */
const MASTERPLAN_ZONES: Record<string, string[]> = {
  'Hyde Park': ['Park Corner', 'Hyde Park Central', 'The Residence', 'HydeOut Lifestyle', 'Central Park'],
  'Mountain View iCity': ['Lagoon Beach Park', 'Club Park', 'Mountain Park', 'Royal Park', 'Crystal Lagoon'],
  'Mountain View Hyde Park': ['Central Park', 'Sports Clubhouse', 'HydeOut'],
  'Mountain View Executive': ['Executive Park', 'The Ridge'],
  Mivida: ['The Boulevard', 'The Greens', 'Twin Valley'],
  'Palm Hills New Cairo': ['Phase 1 Enclave', 'Palm Hills Club', 'The Botanical Valley'],
  'Katameya Heights': ['Golf Villas Phase 1', 'Fairway Residences', 'Clubhouse Quarter'],
  Eastown: ['Eastown Residences', 'The Commercial Spine', 'Spectra'],
  Villette: ['Sky Condos', 'The Pocket Parks', 'Villette Central'],
  'ZED East': ['Club Residences', 'Park View Apartments', 'The Commercial Strip'],
  'Cairo Festival City': ['Oriana Villas', 'Aura Apartments', 'Festival Tower District'],
  'Taj City': ['Shalya', 'Taj Sultan', 'Zone T', 'Elect'],
  'Fifth Square': ['Fifth Square Park Villas', 'The Mall Concourse', 'Clubhouse Central'],
  'The Waterway': ['Waterway Villas', 'The Commercial Promenade'],
  'Swan Lake Residence': ['The Phoenix', 'The Scarlet', 'Selena', 'The Iris'],
  'Stone Residence': ['Stone Park Villas', 'Stone Residence West'],
  'District 5': ['Mindhaus Business', 'District 5 Villas', 'Plaza Concourse'],
  'Al Rehab': ['Phase 1-5 Residences', 'Rehab City Avenue'],
  Madinaty: ['South Park', 'Golf Residences', 'Madinaty Central'],
  'Uptown Cairo': ['Celesta Hills', 'Aurora', 'The Sierras'],
};

const CATEGORIES = [
  'Apartment', 'Villa', 'Twin House', 'Townhouse', 'Duplex', 'Penthouse', 'Commercial',
] as const;

const FINISHINGS = ['Core & Shell', 'Semi-Finished', 'Fully Finished', 'Furnished'] as const;

const AVAILABILITIES = ['Available', 'Reserved', 'Sold/Rented'] as const;

const ROLES = [
  { id: 'Direct Owner', icon: '🏠', desc: 'I own this unit directly' },
  { id: 'Co-Broker', icon: '🤝', desc: 'I represent the owner as an external broker' },
  { id: 'Internal Agent', icon: '🏛️', desc: 'Sierra Estates internal team' },
] as const;

/* ------------------------------------------------------------------ */
/*  PHONE NORMALIZATION (client mirror of lib/utils/phone.ts)           */
/* ------------------------------------------------------------------ */

function toAsciiDigits(raw: string): string {
  return raw
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function normalizePhoneClient(raw: string): string | null {
  let digits = toAsciiDigits(String(raw ?? '')).replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('20') && digits.length === 12) digits = '0' + digits.slice(2);
  if (digits.length === 10 && /^1[0125]/.test(digits)) digits = '0' + digits;
  if (!/^01[0125]\d{8}$/.test(digits)) return null;
  return `+20${digits.slice(1)}`;
}

/* ------------------------------------------------------------------ */
/*  IMAGE COMPRESSION                                                  */
/* ------------------------------------------------------------------ */

const MAX_PHOTOS = 10;
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

interface PhotoItem {
  id: string;
  dataUrl: string;
  name: string;
}

async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                          */
/* ------------------------------------------------------------------ */

export default function PublicAddListingForm({ isAr = false }: { isAr?: boolean }) {
  const [submitterRole, setSubmitterRole] = useState<(typeof ROLES)[number]['id']>('Direct Owner');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [transaction, setTransaction] = useState<'Sale' | 'Rent'>('Sale');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Apartment');
  const [compound, setCompound] = useState('Hyde Park');
  const [customCompound, setCustomCompound] = useState('');
  const [zone, setZone] = useState('');
  const [areaSqm, setAreaSqm] = useState('');
  const [gardenSqm, setGardenSqm] = useState('');
  const [bedrooms, setBedrooms] = useState('3');
  const [bathrooms, setBathrooms] = useState('3');
  const [floor, setFloor] = useState('');
  const [finishing, setFinishing] = useState<(typeof FINISHINGS)[number]>('Fully Finished');
  const [priceEgp, setPriceEgp] = useState('');
  const [downPaymentEgp, setDownPaymentEgp] = useState('');
  const [installmentYears, setInstallmentYears] = useState('');
  const [monthlyInstallmentEgp, setMonthlyInstallmentEgp] = useState('');
  const [availability, setAvailability] = useState<(typeof AVAILABILITIES)[number]>('Available');
  const [notes, setNotes] = useState('');
  const [unitNumber, setUnitNumber] = useState('');

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    unitCode: string;
    action: 'created' | 'merged';
    message: string;
  } | null>(null);

  const effectiveCompound = compound === 'Other (specify)' ? customCompound.trim() : compound;
  const zones = MASTERPLAN_ZONES[effectiveCompound] ?? [];
  const normalizedPhone = normalizePhoneClient(phone);

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const next: PhotoItem[] = [...photos];
      for (const file of Array.from(files).slice(0, MAX_PHOTOS - photos.length)) {
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await compressImage(file);
        next.push({ id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, dataUrl, name: file.name });
      }
      setPhotos(next.slice(0, MAX_PHOTOS));
    } catch {
      setError(isAr ? 'تعذر معالجة الصور.' : 'Could not process the images.');
    } finally {
      setUploading(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (contactName.trim().length < 2) {
      setError(isAr ? 'يرجى إدخال اسم جهة الاتصال.' : 'Please enter the contact name.');
      return;
    }
    if (!normalizedPhone) {
      setError(isAr ? 'يرجى إدخال رقم موبايل مصري صحيح (01012345678).' : 'Enter a valid Egyptian mobile (e.g. 01012345678).');
      return;
    }
    if (!effectiveCompound) {
      setError(isAr ? 'يرجى تحديد الكمبوند.' : 'Please select a compound.');
      return;
    }
    const area = Number(areaSqm);
    if (!area || area < 20) {
      setError(isAr ? 'يرجى إدخال مساحة بناء صحيحة (م²).' : 'Enter a valid built-up area (sqm).');
      return;
    }
    const price = Number(priceEgp);
    if (!price || price < 1000) {
      setError(isAr ? 'يرجى إدخال سعر صحيح بالجنيه المصري.' : 'Enter a valid price in EGP.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/listings/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submitterRole,
          contactName: contactName.trim(),
          phone,
          transaction,
          category,
          compound: effectiveCompound,
          zone: zone || undefined,
          areaSqm: area,
          gardenSqm: Number(gardenSqm) || 0,
          bedrooms: Number(bedrooms) || 0,
          bathrooms: Number(bathrooms) || 0,
          floor: floor || undefined,
          finishing,
          priceEgp: price,
          monthlyRentEgp: transaction === 'Rent' ? price : undefined,
          downPaymentEgp: Number(downPaymentEgp) || undefined,
          installmentYears: Number(installmentYears) || undefined,
          monthlyInstallmentEgp: Number(monthlyInstallmentEgp) || undefined,
          availability,
          photos: photos.map((p) => p.dataUrl),
          notes: notes.trim() || undefined,
          unitNumber: unitNumber.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || (isAr ? 'تعذر حفظ الإعلان.' : 'Could not save the listing.'));
      }
      setSuccess({ unitCode: data.unitCode, action: data.action, message: data.message });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className={styles.formCard} style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', padding: '48px 32px' }}>
        <CheckCircle2 style={{ width: 56, height: 56, color: '#10b981', marginBottom: 16 }} />
        <h2 style={{ margin: '0 0 10px', color: '#fff', fontSize: 24 }}>
          {success.action === 'merged'
            ? (isAr ? 'تم تحديث إعلان قائم' : 'Existing Listing Updated')
            : (isAr ? 'تم استلام الإعلان بنجاح!' : 'Listing Submitted!')}
        </h2>
        <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px' }}>{success.message}</p>
        <div
          style={{
            display: 'inline-block', padding: '12px 26px', borderRadius: 12,
            border: '1px solid #c9a86a', background: 'rgba(201,168,106,.08)',
            fontFamily: 'monospace', fontWeight: 800, fontSize: 18, color: '#fde047',
          }}
        >
          {success.unitCode}
        </div>
        <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, marginTop: 18 }}>
          {isAr
            ? 'كود الوحدة الرسمي وفق قواعد الترميز المعتمدة — ستتم مراجعة الإعلان ونشره خلال 24 ساعة.'
            : 'The official Sierra Estates unit code — our team verifies and publishes within 24 hours.'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.formCard} style={{ maxWidth: 880, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <Home style={{ width: 22, height: 22, color: '#c9a86a' }} />
        <h2 style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 800 }}>
          {isAr ? 'أضف وحدتك — ملاك وبروكر' : 'Add Your Listing — Owners & Brokers'}
        </h2>
      </div>

      {error && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)', color: '#ef4444', fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
          <AlertCircle style={{ width: 16, height: 16, flex: 'none' }} />
          {error}
        </div>
      )}

      {/* ── Submitter role ── */}
      <FieldGroup label={isAr ? 'صفة المُقدّم *' : 'Submitter Role *'}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSubmitterRole(r.id)}
              style={{
                padding: '14px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                border: submitterRole === r.id ? '1.5px solid #c9a86a' : '1.5px solid rgba(255,255,255,.12)',
                background: submitterRole === r.id ? 'rgba(201,168,106,.1)' : 'rgba(255,255,255,.03)',
                color: '#fff', transition: 'all .2s',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700 }}>{r.icon} {r.id}</div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.55)', marginTop: 4 }}>{r.desc}</div>
            </button>
          ))}
        </div>
      </FieldGroup>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <FieldGroup label={isAr ? 'اسم جهة الاتصال *' : 'Contact Name *'}>
          <input className={styles.input} value={contactName} onChange={(e) => setContactName(e.target.value)} required maxLength={120} />
        </FieldGroup>
        <FieldGroup label={isAr ? 'الموبايل (مصر) *' : 'Phone (Egypt) *'}>
          <input className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" placeholder="01012345678" />
          {phone.trim() !== '' && (
            <div style={{ marginTop: 6, fontSize: 11.5, color: normalizedPhone ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
              {normalizedPhone ?? (isAr ? 'رقم غير صالح' : 'invalid number')}
            </div>
          )}
        </FieldGroup>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <FieldGroup label={isAr ? 'نوع التعامل *' : 'Transaction *'}>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['Sale', 'Rent'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTransaction(t)}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13.5,
                  border: transaction === t ? '1.5px solid #c9a86a' : '1.5px solid rgba(255,255,255,.12)',
                  background: transaction === t ? 'rgba(201,168,106,.12)' : 'rgba(255,255,255,.03)',
                  color: transaction === t ? '#fde047' : 'rgba(255,255,255,.7)',
                }}
              >
                {t === 'Sale' ? (isAr ? 'بيع' : 'Sale') : (isAr ? 'إيجار' : 'Rent')}
              </button>
            ))}
          </div>
        </FieldGroup>
        <FieldGroup label={isAr ? 'نوع الوحدة *' : 'Category *'}>
          <select className={styles.input} value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </FieldGroup>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <FieldGroup label={isAr ? 'الكمبوند / المنطقة *' : 'Compound / Zone *'}>
          <select className={styles.input} value={compound} onChange={(e) => { setCompound(e.target.value); setZone(''); }}>
            {COMPOUND_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {compound === 'Other (specify)' && (
            <input className={styles.input} style={{ marginTop: 10 }} value={customCompound} onChange={(e) => setCustomCompound(e.target.value)} placeholder={isAr ? 'اسم الكمبوند…' : 'Compound name…'} required />
          )}
        </FieldGroup>
        <FieldGroup label={isAr ? 'منطقة المسقط (اختياري)' : 'Masterplan Zone (optional)'}>
          {zones.length ? (
            <select className={styles.input} value={zone} onChange={(e) => setZone(e.target.value)}>
              <option value="">{isAr ? '— اختر المنطقة —' : '— Select zone —'}</option>
              {zones.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          ) : (
            <input className={styles.input} value={zone} onChange={(e) => setZone(e.target.value)} placeholder={isAr ? 'الحي / المنطقة' : 'Neighborhood / zone'} />
          )}
          <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,.4)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <MapPin style={{ width: 11, height: 11 }} />
            {isAr ? 'يُستخدم للتوسيم على المسقط الافتتاحي (هايد بارك / أي سيتي)' : 'Used for the SVG masterplan pin tagging (Hyde Park / iCity)'}
          </div>
        </FieldGroup>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
        <FieldGroup label={isAr ? 'مساحة البناء م² *' : 'BUA (sqm) *'}>
          <input className={styles.input} type="number" min={20} max={10000} value={areaSqm} onChange={(e) => setAreaSqm(e.target.value)} required />
        </FieldGroup>
        <FieldGroup label={isAr ? 'حديقة / أرض م²' : 'Land / Garden (sqm)'}>
          <input className={styles.input} type="number" min={0} value={gardenSqm} onChange={(e) => setGardenSqm(e.target.value)} />
        </FieldGroup>
        <FieldGroup label={isAr ? 'غرف نوم' : 'Bedrooms'}>
          <input className={styles.input} type="number" min={0} max={20} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
        </FieldGroup>
        <FieldGroup label={isAr ? 'حمامات' : 'Bathrooms'}>
          <input className={styles.input} type="number" min={0} max={20} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
        </FieldGroup>
        <FieldGroup label={isAr ? 'الدور / الطابق' : 'Floor'}>
          <input className={styles.input} value={floor} onChange={(e) => setFloor(e.target.value)} placeholder={isAr ? 'مثال: 3 / G+2 / Roof' : 'e.g. 3 / G+2 / Ground'} maxLength={40} />
        </FieldGroup>
        <FieldGroup label={isAr ? 'رقم المبنى / الوحدة' : 'Building / Unit No.'}>
          <input className={styles.input} value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} maxLength={60} placeholder="B12-U34" />
        </FieldGroup>
      </div>

      <FieldGroup label={isAr ? 'التشطيب *' : 'Finishing *'}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {FINISHINGS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFinishing(f)}
              style={{
                padding: '9px 18px', borderRadius: 999, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                border: finishing === f ? '1.5px solid #c9a86a' : '1.5px solid rgba(255,255,255,.12)',
                background: finishing === f ? 'rgba(201,168,106,.12)' : 'rgba(255,255,255,.03)',
                color: finishing === f ? '#fde047' : 'rgba(255,255,255,.7)',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </FieldGroup>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <FieldGroup label={transaction === 'Rent' ? (isAr ? 'الإيجار الشهري (جنيه) *' : 'Monthly Rent (EGP) *') : (isAr ? 'السعر (جنيه) *' : 'Price (EGP) *')}>
          <input className={styles.input} type="number" min={1000} value={priceEgp} onChange={(e) => setPriceEgp(e.target.value)} required />
        </FieldGroup>
        {transaction === 'Sale' && (
          <>
            <FieldGroup label={isAr ? 'مقدم (جنيه)' : 'Down Payment (EGP)'}>
              <input className={styles.input} type="number" min={0} value={downPaymentEgp} onChange={(e) => setDownPaymentEgp(e.target.value)} />
            </FieldGroup>
            <FieldGroup label={isAr ? 'سنوات التقسيط' : 'Installment Years'}>
              <input className={styles.input} type="number" min={0} max={30} value={installmentYears} onChange={(e) => setInstallmentYears(e.target.value)} />
            </FieldGroup>
            <FieldGroup label={isAr ? 'القسط الشهري (جنيه)' : 'Monthly Installment (EGP)'}>
              <input className={styles.input} type="number" min={0} value={monthlyInstallmentEgp} onChange={(e) => setMonthlyInstallmentEgp(e.target.value)} />
            </FieldGroup>
          </>
        )}
        <FieldGroup label={isAr ? 'حالة الوحدة *' : 'Availability Status *'}>
          <select className={styles.input} value={availability} onChange={(e) => setAvailability(e.target.value as typeof availability)}>
            {AVAILABILITIES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </FieldGroup>
      </div>

      {/* ── Photos ── */}
      <FieldGroup label={isAr ? `الصور (${photos.length}/${MAX_PHOTOS})` : `Photos (${photos.length}/${MAX_PHOTOS})`}>
        <label
          htmlFor="pal-photos"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '22px', border: '1.5px dashed rgba(255,255,255,.18)', borderRadius: 12,
            cursor: 'pointer', color: 'rgba(255,255,255,.55)', fontSize: 13,
          }}
        >
          {uploading
            ? <Loader2 style={{ width: 18, height: 18, animation: 'palSpin 1s linear infinite' }} />
            : <UploadCloud style={{ width: 18, height: 18, color: '#c9a86a' }} />}
          {isAr ? 'اسحب الصور أو اضغط للاختيار — يتم ضغطها تلقائياً' : 'Drop images or click to choose — auto-compressed client-side'}
        </label>
        <input
          id="pal-photos"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => { void addPhotos(e.target.files); e.target.value = ''; }}
        />
        {photos.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10, marginTop: 14 }}>
            {photos.map((p) => (
              <div key={p.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,.12)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.dataUrl} alt={p.name} style={{ width: '100%', height: 84, objectFit: 'cover', display: 'block' }} />
                <button
                  type="button"
                  onClick={() => setPhotos((cur) => cur.filter((x) => x.id !== p.id))}
                  style={{
                    position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%',
                    border: 'none', background: 'rgba(0,0,0,.65)', color: '#fff', cursor: 'pointer',
                    display: 'grid', placeItems: 'center',
                  }}
                  aria-label="Remove photo"
                >
                  <X style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </FieldGroup>

      <FieldGroup label={isAr ? 'ملاحظات' : 'Notes'}>
        <textarea
          className={styles.input}
          rows={3}
          maxLength={4000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={isAr ? 'تفاصيل إضافية (إطلالة، نظرة عين، مزايا…)' : 'Extra details (view, overlooking, highlights…)'}
        />
      </FieldGroup>

      <button type="submit" className={styles.submitBtn} disabled={submitting} style={{ width: '100%', marginTop: 8 }}>
        {submitting ? (
          <>
            <Loader2 style={{ width: 18, height: 18, animation: 'palSpin 1s linear infinite' }} />
            {isAr ? 'جارٍ الحفظ والترميز…' : 'Saving & coding unit…'}
          </>
        ) : (
          isAr ? 'إرسال الإعلان' : 'Submit Listing'
        )}
      </button>

      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.45)', fontSize: 11.5, marginTop: 14, lineHeight: 1.6 }}>
        {isAr
          ? 'يتم فحص التكرار (هاتف + كمبوند + مساحة)، وتوليد كود الوحدة الرسمي، والحفظ في قاعدة البيانات + شيتات جوجل، وإرسال تنبيه فوري للإدارة.'
          : 'We dedupe (phone + compound + area), mint the official unit code, dual-write to our database + Google Sheets, and alert the team instantly.'}
      </p>

      <style>{'@keyframes palSpin{to{transform:rotate(360deg)}}'}</style>
    </form>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
