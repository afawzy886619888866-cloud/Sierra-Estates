'use client';

/**
 * AddListingForm — React port of deploy/add-listing.html.
 * Markup, copy, styling and behaviour mirror the source page; the only
 * change is that submissions POST to /api/listings/submit.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Moon, Sun, Languages, BadgeCheck, Users, Percent,
  ArrowRight, Check, MessageCircle, UploadCloud, X,
} from 'lucide-react';
import s from './AddListingForm.module.css';

const WA = '201092048333';

const CPDS = [
  'Mountain View iCity', 'Mountain View Hyde Park', 'Uptown Cairo', 'Mivida', 'Madinaty',
  'Hyde Park', 'Eastown', 'El Shorouk', 'Palm Hills New Cairo', 'Villette', 'Fifth Square',
  'SODIC East', 'Taj City', 'Bloomfields', 'Sarai', 'Katameya Heights', 'Al Rehab',
  'Zed East', 'La Vista City',
];

const TYPES = ['Apartment', 'Villa', 'Townhouse', 'Twin House', 'Penthouse', 'Duplex', 'Studio', 'Chalet'];
const FINISHES = ['Fully finished', 'Semi-finished', 'Core & shell', 'Furnished'];

const TYPES_AR: Record<string, string> = {
  'Apartment': 'شقة', 'Villa': 'فيلا', 'Townhouse': 'تاون هاوس', 'Twin House': 'توين هاوس',
  'Penthouse': 'بنتهاوس', 'Duplex': 'دوبلكس', 'Studio': 'استوديو', 'Chalet': 'شاليه',
};
const FIN_AR: Record<string, string> = {
  'Fully finished': 'تشطيب كامل', 'Semi-finished': 'نصف تشطيب',
  'Core & shell': 'على الطوب', 'Furnished': 'مفروش',
};

const T = {
  en: {
    brandSub: 'AI Real Estate · New Cairo', langLabel: 'عربي',
    eyebrow: 'For brokers & owners', titleLead: 'List your unit with ', titleEm: 'Sierra Estates',
    lead: "Send us the unit once. Our team verifies it, prices it against live New Cairo comparables, and puts it in front of matched buyers and tenants.",
    p1: 'Verified in 24 hours', p2: 'Matched to active buyers', p3: 'No upfront fee',
    s1: 'The unit', s2: 'You', purpose: 'Listing for', sale: 'Resale', rent: 'Rent',
    cpd: 'Compound', type: 'Property type', beds: 'Bedrooms', baths: 'Bathrooms',
    area: 'Area (m²)', priceSale: 'Asking price (EGP)', priceRent: 'Monthly rent (EGP)',
    finish: 'Finishing', notes: 'Anything else we should know',
    photosTit: 'Property Photos', dropPhotos: 'Drop property photos here or click to browse',
    photosSub: 'High-res photos increase inquiry velocity by 3.4x (JPG, PNG, WebP · Max 10 photos)',
    coverTag: 'Cover Photo', removePhoto: 'Remove photo',
    role: 'You are', owner: 'Owner', broker: 'Broker', name: 'Full name', wa: 'WhatsApp number',
    note: "Photos and documents can also be sent over WhatsApp after you submit — we'll open the chat for you.",
    submit: 'Submit listing', sending: 'Submitting…',
    needCpd: 'Which compound is the unit in?', needArea: 'Add the unit area in m².',
    needPrice: 'Add the asking price.', needName: 'Please add your name.',
    needPhone: 'Add a valid WhatsApp number so we can come back to you.',
    failed: 'Something went wrong — please try again.',
    doneTit: 'Listing received',
    doneMsg: 'Our inventory team reviews it within 24 hours and comes back to you on WhatsApp.',
    ref: 'Reference', sendPhotos: 'Send more photos on WhatsApp', again: 'Add another listing',
    legal: 'Sierra Estates · Banafseg 2, Villa 402, New Cairo · +2 010 9204 8333',
    phName: 'Your name', phCpd: 'e.g. Mivida', phArea: '220',
    phPriceSale: '12,500,000', phPriceRent: '85,000',
    phNotes: 'Floor, view, delivery date, payment plan, availability for viewings…',
  },
  ar: {
    brandSub: 'عقارات بالذكاء الاصطناعي · القاهرة الجديدة', langLabel: 'EN',
    eyebrow: 'للوسطاء والمالكين', titleLead: 'أضف وحدتك مع ', titleEm: 'سييرا إستيتس',
    lead: 'ابعتلنا الوحدة مرة واحدة. فريقنا يعاينها، يسعّرها بمقارنات حقيقية في القاهرة الجديدة، ويعرضها على مشترين ومستأجرين مطابقين.',
    p1: 'معاينة خلال 24 ساعة', p2: 'عرض على عملاء جاهزين', p3: 'بدون مقدم أو رسوم',
    s1: 'بيانات الوحدة', s2: 'بياناتك', purpose: 'نوع الإعلان', sale: 'بيع', rent: 'إيجار',
    cpd: 'الكمبوند', type: 'نوع العقار', beds: 'غرف النوم', baths: 'الحمامات',
    area: 'المساحة (م²)', priceSale: 'السعر المطلوب (ج.م)', priceRent: 'الإيجار الشهري (ج.م)',
    finish: 'التشطيب', notes: 'أي تفاصيل إضافية',
    photosTit: 'صور العقار', dropPhotos: 'اسحب وأفلت صور العقار هنا أو اضغط للاختيار',
    photosSub: 'الصور عالية الجودة تزيد من سرعة التواصل بمعدل 3.4x (JPG, PNG, WebP · حتى 10 صور)',
    coverTag: 'الصورة الرئيسية', removePhoto: 'حذف الصورة',
    role: 'أنت', owner: 'مالك', broker: 'وسيط', name: 'الاسم بالكامل', wa: 'رقم الواتساب',
    note: 'يمكن أيضاً إرسال الصور والمستندات عبر واتساب بعد الإرسال — هنفتحلك المحادثة.',
    submit: 'أرسل العقار', sending: 'جارٍ الإرسال…',
    needCpd: 'الوحدة في أي كمبوند؟', needArea: 'اكتب مساحة الوحدة بالمتر.',
    needPrice: 'اكتب السعر المطلوب.', needName: 'من فضلك اكتب اسمك.',
    needPhone: 'اكتب رقم واتساب صحيح حتى نتواصل معك.',
    failed: 'حدث خطأ، برجاء المحاولة مرة أخرى.',
    doneTit: 'تم استلام العقار',
    doneMsg: 'فريق المخزون يراجعه خلال 24 ساعة ويرجعلك على واتساب.',
    ref: 'رقم الطلب', sendPhotos: 'إرسال المزيد على واتساب', again: 'أضف عقار آخر',
    legal: 'سييرا إستيتس · البنفسج 2، فيلا 402، القاهرة الجديدة · 01092048333',
    phName: 'اسمك', phCpd: 'مثال: ميفيدا', phArea: '220',
    phPriceSale: '12,500,000', phPriceRent: '85,000',
    phNotes: 'الدور، الفيو، موعد التسليم، خطة السداد، مواعيد المعاينة…',
  },
} as const;

type Lang = 'en' | 'ar';
type Theme = 'light' | 'dark';
type Purpose = 'sale' | 'rent';
type Role = 'owner' | 'broker';

const digits = (v: string) => String(v || '').replace(/[^\d]/g, '');

export default function AddListingForm() {
  const [lang, setLang] = useState<Lang>('en');
  const [theme, setTheme] = useState<Theme>('light');

  const [purpose, setPurpose] = useState<Purpose>('sale');
  const [role, setRole] = useState<Role>('owner');
  const [beds, setBeds] = useState(3);
  const [cpd, setCpd] = useState('');
  const [ptype, setPtype] = useState('Apartment');
  const [baths, setBaths] = useState('2');
  const [area, setArea] = useState('');
  const [price, setPrice] = useState('');
  const [finish, setFinish] = useState('Fully finished');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const [badField, setBadField] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ ref: string; waHref: string } | null>(null);

  const cpdRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedLang = window.localStorage.getItem('hzp-lang');
    const storedTheme = window.localStorage.getItem('hzp-theme');
    if (storedLang === 'ar' || storedLang === 'en') setLang(storedLang);
    if (storedTheme === 'dark' || storedTheme === 'light') setTheme(storedTheme);
  }, []);

  const t = T[lang];
  const isAr = lang === 'ar';

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    window.localStorage.setItem('hzp-theme', next);
  }

  function toggleLang() {
    const next: Lang = isAr ? 'en' : 'ar';
    setLang(next);
    window.localStorage.setItem('hzp-lang', next);
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  function clearErr() {
    setErr('');
    setBadField(null);
  }

  function fail(field: string, msg: string, ref: React.RefObject<HTMLInputElement | null>) {
    setErr(msg);
    setBadField(field);
    ref.current?.focus();
    return false;
  }

  const processFiles = (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, 10);
    list.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const res = e.target?.result as string;
        if (res) {
          setPhotos((prev) => (prev.length < 10 && !prev.includes(res) ? [...prev, res] : prev));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  async function onSubmit() {
    const cpdV = cpd.trim();
    const areaV = digits(area);
    const priceV = digits(price);
    const nameV = name.trim();

    if (cpdV.length < 2) return fail('cpd', t.needCpd, cpdRef);
    if (!areaV || Number(areaV) < 20) return fail('area', t.needArea, areaRef);
    if (!priceV) return fail('price', t.needPrice, priceRef);
    if (nameV.length < 2) return fail('name', t.needName, nameRef);
    if (digits(phone).length < 8) return fail('phone', t.needPhone, phoneRef);
    clearErr();

    setSending(true);
    try {
      const res = await fetch('/api/listings/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compound: cpdV,
          propertyType: ptype,
          mode: purpose,
          beds,
          baths: Number(baths) || 2,
          area: Number(areaV),
          price: Number(priceV),
          finishing: finish,
          ownerName: nameV,
          ownerType: role === 'broker' ? 'Broker' : 'Owner',
          mobile: phone.trim(),
          comment: notes.trim(),
          photos,
          images: photos,
        }),
      });
      const result = await res.json().catch(() => null);
      const ref: string =
        result?.code || result?.listing?.code || `SL-${Date.now().toString(36).toUpperCase().slice(-6)}`;

      const summary = isAr
        ? `عرض عقار جديد — ${role === 'broker' ? 'وسيط' : 'مالك'} ${nameV} · ${purpose === 'rent' ? 'إيجار' : 'بيع'} · ${TYPES_AR[ptype] || ptype} · ${beds} غرف · ${areaV} م² · ${cpdV} · ${Number(priceV).toLocaleString('en-US')} ج.م · رقم الطلب ${ref}`
        : `New listing — ${role === 'broker' ? 'Broker' : 'Owner'} ${nameV} · ${purpose === 'rent' ? 'Rent' : 'Resale'} · ${ptype} · ${beds}-bed · ${areaV} m² · ${cpdV} · EGP ${Number(priceV).toLocaleString('en-US')} · Ref ${ref}`;

      setDone({ ref, waHref: `https://wa.me/${WA}?text=${encodeURIComponent(summary)}` });
      window.scrollTo(0, 0);
    } catch {
      setErr(t.failed);
    } finally {
      setSending(false);
    }
  }

  function again() {
    setCpd(''); setArea(''); setPrice(''); setNotes('');
    setDone(null);
    window.scrollTo(0, 0);
    requestAnimationFrame(() => cpdRef.current?.focus());
  }

  const priceLabel = purpose === 'rent' ? t.priceRent : t.priceSale;
  const pricePh = purpose === 'rent' ? t.phPriceRent : t.phPriceSale;
  const bad = (f: string) => (badField === f ? s.bad : undefined);

  return (
    <div className={s.page} data-theme={theme} dir={isAr ? 'rtl' : 'ltr'} lang={lang}>
      <header className={s.top}>
        <div className={s.wrap}>
          <a className={s.brand} href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/logo-mark.png" alt="Sierra Estates" />
            <span>
              <b>Sierra Estates</b>
              <small>{t.brandSub}</small>
            </span>
          </a>
          <div className={s.topAct}>
            <button
              className={s.tb}
              type="button"
              title="Toggle theme"
              aria-label="Toggle theme"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun className={s.i} /> : <Moon className={s.i} />}
            </button>
            <button
              className={s.tb}
              type="button"
              title="Toggle language"
              aria-label="Toggle language"
              onClick={toggleLang}
            >
              <Languages className={s.i} />
              <span>{t.langLabel}</span>
            </button>
          </div>
        </div>
      </header>

      <section className={s.hero}>
        <div className={s.wrap}>
          <div className={s.eyebrow}>{t.eyebrow}</div>
          <h1>
            {t.titleLead}
            <em>{t.titleEm}</em>
          </h1>
          <p>{t.lead}</p>
          <div className={s.perks}>
            <span><BadgeCheck className={s.i} /><span>{t.p1}</span></span>
            <span><Users className={s.i} /><span>{t.p2}</span></span>
            <span><Percent className={s.i} /><span>{t.p3}</span></span>
          </div>
        </div>
      </section>

      <main className={s.main}>
        <div className={s.wrap}>
          {!done ? (
            <div className={s.card}>
              <div className={s.sect}>{t.s1}</div>
              <div className={s.grid}>
                <div className={`${s.f} ${s.wide}`}>
                  <label htmlFor="purpose">{t.purpose}</label>
                  <div className={s.seg} id="purpose">
                    <button
                      type="button"
                      className={purpose === 'sale' ? s.on : undefined}
                      onClick={() => setPurpose('sale')}
                    >
                      {t.sale}
                    </button>
                    <button
                      type="button"
                      className={purpose === 'rent' ? s.on : undefined}
                      onClick={() => setPurpose('rent')}
                    >
                      {t.rent}
                    </button>
                  </div>
                </div>

                <div className={s.f}>
                  <label htmlFor="cpd">{t.cpd}</label>
                  <input
                    type="text"
                    id="cpd"
                    ref={cpdRef}
                    list="cpd-list"
                    className={bad('cpd')}
                    value={cpd}
                    onChange={(e) => { setCpd(e.target.value); clearErr(); }}
                    placeholder={t.phCpd}
                    autoComplete="off"
                    title="Compound"
                  />
                  <datalist id="cpd-list">
                    {CPDS.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <div className={s.f}>
                  <label htmlFor="ptype">{t.type}</label>
                  <select
                    id="ptype"
                    title="Property type"
                    aria-label="Property type"
                    value={ptype}
                    onChange={(e) => setPtype(e.target.value)}
                  >
                    {TYPES.map((o) => (
                      <option key={o} value={o}>{isAr ? TYPES_AR[o] || o : o}</option>
                    ))}
                  </select>
                </div>

                <div className={`${s.f} ${s.wide}`}>
                  <label htmlFor="beds">{t.beds}</label>
                  <div className={s.chips} id="beds">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={beds === n ? s.on : undefined}
                        onClick={() => setBeds(n)}
                      >
                        {n === 6 ? '6+' : n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={s.f}>
                  <label htmlFor="baths">{t.baths}</label>
                  <input
                    type="number"
                    id="baths"
                    min={1}
                    max={9}
                    value={baths}
                    onChange={(e) => setBaths(e.target.value)}
                    title="Bathrooms"
                    placeholder="2"
                  />
                </div>

                <div className={s.f}>
                  <label htmlFor="area">{t.area}</label>
                  <input
                    type="number"
                    id="area"
                    ref={areaRef}
                    className={bad('area')}
                    min={40}
                    value={area}
                    onChange={(e) => { setArea(e.target.value); clearErr(); }}
                    placeholder={t.phArea}
                    title="Area in square meters"
                  />
                </div>

                <div className={s.f}>
                  <label htmlFor="price">{priceLabel}</label>
                  <input
                    type="text"
                    id="price"
                    ref={priceRef}
                    className={bad('price')}
                    inputMode="numeric"
                    value={price}
                    onChange={(e) => { setPrice(e.target.value); clearErr(); }}
                    placeholder={pricePh}
                    title="Asking price"
                  />
                </div>

                <div className={s.f}>
                  <label htmlFor="finish">{t.finish}</label>
                  <select
                    id="finish"
                    title="Finishing"
                    aria-label="Finishing"
                    value={finish}
                    onChange={(e) => setFinish(e.target.value)}
                  >
                    {FINISHES.map((o) => (
                      <option key={o} value={o}>{isAr ? FIN_AR[o] || o : o}</option>
                    ))}
                  </select>
                </div>

                <div className={`${s.f} ${s.wide}`}>
                  <label>{t.photosTit}</label>
                  <div
                    className={`${s.photoDropzone} ${isDragging ? s.dragover : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    <UploadCloud className={s.photoIcon} />
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.dropPhotos}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{t.photosSub}</div>
                  </div>

                  {photos.length > 0 && (
                    <div className={s.photoGrid}>
                      {photos.map((src, idx) => (
                        <div key={idx} className={s.photoThumb}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt={`Property upload ${idx + 1}`} />
                          {idx === 0 && <span className={s.photoCoverBadge}>{t.coverTag}</span>}
                          <button
                            type="button"
                            className={s.photoRemoveBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              removePhoto(idx);
                            }}
                            title={t.removePhoto}
                            aria-label={t.removePhoto}
                          >
                            <X style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`${s.f} ${s.wide}`}>
                  <label htmlFor="notes">{t.notes}</label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t.phNotes}
                  />
                </div>
              </div>

              <hr />

              <div className={s.sect}>{t.s2}</div>
              <div className={`${s.grid} ${s.three}`}>
                <div className={s.f}>
                  <label htmlFor="role">{t.role}</label>
                  <div className={s.seg} id="role">
                    <button
                      type="button"
                      className={role === 'owner' ? s.on : undefined}
                      onClick={() => setRole('owner')}
                    >
                      {t.owner}
                    </button>
                    <button
                      type="button"
                      className={role === 'broker' ? s.on : undefined}
                      onClick={() => setRole('broker')}
                    >
                      {t.broker}
                    </button>
                  </div>
                </div>

                <div className={s.f}>
                  <label htmlFor="name">{t.name}</label>
                  <input
                    type="text"
                    id="name"
                    ref={nameRef}
                    className={bad('name')}
                    value={name}
                    onChange={(e) => { setName(e.target.value); clearErr(); }}
                    placeholder={t.phName}
                  />
                </div>

                <div className={s.f}>
                  <label htmlFor="phone">{t.wa}</label>
                  <input
                    type="tel"
                    id="phone"
                    ref={phoneRef}
                    className={bad('phone')}
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); clearErr(); }}
                    placeholder="+20 10 1234 5678"
                  />
                </div>
              </div>

              <div className={s.err} role="alert">{err}</div>
              <div className={s.foot}>
                <div className={s.note}>{t.note}</div>
                <button className={s.submit} type="button" onClick={onSubmit} disabled={sending}>
                  <span>{sending ? t.sending : t.submit}</span>
                  <ArrowRight className={s.i} />
                </button>
              </div>
            </div>
          ) : (
            <div className={`${s.card} ${s.done}`}>
              <div className={s.tick}><Check className={s.i} /></div>
              <h2>{t.doneTit}</h2>
              <p>{t.doneMsg}</p>
              <div className={s.ref}>{t.ref} · {done.ref}</div>
              <a className={s.wa} href={done.waHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className={s.i} />
                <span>{t.sendPhotos}</span>
              </a>
              <button className={s.again} type="button" onClick={again}>{t.again}</button>
            </div>
          )}

          <div className={s.legal}>{t.legal}</div>
        </div>
      </main>
    </div>
  );
}
