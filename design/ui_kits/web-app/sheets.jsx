/* Sierra Estates — Client Portal (mobile-first, responsive) */
const { useState, useEffect, useRef, useMemo, createContext, useContext } = React;

/* ── SMART FILTER SHEET (shared by Hero + sticky header) ── */
function SmartFilterSheet(props) {
  var open = props.open,onClose = props.onClose,purpose = props.purpose,setPurpose = props.setPurpose,beds = props.beds,setBeds = props.setBeds,setSearch = props.setSearch,showLead = props.showLead;
  var wide = useWide();
  var c = useApp();var lang = c.lang;var isAr = lang === 'ar';
  var name = useState('');var setName = name[1];name = name[0];
  var phone = useState('');var setPhone = phone[1];phone = phone[0];
  var leadErr = useState(false);var setLeadErr = leadErr[1];leadErr = leadErr[0];
  var leadDone = useState(false);var setLeadDone = leadDone[1];leadDone = leadDone[0];
  var ALL_CPDS_FILTER = ["Katameya Heights", "Katameya Dunes", "Swan Lake Residence", "Mivida", "Cairo Festival City (CFC) Residences", "Hyde Park New Cairo", "Taj City", "Eastown (SODIC)", "Mountain View iCity", "Zed East (Ora)", "Palm Hills New Cairo", "The Waterway", "Lake View / Lake View Residence", "Fifth Square (Al Marasem)", "Villette (SODIC)", "Stone Residence (Rooya Group)", "The Square (Al Ahly Sabbour)", "El Patio Oro (La Vista)", "El Patio 7 (La Vista)", "Katameya Gardens", "Village Gardens Katameya (Palm Hills)", "Galleria Moon Valley (Arabia Holding)", "90 Avenue (Tabarak)", "Azzar New Cairo (Reedy Group)", "District 5 (Marakez)", "The Brooks (PRE Developments)", "STEI8HT (LMD)", "The Crest (IL Cazar)", "Azad & Azad Views (Tameer)", "Eastshire (Alqamzi)", "The Waterway Branded Residences", "Aster Residence", "The MarQ", "Capital Gate (Al Marasem)", "Bloomfields (Tatweer Misr)", "IL Bosco City (Misr Italia)", "Odyssia (Al Ahly Sabbour)", "Haptown (Hassan Allam)", "Sarai (Madinet Masr)", "Madinaty", "El Shorouk"];
  var PROP_TYPES = ['Villa', 'Apartment', 'Twin House', 'Townhouse', 'Duplex', 'Penthouse'];
  var propSel = useState([]);var setPropSel = propSel[1];propSel = propSel[0];
  var priceSlider = useState(50);var setPriceSlider = priceSlider[1];priceSlider = priceSlider[0];
  var cpdSrch = useState('');var setCpdSrch = cpdSrch[1];cpdSrch = cpdSrch[0];
  var cpdSel = useState([]);var setCpdSel = cpdSel[1];cpdSel = cpdSel[0];
  var bedsSel = useState([]);var setBedsSel = bedsSel[1];bedsSel = bedsSel[0];
  var comment = useState('');var setComment = comment[1];comment = comment[0];
  var openDrop = useState(null);var setOpenDrop = openDrop[1];openDrop = openDrop[0];

  useEffect(function () {if (setSearch) setSearch(cpdSel.length > 0 ? cpdSel[0] : '');}, [cpdSel]);
  useEffect(function () {if (setBeds) setBeds(bedsSel.length === 1 ? bedsSel[0] : null);}, [bedsSel.join(',')]);

  function toggleDrop(k) {setOpenDrop(function (o) {return o === k ? null : k;});}
  function toggleArr(setter, arr, v) {setter(arr.indexOf(v) >= 0 ? arr.filter(function (x) {return x !== v;}) : arr.concat([v]));}
  function submitLead() {
    if (showLead && (!name.trim() || !phone.trim())) {setLeadErr(true);return;}
    setLeadErr(false);
    if (showLead) {
      try {
        var leads = JSON.parse(localStorage.getItem('sierra_leads') || '[]');
        leads.push({ name: name.trim(), phone: phone.trim(), comment: comment.trim(), purpose: purpose, compounds: cpdSel, propTypes: propSel, beds: bedsSel, source: 'Website Lead', ts: new Date().toISOString() });
        localStorage.setItem('sierra_leads', JSON.stringify(leads));
      } catch (e) {}
      setLeadDone(true);
    } else {
      onClose();
    }
  }

  var matchCount = useMemo(function () {
    var n = 26;
    if (cpdSel.length > 0) n = Math.max(1, Math.round(n * cpdSel.length / 8));
    if (bedsSel.length > 0) n = Math.max(1, Math.round(n * .55));
    if (propSel.length > 0) n = Math.max(1, Math.round(n * .6));
    return Math.min(n, 26);
  }, [cpdSel.length, bedsSel.length, propSel.length]);

  if (!open) return null;

  function DropHead(key, label, count, extra) {
    var isOpen = openDrop === key;
    return (
      <button onClick={function () {toggleDrop(key);}} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: isOpen ? 'rgba(200,150,26,.06)' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', transition: 'background .2s' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: N }}>{label}</span>
          {count > 0 && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 800, padding: '2px 7px', borderRadius: 10, background: 'linear-gradient(135deg,' + G + ',' + GL + ')', color: N }}>{count}</span>}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {extra}
          <span style={{ display: 'inline-block', transition: 'transform .28s cubic-bezier(.4,0,.2,1)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: '#8A94A0', fontSize: 11 }}>▾</span>
        </span>
      </button>);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 510, background: 'rgba(4,8,15,.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: wide ? 'center' : 'flex-end', justifyContent: 'center', padding: wide ? 24 : 0, animation: 'fadeIn .25s both' }} onClick={function (e) {if (e.target === e.currentTarget) onClose();}}>
      <div style={{ background: '#fff', borderRadius: wide ? 24 : '22px 22px 0 0', width: wide ? 'min(720px, 94vw)' : '100%', maxHeight: wide ? 'min(85vh, 860px)' : '92%', overflowY: 'auto', animation: 'slideUp .4s cubic-bezier(.16,1,.3,1) both', boxShadow: '0 -20px 60px rgba(13,32,53,.24)' }}>
        <div style={{ textAlign: 'center', padding: '10px 0 0' }}><div style={{ width: 36, height: 3.5, borderRadius: 2, background: 'rgba(13,32,53,.14)', margin: '0 auto' }} /></div>
        <div style={{ padding: '10px 20px 8px', borderBottom: '1px solid rgba(13,32,53,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 1, direction: isAr ? 'rtl' : 'ltr' }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, letterSpacing: '.18em', color: G, textTransform: 'uppercase', marginBottom: 2 }}>{isAr ? 'بحث بالذكاء الاصطناعي' : 'AI-POWERED SEARCH'}</div>
            <div style={{ fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT, fontSize: isAr ? 20 : 22, fontWeight: isAr ? 700 : 500, color: N }}>{showLead ? (isAr ? 'اطلب عقارك' : 'Request Your Property') : (isAr ? 'الفلتر الذكي' : 'Smart Filter')}</div>
          </div>
          <button onClick={function () {onClose();setLeadDone(false);}} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(13,32,53,.35)', fontSize: 24 }}>×</button>
        </div>
        {leadDone ?
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ width: 62, height: 62, borderRadius: '50%', background: '#16a34a', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: '#fff', animation: 'popIn .4s both' }}>✓</div>
            <div style={{ fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT, fontSize: isAr ? 22 : 25, fontWeight: isAr ? 700 : 600, color: N, marginBottom: 8 }}>{isAr ? 'وصلنا طلبك!' : 'Request Received!'}</div>
            <p style={{ fontSize: 12, color: '#5A6475', lineHeight: 1.65, marginBottom: 18, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{isAr ? 'سيتواصل معك فريقنا قريباً على واتساب.' : 'Our team will reach out on WhatsApp shortly.'}</p>
            <button onClick={function () {onClose();setLeadDone(false);}} style={{ padding: '10px 24px', borderRadius: 9, border: '1px solid rgba(13,32,53,.14)', background: 'none', color: '#5A6475', fontSize: 12, cursor: 'pointer', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{isAr ? 'إقفال' : 'Close'}</button>
          </div> :
        <div style={{ padding: '14px 20px 28px', display: 'flex', flexDirection: 'column', gap: 10, direction: isAr ? 'rtl' : 'ltr' }}>
          {showLead && <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, border: '1px solid ' + (leadErr && !name.trim() ? '#dc2626' : 'rgba(13,32,53,.12)'), borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8A94A0', marginBottom: 3, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{isAr ? 'الاسم *' : 'Name *'}</div>
              <input value={name} onChange={function (e) {setName(e.target.value);}} placeholder={isAr ? 'اسمك الكامل' : 'Your full name'} style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: 12.5, fontWeight: 500, color: N, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }} />
            </div>
            <div style={{ flex: 1, border: '1px solid ' + (leadErr && !phone.trim() ? '#dc2626' : 'rgba(13,32,53,.12)'), borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8A94A0', marginBottom: 3, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{isAr ? 'واتساب *' : 'WhatsApp *'}</div>
              <input type="tel" value={phone} onChange={function (e) {setPhone(e.target.value);}} placeholder="+20 1XX XXX XXXX" style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: 12.5, fontWeight: 500, color: N, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }} />
            </div>
          </div>}
          {showLead && <div style={{ margin: '2px 0 4px', height: 1, background: 'linear-gradient(90deg,transparent,rgba(200,150,26,.35),transparent)' }} />}
          {showLead && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: G, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{isAr ? 'ثم حدد الفلتر' : 'Then set your filters'}</div>}
          {/* Rent/Resale */}
          <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'rgba(13,32,53,.07)', border: '1px solid rgba(13,32,53,.1)' }}>
            {[['resale', isAr ? '🏠 بيع' : '🏠  Resale'], ['rent', isAr ? '🔑 إيجار' : '🔑  Rent']].map(function (pair) {return (
                <button key={pair[0]} onClick={function () {setPurpose(pair[0]);setPriceSlider(50);}} style={{ flex: 1, padding: '10px 8px', borderRadius: 9, fontSize: 12, fontWeight: 800, cursor: 'pointer', border: 'none', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', transition: 'all .25s cubic-bezier(.4,0,.2,1)', background: purpose === pair[0] ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'transparent', color: purpose === pair[0] ? N : '#8A94A0', transform: purpose === pair[0] ? 'scale(1.02)' : 'scale(1)' }}>{pair[1]}</button>);
            })}
          </div>

          {/* Compound dropdown */}
          <div style={{ border: '1px solid ' + (cpdSel.length > 0 ? 'rgba(200,150,26,.4)' : 'rgba(13,32,53,.12)'), borderRadius: 12, overflow: 'hidden', transition: 'border-color .2s' }}>
            {DropHead('cpd', isAr ? 'الكمبوند (اختيار متعدد)' : 'Compound (multi-select)', cpdSel.length, cpdSel.length > 0 && <span onClick={function (e) {e.stopPropagation();setCpdSel([]);setCpdSrch('');}} style={{ color: '#dc2626', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>{isAr ? 'مسح' : 'clear'}</span>)}
            <div style={{ maxHeight: openDrop === 'cpd' ? 220 : 0, opacity: openDrop === 'cpd' ? 1 : 0, overflow: 'hidden', transition: 'max-height .32s cubic-bezier(.4,0,.2,1), opacity .22s', padding: openDrop === 'cpd' ? '0 14px 12px' : '0 14px' }}>
              <input value={cpdSrch} onChange={function (e) {setCpdSrch(e.target.value);}} placeholder={isAr ? 'ابحث ضمن 40 كمبوند…' : 'Search 40 compounds…'} style={{ width: '100%', padding: '7px 10px', border: '1px solid rgba(13,32,53,.12)', borderRadius: 8, fontSize: 11, outline: 'none', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', color: N, marginBottom: 7, background: 'rgba(13,32,53,.02)', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 150, overflowY: 'auto' }}>
                {ALL_CPDS_FILTER.filter(function (nm) {return !cpdSrch || nm.toLowerCase().indexOf(cpdSrch.toLowerCase()) >= 0;}).map(function (nm, i) {var on = cpdSel.indexOf(nm) >= 0;return (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 7, cursor: 'pointer', background: on ? 'rgba(200,150,26,.08)' : 'transparent' }} onClick={function () {toggleArr(setCpdSel, cpdSel, nm);}}>
                    <span style={{ width: 16, height: 16, borderRadius: 5, border: '1.5px solid ' + (on ? G : 'rgba(13,32,53,.25)'), background: on ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>{on && <span style={{ color: N, fontSize: 10, fontWeight: 900 }}>✓</span>}</span>
                    <span style={{ fontSize: 11, color: on ? N : '#5A6472', fontWeight: on ? 700 : 500, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{nm}</span>
                  </label>);
                })}
              </div>
            </div>
          </div>

          {/* Property Type dropdown */}
          <div style={{ border: '1px solid ' + (propSel.length > 0 ? 'rgba(200,150,26,.4)' : 'rgba(13,32,53,.12)'), borderRadius: 12, overflow: 'hidden', transition: 'border-color .2s' }}>
            {DropHead('type', isAr ? 'نوع العقار' : 'Property Type', propSel.length)}
            <div style={{ maxHeight: openDrop === 'type' ? 160 : 0, opacity: openDrop === 'type' ? 1 : 0, overflow: 'hidden', transition: 'max-height .32s cubic-bezier(.4,0,.2,1), opacity .22s', padding: openDrop === 'type' ? '0 14px 12px' : '0 14px' }}>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {PROP_TYPES.map(function (tp) {var on = propSel.indexOf(tp) >= 0;return (
                    <button key={tp} onClick={function () {toggleArr(setPropSel, propSel, tp);}} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: '1px solid', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', transition: 'all .18s', borderColor: on ? G : 'rgba(13,32,53,.12)', background: on ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'transparent', color: on ? N : '#8A94A0' }}>{on ? '✓ ' : ''}{tp}</button>);
                })}
              </div>
            </div>
          </div>

          {/* Bedrooms dropdown */}
          <div style={{ border: '1px solid ' + (bedsSel.length > 0 ? 'rgba(200,150,26,.4)' : 'rgba(13,32,53,.12)'), borderRadius: 12, overflow: 'hidden', transition: 'border-color .2s' }}>
            {DropHead('beds', isAr ? 'عدد الغرف' : 'No. of Rooms', bedsSel.length)}
            <div style={{ maxHeight: openDrop === 'beds' ? 120 : 0, opacity: openDrop === 'beds' ? 1 : 0, overflow: 'hidden', transition: 'max-height .32s cubic-bezier(.4,0,.2,1), opacity .22s', padding: openDrop === 'beds' ? '0 14px 12px' : '0 14px' }}>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5, 6].map(function (b) {var on = bedsSel.indexOf(b) >= 0;return (
                    <button key={b} onClick={function () {toggleArr(setBedsSel, bedsSel, b);}} style={{ padding: '6px 13px', borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: '1px solid', fontFamily: 'Inter', transition: 'all .18s', borderColor: on ? G : 'rgba(13,32,53,.12)', background: on ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'transparent', color: on ? N : '#8A94A0' }}>{on ? '✓ ' : ''}{b === 6 ? '6+' : b}{isAr ? '' : 'B'}</button>);
                })}
              </div>
            </div>
          </div>

          {/* Budget */}
          <div style={{ border: '1px solid rgba(13,32,53,.12)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: N, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{isAr ? 'الميزانية' : 'Budget'}</div>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: G }}>{purpose === 'rent' ? '$' + (500 + Math.round(priceSlider / 100 * 9500)).toLocaleString() + '/mo' : 'EGP ' + (1 + priceSlider / 100 * 49).toFixed(1) + 'M'}</span>
            </div>
            <input type="range" min="0" max="100" value={priceSlider} onChange={function (e) {setPriceSlider(Number(e.target.value));}} style={{ width: '100%', accentColor: G }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
              <span style={{ fontSize: 8, color: 'rgba(13,32,53,.35)', fontFamily: 'Inter' }}>{purpose === 'rent' ? '$500/mo' : 'EGP 1M'}</span>
              <span style={{ fontSize: 8, color: 'rgba(13,32,53,.35)', fontFamily: 'Inter' }}>{purpose === 'rent' ? '$10,000/mo' : 'EGP 50M+'}</span>
            </div>
          </div>

          {/* Comment */}
          <div style={{ border: '1px solid rgba(13,32,53,.12)', borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8A94A0', marginBottom: 6, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{isAr ? 'ملاحظة (اختياري)' : 'Comment (optional)'}</div>
            <textarea value={comment} onChange={function (e) {setComment(e.target.value);}} rows={2} placeholder={isAr ? 'اكتب أي تفاصيل إضافية…' : 'Any extra detail you want us to know…'} style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: 12, color: N, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', background: 'transparent' }} />
          </div>

          <button onClick={submitLead} style={{ padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,' + N + ',#1A3354)', color: GL, fontSize: 11.5, fontWeight: 800, letterSpacing: '.05em', border: 'none', cursor: 'pointer', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', textTransform: 'uppercase', boxShadow: '0 6px 22px rgba(13,32,53,.35)', width: '100%', transition: 'transform .15s' }}>
            {showLead ? (isAr ? 'إرسال الطلب' : 'Submit Request') : (isAr ? 'تطبيق الفلتر' : 'Apply Filters')} →
          </button>
          {showLead && leadErr && <div style={{ textAlign: 'center', fontSize: 9.5, color: '#dc2626', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{isAr ? 'الاسم والواتساب مطلوبان' : 'Name and WhatsApp are required'}</div>}
          <div style={{ textAlign: 'center', fontSize: 9, color: 'rgba(13,32,53,.32)', fontFamily: 'Inter', marginTop: leadErr ? 0 : -7 }}>⚡ {isAr ? 'بدعم الذكاء الاصطناعي' : 'Powered by AI'}</div>
        </div>}
      </div>
    </div>);

}

/* ── UNIT SHEET ── */
function CpdSheet(props) {
  var cpd = props.cpd,purpose = props.purpose,onClose = props.onClose;
  var c = useApp();var lang = c.lang;var t = LANG[lang];var isAr = lang === 'ar';
  var stF = useState('All');var setStF = stF[1];stF = stF[0];
  var bdF = useState(null);var setBdF = bdF[1];bdF = bdF[0];
  var sc = useState('ai');var setSc = sc[1];sc = sc[0];
  var sd = useState('desc');var setSd = sd[1];sd = sd[0];
  var allU = cpd ? UNITS[cpd.n] || [] : [];
  var av = allU.filter(function (u) {return u.status === 'Available';}).length;
  var uo = allU.filter(function (u) {return u.status === 'Under Offer';}).length;
  var so = allU.filter(function (u) {return u.status === 'Sold';}).length;
  function hSort(col) {if (sc === col) setSd(function (d) {return d === 'asc' ? 'desc' : 'asc';});else {setSc(col);setSd('desc');}}
  var units = useMemo(function () {
    var u = allU.slice();
    if (stF !== 'All') u = u.filter(function (x) {return x.status === stF;});
    if (bdF) u = u.filter(function (x) {return x.beds === bdF;});
    u.sort(function (a, b) {var av = a[sc],bv = b[sc];if (typeof av === 'string') {av = av.toLowerCase();bv = bv.toLowerCase();}return sd === 'asc' ? av > bv ? 1 : -1 : av < bv ? 1 : -1;});
    return u;
  }, [allU, stF, bdF, sc, sd]);
  function thS(col) {return sc === col ? sd === 'asc' ? ' ▲' : ' ▼' : '';}
  if (!cpd) return null;
  return (
    <Sheet open={!!cpd} onClose={onClose} maxH="88%">
      <div style={{ padding: '0 16px 10px', borderBottom: '1px solid rgba(13,32,53,.07)', flexShrink: 0, direction: isAr ? 'rtl' : 'ltr' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, paddingTop: 6 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.15em', color: G, textTransform: 'uppercase', marginBottom: 2 }}>{cpd.z} · AI {cpd.ai}/10</div>
            <div style={{ fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT, fontSize: 22, fontWeight: isAr ? 700 : 600, color: N, lineHeight: 1.1 }}>{cpd.n}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(13,32,53,.3)', fontSize: 24, lineHeight: 1, marginTop: 2 }}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 9 }}>
          <span className="pill-av">{av} {t.pAv}</span>
          <span className="pill-uo">{uo} {t.pUO}</span>
          <span className="pill-so">{so} {t.pSold}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[[t.sAll, 'All'], [t.sAv, 'Available'], [t.sUO, 'Under Offer'], [t.sSold, 'Sold']].map(function (pair) {return (
              <button key={pair[0]} onClick={function () {setStF(pair[1]);}} style={{ padding: '3px 9px', borderRadius: 20, fontSize: 8.5, fontWeight: 600, cursor: 'pointer', border: '1px solid', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', transition: 'all .15s', borderColor: stF === pair[1] ? G : 'rgba(13,32,53,.12)', background: stF === pair[1] ? 'rgba(200,150,26,.13)' : 'transparent', color: stF === pair[1] ? G : '#8A94A0' }}>{pair[0]}</button>);
          })}
          {[null, 2, 3, 4, 5].map(function (b) {return (
              <button key={b == null ? 'a' : b} onClick={function () {setBdF(bdF === b ? null : b);}} style={{ padding: '3px 9px', borderRadius: 20, fontSize: 8.5, fontWeight: 600, cursor: 'pointer', border: '1px solid', fontFamily: 'Inter', transition: 'all .15s', borderColor: bdF === b ? N : 'rgba(13,32,53,.12)', background: bdF === b ? 'rgba(13,32,53,.08)' : 'transparent', color: bdF === b ? N : '#8A94A0' }}>
              {b ? b + 'B' : t.allBeds}
            </button>);
          })}
        </div>
      </div>
      <div style={{ padding: '5px 16px', background: N2, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <Shield sz={14} />
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, letterSpacing: '.14em', color: G }}>SIERRA ESTATES · INVENTORY PLUGIN v2.6</span>
        <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono',monospace", fontSize: 7, color: 'rgba(200,150,26,.4)' }}>{units.length} rows · tap row for details</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table className="ut" style={{ direction: isAr ? 'rtl' : 'ltr' }}>
          <thead>
            <tr>
              {[[t.tId, 'id'], [t.tType, 'type'], [t.tBd, 'beds'], [t.tArea, 'area'], [t.tPrice, purpose === 'rent' ? 'usd' : 'egpM'], [t.tAI, 'ai'], [t.tStatus, 'status'], [t.tCTA, null]].map(function (pair) {return (
                  <th key={pair[0]} onClick={pair[1] ? function () {hSort(pair[1]);} : undefined}>{pair[0]}{pair[1] ? thS(pair[1]) : ''}</th>);
              })}
            </tr>
          </thead>
          <tbody>
            {units.map(function (u) {return (
                <tr key={u.id} onClick={function () {if (props.onUnit) props.onUnit(u);}} style={{ cursor: 'pointer' }}>
                <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, color: '#8A94A0' }}>{u.id}</td>
                <td style={{ fontWeight: 600, color: N, fontSize: 10.5, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{u.type}</td>
                <td style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{u.beds}</td>
                <td style={{ fontFamily: "'JetBrains Mono',monospace", color: '#5A6475' }}>{u.area}</td>
                <td style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: G, fontSize: 10 }}>{purpose === 'rent' ? '$' + u.usd.toLocaleString() : u.egpM + 'M'}</td>
                <td style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: u.ai >= 9.5 ? '#059669' : G, fontSize: 10.5 }}>{u.ai}</td>
                <td><span className={u.status === 'Available' ? 'pill-av' : u.status === 'Under Offer' ? 'pill-uo' : 'pill-so'}>{u.status === 'Available' ? t.pAv : u.status === 'Under Offer' ? t.pUO : t.pSold}</span></td>
                <td>{u.status !== 'Sold' && <button onClick={function (e) {e.stopPropagation();window.open('https://wa.me/201061399688?text=' + encodeURIComponent('Hi Sierra! Interested in unit ' + u.id + ' (' + u.beds + 'BR ' + u.type + ', EGP ' + u.egpM + 'M)'), '_blank');}} style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 7px', fontSize: 8, fontWeight: 900, cursor: 'pointer' }}>WA</button>}</td>
              </tr>);
            })}
            {units.length === 0 && <tr><td colSpan="8" style={{ textAlign: 'center', padding: '22px', color: '#8A94A0', fontSize: 12 }}>No units match.</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '10px 16px 24px', borderTop: '1px solid rgba(13,32,53,.07)', flexShrink: 0 }}>
        <button style={{ width: '100%', padding: '11px', borderRadius: 10, background: N, color: 'rgba(200,150,26,.9)', fontSize: 11, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', fontFamily: 'Inter' }}>
          📞 Contact Agent for {cpd.n}
        </button>
      </div>
    </Sheet>);

}

/* ── LISTING SHEET · FULL PROPERTY PAGE ── */
var PROP_INTERIORS = [
'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=900&q=85',
'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=900&q=85',
'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=85',
'https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?w=900&q=85',
'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=85'];

function ListSheet(props) {
  var item = props.item,purpose = props.purpose,onClose = props.onClose,saved = props.saved,onSave = props.onSave;
  var c = useApp();var lang = c.lang;var t = LANG[lang];var isAr = lang === 'ar';
  var gi = useState(0);var setGi = gi[1];gi = gi[0];
  var openPlan = useState(0);var setOpenPlan = openPlan[1];openPlan = openPlan[0];
  var room = useState(0);var setRoom = room[1];room = room[0];
  var pan = useState({ x: 50, y: 50 });var setPan = pan[1];pan = pan[0];
  var dragRef = useRef({ on: false, lx: 0, ly: 0 });
  useEffect(function () {if (item) {setGi(0);setRoom(0);setPan({ x: 50, y: 50 });var sc = document.getElementById('root-scroll');}}, [item && item.id]);
  if (!item) return null;

  var pr = purpose === 'rent' ? '$' + item.usd.toLocaleString() + '/mo' : 'EGP ' + item.egpM + 'M';
  var prShort = purpose === 'rent' ? '$' + (item.usd / 1000).toFixed(1) + 'K/mo' : 'EGP ' + item.egpM + 'M';
  var perUnit = purpose === 'rent' ? '$' + Math.round(item.usd / item.area) + ' / m² · mo' : 'EGP ' + Math.round(item.egpM * 1e6 / item.area).toLocaleString() + ' / m²';
  var isGold = item.tag === 'Premium' || item.tag === 'Exclusive';
  var waText = encodeURIComponent('Hi Sierra! Interested in: ' + item.beds + 'BR ' + item.type + ' at ' + item.cmp + ' — ' + pr + ' (AI ' + item.ai + '/10)');

  var gallery = [item.img].concat(PROP_INTERIORS);
  var garage = item.beds >= 5 ? 2 : 1;
  var built = 2015 + item.id % 8;
  var overview = [
  { icon: '⌂', value: item.type.split(' ')[0], label: isAr ? 'النوع' : 'Type' },
  { icon: '⌥', value: item.beds, label: isAr ? 'غرف' : 'Bedrooms' },
  { icon: '≋', value: item.bath, label: isAr ? 'حمامات' : 'Bathrooms' },
  { icon: '⬚', value: item.area.toLocaleString(), label: isAr ? 'م²' : 'Sq M' },
  { icon: '⛝', value: garage, label: isAr ? 'جراج' : 'Garage' },
  { icon: '◷', value: built, label: isAr ? 'سنة البناء' : 'Built' }];

  var features = ['Central A/C', 'Smart Home', 'Private Garden', 'Clubhouse', 'Gym & Spa', 'Swimming Pool', '24/7 Security', 'Covered Parking', 'Kids Area', 'Landscaped', 'Backup Power', 'High-Speed Fiber'];
  var plans = [
  { name: isAr ? 'الطابق الأرضي' : 'Ground Floor', beds: Math.max(1, item.beds - 2), baths: Math.max(1, item.bath - 1), size: Math.round(item.area * 0.55) + ' m²' },
  { name: isAr ? 'الطابق الأول' : 'Upper Floor', beds: 2, baths: item.bath - Math.max(1, item.bath - 1) || 1, size: Math.round(item.area * 0.45) + ' m²' }];

  var details = [
  { label: isAr ? 'كود الوحدة' : 'Property ID', value: item.cmp.substr(0, 2).toUpperCase() + '-' + (100 + item.id) },
  { label: isAr ? 'المساحة' : 'Property Size', value: item.area + ' m²' },
  { label: isAr ? 'تقييم الذكاء' : 'AI Score', value: item.ai + ' / 10' },
  { label: isAr ? 'المقدم' : 'Down Payment', value: '15%' },
  { label: isAr ? 'التسليم' : 'Delivery', value: (2026 + item.id % 3).toString() },
  { label: isAr ? 'الحالة' : 'Status', value: item.tag || (isAr ? 'متاح' : 'Available') },
  { label: isAr ? 'التشطيب' : 'Finishing', value: isAr ? 'سوبر لوكس' : 'Super Lux' },
  { label: isAr ? 'الكمبوند' : 'Compound', value: item.cmp }];

  var rooms = [
  { name: isAr ? 'المعيشة' : 'Living Area', img: gallery[0] },
  { name: isAr ? 'الماستر' : 'Master Suite', img: PROP_INTERIORS[1] },
  { name: isAr ? 'الحديقة' : 'Private Garden', img: PROP_INTERIORS[2] },
  { name: isAr ? 'المسبح' : 'Pool Deck', img: PROP_INTERIORS[3] },
  { name: isAr ? 'الواجهة' : 'Villa Exterior', img: PROP_INTERIORS[4] }];

  var curRoom = rooms[room] || rooms[0];
  function tourDown(e) {var p = e.touches ? e.touches[0] : e;dragRef.current = { on: true, lx: p.clientX, ly: p.clientY };}
  function tourMove(e) {
    if (!dragRef.current.on) return;
    var p = e.touches ? e.touches[0] : e;
    var dx = p.clientX - dragRef.current.lx,dy = p.clientY - dragRef.current.ly;
    dragRef.current.lx = p.clientX;dragRef.current.ly = p.clientY;
    var cl = function (v, lo, hi) {return Math.max(lo, Math.min(hi, v));};
    setPan(function (s) {return { x: cl(s.x - dx * 0.06, 0, 100), y: cl(s.y - dy * 0.06, 15, 85) };});
  }
  function tourUp() {dragRef.current.on = false;}

  var eyeStyle = { fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.22em', color: G, textTransform: 'uppercase' };
  var h2Style = { fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT, fontSize: 26, fontWeight: isAr ? 700 : 400, color: '#fff', lineHeight: 1.1, marginBottom: 14 };
  function eyebrow(label) {return <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexDirection: isAr ? 'row-reverse' : 'row' }}><span style={{ width: 18, height: 1.5, background: G }} /><span style={eyeStyle}>{label}</span></div>;}

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 640, background: 'rgba(4,8,15,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={function (e) {if (e.target === e.currentTarget) onClose();}}>
      <div dir={isAr ? 'rtl' : 'ltr'} style={{ width: 393, maxWidth: '100vw', height: 852, maxHeight: '100vh', background: '#071524', overflowY: 'auto', overflowX: 'hidden', position: 'relative', animation: 'slideUp .4s cubic-bezier(.16,1,.3,1) both', boxShadow: '0 40px 120px rgba(0,0,0,.7)' }} className="scr">

        {/* TOP APP BAR */}
        <div style={{ position: 'sticky', top: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(7,21,36,.82)', backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(200,150,26,.12)', flexDirection: isAr ? 'row-reverse' : 'row' }}>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{isAr ? '→' : '←'}</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: HEADING_FONT, fontSize: 14, fontWeight: 700, letterSpacing: '.16em', color: G, lineHeight: 1 }}>SIERRA ESTATES</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 6, letterSpacing: '.28em', color: 'rgba(200,150,26,.5)', marginTop: 2 }}>AI REAL ESTATE</div>
          </div>
          <button onClick={function () {onSave && onSave(item.id);}} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: saved && saved.has(item.id) ? '#ef4444' : '#fff', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{saved && saved.has(item.id) ? '♥' : '♡'}</button>
        </div>

        {/* HERO GALLERY */}
        <div style={{ position: 'relative' }}>
          <div onScroll={function (e) {var el = e.target;var idx = Math.round(el.scrollLeft / el.clientWidth);if (idx !== gi) setGi(idx);}} style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', height: 380 }} className="gal-track">
            {gallery.map(function (im, i) {return (
              <div key={i} style={{ flex: '0 0 100%', scrollSnapAlign: 'start', position: 'relative', overflow: 'hidden', height: 380 }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(' + im + ')', backgroundSize: 'cover', backgroundPosition: 'center', animation: 'kenBurns 16s ease-in-out infinite alternate' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(7,21,36,.92) 0%,rgba(7,21,36,.1) 40%,rgba(7,21,36,.3) 100%)' }} />
              </div>);
            })}
          </div>
          <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: 'rgba(7,21,36,.85)', border: '1px solid rgba(200,150,26,.45)', fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, color: G }}>★ AI {item.ai}</div>
          {item.tag && <div style={{ position: 'absolute', top: 14, right: 14, background: isGold ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'rgba(7,21,36,.85)', color: isGold ? N : 'rgba(200,150,26,.9)', border: isGold ? 'none' : '1px solid rgba(200,150,26,.3)', fontSize: 9, fontWeight: 900, letterSpacing: '.08em', padding: '4px 10px', borderRadius: 20, textTransform: 'uppercase' }}>{item.tag}</div>}
          <div style={{ position: 'absolute', bottom: 22, left: 20, right: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                <span style={{ width: 16, height: 1.5, background: G, display: 'block' }} />
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.22em', color: G, textTransform: 'uppercase' }}>{item.type} · {purpose === 'rent' ? (isAr ? 'للإيجار' : 'For Rent') : (isAr ? 'للبيع' : 'For Sale')}</span>
              </div>
              <h1 style={{ fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT, fontSize: 32, fontWeight: isAr ? 700 : 400, fontStyle: isAr ? 'normal' : 'italic', color: '#fff', lineHeight: 1, textShadow: '0 3px 16px rgba(0,0,0,.5)' }}>{item.beds}BR {item.type}</h1>
            </div>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,.6)', background: 'rgba(7,21,36,.6)', padding: '4px 9px', borderRadius: 8, backdropFilter: 'blur(6px)' }}>{gi + 1} / {gallery.length}</span>
          </div>
          <div style={{ position: 'absolute', bottom: 12, left: 20, display: 'flex', gap: 5 }}>
            {gallery.map(function (_, i) {return <span key={i} style={{ height: 4, borderRadius: 3, transition: 'all .3s', width: i === gi ? 18 : 4, background: i === gi ? G : 'rgba(255,255,255,.35)' }} />;})}
          </div>
        </div>

        {/* PRICE + ADDRESS */}
        <div style={{ padding: '18px 20px 20px', borderBottom: '1px solid rgba(200,150,26,.1)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexDirection: isAr ? 'row-reverse' : 'row' }}>
            <div style={{ textAlign: isAr ? 'right' : 'left' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 25, fontWeight: 700, lineHeight: 1, background: 'linear-gradient(90deg,#E9C176,#C8961A 45%,#E9C176)', backgroundSize: '200%', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 6s linear infinite' }}>{pr}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 6, fontFamily: "'JetBrains Mono',monospace" }}>{perUnit}</div>
            </div>
            <div style={{ textAlign: isAr ? 'left' : 'right' }}>
              <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 12 }}>📍 {item.cmp}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 3 }}>{isAr ? 'القاهرة الجديدة' : 'New Cairo, Egypt'}</div>
            </div>
          </div>
        </div>

        {/* OVERVIEW */}
        <div style={{ padding: '22px 20px 6px' }}>
          {eyebrow(isAr ? 'نظرة عامة' : 'Property Overview')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9 }}>
            {overview.map(function (o, i) {return (
              <div key={i} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(200,150,26,.14)', borderRadius: 12, padding: '13px 10px', textAlign: 'center' }}>
                <div style={{ color: G, fontSize: 17, lineHeight: 1 }}>{o.icon}</div>
                <div style={{ fontFamily: HEADING_FONT, fontSize: 20, fontWeight: 600, color: '#fff', lineHeight: 1, marginTop: 8 }}>{o.value}</div>
                <div style={{ fontSize: 8, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{o.label}</div>
              </div>);
            })}
          </div>
        </div>

        {/* DESCRIPTION */}
        <div style={{ padding: '26px 20px 6px' }}>
          {eyebrow(isAr ? 'الوحدة' : 'The Residence')}
          <h2 style={h2Style}>{isAr ? 'مساحة مدروسة' : 'A Considered Space'}</h2>
          <p style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(255,255,255,.55)', marginBottom: 12 }}>{isAr ? 'وحدة ' + item.type + ' فاخرة بمساحة ' + item.area + ' م² في ' + item.cmp + '، بتشطيب سوبر لوكس وإطلالات مفتوحة. صُممت كل مساحة لتعيش مع ضوء النهار.' : 'A ' + item.area + ' m² ' + item.type.toLowerCase() + ' in ' + item.cmp + ' with super-lux finishing, warm materials and light-filled volumes tuned for calm living.'}</p>
          <p style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(255,255,255,.55)' }}>{isAr ? item.beds + ' غرف نوم و' + item.bath + ' حمامات تطل على مساحات خضراء خاصة — على بعد دقائق من قلب القاهرة الجديدة.' : item.beds + ' bedrooms and ' + item.bath + ' baths open onto private landscaping — minutes from the heart of New Cairo.'}</p>
        </div>

        {/* FEATURES */}
        <div style={{ padding: '26px 20px 6px' }}>
          {eyebrow((isAr ? 'المرافق · ' : 'Amenities · ') + features.length)}
          <h2 style={h2Style}>{isAr ? 'المميزات' : 'Features'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '11px 14px' }}>
            {features.map(function (f, i) {return <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: 'rgba(255,255,255,.7)', flexDirection: isAr ? 'row-reverse' : 'row', textAlign: isAr ? 'right' : 'left' }}><span style={{ color: G, fontSize: 13, flexShrink: 0 }}>✓</span>{f}</div>;})}
          </div>
        </div>

        {/* FLOOR PLANS */}
        <div style={{ padding: '26px 20px 6px' }}>
          {eyebrow(isAr ? 'التصميم' : 'Layout')}
          <h2 style={h2Style}>{isAr ? 'المخططات' : 'Floor Plans'}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {plans.map(function (pl, i) {var op = openPlan === i;return (
              <div key={i} style={{ border: '1px solid rgba(200,150,26,.16)', borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,.04)' }}>
                <div onClick={function () {setOpenPlan(op ? -1 : i);}} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 16px', cursor: 'pointer', flexDirection: isAr ? 'row-reverse' : 'row' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexDirection: isAr ? 'row-reverse' : 'row' }}>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(200,150,26,.14)', border: '1px solid rgba(200,150,26,.3)', color: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{op ? '−' : '+'}</span>
                    <span style={{ fontFamily: HEADING_FONT, fontSize: 18, fontWeight: 600, color: '#fff' }}>{pl.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'rgba(255,255,255,.5)', fontFamily: "'JetBrains Mono',monospace" }}>
                    <span style={{ color: G }}>⌥ {pl.beds}</span><span style={{ color: G }}>≋ {pl.baths}</span>
                  </div>
                </div>
                {op &&
                <div style={{ padding: '0 16px 16px' }}>
                  <div style={{ height: 160, borderRadius: 10, background: 'repeating-linear-gradient(45deg,rgba(200,150,26,.06) 0 12px,rgba(200,150,26,.02) 12px 24px)', border: '1px dashed rgba(200,150,26,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(200,150,26,.6)' }}>FLOOR PLAN · {pl.size}</div>
                </div>}
              </div>);
            })}
          </div>
        </div>

        {/* DETAILS */}
        <div style={{ padding: '26px 20px 6px' }}>
          {eyebrow(isAr ? 'المواصفات' : 'Specifications')}
          <h2 style={h2Style}>{isAr ? 'التفاصيل' : 'Details'}</h2>
          <div style={{ border: '1px solid rgba(200,150,26,.14)', borderRadius: 14, overflow: 'hidden' }}>
            {details.map(function (d, i) {return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', borderBottom: i < details.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none', background: 'rgba(255,255,255,.02)', flexDirection: isAr ? 'row-reverse' : 'row' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>{d.label}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: '#fff' }}>{d.value}</span>
              </div>);
            })}
          </div>
        </div>

        {/* VIRTUAL TOUR */}
        <div style={{ padding: '26px 0 6px' }}>
          <div style={{ padding: '0 20px' }}>
            {eyebrow(isAr ? 'جولة ثنائية الأبعاد' : 'Immersive 2D Tour')}
            <h2 style={h2Style}>{isAr ? 'جولة افتراضية' : 'Virtual Walkthrough'}</h2>
          </div>
          <div style={{ position: 'relative', margin: '0 20px', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(200,150,26,.2)', cursor: 'grab', userSelect: 'none', touchAction: 'none' }}
            onMouseDown={tourDown} onMouseMove={tourMove} onMouseUp={tourUp} onMouseLeave={tourUp}
            onTouchStart={tourDown} onTouchMove={tourMove} onTouchEnd={tourUp}>
            <div style={{ height: 250, backgroundImage: 'url(' + curRoom.img + ')', backgroundSize: '280%', backgroundPosition: pan.x + '% ' + pan.y + '%', backgroundRepeat: 'no-repeat' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(7,21,36,.85) 0%,transparent 45%,transparent 72%,rgba(7,21,36,.4) 100%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 9, background: 'rgba(7,21,36,.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(200,150,26,.2)', pointerEvents: 'none' }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,.55)' }}>✥ {isAr ? 'اسحب للاستكشاف' : 'Drag to explore'}</span>
            </div>
            <div style={{ position: 'absolute', bottom: 10, left: 12, fontFamily: HEADING_FONT, fontSize: 20, fontWeight: 500, color: '#fff', lineHeight: 1, textShadow: '0 2px 10px rgba(0,0,0,.5)', pointerEvents: 'none' }}>{curRoom.name}</div>
            <div style={{ position: 'absolute', bottom: 12, right: 12, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,.45)', pointerEvents: 'none' }}>{room + 1} / {rooms.length}</div>
          </div>
          <div style={{ overflowX: 'auto', padding: '12px 0 4px' }} className="gal-track">
            <div style={{ display: 'flex', gap: 7, padding: '0 20px', width: 'max-content' }}>
              {rooms.map(function (r, i) {var on = i === room;return (
                <button key={i} onClick={function () {setRoom(i);setPan({ x: 50, y: 50 });}} style={{ padding: '7px 13px', borderRadius: 22, fontSize: 10, fontWeight: 600, cursor: 'pointer', flexShrink: 0, border: '1px solid ' + (on ? G : 'rgba(200,150,26,.2)'), background: on ? G : 'rgba(200,150,26,.07)', color: on ? N : 'rgba(200,150,26,.85)' }}>{r.name}</button>);
              })}
            </div>
          </div>
        </div>

        {/* AGENT */}
        <div style={{ padding: '26px 20px 6px' }}>
          <div style={{ border: '1px solid rgba(200,150,26,.18)', borderRadius: 18, overflow: 'hidden', background: 'linear-gradient(150deg,rgba(26,51,84,.6),rgba(7,21,36,.4))' }}>
            <div style={{ padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid rgba(200,150,26,.12)', flexDirection: isAr ? 'row-reverse' : 'row' }}>
              <img src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=160&q=80" alt="" style={{ width: 62, height: 62, borderRadius: 14, objectFit: 'cover', border: '1.5px solid rgba(200,150,26,.4)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, textAlign: isAr ? 'right' : 'left' }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, letterSpacing: '.16em', color: G, textTransform: 'uppercase', marginBottom: 3 }}>{isAr ? 'المستشار' : 'Listing Agent'}</div>
                <div style={{ fontFamily: HEADING_FONT, fontSize: 22, fontWeight: 600, color: '#fff', lineHeight: 1 }}>Layla Hassan</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 6 }}>★ 4.9 · Sierra Estates</div>
              </div>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input placeholder={isAr ? 'الاسم بالكامل' : 'Full name'} style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(200,150,26,.16)', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none', textAlign: isAr ? 'right' : 'left' }} />
              <input placeholder={isAr ? 'واتساب · +20 ...' : 'WhatsApp · +20 ...'} style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(200,150,26,.16)', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none', textAlign: isAr ? 'right' : 'left' }} />
              <div style={{ display: 'flex', gap: 9 }}>
                <button onClick={function () {window.open('https://wa.me/201061399688?text=' + waText, '_blank');}} style={{ flex: 1, padding: 12, border: '1px solid rgba(37,211,102,.5)', borderRadius: 10, background: 'rgba(37,211,102,.12)', color: '#25d366', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>💬 WhatsApp</button>
                <button style={{ flex: 1.3, padding: 12, border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,' + G + ',' + GL + ')', color: N, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{isAr ? 'اطلب معلومات' : 'Request Info'}</button>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ background: '#04101d', padding: '30px 20px 26px', textAlign: 'center', marginTop: 22 }}>
          <div style={{ fontFamily: HEADING_FONT, fontSize: 16, fontWeight: 600, letterSpacing: '.16em', color: G }}>SIERRA ESTATES</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, color: 'rgba(255,255,255,.28)', letterSpacing: '.12em', marginTop: 5 }}>NEW CAIRO · AI-DRIVEN · 2026</div>
        </div>

        {/* STICKY CTA */}
        <div style={{ position: 'sticky', bottom: 0, zIndex: 85, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(7,21,36,.96)', backdropFilter: 'blur(22px)', borderTop: '1px solid rgba(200,150,26,.14)', flexDirection: isAr ? 'row-reverse' : 'row' }}>
          <div style={{ flexShrink: 0, textAlign: isAr ? 'right' : 'left' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 700, color: GL, lineHeight: 1 }}>{prShort}</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{item.beds}BR · {item.area}m²</div>
          </div>
          <button style={{ flex: 1, padding: 13, border: 'none', borderRadius: 12, background: 'rgba(255,255,255,.08)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>📞 {t.call || 'Call'}</button>
          <button style={{ position: 'relative', overflow: 'hidden', flex: 1.4, padding: 13, border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,' + G + ',' + GL + ')', color: N, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
            <span style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '100%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent)', animation: 'sheen 4.5s ease-in-out infinite' }} />
            {isAr ? 'احجز معاينة' : 'Schedule Tour'}
          </button>
        </div>

      </div>
    </div>);

}

/* ── ROI SHEET ── */
function ROISheet(props) {
  var open = props.open,onClose = props.onClose;
  var c = useApp();var lang = c.lang;var t = LANG[lang];var isAr = lang === 'ar';
  var price = useState(6);var setPrice = price[1];price = price[0];
  var rent = useState(6000);var setRent = rent[1];rent = rent[0];
  var gross = (rent * 12 / (price * 1e6) * 100).toFixed(2);
  var net = (gross * .75).toFixed(2);
  var gain5 = (price * 1.2).toFixed(1);
  var cash = Math.round(rent * 12 * .75).toLocaleString();
  var sorted = CPDS.slice().sort(function (a, b) {return parseFloat(b.g) - parseFloat(a.g);});
  if (!open) return null;
  return (
    <Sheet open={open} onClose={onClose} maxH="90%">
      <div style={{ padding: '12px 20px 8px', borderBottom: '1px solid rgba(13,32,53,.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.2em', color: G, textTransform: 'uppercase', marginBottom: 2 }}>AI SUPPORT · INVESTMENT</div>
            <div style={{ fontFamily: HEADING_FONT, fontSize: 22, fontWeight: 500, color: N }}>{t.roiTit}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(13,32,53,.3)', fontSize: 24 }}>×</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
        <div style={{ fontFamily: HEADING_FONT, fontSize: 18, fontWeight: 500, color: N, marginBottom: 10 }}>Yield Leaderboard</div>
        <div style={{ border: '1px solid rgba(13,32,53,.09)', borderRadius: 12, overflow: 'hidden', marginBottom: 18 }}>
          {sorted.slice(0, 10).map(function (cpd, i) {
            var pct = parseFloat(cpd.g);var barW = Math.round(pct / 35 * 100);
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 52px', gap: 8, alignItems: 'center', padding: '10px 12px', borderTop: i > 0 ? '1px solid rgba(13,32,53,.06)' : 'none', background: i === 0 ? 'rgba(200,150,26,.04)' : 'transparent' }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: i < 3 ? G : '#8A94A0' }}>#{i + 1}</span>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: N, marginBottom: 3 }}>{cpd.n}</div>
                  <div style={{ height: 5, borderRadius: 3, background: 'rgba(13,32,53,.07)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: barW + '%', background: 'linear-gradient(90deg,' + GL + ',' + G + ')', borderRadius: 3 }} />
                  </div>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: G, textAlign: 'right' }}>{cpd.g}</span>
              </div>);

          })}
        </div>
        <div style={{ padding: '16px', borderRadius: 14, background: N, boxShadow: '0 8px 32px rgba(13,32,53,.3)' }}>
          <div style={{ fontFamily: HEADING_FONT, fontSize: 18, fontWeight: 500, color: '#fff', marginBottom: 12 }}>{t.roiCalc}</div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: 'Inter' }}>{t.roiPrice}</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: G }}>EGP {price.toFixed(1)}M</span>
            </div>
            <input type="range" min={1} max={50} step={0.5} value={price} onChange={function (e) {setPrice(+e.target.value);}} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: 'Inter' }}>{t.roiRent}/mo</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: G }}>${rent.toLocaleString()}</span>
            </div>
            <input type="range" min={500} max={15000} step={100} value={rent} onChange={function (e) {setRent(+e.target.value);}} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[[gross + '%', t.roiG], [net + '%', t.roiN], ['EGP ' + gain5 + 'M', t.roi5], ['$' + cash, t.roiCash]].map(function (pair, i) {return (
                <div key={i} style={{ background: 'rgba(255,255,255,.07)', borderRadius: 10, padding: '11px 10px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700, color: G, lineHeight: 1 }}>{pair[0]}</div>
                <div style={{ fontSize: 8, letterSpacing: '.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginTop: 3, fontFamily: 'Inter' }}>{pair[1]}</div>
              </div>);
            })}
          </div>
        </div>
      </div>
    </Sheet>);

}

/* ── PRICE SHEET ── */
function PriceSheet(props) {
  var open = props.open,onClose = props.onClose;
  var c = useApp();var lang = c.lang;var t = LANG[lang];var isAr = lang === 'ar';
  var cpd = useState('Hyde Park');var setCpd = cpd[1];cpd = cpd[0];
  var area = useState(180);var setArea = area[1];area = area[0];
  var bds = useState(3);var setBds = bds[1];bds = bds[0];
  var fin = useState(1);var setFin = fin[1];fin = fin[0];
  var est = useMemo(function () {
    var base = (CPDS.find(function (x) {return x.n === cpd;}) || CPDS[0]).priceM;
    var af = area / 200;var ff = [0.85, 1, 1.25][fin];var bf = bds <= 2 ? .82 : bds <= 3 ? 1 : bds <= 4 ? 1.22 : 1.45;
    var mid = base * af * ff * bf;
    return { lo: (mid * .88).toFixed(1), hi: (mid * 1.12).toFixed(1), mid: mid.toFixed(1) };
  }, [cpd, area, bds, fin]);
  if (!open) return null;
  return (
    <Sheet open={open} onClose={onClose} maxH="90%">
      <div style={{ padding: '12px 20px 8px', borderBottom: '1px solid rgba(13,32,53,.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.2em', color: G, textTransform: 'uppercase', marginBottom: 2 }}>AI SUPPORT · VALUATION</div>
            <div style={{ fontFamily: HEADING_FONT, fontSize: 22, fontWeight: 500, color: N }}>{t.priceTit}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(13,32,53,.3)', fontSize: 24 }}>×</button>
        </div>
        <p style={{ fontSize: 11, color: '#8A94A0', marginTop: 4, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{t.priceSub}</p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
        <div style={{ padding: '20px', borderRadius: 14, background: 'linear-gradient(160deg,' + N2 + ',#091828)', marginBottom: 18, textAlign: 'center' }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.24em', textTransform: 'uppercase', color: GL, marginBottom: 8, opacity: .85 }}>{t.priceResult}</div>
          <div style={{ fontFamily: HEADING_FONT, fontSize: 46, fontWeight: 600, color: GL, lineHeight: 1, marginBottom: 4 }}>EGP {est.mid}M</div>
          <div style={{ fontSize: 12, color: 'rgba(239,248,247,.5)', marginBottom: 14 }}>Range: EGP {est.lo}M – {est.hi}M</div>
          <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', fontFamily: 'Inter' }}>{t.priceConf}</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: G }}>88%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '88%', background: 'linear-gradient(90deg,' + GL + ',' + G + ')', borderRadius: 3 }} />
            </div>
          </div>
        </div>
        <div style={{ border: '1px solid rgba(13,32,53,.1)', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8A94A0', marginBottom: 5, fontFamily: 'Inter' }}>{t.priceCpd}</div>
          <select value={cpd} onChange={function (e) {setCpd(e.target.value);}} style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: 13, fontWeight: 600, color: N, fontFamily: 'Inter', cursor: 'pointer' }}>
            {CPDS.map(function (x) {return <option key={x.n}>{x.n}</option>;})}
          </select>
        </div>
        <div style={{ border: '1px solid rgba(13,32,53,.1)', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8A94A0', fontFamily: 'Inter' }}>{t.priceArea}</div>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: G }}>{area} m²</span>
          </div>
          <input type="range" min={50} max={900} step={5} value={area} onChange={function (e) {setArea(+e.target.value);}} />
        </div>
        <div style={{ border: '1px solid rgba(13,32,53,.1)', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8A94A0', marginBottom: 8, fontFamily: 'Inter' }}>{t.priceBeds}</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {[1, 2, 3, 4, 5].map(function (b) {return (
                <button key={b} onClick={function () {setBds(b);}} style={{ flex: 1, padding: '8px', borderRadius: 9, border: '1px solid', fontFamily: 'Inter', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all .18s', borderColor: bds === b ? G : 'rgba(13,32,53,.12)', background: bds === b ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'transparent', color: bds === b ? N : '#8A94A0' }}>{b}</button>);
            })}
          </div>
        </div>
        <div style={{ border: '1px solid rgba(13,32,53,.1)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8A94A0', marginBottom: 8, fontFamily: 'Inter' }}>{t.priceFinish}</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {t.finOpts.map(function (f, i) {return (
                <button key={i} onClick={function () {setFin(i);}} style={{ flex: 1, padding: '7px 4px', borderRadius: 9, border: '1px solid', fontFamily: 'Inter', fontWeight: 600, fontSize: 10, cursor: 'pointer', transition: 'all .18s', borderColor: fin === i ? G : 'rgba(13,32,53,.12)', background: fin === i ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'transparent', color: fin === i ? N : '#8A94A0' }}>{f}</button>);
            })}
          </div>
        </div>
        <button style={{ width: '100%', padding: '12px', borderRadius: 10, background: N, color: 'rgba(200,150,26,.9)', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', fontFamily: 'Inter' }}>
          📞 Get Full Valuation Report →
        </button>
      </div>
    </Sheet>);

}

/* ── SMART MATCH SHEET ── */
function MatchSheet(props) {
  var open = props.open,onClose = props.onClose,purpose = props.purpose;
  var c = useApp();var lang = c.lang;var t = LANG[lang];var isAr = lang === 'ar';
  var mode = useState(purpose);var setMode = mode[1];mode = mode[0];
  var q = useState('');var setQ = q[1];q = q[0];
  var bds = useState(null);var setBds = bds[1];bds = bds[0];
  var items = useMemo(function () {
    var all = [];
    Object.keys(UNITS).forEach(function (cmpName) {UNITS[cmpName].forEach(function (u) {all.push(Object.assign({}, u, { cmp: cmpName }));});});
    if (q) {var lq = q.toLowerCase();all = all.filter(function (u) {return u.cmp.toLowerCase().indexOf(lq) >= 0 || u.type.toLowerCase().indexOf(lq) >= 0;});}
    if (bds) all = all.filter(function (u) {return u.beds === bds;});
    return all.sort(function (a, b) {return b.ai - a.ai;});
  }, [q, bds]);
  if (!open) return null;
  return (
    <Sheet open={open} onClose={onClose} maxH="90%">
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid rgba(13,32,53,.07)', flexShrink: 0, direction: isAr ? 'rtl' : 'ltr' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.2em', color: G, textTransform: 'uppercase', marginBottom: 2 }}>AI SUPPORT · MATCHING</div>
            <div style={{ fontFamily: HEADING_FONT, fontSize: 22, fontWeight: 500, color: N }}>{t.matchTit}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(13,32,53,.3)', fontSize: 24 }}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'rgba(13,32,53,.06)', borderRadius: 10, padding: 3, marginBottom: 9 }}>
          {[['resale', t.resale], ['rent', t.rent]].map(function (pair) {return (
              <button key={pair[0]} onClick={function () {setMode(pair[0]);}} style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter', transition: 'all .2s', background: mode === pair[0] ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'transparent', color: mode === pair[0] ? N : '#8A94A0' }}>{pair[1]}</button>);
          })}
        </div>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(13,32,53,.4)" strokeWidth="2.5" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input value={q} onChange={function (e) {setQ(e.target.value);}} placeholder="Filter by compound or type…" style={{ width: '100%', paddingLeft: 28, paddingRight: 10, paddingTop: 8, paddingBottom: 8, background: 'rgba(13,32,53,.05)', border: '1px solid rgba(13,32,53,.1)', borderRadius: 9, fontSize: 12, color: N, outline: 'none', fontFamily: 'Inter' }} />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[null, 1, 2, 3, 4, 5].map(function (b) {return (
              <button key={b == null ? 'a' : b} onClick={function () {setBds(bds === b ? null : b);}} style={{ padding: '3px 9px', borderRadius: 20, fontSize: 9.5, fontWeight: 600, cursor: 'pointer', border: '1px solid', fontFamily: 'Inter', transition: 'all .15s', borderColor: bds === b ? G : 'rgba(13,32,53,.12)', background: bds === b ? 'rgba(200,150,26,.13)' : 'transparent', color: bds === b ? G : '#8A94A0' }}>{b == null ? t.any : b + 'B'}</button>);
          })}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
        <div style={{ fontSize: 9.5, color: '#8A94A0', marginBottom: 8, fontFamily: 'Inter' }}>{items.length} units · ranked by AI score</div>
        {items.slice(0, 30).map(function (u) {return (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 10, border: '1px solid rgba(13,32,53,.08)', marginBottom: 7, background: '#fff' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,' + N + ',' + N3 + ')', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 800, color: G }}>{u.ai}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, color: N, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 1 }}>{u.cmp}</div>
              <div style={{ fontFamily: HEADING_FONT, fontSize: 13, fontWeight: 600, color: N, lineHeight: 1.2 }}>{u.beds}B {u.type} · {u.area}m²</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: G }}>{mode === 'rent' ? '$' + u.usd.toLocaleString() : u.egpM + 'M'}</div>
              <span className={u.status === 'Available' ? 'pill-av' : u.status === 'Under Offer' ? 'pill-uo' : 'pill-so'}>{u.status === 'Available' ? t.pAv : u.status === 'Under Offer' ? t.pUO : t.pSold}</span>
            </div>
          </div>);
        })}
      </div>
    </Sheet>);

}

/* ── DREAM SHEET ── */
function DreamSheet(props) {
  var open = props.open,onClose = props.onClose;
  var c = useApp();var lang = c.lang;var t = LANG[lang];var isAr = lang === 'ar';
  var step = useState(0);var setStep = step[1];step = step[0];
  var answers = useState([]);var setAnswers = answers[1];answers = answers[0];
  var done = useState(false);var setDone = done[1];done = done[0];
  function pick(opt) {var a = answers.concat([opt]);setAnswers(a);if (step < 3) setStep(function (s) {return s + 1;});else setDone(true);}
  function reset() {setStep(0);setAnswers([]);setDone(false);}
  var priority = answers[0] || Object.keys(t.dreamRes)[0];
  var res = t.dreamRes[priority] || Object.values(t.dreamRes)[0];
  if (!open) return null;
  return (
    <Sheet open={open} onClose={onClose} maxH="88%">
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid rgba(13,32,53,.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.2em', color: G, textTransform: 'uppercase', marginBottom: 2 }}>AI SUPPORT · DECISION</div>
            <div style={{ fontFamily: HEADING_FONT, fontSize: 20, fontWeight: 500, color: N }}>{t.dreamTit}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(13,32,53,.3)', fontSize: 24 }}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {[0, 1, 2, 3].map(function (i) {return (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < (done ? 4 : step) ? 'linear-gradient(90deg,' + GL + ',' + G + ')' : 'rgba(13,32,53,.1)', transition: 'background .4s' }} />);
          })}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {done ?
        <div style={{ textAlign: 'center', animation: 'popIn .5s cubic-bezier(.16,1,.3,1) both' }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>🏆</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.2em', color: G, textTransform: 'uppercase', marginBottom: 5 }}>YOUR PERFECT MATCH</div>
            <div style={{ fontFamily: HEADING_FONT, fontSize: 32, fontWeight: 600, color: N, marginBottom: 4, lineHeight: 1.1 }}>{res[0]}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: G, marginBottom: 16 }}>{res[1]}</div>
            <div style={{ fontSize: 12, color: 'rgba(13,32,53,.6)', lineHeight: 1.6, background: IV, borderRadius: 12, padding: '13px 15px', marginBottom: 18, textAlign: 'left' }}>{res[2]}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={reset} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid rgba(13,32,53,.14)', background: 'none', color: '#8A94A0', fontSize: 11, cursor: 'pointer', fontFamily: 'Inter' }}>Start Over</button>
              <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 10, background: N, color: 'rgba(200,150,26,.9)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', border: 'none', cursor: 'pointer', fontFamily: 'Inter' }}>View Units →</button>
            </div>
          </div> :

        <div>
            <div style={{ fontFamily: HEADING_FONT, fontSize: 26, fontWeight: 500, color: N, marginBottom: 4, lineHeight: 1.15 }}>{t.dq[step]}</div>
            <p style={{ fontSize: 12, color: '#8A94A0', marginBottom: 20, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{t.dh[step]}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {t.do[step].map(function (o, i) {return (
                <button key={i} onClick={function () {pick(o.t);}} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', border: '1px solid rgba(13,32,53,.1)', borderRadius: 13, cursor: 'pointer', transition: 'all .22s', background: 'none', fontFamily: 'inherit', textAlign: 'left' }}>
                  <div style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: 'rgba(13,32,53,.06)', fontSize: 20, flexShrink: 0 }}>{o.ic}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: N, marginBottom: 2, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{o.t}</div>
                    <div style={{ fontSize: 11, color: '#8A94A0', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{o.d}</div>
                  </div>
                </button>);
            })}
            </div>
            {step > 0 && <button onClick={function () {setStep(function (s) {return s - 1;});setAnswers(function (a) {return a.slice(0, -1);});}} style={{ marginTop: 16, background: 'none', border: 'none', color: '#8A94A0', fontFamily: 'Inter', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{t.dreamBack}</button>}
          </div>
        }
      </div>
    </Sheet>);

}

/* ── AI ENGINE SHEET ── */
function AIEngineSheet(props) {
  var open = props.open,onClose = props.onClose;
  var wide = useWide();
  var c = useApp();var isAr = c.lang === 'ar';
  var animDone = useState(false);var setAnimDone = animDone[1];animDone = animDone[0];
  useEffect(function () {if (open) setTimeout(function () {setAnimDone(true);}, 400);else setAnimDone(false);}, [open]);
  var PRICE_PTS = [{ y: '2020', v: 3.2 }, { y: '2021', v: 4.1 }, { y: '2022', v: 5.8 }, { y: '2023', v: 8.4 }, { y: '2024', v: 11.9 }, { y: '2026', v: 16.2 }];
  var ROI_BARS = [{ n: 'Uptown Cairo', p: 31 }, { n: 'Mountain View', p: 24 }, { n: 'Hyde Park', p: 22 }, { n: 'Palm Hills NC', p: 21 }, { n: 'Villette', p: 20 }, { n: 'SODIC East', p: 18 }, { n: 'Mivida', p: 18 }, { n: 'Eastown', p: 19 }];
  var W = 320,H = 140,PL = 32,PR = 12,PT = 8,PB = 28;
  var maxV = 18;
  var pts = PRICE_PTS.map(function (d, i) {var x = PL + i / (PRICE_PTS.length - 1) * (W - PL - PR);var y = H - PB - d.v / maxV * (H - PT - PB);return { x: x, y: y, yLabel: d.y, v: d.v };});
  var pathD = pts.map(function (p, i) {return (i === 0 ? 'M ' : 'L ') + p.x + ',' + p.y;}).join(' ');
  var fillD = 'M ' + pts[0].x + ',' + (H - PB) + ' ' + pts.map(function (p) {return 'L ' + p.x + ',' + p.y;}).join(' ') + ' L ' + pts[pts.length - 1].x + ',' + (H - PB) + ' Z';
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 550, background: 'rgba(4,8,15,.78)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: wide ? 'center' : 'flex-end', justifyContent: 'center', padding: wide ? 24 : 0 }} onClick={function (e) {if (e.target === e.currentTarget) onClose();}}>
      <div style={{ background: '#09090f', borderRadius: wide ? 24 : '22px 22px 0 0', width: wide ? 'min(720px, 94vw)' : '100%', maxHeight: wide ? 'min(85vh, 860px)' : '92%', display: 'flex', flexDirection: 'column', animation: 'slideUp .4s cubic-bezier(.16,1,.3,1) both', boxShadow: '0 -20px 80px rgba(0,0,0,.6),0 0 0 1px rgba(200,150,26,.15)' }}>
        <div style={{ textAlign: 'center', padding: '10px 0 0', flexShrink: 0 }}><div style={{ width: 36, height: 3.5, borderRadius: 2, background: 'rgba(200,150,26,.25)', margin: '0 auto' }} /></div>
        <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid rgba(200,150,26,.15)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, letterSpacing: '.22em', color: 'rgba(200,150,26,.6)', textTransform: 'uppercase', marginBottom: 3 }}>INTELLIGENCE OS PLATFORM</div>
              <div style={{ fontFamily: HEADING_FONT, fontSize: 22, fontWeight: 400, color: '#fff', lineHeight: 1.1 }}>
                AI Engine <span style={{ fontStyle: 'italic', background: 'linear-gradient(90deg,' + GL + ',' + G + ')', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>3.0</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(52,211,153,.12)', border: '1px solid rgba(52,211,153,.25)', fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', animation: 'blink 2s ease infinite', display: 'block' }} />LIVE
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.3)', fontSize: 22, lineHeight: 1 }}>×</button>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>
          {/* AVM Chart */}
          <div style={{ marginBottom: 20, padding: '16px', borderRadius: 14, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(200,150,26,.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: G, display: 'block', animation: 'blink 2s ease infinite' }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.16em', color: 'rgba(240,237,229,.4)', textTransform: 'uppercase' }}>AVM PREDICTIVE PRICING ENGINE</span>
              <span style={{ marginLeft: 'auto', padding: '2px 7px', borderRadius: 4, background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.22)', fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, fontWeight: 700, color: '#34d399' }}>LIVE</span>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(240,237,229,.3)', marginBottom: 10, fontFamily: 'Inter' }}>Avg compound price · EGP millions · 2020–2026</div>
            <svg width="100%" viewBox={'0 0 ' + W + ' ' + H} style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="fg2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={G} stopOpacity=".3" />
                  <stop offset="100%" stopColor={G} stopOpacity="0" />
                </linearGradient>
              </defs>
              {[.25, .5, .75, 1].map(function (f, i) {var y2 = PT + (1 - f) * (H - PT - PB);return <line key={i} x1={PL} y1={y2} x2={W - PR} y2={y2} stroke="rgba(255,255,255,.05)" strokeWidth="1" />;})}
              {animDone && <path d={fillD} fill="url(#fg2)" />}
              {animDone && <path d={pathD} fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="800" strokeDashoffset="0" style={{ animation: 'lineGrow 1.2s .1s cubic-bezier(.16,1,.3,1) both' }} />}
              {pts.map(function (p, i) {return (
                  <g key={i} style={{ animation: 'dotAppear .5s ' + (.2 + i * .1) + 's both' }}>
                  <circle cx={p.x} cy={p.y} r="4" fill={G} stroke="rgba(9,9,15,.8)" strokeWidth="1.5" />
                  <text x={p.x} y={H - 6} fill="rgba(240,237,229,.25)" fontSize="8" textAnchor="middle" fontFamily="JetBrains Mono,monospace">{p.yLabel}</text>
                </g>);
              })}
            </svg>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              {[['Hyde Park', 'EGP 18.5M'], ['Mountain View', 'EGP 11.2M'], ['Mivida', 'EGP 5.8M']].map(function (pair, i) {return (
                  <div key={i} style={{ flex: 1, padding: '8px 9px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(200,150,26,.1)' }}>
                  <div style={{ fontFamily: 'Inter', fontSize: 8.5, color: 'rgba(240,237,229,.4)', marginBottom: 3 }}>{pair[0]}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: G }}>{pair[1]}</div>
                </div>);
              })}
            </div>
          </div>
          {/* ROI Bars */}
          <div style={{ marginBottom: 20, padding: '16px', borderRadius: 14, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(200,150,26,.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'block' }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.16em', color: 'rgba(240,237,229,.4)', textTransform: 'uppercase' }}>ROI COMPOUNDING YIELD</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {ROI_BARS.map(function (r, i) {return (
                  <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 11, color: 'rgba(240,237,229,.75)', fontWeight: 500 }}>{r.n}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: G }}>+{r.p}%</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 2.5, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2.5, background: 'linear-gradient(90deg,' + GL + ',' + G + ')', width: animDone ? Math.round(r.p / 35 * 100) + '%' : '0%', transition: 'width .9s ' + (.05 + i * .07) + 's cubic-bezier(.16,1,.3,1)' }} />
                  </div>
                </div>);
              })}
            </div>
            <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 10, background: 'rgba(200,150,26,.07)', border: '1px solid rgba(200,150,26,.18)' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: G, letterSpacing: '.12em', marginBottom: 4, textTransform: 'uppercase' }}>Q2 2026 SIGNAL</div>
              <p style={{ fontFamily: 'Inter', fontSize: 10.5, color: 'rgba(240,237,229,.55)', lineHeight: 1.6 }}>Strong buy signals across 5th Settlement. Avg 22% YoY growth projected. Hyde Park & Uptown Cairo outperforming baseline.</p>
            </div>
          </div>

          <button onClick={onClose} style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'linear-gradient(135deg,' + G + ',' + GL + ')', color: N, fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', fontFamily: 'Inter' }}>
            ← Back to App
          </button>
        </div>
      </div>
    </div>);

}

