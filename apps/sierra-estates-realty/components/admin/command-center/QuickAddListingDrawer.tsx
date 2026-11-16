'use client';

/**
 * SIERRA ESTATES — ADMIN/ BROKER QUICK-ADD LISTING DRAWER (Module 4)
 *
 * Authenticated fast-add form for the admin console (Inventory OS view and
 * the /admin command center). Posts to POST /api/listings/add with staff
 * credentials, so the listing lands verified + PUBLISHABLE (vs the public
 * REVIEW_REQUIRED queue) and the pipeline still runs: dedup → official unit
 * code → Supabase + Google Sheets dual-write → storage upload → Telegram.
 *
 * Deliberately compact: a broker on a call fills this in under a minute —
 * role, contact, phone, deal, specs, price, done.
 */

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Plus, Sparkles } from 'lucide-react';
import { CcButton, CcModal, mutateApi } from './ui';

const COMPOUNDS = [
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
];

const CATEGORIES = ['Apartment', 'Villa', 'Twin House', 'Townhouse', 'Duplex', 'Penthouse', 'Commercial'] as const;
const FINISHINGS = ['Core & Shell', 'Semi-Finished', 'Fully Finished', 'Furnished'] as const;
const AVAILABILITIES = ['Available', 'Reserved', 'Sold/Rented'] as const;

interface QuickAddResult {
  ok: boolean;
  unitCode?: string;
  action?: 'created' | 'merged';
  message?: string;
  error?: string;
}