/* ── AI CHAT ── */
function ChatSheet(props) {
  var open = props.open,initQ = props.initQ,onClose = props.onClose;
  var wide = useWide();
  var c = useApp();var lang = c.lang;var t = LANG[lang];var isAr = lang === 'ar';
  var msgs = useState([{ r: 'ai', tx: t.aiResp.def }]);var setMsgs = msgs[1];msgs = msgs[0];
  var inp = useState('');var setInp = inp[1];inp = inp[0];
  var typing = useState(false);var setTyping = typing[1];typing = typing[0];
  var bRef = useRef(null);
  useEffect(function () {setMsgs([{ r: 'ai', tx: t.aiResp.def }]);}, [lang]);
  useEffect(function () {if (bRef.current) bRef.current.scrollTop = bRef.current.scrollHeight;}, [msgs, typing]);
  useEffect(function () {if (open && initQ) doSend(initQ);}, [open, initQ]);
  function doSend(txt) {
    setMsgs(function (m) {return m.concat([{ r: 'user', tx: txt }]);});setTyping(true);
    setTimeout(function () {
      var q = txt.toLowerCase();
      var ar = t.aiResp;
      var rep = q.indexOf('hyde') >= 0 ? ar.hyde : q.indexOf('mivida') >= 0 ? ar.mivida : q.indexOf('roi') >= 0 || q.indexOf('invest') >= 0 || q.indexOf('عائد') >= 0 ? ar.roi : q.indexOf('rent') >= 0 || q.indexOf('إيجار') >= 0 ? ar.rent : q.indexOf('compare') >= 0 || q.indexOf('قارن') >= 0 ? ar.compare : q.indexOf('invest') >= 0 ? ar.invest : ar.def;
      setMsgs(function (m) {return m.concat([{ r: 'ai', tx: rep }]);});setTyping(false);
    }, 900 + Math.random() * 600);
  }
  function send() {if (!inp.trim()) return;var txt = inp.trim();setInp('');doSend(txt);}
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(4,8,15,.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: wide ? 'center' : 'flex-end', justifyContent: 'center', padding: wide ? 24 : 0 }} onClick={function (e) {if (e.target === e.currentTarget) onClose();}}>
      <div style={{ background: '#fff', borderRadius: wide ? 24 : '22px 22px 0 0', width: wide ? 'min(720px, 94vw)' : '100%', height: wide ? 'min(76vh, 760px)' : '72%', display: 'flex', flexDirection: 'column', animation: 'slideUp .38s cubic-bezier(.16,1,.3,1) both', boxShadow: '0 -20px 60px rgba(13,32,53,.22)' }}>
        <div style={{ padding: '12px 16px', background: N2, borderRadius: '22px 22px 0 0', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexDirection: isAr ? 'row-reverse' : 'row' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,' + G + ',' + GL + ')', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEADING_FONT, fontSize: 17, color: N, fontWeight: 700, flexShrink: 0 }}>S</div>
          <div style={{ textAlign: isAr ? 'right' : 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{t.aiName}</div>
            <div style={{ fontSize: 8.5, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, flexDirection: isAr ? 'row-reverse' : 'row' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'block', animation: 'blink 2s ease infinite' }} />
              <span style={{ fontFamily: 'Inter' }}>{t.aiOn}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ marginLeft: isAr ? 0 : 'auto', marginRight: isAr ? 'auto' : 0, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.35)', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>
        <div ref={bRef} style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {msgs.map(function (m, i) {return (
              <div key={i} style={{ maxWidth: '88%', padding: '9px 12px', borderRadius: m.r === 'ai' ? '4px 13px 13px 13px' : '13px 4px 13px 13px', fontSize: 12, lineHeight: 1.55, background: m.r === 'ai' ? 'rgba(13,32,53,.06)' : 'linear-gradient(135deg,' + G + ',' + GL + ')', color: N, border: m.r === 'ai' ? '1px solid rgba(13,32,53,.08)' : 'none', alignSelf: m.r === 'ai' ? 'flex-start' : 'flex-end', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', textAlign: isAr ? 'right' : 'left' }}>{m.tx}</div>);
          })}
          {typing && <div style={{ display: 'flex', gap: 5, padding: '9px 13px', borderRadius: '4px 13px 13px 13px', background: 'rgba(13,32,53,.06)', border: '1px solid rgba(13,32,53,.08)', alignSelf: 'flex-start', width: 58 }}>
            {[0, 1, 2].map(function (i) {return <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: G, display: 'block', animation: 'dotPulse 1.4s ' + .18 * i + 's ease-in-out infinite both' }} />;})}
          </div>}
        </div>
        <div style={{ padding: '5px 12px 3px', display: 'flex', gap: 5, flexWrap: 'wrap', flexShrink: 0 }}>
          {[t.c1, t.c2, t.c3, t.c4, t.c5].map(function (s, i) {return (
              <button key={i} onClick={function () {doSend(s);}} style={{ padding: '3px 9px', borderRadius: 20, fontSize: 9.5, fontWeight: 600, background: 'rgba(13,32,53,.06)', border: '1px solid rgba(13,32,53,.1)', color: N, cursor: 'pointer', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{s}</button>);
          })}
        </div>
        <div style={{ padding: '7px 12px 22px', display: 'flex', gap: 8, flexShrink: 0, flexDirection: isAr ? 'row-reverse' : 'row' }}>
          <input value={inp} onChange={function (e) {setInp(e.target.value);}} onKeyDown={function (e) {if (e.key === 'Enter') send();}} placeholder={t.aiPh} style={{ flex: 1, padding: '10px 13px', borderRadius: 10, border: '1px solid rgba(13,32,53,.14)', background: 'rgba(13,32,53,.03)', fontSize: 12, color: N, outline: 'none', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', textAlign: isAr ? 'right' : 'left' }} />
          <button onClick={send} style={{ padding: '10px 15px', borderRadius: 10, background: N, color: G, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>→</button>
        </div>
      </div>
    </div>);

}

/* ── SAVED SHEET ── */
function SavedSheet(props) {
  var open = props.open,onClose = props.onClose,savedIds = props.savedIds,listings = props.listings,purpose = props.purpose;
  var wide = useWide();
  var c = useApp();var isAr = c.lang === 'ar';
  var items = listings.filter(function (l) {return savedIds.has(l.id);});
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(4,8,15,.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: wide ? 'center' : 'flex-end', justifyContent: 'center', padding: wide ? 24 : 0 }} onClick={function (e) {if (e.target === e.currentTarget) onClose();}}>
      <div style={{ background: '#fff', borderRadius: wide ? 24 : '22px 22px 0 0', width: wide ? 'min(720px, 94vw)' : '100%', maxHeight: wide ? 'min(80vh, 820px)' : '80%', display: 'flex', flexDirection: 'column', animation: 'slideUp .38s cubic-bezier(.16,1,.3,1) both', boxShadow: '0 -20px 60px rgba(13,32,53,.22)' }}>
        <div style={{ textAlign: 'center', padding: '10px 0 0', flexShrink: 0 }}><div style={{ width: 36, height: 3.5, borderRadius: 2, background: 'rgba(13,32,53,.14)', margin: '0 auto' }} /></div>
        <div style={{ padding: '10px 20px 8px', borderBottom: '1px solid rgba(13,32,53,.07)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.2em', color: G, textTransform: 'uppercase', marginBottom: 2 }}>MY COLLECTION</div>
            <div style={{ fontFamily: HEADING_FONT, fontSize: 22, fontWeight: 500, color: N }}>Saved Properties</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(13,32,53,.3)', fontSize: 24 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }}>
          {items.length === 0 ?
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8A94A0' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>♡</div>
              <div style={{ fontFamily: HEADING_FONT, fontSize: 18, color: N, marginBottom: 5 }}>No saved properties yet</div>
              <div style={{ fontSize: 12, fontFamily: 'Inter' }}>Tap the heart on any listing to save it here.</div>
            </div> :
          items.map(function (l) {
            var pr = purpose === 'rent' ? '$' + l.usd.toLocaleString() + '/mo' : 'EGP ' + l.egpM + 'M';
            return (
              <div key={l.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px', borderRadius: 12, border: '1px solid rgba(13,32,53,.08)', marginBottom: 8, background: '#fff' }}>
                <img src={l.img} alt="" style={{ width: 60, height: 60, borderRadius: 9, objectFit: 'cover', flexShrink: 0 }} loading="lazy" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, letterSpacing: '.12em', textTransform: 'uppercase', color: N, marginBottom: 1 }}>{l.cmp}</div>
                  <div style={{ fontFamily: HEADING_FONT, fontSize: 14, fontWeight: 600, color: N, lineHeight: 1.2, marginBottom: 3 }}>{l.beds}B {l.type} · {l.area}m²</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: G }}>{pr}</div>
                </div>
                <a href={'https://wa.me/201061399688?text=' + encodeURIComponent('Hi! Interested in saved unit: ' + l.beds + 'BR ' + l.type + ' at ' + l.cmp)} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" /></svg>
                </a>
              </div>);

          })}
        </div>
        {items.length > 0 && <div style={{ padding: '10px 16px 24px', borderTop: '1px solid rgba(13,32,53,.07)', flexShrink: 0 }}>
          <button style={{ width: '100%', padding: '12px', borderRadius: 10, background: N, color: 'rgba(200,150,26,.9)', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', fontFamily: 'Inter' }}>
            💬 Enquire About All {items.length} Saved →
          </button>
        </div>}
      </div>
    </div>);

}

/* ── REQUEST MODAL ── */
function ReqModal(props) {
  var open = props.open,onClose = props.onClose;
  var wide = useWide();
  var c = useApp();var lang = c.lang;var t = LANG[lang];var isAr = lang === 'ar';
  var form = useState({ name: '', phone: '', comment: '' });
  var setForm = form[1];form = form[0];
  var done = useState(false);var setDone = done[1];done = done[0];
  function set(k, v) {setForm(function (f) {var n = Object.assign({}, f);n[k] = v;return n;});}
  function submit() {
    if (!form.name.trim() || !form.phone.trim()) return;
    var payload = { name: form.name.trim(), email: '', phone: form.phone.trim(), message: form.comment.trim(), locale: lang, source: 'client-portal' };
    try {
      var leads = JSON.parse(localStorage.getItem('sierra_leads') || '[]');
      leads.push(Object.assign({ ts: new Date().toISOString() }, payload));
      localStorage.setItem('sierra_leads', JSON.stringify(leads));
    } catch (e) {}
    try { /* backend funnel — POST /api/leads per docs/API_CONTRACT.md; fire-and-forget, offline-safe */
      var API = (window.SIERRA_API_BASE || '').replace(/\/$/, '');
      fetch(API + '/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(function () {});
      if (window.__seTrack) window.__seTrack('lead_submitted', { source: 'client-portal', lang: lang });
    } catch (e) {}
    setDone(true);
  }
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(4,8,15,.72)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: wide ? 'center' : 'flex-end', justifyContent: 'center', padding: wide ? 24 : 0 }} onClick={function (e) {if (e.target === e.currentTarget) {setDone(false);onClose();}}}>
      <div style={{ background: '#fff', borderRadius: wide ? 24 : '22px 22px 0 0', width: wide ? 'min(680px, 94vw)' : '100%', maxHeight: wide ? 'min(85vh, 860px)' : '88%', overflowY: 'auto', animation: 'slideUp .4s cubic-bezier(.16,1,.3,1) both', boxShadow: '0 -24px 80px rgba(13,32,53,.25)' }}>
        <div style={{ textAlign: 'center', padding: '10px 0 0' }}><div style={{ width: 36, height: 3.5, borderRadius: 2, background: 'rgba(13,32,53,.14)', margin: '0 auto 12px' }} /></div>
        <div style={{ padding: '0 20px 10px', borderBottom: '1px solid rgba(13,32,53,.07)', position: 'sticky', top: 0, background: '#fff', zIndex: 1, direction: isAr ? 'rtl' : 'ltr' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
            <div style={{ fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT, fontSize: 22, fontWeight: isAr ? 700 : 600, color: N }}>{t.reqTit}</div>
            <button onClick={function () {setDone(false);onClose();}} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(13,32,53,.35)', fontSize: 24 }}>×</button>
          </div>
          <div style={{ padding: '7px 11px', borderRadius: 9, background: 'rgba(200,150,26,.07)', border: '1px solid rgba(200,150,26,.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15 }}>🏷️</span>
            <span style={{ fontSize: 11, color: N, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}><strong style={{ color: G }}>25% OFF</strong> · {t.reqSub}</span>
          </div>
        </div>
        {done ?
        <div style={{ padding: '44px 20px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#16a34a', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: 'white', animation: 'popIn .4s both' }}>✓</div>
            <div style={{ fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT, fontSize: isAr ? 22 : 26, fontWeight: isAr ? 700 : 600, color: N, marginBottom: 8 }}>{t.doneTit}</div>
            <p style={{ fontSize: 12, color: '#5A6475', lineHeight: 1.65, marginBottom: 16, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{t.doneSub}</p>
            <button onClick={function () {setDone(false);onClose();}} style={{ padding: '10px 24px', borderRadius: 9, border: '1px solid rgba(13,32,53,.14)', background: 'none', color: '#5A6475', fontSize: 12, cursor: 'pointer', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{t.close}</button>
          </div> :

        <div style={{ padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: 10, direction: isAr ? 'rtl' : 'ltr' }}>
            {/* Name + Phone */}
            {[[t.nm, 'name', 'text', t.nmPh], [t.ph, 'phone', 'tel', t.phPh]].map(function (row) {return (
              <div key={row[1]} style={{ border: '1px solid rgba(13,32,53,.12)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8A94A0', marginBottom: 4, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{row[0]}</div>
                <input type={row[2]} placeholder={row[3]} value={form[row[1]]} onChange={function (e) {set(row[1], e.target.value);}} style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: 13, fontWeight: 500, color: N, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', textAlign: isAr ? 'right' : 'left' }} />
              </div>);
          })}
            {/* Comment */}
            <div style={{ border: '1px solid rgba(13,32,53,.12)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8A94A0', marginBottom: 4, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{t.cmt}</div>
              <textarea rows={3} placeholder={t.cmtPh} value={form.comment} onChange={function (e) {set('comment', e.target.value);}} style={{ width: '100%', background: 'none', border: 'none', outline: 'none', resize: 'none', fontSize: 13, fontWeight: 500, color: N, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', textAlign: isAr ? 'right' : 'left' }} />
            </div>
            <button onClick={submit} style={{ padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,' + N + ',#1A3354)', color: GL, fontSize: 11.5, fontWeight: 900, letterSpacing: '.05em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', boxShadow: '0 6px 22px rgba(13,32,53,.38)', marginTop: 2, width: '100%' }}>
              {isAr ? 'أرسل طلبي' : 'Submit My Request'}
            </button>
            <div style={{ textAlign: 'center', fontSize: 9, color: 'rgba(13,32,53,.32)', fontFamily: 'Inter', marginTop: -4 }}>⚡ {isAr ? 'يذهب مباشرة إلى فريق المبيعات' : 'Goes straight to our sales team'}</div>
          </div>
        }
      </div>
    </div>);

}

/* ── UNIT DETAILS ── */
function UnitSheet(props) {
  var data = props.data,purpose = props.purpose,onClose = props.onClose;
  var wide = useWide();
  var c = useApp();var lang = c.lang;var isAr = lang === 'ar';
  if (!data) return null;
  var u = data.u,cpd = data.cpd;
  var f = FEATURED.find(function (x) {return cpd && (cpd.n.indexOf(x.cmp) >= 0 || x.cmp.indexOf(cpd.n) >= 0);});
  var img = f ? f.img : 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=85';
  var isAvail = u.status === 'Available';
  var prEGP = 'EGP ' + u.egpM + 'M';
  var prUSD = '$' + u.usd.toLocaleString() + '/mo';
  var waText = encodeURIComponent('Hi Sierra! Interested in unit ' + u.id + ' — ' + u.beds + 'BR ' + u.type + ' at ' + (cpd ? cpd.n : '') + ' (' + prEGP + ')');
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 620, background: 'rgba(4,8,15,.78)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: wide ? 'center' : 'flex-end', justifyContent: 'center', padding: wide ? 24 : 0 }} onClick={function (e) {if (e.target === e.currentTarget) onClose();}}>
      <div style={{ background: '#fff', borderRadius: wide ? 24 : '22px 22px 0 0', width: wide ? 'min(720px, 94vw)' : '100%', maxHeight: wide ? 'min(88vh, 900px)' : '94%', display: 'flex', flexDirection: 'column', animation: 'slideUp .4s cubic-bezier(.16,1,.3,1) both', boxShadow: '0 -24px 80px rgba(13,32,53,.3)' }}>
        {/* Hero image */}
        <div style={{ position: 'relative', height: 220, flexShrink: 0, borderRadius: '22px 22px 0 0', overflow: 'hidden' }}>
          <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(7,21,36,.8),transparent 55%)' }} />
          <button onClick={onClose} style={{ position: 'absolute', top: 14, left: 14, width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,.5)', border: '1px solid rgba(255,255,255,.2)', cursor: 'pointer', color: '#fff', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(7,21,36,.9)', border: '1px solid rgba(200,150,26,.5)', borderRadius: 20, padding: '4px 11px', fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, fontWeight: 700, color: G }}>▲ AI {u.ai}</div>
          <div style={{ position: 'absolute', bottom: 14, left: 16, right: 16, direction: isAr ? 'rtl' : 'ltr' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: 'rgba(233,193,118,.9)', letterSpacing: '.14em', marginBottom: 3, textTransform: 'uppercase' }}>{u.id}{cpd ? ' · ' + cpd.n : ''}</div>
            <div style={{ fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT, fontSize: 24, fontWeight: isAr ? 700 : 600, color: '#fff', lineHeight: 1.1 }}>{u.beds}B {u.type}</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 28px', direction: isAr ? 'rtl' : 'ltr' }}>
          {/* Price + status */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 700, color: G, lineHeight: 1 }}>{purpose === 'rent' ? prUSD : prEGP}</div>
              <div style={{ fontSize: 10, color: '#8A94A0', fontFamily: 'Inter', marginTop: 4 }}>{purpose === 'rent' ? (isAr ? 'أو للبيع ' : 'or resale ') + prEGP : (isAr ? 'أو للإيجار ' : 'or rent ') + prUSD}</div>
            </div>
            <span className={isAvail ? 'pill-av' : u.status === 'Under Offer' ? 'pill-uo' : 'pill-so'} style={{ fontSize: 9, padding: '4px 11px' }}>{u.status}</span>
          </div>
          {/* Specs grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 7, marginBottom: 16 }}>
            {[[u.beds, isAr ? 'غرف' : 'Beds'], [u.bath, isAr ? 'حمام' : 'Baths'], [u.area + 'm²', isAr ? 'مساحة' : 'Area'], [u.ai, isAr ? 'ذكاء' : 'AI Score']].map(function (p, i) {return (
                <div key={i} style={{ padding: '11px 6px', borderRadius: 11, background: 'rgba(13,32,53,.045)', border: '1px solid rgba(13,32,53,.07)', textAlign: 'center' }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 700, color: N, lineHeight: 1 }}>{p[0]}</div>
                <div style={{ fontSize: 7.5, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8A94A0', marginTop: 4, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{p[1]}</div>
              </div>);
            })}
          </div>
          {/* Compound card */}
          {cpd && <div style={{ padding: '13px 15px', borderRadius: 13, background: 'linear-gradient(160deg,' + N2 + ',#0D2035)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(200,150,26,.14)', border: '1px solid rgba(200,150,26,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: G }}>{cpd.ai}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'Inter', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cpd.n}</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: G, letterSpacing: '.1em', marginTop: 3 }}>{cpd.z} · {cpd.g} {isAr ? 'نمو' : 'GROWTH'}</div>
            </div>
          </div>}
          {/* CTAs */}
          <div style={{ display: 'flex', gap: 10, flexDirection: isAr ? 'row-reverse' : 'row' }}>
            <button onClick={function () {window.open('https://wa.me/201061399688?text=' + waText, '_blank');}} style={{ flex: 1, padding: '13px', borderRadius: 11, background: '#25D366', color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>💬 WhatsApp</button>
            <button onClick={function () {window.open('tel:+201061399688');}} style={{ flex: 1, padding: '13px', borderRadius: 11, background: 'linear-gradient(135deg,' + G + ',' + GL + ')', color: N, fontSize: 11, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>📞 {isAr ? 'اتصل' : 'Call'}</button>
          </div>
        </div>
      </div>
    </div>);

}


Object.assign(window, { SmartFilterSheet, CpdSheet, ListSheet, ROISheet, PriceSheet, MatchSheet, DreamSheet, AIEngineSheet, ChatSheet, SavedSheet, ReqModal, UnitSheet });