export default function QuickAddListingDrawer({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitterRole, setSubmitterRole] = useState<'Direct Owner' | 'Co-Broker' | 'Internal Agent'>('Internal Agent');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [transaction, setTransaction] = useState<'Sale' | 'Rent'>('Sale');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Apartment');
  const [compound, setCompound] = useState('Hyde Park');
  const [areaSqm, setAreaSqm] = useState('');
  const [gardenSqm, setGardenSqm] = useState('');
  const [bedrooms, setBedrooms] = useState('3');
  const [bathrooms, setBathrooms] = useState('3');
  const [floor, setFloor] = useState('');
  const [finishing, setFinishing] = useState<(typeof FINISHINGS)[number]>('Fully Finished');
  const [priceEgp, setPriceEgp] = useState('');
  const [availability, setAvailability] = useState<(typeof AVAILABILITIES)[number]>('Available');
  const [unitNumber, setUnitNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuickAddResult | null>(null);

  function reset() {
    setContactName('');
    setPhone('');
    setAreaSqm('');
    setGardenSqm('');
    setPriceEgp('');
    setFloor('');
    setUnitNumber('');
    setNotes('');
    setError(null);
    setResult(null);
  }

  async function submit() {
    setError(null);
    if (contactName.trim().length < 2) return setError('Contact name is required.');
    if (!/^(\+?20)?0?1[0125]\d{8}$/.test(phone.replace(/\s/g, ''))) {
      return setError('Enter a valid Egyptian mobile (e.g. 01012345678).');
    }
    if (!Number(areaSqm) || Number(areaSqm) < 20) return setError('Enter a valid BUA (sqm).');
    if (!Number(priceEgp) || Number(priceEgp) < 1000) return setError('Enter a valid price (EGP).');

    setBusy(true);
    const res = await mutateApi('/api/listings/add', 'POST', {
      submitterRole,
      contactName: contactName.trim(),
      phone,
      transaction,
      category,
      compound,
      areaSqm: Number(areaSqm),
      gardenSqm: Number(gardenSqm) || 0,
      bedrooms: Number(bedrooms) || 0,
      bathrooms: Number(bathrooms) || 0,
      floor: floor || undefined,
      finishing,
      priceEgp: Number(priceEgp),
      monthlyRentEgp: transaction === 'Rent' ? Number(priceEgp) : undefined,
      availability,
      notes: notes.trim() || undefined,
      unitNumber: unitNumber.trim() || undefined,
    });
    setBusy(false);

    if (res.ok) {
      setResult({
        ok: true,
        unitCode: String(res.body.unitCode ?? ''),
        action: res.body.action as 'created' | 'merged' | undefined,
        message: String(res.body.message ?? ''),
      });
      onCreated?.();
    } else {
      setResult({ ok: false, error: String(res.body.error ?? 'Quick-add failed.') });
    }
  }

  return (
    <>
      <CcButton variant="gold" onClick={() => { reset(); setOpen(true); }}>
        <Plus className="h-4 w-4" aria-hidden /> Quick Add Listing
      </CcButton>

      <CcModal
        open={open}
        onClose={() => setOpen(false)}
        title="Quick Add Listing"
        subtitle="Internal fast-add — deduped, unit-coded, synced to Supabase + Google Sheets, Telegram alert on save."
        wide
      >
        {result?.ok ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-soft" aria-hidden />
            <p className="text-sm text-[#f5f3ec]/80">{result.message}</p>
            {result.unitCode && (
              <code className="rounded-lg border border-gold-500/40 bg-gold-500/10 px-4 py-2 font-mono text-base font-bold text-gold-300">
                {result.unitCode}
              </code>
            )}
            <div className="mt-2 flex gap-2">
              <CcButton variant="gold" onClick={() => reset()}>Add another</CcButton>
              <CcButton variant="ghost" onClick={() => setOpen(false)}>Done</CcButton>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(error ?? result?.error) && (
              <div className="md:col-span-2 flex items-center gap-2 rounded-xl border border-ruby-soft/40 bg-ruby-soft/10 px-3 py-2 text-xs text-[#ff8b95]">
                <AlertCircle className="h-4 w-4 flex-none" aria-hidden />
                {error ?? result?.error}
              </div>
            )}

            <Field label="Submitter role">
              <select value={submitterRole} onChange={(e) => setSubmitterRole(e.target.value as typeof submitterRole)} className={inputCls}>
                <option>Internal Agent</option>
                <option>Direct Owner</option>
                <option>Co-Broker</option>
              </select>
            </Field>
            <Field label="Contact name *">
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputCls} maxLength={120} />
            </Field>
            <Field label="Phone (+20) *">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} inputMode="tel" placeholder="01012345678" />
            </Field>
            <Field label="Transaction">
              <div className="flex gap-2">
                {(['Sale', 'Rent'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTransaction(t)}
                    className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                      transaction === t
                        ? 'border-gold-500/60 bg-gold-500/15 text-gold-300'
                        : 'border-white/10 bg-black/20 text-[#f5f3ec]/60 hover:border-white/25'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Compound">
              <select value={compound} onChange={(e) => setCompound(e.target.value)} className={inputCls}>
                {COMPOUNDS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Building / Unit no.">
              <input value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} className={inputCls} placeholder="B12-U34" maxLength={60} />
            </Field>
            <Field label="BUA (sqm) *">
              <input type="number" min={20} value={areaSqm} onChange={(e) => setAreaSqm(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Garden (sqm)">
              <input type="number" min={0} value={gardenSqm} onChange={(e) => setGardenSqm(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Bedrooms">
              <input type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Bathrooms">
              <input type="number" min={0} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Floor">
              <input value={floor} onChange={(e) => setFloor(e.target.value)} className={inputCls} placeholder="3 / G+2 / Ground" maxLength={40} />
            </Field>
            <Field label="Finishing">
              <select value={finishing} onChange={(e) => setFinishing(e.target.value as typeof finishing)} className={inputCls}>
                {FINISHINGS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </Field>
            <Field label={transaction === 'Rent' ? 'Monthly rent (EGP) *' : 'Price (EGP) *'}>
              <input type="number" min={1000} value={priceEgp} onChange={(e) => setPriceEgp(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Availability">
              <select value={availability} onChange={(e) => setAvailability(e.target.value as typeof availability)} className={inputCls}>
                {AVAILABILITIES.map((a) => <option key={a}>{a}</option>)}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Notes">
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} maxLength={4000} />
              </Field>
            </div>

            <div className="md:col-span-2 mt-1 flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-[0.66rem] text-[#f5f3ec]/45">
                <Sparkles className="h-3.5 w-3.5 text-gold-400" aria-hidden />
                Dedup by phone + compound + BUA · official SE-SL/RNT code · Sheets sync · Telegram alert
              </p>
              <CcButton variant="gold" onClick={submit} loading={busy} disabled={busy}>
                Save Listing
              </CcButton>
            </div>
          </div>
        )}
      </CcModal>
    </>
  );
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-[#f5f3ec]/90 outline-none transition focus:border-gold-500/50';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-[#f5f3ec]/40">
        {label}
      </span>
      {children}
    </label>
  );
}
