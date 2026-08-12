/* Sierra Estates — Client Portal (mobile-first, responsive) */
const { useState, useEffect, useRef, useMemo, createContext, useContext } = React;

/* ── HERO ── */
function Hero(props) {
  var purpose = props.purpose,setPurpose = props.setPurpose,beds = props.beds,setBeds = props.setBeds,search = props.search,setSearch = props.setSearch,onReq = props.onReq,filterOpen = props.filterOpen,setFilterOpen = props.setFilterOpen;
  var c = useApp();var dark = c.dark,lang = c.lang;
  var t = LANG[lang];var isAr = lang === 'ar';
  var SLIDES = [
  { pre: 'FIRST & ONLY WEBSITE IN EGYPT DESIGNED FOR NEW CAIRO', main: 'The First Exclusive Destination for New Cairo Properties. Rent & Resale.', img: 'https://images.unsplash.com/photo-1613977257592-4a9a32f9141a?w=1200&q=90' },
  { pre: 'BEST-IN-CLASS DESIGN', main: 'Redefining Luxury Living with AI-Driven Excellence', img: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200&q=90' },
  { pre: 'AI-DRIVEN EXCELLENCE', main: 'Smart Matches for Smart Investors', img: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?w=1200&q=90' },
  { pre: 'EXCLUSIVE NETWORK', main: 'Unrivaled Access to Premium Compounds', img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=90' },
  { pre: 'CURATED PORTFOLIO', main: 'Your Journey to Exceptional Homes Begins Here', img: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=1200&q=90' }];

  var imgI = useState(0);var setImgI = imgI[1];imgI = imgI[0];
  useEffect(function () {
    SLIDES.forEach(function (sl) {var im = new Image();im.src = sl.img;});
    var id = setInterval(function () {setImgI(function (i) {return (i + 1) % SLIDES.length;});}, 3200);
    return function () {clearInterval(id);};
  }, []);
  return (
    <section id="s-hero" style={{ position: 'relative', background: '#00131f', minHeight: 380, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '18px 0 0', overflow: 'hidden' }}>
      {SLIDES.map(function (sl, i) {return (
          <div key={i} style={{ position: 'absolute', inset: 0, backgroundImage: 'url(' + sl.img + ')', backgroundSize: 'cover', backgroundPosition: 'center', opacity: i === imgI ? 1 : 0, transition: 'opacity .5s ease', zIndex: 0 }} />);
      })}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(172deg,rgba(0,10,25,.95) 0%,rgba(0,25,55,.72) 50%,rgba(0,0,0,.2) 100%)', zIndex: 0, pointerEvents: 'none' }} />
      <div className="hero-inner" style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0 20px', marginBottom: 14, direction: 'ltr' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
          <span style={{ width: 18, height: 1.5, background: G, display: 'block', flexShrink: 0 }} />
          <span className="hero-eye" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 6.5, color: G, letterSpacing: '.16em', textTransform: 'uppercase', lineHeight: 1.5 }}>{SLIDES[imgI].pre}</span>
        </div>
        <h1 className="hero-h1" style={{ fontFamily: HEADING_FONT, fontSize: 28, fontWeight: 500, lineHeight: 1.1, marginBottom: 14, color: '#fff', textShadow: '0 2px 26px rgba(0,0,0,.88), 0 0 56px rgba(200,150,26,.3)', letterSpacing: '-.01em' }}>
          {SLIDES[imgI].main}
        </h1>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {SLIDES.map(function (sl, i) {return (
                <button key={i} onClick={function () {setImgI(i);}} style={{ height: 3, width: i === imgI ? 24 : 7, borderRadius: 2, background: i === imgI ? G : 'rgba(255,255,255,.3)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all .4s cubic-bezier(.16,1,.3,1)' }} />);
            })}
        </div>
      </div>

      {/* Compact smart-filter trigger bar */}
      <div className="hero-filter" style={{ padding: '0 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 3, background: 'rgba(7,21,36,.65)', backdropFilter: 'blur(14px)', border: '1px solid rgba(200,150,26,.3)', borderRadius: 11, padding: 3, flex: 1 }}>
            {[['resale', isAr ? 'بيع' : 'Resale'], ['rent', isAr ? 'إيجار' : 'Rent']].map(function (p) {return (
                  <button key={p[0]} onClick={function () {setPurpose(p[0]);}} style={{ flex: 1, padding: '9px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', transition: 'all .22s cubic-bezier(.4,0,.2,1)', background: purpose === p[0] ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'transparent', color: purpose === p[0] ? N : 'rgba(255,255,255,.55)' }}>{p[1]}</button>);
              })}
          </div>
          <button onClick={function () {setFilterOpen(true);}} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 16px', borderRadius: 11, background: 'linear-gradient(135deg,' + G + ',' + GL + ')', border: 'none', cursor: 'pointer', boxShadow: '0 4px 18px rgba(200,150,26,.4)', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={N} strokeWidth="2.5"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            <span style={{ fontSize: 11, fontWeight: 900, color: N, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{isAr ? 'فلتر' : 'Filters'}</span>
          </button>
        </div>
      </div>

      {/* View Map bottom link */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 18 }}>
        <button onClick={function () {var el = document.getElementById('s-map');var sc = document.getElementById('root-scroll');if (el && sc) sc.scrollTo({ top: el.offsetTop - 60, behavior: 'smooth' });}} style={{ padding: '9px 28px', borderRadius: 50, background: 'rgba(7,21,36,.72)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(200,150,26,.45)', color: 'rgba(200,150,26,.95)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter', display: 'flex', alignItems: 'center', gap: 7, letterSpacing: '.06em', boxShadow: '0 0 18px rgba(200,150,26,.22)' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
          View Map
        </button>
      </div>
      </div>
    </section>);

}

/* ── LISTINGS ── */ /* ── LISTINGS ── */
function Listings(props) {
  var purpose = props.purpose,search = props.search,beds = props.beds,onTap = props.onTap,saved = props.saved,onSave = props.onSave,comparing = props.comparing,onCompare = props.onCompare,onQuickView = props.onQuickView;
  var c = useApp();var dark = c.dark,lang = c.lang;
  var t = LANG[lang];var isAr = lang === 'ar';
  var C = th(dark);
  var sort = useState('ai');var setSort = sort[1];sort = sort[0];
  var cmpF = useState(new Set());var setCmpF = cmpF[1];cmpF = cmpF[0];
  var cmpOpen = useState(false);var setCmpOpen = cmpOpen[1];cmpOpen = cmpOpen[0];
  var rv = useScrollAnim(60);var ref = rv[0],vis = rv[1];
  var pg = useState(0);var page = pg[0],setPage = pg[1];
  var dxs = useState(0);var dragX = dxs[0],setDragX = dxs[1];
  var swRef = useRef({ on: false, sx: 0, dx: 0 });
  var sq = useState(search || '');var searchQ = sq[0],setSearchQ = sq[1];
  useEffect(function () {setSearchQ(search || '');}, [search]);
  var q = (searchQ || '').trim();
  var items = useMemo(function () {
    var l = FEATURED.slice();
    if (cmpF.size > 0) l = l.filter(function (x) {return cmpF.has(x.cmp);});
    if (q) {var qq = q.toLowerCase();l = l.filter(function (x) {return x.cmp.toLowerCase().indexOf(qq) >= 0 || x.type.toLowerCase().indexOf(qq) >= 0 || (x.beds + 'b').indexOf(qq) >= 0;});}
    if (beds != null && beds > 0) l = l.filter(function (x) {return x.beds === beds;});
    if (sort === 'ai') l.sort(function (a, b) {return b.ai - a.ai;});else
    if (sort === 'px') l.sort(function (a, b) {return a.egpM - b.egpM;});else
    if (sort === 'pd') l.sort(function (a, b) {return b.egpM - a.egpM;});else
    l.sort(function (a, b) {return b.area - a.area;});
    return l;
  }, [purpose, q, beds, sort, cmpF.size]);
  var PER = 4;
  var pages = Math.max(1, Math.ceil(items.length / PER));
  useEffect(function () {setPage(0);}, [q, beds, sort, cmpF.size, purpose]);
  var pageSafe = Math.min(page, pages - 1);
  var shown = items.slice(pageSafe * PER, pageSafe * PER + PER);
  function priceStr(item) {return purpose === 'rent' ? '$' + item.usd.toLocaleString() + '/mo' : 'EGP ' + item.egpM + 'M';}
  function swDown(e) {var p = e.touches ? e.touches[0] : e;swRef.current = { on: true, sx: p.clientX, dx: 0 };}
  function swMove(e) {
    if (!swRef.current.on) return;
    var p = e.touches ? e.touches[0] : e;
    var dx = p.clientX - swRef.current.sx;
    if (pageSafe === 0 && dx > 0 || pageSafe >= pages - 1 && dx < 0) dx *= 0.3;
    swRef.current.dx = dx;setDragX(dx);
  }
  function swUp() {
    if (!swRef.current.on) return;
    var dx = swRef.current.dx;swRef.current.on = false;
    if (dx < -60 && pageSafe < pages - 1) setPage(pageSafe + 1);else
    if (dx > 60 && pageSafe > 0) setPage(pageSafe - 1);
    setDragX(0);
  }
  var Mo = (window.Motion || {}).motion;
  function cardGrid(item, i) {
    var isGold = item.tag === 'Premium' || item.tag === 'Exclusive';
    var isComparing = comparing && comparing.has(item.id);
    var Wrap = Mo ? Mo.div : 'div';
    var motionProps = Mo ? { initial: { opacity: 0, y: 22, scale: .96 }, whileInView: { opacity: 1, y: 0, scale: 1 }, viewport: { once: true, amount: .3 }, transition: { duration: .45, delay: i % 4 * .06, ease: 'easeOut' }, whileHover: { y: -5, boxShadow: '0 14px 34px rgba(13,32,53,.18)' }, whileTap: { scale: .97 } } : {};
    return (
      <Wrap key={item.id} onClick={function () {if (Math.abs(swRef.current.dx) > 8) return;onTap(item);}} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(13,32,53,.08)', cursor: 'pointer', boxShadow: '0 3px 16px rgba(13,32,53,.08)' }} {...motionProps}>
        <div style={{ position: 'relative', height: 150 }}>
          <img src={item.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} draggable="false" loading="lazy" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(13,32,53,.55),transparent 50%)' }} />
          <div style={{ position: 'absolute', top: 9, left: 9, background: 'rgba(7,21,36,.85)', border: '1px solid rgba(200,150,26,.45)', borderRadius: 20, padding: '2px 9px', fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, color: G }}>▲ {item.ai}</div>
          {item.tag && <div style={{ position: 'absolute', top: 9, right: 34, padding: '2px 9px', borderRadius: 20, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', background: isGold ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'rgba(7,21,36,.85)', color: isGold ? N : 'rgba(200,150,26,.9)', border: isGold ? 'none' : '1px solid rgba(200,150,26,.3)' }}>{item.tag}</div>}
          {onCompare && <button onClick={function (e) {e.stopPropagation();onCompare(item.id);}} style={{ position: 'absolute', bottom: 8, left: 8, width: 26, height: 26, borderRadius: 6, background: isComparing ? G : 'rgba(0,0,0,.3)', border: isComparing ? 'none' : '1px solid rgba(255,255,255,.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: isComparing ? N : 'rgba(255,255,255,.7)', fontWeight: 700, transition: 'all .2s' }}>⚖</button>}
          <button onClick={function (e) {e.stopPropagation();onSave(item.id);}} style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,.3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: saved.has(item.id) ? '#ef4444' : 'rgba(255,255,255,.7)' }}>{saved.has(item.id) ? '♥' : '♡'}</button>
        </div>
        <div style={{ padding: '10px 12px 12px', direction: isAr ? 'rtl' : 'ltr' }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.12em', textTransform: 'uppercase', color: N, marginBottom: 2 }}>{item.cmp}</div>
          <div style={{ fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT, fontSize: 14, fontWeight: 600, color: N, lineHeight: 1.2, marginBottom: 3 }}>{item.beds}B {item.type}</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, color: '#8A94A0', marginBottom: 5 }}>{item.bath} BA · {item.area} m²</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: G }}>{priceStr(item)}</div>
            {onQuickView && <button onClick={function (e) {e.stopPropagation();onQuickView(item);}} style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6, background: 'rgba(200,150,26,.12)', border: '1px solid rgba(200,150,26,.3)', color: G, cursor: 'pointer', fontFamily: 'Inter' }}>Quick View</button>}
          </div>
        </div>
      </Wrap>);

  }
  var cmpLabel = cmpF.size === 0 ? t.allCpd : cmpF.size === 1 ? cmpF.size + t.nSel : cmpF.size + t[' nSelP'];
  return (
    <section id="s-listings" style={{ background: C.bg, paddingBottom: 4, transition: 'background .3s', position: 'relative', overflow: 'hidden' }}>
      <MorphBlob size={480} opacity={dark ? .14 : .08} style={{ top: -140, right: -160 }} />
      <div ref={ref} className="sec-inner" style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(20px)', transition: 'all .55s .1s cubic-bezier(.16,1,.3,1)', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 0', flexDirection: isAr ? 'row-reverse' : 'row' }}>
          <SH eye={t.eyeList} title={t.propTit + ' (' + items.length + ')'} />
          <select value={sort} onChange={function (e) {setSort(e.target.value);}} style={{ marginTop: 12, padding: '6px 10px', borderRadius: 8, background: dark ? '#1A2C3F' : '#fff', border: '1px solid ' + (dark ? 'rgba(200,150,26,.3)' : 'rgba(13,32,53,.15)'), fontSize: 10, fontWeight: 600, color: dark ? G : N, outline: 'none', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', flexShrink: 0, cursor: 'pointer' }}>
            <option value="ai">AI ↓</option><option value="px">Price ↑</option><option value="pd">Price ↓</option><option value="area">Area</option>
          </select>
        </div>
        {/* Big search filter */}
        <div style={{ padding: '10px 20px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 14, border: '1px solid ' + (q ? G : dark ? 'rgba(200,150,26,.25)' : 'rgba(13,32,53,.12)'), background: dark ? '#122436' : '#fff', boxShadow: '0 3px 16px rgba(13,32,53,.06)', flexDirection: isAr ? 'row-reverse' : 'row' }}>
            <span style={{ fontSize: 17, color: q ? G : '#8A94A0' }}>⌕</span>
            <input value={searchQ} onChange={function (e) {setSearchQ(e.target.value);}} placeholder={isAr ? 'ابحث عن كومباوند، نوع الوحدة...' : 'Search compound, type, beds…'} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, fontWeight: 500, color: dark ? '#EAF0F6' : N, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', textAlign: isAr ? 'right' : 'left', minWidth: 0 }} />
            {searchQ && <button onClick={function () {setSearchQ('');}} style={{ fontSize: 16, color: '#8A94A0', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>}
          </div>
          {q &&
          <div style={{ marginTop: 8, fontSize: 11, color: C.txM, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', textAlign: isAr ? 'right' : 'left' }}>
              {isAr ? 'نتائج لـ ' : 'Results for '}<span style={{ color: G, fontWeight: 700 }}>“{q}”</span> — {items.length} {isAr ? 'وحدة' : items.length === 1 ? 'unit' : 'units'}
            </div>}
        </div>
        {/* Compound dropdown */}
        <div style={{ padding: '0 20px 10px', position: 'relative' }}>
          <button onClick={function (e) {e.stopPropagation();setCmpOpen(function (o) {return !o;});}} style={{ width: '100%', padding: '8px 12px', borderRadius: 9, border: '1px solid ' + (cmpF.size > 0 ? G : 'rgba(13,32,53,.12)'), background: cmpF.size > 0 ? 'rgba(200,150,26,.07)' : 'rgba(13,32,53,.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'Inter', transition: 'all .2s' }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: cmpF.size > 0 ? G : '#8A94A0' }}>{cmpLabel}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {cmpF.size > 0 && <button onClick={function (e) {e.stopPropagation();setCmpF(new Set());}} style={{ fontSize: 13, color: '#8A94A0', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>}
              <span style={{ fontSize: 10, color: '#8A94A0' }}>▾</span>
            </div>
          </button>
          {cmpOpen &&
          <div style={{ position: 'absolute', top: 'calc(100% - 2px)', left: 20, right: 20, zIndex: 20, background: '#fff', border: '1px solid rgba(13,32,53,.12)', borderRadius: 11, boxShadow: '0 8px 32px rgba(13,32,53,.14)', padding: '8px', maxHeight: 180, overflowY: 'auto' }} onClick={function (e) {e.stopPropagation();}}>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {CPDS.map(function (cpd, i) {var on = cmpF.has(cpd.n);return (
                  <button key={i} onClick={function () {setCmpF(function (p) {var s = new Set(p);if (s.has(cpd.n)) s.delete(cpd.n);else s.add(cpd.n);return s;});}} style={{ padding: '3px 9px', borderRadius: 20, fontSize: 9, fontWeight: 600, cursor: 'pointer', border: '1px solid', fontFamily: 'Inter', transition: 'all .15s', whiteSpace: 'nowrap', borderColor: on ? G : 'rgba(13,32,53,.12)', background: on ? N : 'transparent', color: on ? G : '#8A94A0' }}>
                    {on ? '✓ ' : ''}{cpd.n}
                  </button>);
              })}
              </div>
            </div>
          }
        </div>
        {items.length > 0 ?
        <div style={{ overflow: 'hidden', padding: '4px 0 0', touchAction: 'pan-y' }}
        onMouseDown={swDown} onMouseMove={swMove} onMouseUp={swUp} onMouseLeave={swUp}
        onTouchStart={swDown} onTouchMove={swMove} onTouchEnd={swUp}>
            <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 20px', transform: 'translateX(' + dragX + 'px)', transition: swRef.current.on ? 'none' : 'transform .35s cubic-bezier(.16,1,.3,1)', cursor: pages > 1 ? 'grab' : 'default' }}>
              {shown.map(function (item, i) {return cardGrid(item, i);})}
            </div>
          </div> :
        <div style={{ padding: '30px', color: '#8A94A0', fontSize: 12, textAlign: 'center', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{isAr ? 'لا توجد نتائج.' : 'No matches.'}</div>}
        {pages > 1 &&
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '14px 20px 0' }}>
            <button onClick={function () {setPage(Math.max(0, pageSafe - 1));}} disabled={pageSafe === 0} style={{ padding: '8px 20px', borderRadius: 20, border: '1px solid rgba(13,32,53,.15)', background: 'transparent', color: pageSafe === 0 ? '#B7C0CB' : N, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: pageSafe === 0 ? 'default' : 'pointer', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', opacity: pageSafe === 0 ? .5 : 1 }}>{isAr ? 'السابق' : 'Prev'}</button>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: C.txM }}>{pageSafe + 1} / {pages}</span>
            <button onClick={function () {setPage(Math.min(pages - 1, pageSafe + 1));}} disabled={pageSafe >= pages - 1} style={{ padding: '8px 20px', borderRadius: 20, border: 'none', background: pageSafe >= pages - 1 ? 'rgba(13,32,53,.3)' : N, color: G, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: pageSafe >= pages - 1 ? 'default' : 'pointer', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', opacity: pageSafe >= pages - 1 ? .5 : 1 }}>{isAr ? 'التالي' : 'Next'}</button>
          </div>}

        <div style={{ padding: '14px 20px 22px' }}>
          <button style={{ width: '100%', padding: '12px', borderRadius: 10, background: N, color: 'rgba(200,150,26,.9)', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>
            {t.viewAll} Units →
          </button>
        </div>
      </div>
    </section>);

}

/* ── MAP ── */
function MapSec(props) {
  var onCpdTap = props.onCpdTap,onFilters = props.onFilters,purpose = props.purpose;
  var c = useApp();var dark = c.dark,lang = c.lang;
  var t = LANG[lang];var isAr = lang === 'ar';
  var C = th(dark);
  var mapRef = useRef(null);var leafRef = useRef(null);var markersRef = useRef([]);var landmarkRef = useRef([]);
  var rv = useScrollAnim(50);var ref = rv[0],vis = rv[1];
  var DEFAULT_SEL = ['Hyde Park New Cairo', 'Mountain View iCity', 'Mivida'];
  var selS = useState(DEFAULT_SEL);var setSel = selS[1];var sel = selS[0];
  var HAS_UNITS = CPDS.filter(function (x) {return (UNITS[x.n] || []).length > 0;});
  var LANDMARKS = [
  { n: isAr ? 'الجامعة الأمريكية' : 'AUC — American Univ.', c: [30.0189, 31.4991], ic: '🎓' },
  { n: isAr ? 'كايرو فيستيفال سيتي' : 'Cairo Festival City', c: [30.0287, 31.4061], ic: '🛍️' },
  { n: isAr ? 'مطار القاهرة' : 'Cairo Intl. Airport', c: [30.1219, 31.4056], ic: '✈️' },
  { n: isAr ? 'وسط البلد' : 'Downtown Cairo', c: [30.0444, 31.2357], ic: '🏛️' }];


  function priceStr(cpd) {return purpose === 'rent' ? '$' + cpd.rent.toLocaleString() + '/mo' : 'EGP ' + cpd.priceM + 'M';}

  /* Init map once */
  useEffect(function () {
    if (!mapRef.current || leafRef.current) return;
    var LL = window.L;if (!LL || typeof LL.map !== 'function') return;
    var map = LL.map(mapRef.current, { center: [30.03, 31.58], zoom: 11, zoomControl: false, attributionControl: false, scrollWheelZoom: false });
    LL.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    LL.control.zoom({ position: 'bottomright' }).addTo(map);
    leafRef.current = map;
    /* Landmark POIs — one-time */
    LANDMARKS.forEach(function (lm) {
      var lmHtml = '<div class="s-landmark"><span>' + lm.ic + '</span></div>';
      var icon = LL.divIcon({ className: '', html: lmHtml, iconSize: [30, 30], iconAnchor: [15, 15] });
      var mk = LL.marker(lm.c, { icon: icon, zIndexOffset: -100 }).addTo(map);
      mk.bindTooltip(lm.n, { permanent: false, direction: 'top', className: 's-landmark-tip' });
      landmarkRef.current.push(mk);
    });
    setTimeout(function () {try {map.invalidateSize();} catch (e) {}}, 200);
    return function () {try {map.remove();} catch (e) {}leafRef.current = null;};
  }, []);

  /* Sync markers with selection */
  useEffect(function () {
    var map = leafRef.current;var LL = window.L;if (!map || !LL) return;
    markersRef.current.forEach(function (m) {try {map.removeLayer(m);} catch (e) {}});
    markersRef.current = [];
    var pts = [];
    sel.forEach(function (name) {
      var cpd = CPDS.find(function (x) {return x.n === name;});if (!cpd) return;
      var cnt = (UNITS[cpd.n] || []).length;
      var pr = priceStr(cpd);
      var mHtml = '<div class="s-marker"><div class="s-pin"><span class="s-pin-L">' + cnt + '</span></div><button class="s-count">' + cnt + ' UNITS · ' + pr + '</button></div>';
      var icon = LL.divIcon({ className: '', html: mHtml, iconSize: [130, 66], iconAnchor: [65, 60] });
      var mk = LL.marker(cpd.c, { icon: icon }).addTo(map);
      mk.on('click', function () {onCpdTap(cpd);});
      markersRef.current.push(mk);
      pts.push(cpd.c);
    });
    if (pts.length > 0) {try {map.fitBounds(pts, { padding: [50, 50], maxZoom: 13 });} catch (e) {}}
  }, [sel.join('|'), purpose]);

  function toggle(name) {
    setSel(function (s) {return s.indexOf(name) >= 0 ? s.filter(function (x) {return x !== name;}) : s.concat([name]);});
  }

  return (
    <section id="s-map" style={{ background: C.bg, transition: 'background .3s', paddingBottom: 24 }}>
      <div ref={ref} className="sec-inner" style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(20px)', transition: 'all .55s cubic-bezier(.16,1,.3,1)' }}>
        {/* Header */}
        <div style={{ padding: '22px 20px 12px', direction: isAr ? 'rtl' : 'ltr' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexDirection: isAr ? 'row-reverse' : 'row' }}>
            <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid ' + G, animation: 'radarPing 2s ease-out infinite' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: G, position: 'absolute', top: 2, left: 2, boxShadow: '0 0 6px ' + G, animation: 'blink 2s ease infinite' }} />
            </div>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, letterSpacing: '.22em', color: G, textTransform: 'uppercase' }}>{t.eyeMap}</span>
          </div>
          <h2 style={{ fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT, fontSize: isAr ? 22 : 26, fontWeight: isAr ? 700 : 400, color: dark ? '#F0EDE5' : N, lineHeight: 1.1, marginBottom: 4 }}>{isAr ? 'خريطة الكمبوندات' : 'Compound Map'}</h2>
          <div style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,.35)' : 'rgba(13,32,53,.4)', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{isAr ? 'اضغط على أي علامة لعرض الوحدات المتاحة' : 'Tap any marker to browse its units'}</div>
        </div>

        {/* Shared Smart Filter trigger */}
        <div style={{ padding: '0 20px 10px' }}>
          <button onClick={onFilters} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 11, background: 'linear-gradient(135deg,' + G + ',' + GL + ')', border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(200,150,26,.3)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={N} strokeWidth="2.5"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            <span style={{ fontSize: 11.5, fontWeight: 900, color: N, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{isAr ? 'الفلتر الذكي · ' + (purpose === 'rent' ? 'إيجار' : 'بيع') : 'Smart Filter · ' + (purpose === 'rent' ? 'Rent' : 'Resale')}</span>
          </button>
        </div>

        {/* Compound chips */}
        <div style={{ overflowX: 'auto', paddingBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6, padding: '0 20px', width: 'max-content' }}>
            {HAS_UNITS.map(function (cpd) {
              var on = sel.indexOf(cpd.n) >= 0;
              var cnt = (UNITS[cpd.n] || []).length;
              return (
                <button key={cpd.n} onClick={function () {toggle(cpd.n);}} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: '1px solid', fontFamily: 'Inter', transition: 'all .18s', whiteSpace: 'nowrap', flexShrink: 0, borderColor: on ? G : dark ? 'rgba(255,255,255,.14)' : 'rgba(13,32,53,.14)', background: on ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : dark ? 'rgba(255,255,255,.04)' : '#fff', color: on ? N : dark ? 'rgba(255,255,255,.55)' : '#5A6472' }}>
                  {cpd.n}
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 800, padding: '1px 6px', borderRadius: 10, background: on ? 'rgba(13,32,53,.18)' : 'rgba(200,150,26,.14)', color: on ? N : G }}>{cnt}</span>
                </button>);

            })}
          </div>
        </div>

        {/* Always-visible map */}
        <div style={{ margin: '0 16px', borderRadius: 18, overflow: 'hidden', border: '1.5px solid ' + (dark ? 'rgba(200,150,26,.28)' : 'rgba(13,32,53,.12)'), boxShadow: '0 10px 36px rgba(13,32,53,.22)', position: 'relative' }}>
          <div ref={mapRef} style={{ height: 340, width: '100%' }} />
          <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 400, background: 'rgba(7,21,36,.88)', backdropFilter: 'blur(8px)', border: '1px solid rgba(200,150,26,.35)', borderRadius: 10, padding: '6px 11px', display: 'flex', alignItems: 'center', gap: 7, pointerEvents: 'none' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'block', animation: 'blink 2s ease infinite' }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.12em', color: G, textTransform: 'uppercase' }}>{sel.length} {isAr ? 'كمبوند' : 'COMPOUNDS'} · {isAr ? 'مباشر' : 'LIVE'}</span>
          </div>
        </div>
        <div style={{ padding: '10px 20px 0', textAlign: 'center', fontSize: 9.5, color: dark ? 'rgba(255,255,255,.3)' : 'rgba(13,32,53,.35)', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>
          {isAr ? '👆 اضغط على العلامة الذهبية لفتح قائمة الوحدات' : '👆 Tap a gold marker to open the unit list'}
        </div>
      </div>
    </section>);

}

/* ── VIRTUAL TOUR ── */
function TourSec() {
  var c = useApp();var dark = c.dark,lang = c.lang;
  var t = LANG[lang];var isAr = lang === 'ar';
  var C = th(dark);
  var openS = useState(false);var setOpen = openS[1];var open = openS[0];
  var rv = useScrollAnim(60);var ref = rv[0],vis = rv[1];
  return (
    <section id="s-tour" style={{ background: dark ? '#050E18' : '#F4F6F8', transition: 'background .3s', paddingBottom: 4 }}>
      <div ref={ref} className="sec-inner" style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(20px)', transition: 'all .55s cubic-bezier(.16,1,.3,1)' }}>
        <SH eye={t.eyeTour} title={t.tourTit} />
        {/* Room thumbnails */}
        <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
          <div style={{ display: 'flex', gap: 9, padding: '0 20px', width: 'max-content' }}>
            {ROOMS.map(function (rm, i) {return (
                <button key={i} onClick={function () {setOpen(true);}} style={{ position: 'relative', width: 148, height: 104, borderRadius: 14, overflow: 'hidden', border: '2px solid transparent', cursor: 'pointer', flexShrink: 0, padding: 0 }}>
                <img src={rm.img} alt={rm.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(7,17,30,.88) 0%,transparent 55%)' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 10px', textAlign: 'left' }}>
                  <div style={{ fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT, fontSize: 11, fontWeight: isAr ? 600 : 400, color: '#fff', lineHeight: 1.2 }}>{rm.name}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 6.5, color: G, letterSpacing: '.1em', marginTop: 2, opacity: .8 }}>TAP TO EXPLORE</div>
                </div>
                <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(200,150,26,.88)', borderRadius: 20, padding: '2px 7px', fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, fontWeight: 700, color: N }}>360°</div>
              </button>);
            })}
          </div>
        </div>
        {/* Launch button */}
        <div style={{ padding: '10px 20px 22px' }}>
          <button onClick={function () {setOpen(true);}} style={{ width: '100%', padding: '14px 18px', borderRadius: 14, background: 'linear-gradient(135deg,' + N + ',#1A3354)', border: '1px solid rgba(200,150,26,.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'inherit' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C8961A" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" /></svg>
            <div style={{ textAlign: isAr ? 'right' : 'left', flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '.03em' }}>{isAr ? 'ابدأ الجولة الثلاثية الأبعاد' : 'Launch 3D Virtual Tour'}</div>
              <div style={{ fontSize: 9, color: G, fontFamily: 'Inter', marginTop: 2, opacity: .75 }}>{isAr ? 'Three.js · 360° · 6 गرف' : 'Three.js · 360° drag · 6 rooms'}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C8961A" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          </button>
        </div>
      </div>
      {/* Fullscreen iframe overlay */}
      {open &&
      <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#07111E' }}>
          <iframe src="virtual-tour.html" style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} title="Sierra Estates Virtual Tour" allow="fullscreen"></iframe>
          <button onClick={function () {setOpen(false);}} style={{ position: 'absolute', top: 14, right: 14, width: 38, height: 38, borderRadius: '50%', background: 'rgba(7,17,30,.92)', border: '1px solid rgba(200,150,26,.45)', color: G, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, lineHeight: 1 }}>×</button>
        </div>
      }
    </section>);

}

/* ── AI HUB ── */
function AIHub(props) {
  var onTool = props.onTool;var onMap = props.onMap;var onContact = props.onContact;
  var c = useApp();var dark = c.dark,lang = c.lang;
  var t = LANG[lang];var isAr = lang === 'ar';
  var C = th(dark);
  var rv = useScrollAnim(60);var ref = rv[0],vis = rv[1];

  var IC = {
    engine: '<svg viewBox="0 0 48 48" width="44" height="44" fill="none"><circle cx="24" cy="24" r="20" stroke="#C8961A" stroke-width="1" stroke-dasharray="4 3" opacity=".4"><animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="8s" repeatCount="indefinite"/></circle><circle cx="24" cy="24" r="13" stroke="#E9C176" stroke-width="1" stroke-dasharray="3 4" opacity=".3"><animateTransform attributeName="transform" type="rotate" from="360 24 24" to="0 24 24" dur="5s" repeatCount="indefinite"/></circle><circle cx="24" cy="11" r="2.5" fill="#C8961A"><animate attributeName="opacity" values="1;.3;1" dur="2s" begin="0s" repeatCount="indefinite"/></circle><circle cx="35" cy="30" r="2.5" fill="#C8961A"><animate attributeName="opacity" values=".3;1;.3" dur="2s" begin=".7s" repeatCount="indefinite"/></circle><circle cx="13" cy="30" r="2.5" fill="#C8961A"><animate attributeName="opacity" values=".6;1;.3" dur="2s" begin="1.4s" repeatCount="indefinite"/></circle><line x1="24" y1="14" x2="24" y2="20" stroke="#C8961A" stroke-width="1" opacity=".5"/><line x1="33" y1="28" x2="28" y2="26" stroke="#C8961A" stroke-width="1" opacity=".5"/><line x1="15" y1="28" x2="20" y2="26" stroke="#C8961A" stroke-width="1" opacity=".5"/><circle cx="24" cy="24" r="4" fill="#E9C176"><animate attributeName="r" values="3.5;5;3.5" dur="2s" repeatCount="indefinite"/></circle></svg>',
    match: '<svg viewBox="0 0 48 48" width="44" height="44" fill="none"><circle cx="24" cy="24" r="18" stroke="#4ade80" stroke-width="1.5"><animate attributeName="r" values="10;20;10" dur="2.5s" repeatCount="indefinite"/><animate attributeName="opacity" values=".5;0;.5" dur="2.5s" repeatCount="indefinite"/></circle><circle cx="24" cy="24" r="11" stroke="#4ade80" stroke-width="1.5"><animate attributeName="r" values="6;13;6" dur="2.5s" begin=".6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".7;.15;.7" dur="2.5s" begin=".6s" repeatCount="indefinite"/></circle><line x1="24" y1="6" x2="24" y2="16" stroke="#4ade80" stroke-width="2" stroke-linecap="round"/><line x1="24" y1="32" x2="24" y2="42" stroke="#4ade80" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="24" x2="16" y2="24" stroke="#4ade80" stroke-width="2" stroke-linecap="round"/><line x1="32" y1="24" x2="42" y2="24" stroke="#4ade80" stroke-width="2" stroke-linecap="round"/><circle cx="24" cy="24" r="5" fill="#4ade80"/><path d="M21.5 24 L23.5 26.5 L27.5 21" stroke="#071524" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    roi: '<svg viewBox="0 0 48 48" width="44" height="44" fill="none"><rect x="7" y="30" width="7" height="10" rx="2" fill="#f59e0b" opacity=".5"><animate attributeName="height" values="3;10;3" dur="2.2s" begin="0s" repeatCount="indefinite"/><animate attributeName="y" values="37;30;37" dur="2.2s" begin="0s" repeatCount="indefinite"/></rect><rect x="17" y="22" width="7" height="18" rx="2" fill="#f59e0b" opacity=".75"><animate attributeName="height" values="7;18;7" dur="2.2s" begin=".35s" repeatCount="indefinite"/><animate attributeName="y" values="33;22;33" dur="2.2s" begin=".35s" repeatCount="indefinite"/></rect><rect x="27" y="13" width="7" height="27" rx="2" fill="#f59e0b"><animate attributeName="height" values="12;27;12" dur="2.2s" begin=".7s" repeatCount="indefinite"/><animate attributeName="y" values="28;13;28" dur="2.2s" begin=".7s" repeatCount="indefinite"/></rect><circle cx="38" cy="11" r="3.5" fill="#f59e0b"><animate attributeName="cy" values="13;9;13" dur="1.5s" repeatCount="indefinite"/></circle><polyline points="10.5,32 20.5,24 30.5,15" stroke="#f59e0b" stroke-width="1.5" fill="none" opacity=".55"/><line x1="5" y1="40" x2="43" y2="40" stroke="rgba(245,158,11,.25)" stroke-width="1"/></svg>',
    price: '<svg viewBox="0 0 48 48" width="44" height="44" fill="none"><path d="M8 8 L32 8 L40 24 L32 40 L8 40 Z" stroke="#a78bfa" stroke-width="1.5" fill="rgba(167,139,250,.08)"/><circle cx="15" cy="18" r="3" stroke="#a78bfa" stroke-width="1.5"/><text x="26" y="30" text-anchor="middle" font-weight="700" font-size="15" fill="#a78bfa" font-family="monospace">$<animate attributeName="opacity" values="1;.25;1" dur="1.8s" repeatCount="indefinite"/></text><line x1="8" y1="24" x2="40" y2="24" stroke="#a78bfa" stroke-width="1" stroke-dasharray="3 2" opacity=".35"><animate attributeName="y1" values="14;34;14" dur="2.8s" repeatCount="indefinite"/><animate attributeName="y2" values="14;34;14" dur="2.8s" repeatCount="indefinite"/></line></svg>',
    dream: '<svg viewBox="0 0 48 48" width="44" height="44" fill="none"><path d="M24 10 L36 22 L33 22 L33 36 L15 36 L15 22 L12 22 Z" fill="#f472b6" opacity=".9"/><rect x="20" y="27" width="8" height="9" fill="#07121E" rx="1"/><rect x="15.5" y="23" width="6" height="5" rx="1" fill="rgba(244,114,182,.35)"/><g><animateTransform attributeName="transform" type="rotate" from="0 24 23" to="360 24 23" dur="3s" repeatCount="indefinite"/><circle cx="40" cy="23" r="2.2" fill="#f472b6"><animate attributeName="opacity" values="1;.3;1" dur="1.5s" repeatCount="indefinite"/></circle></g><g><animateTransform attributeName="transform" type="rotate" from="120 24 23" to="480 24 23" dur="5s" repeatCount="indefinite"/><circle cx="40" cy="23" r="1.6" fill="#E9C176"><animate attributeName="opacity" values=".4;1;.4" dur="2s" repeatCount="indefinite"/></circle></g><g><animateTransform attributeName="transform" type="rotate" from="240 24 23" to="600 24 23" dur="7s" repeatCount="indefinite"/><circle cx="40" cy="23" r="1.1" fill="#fff"><animate attributeName="opacity" values=".5;.1;.5" dur="2.5s" repeatCount="indefinite"/></circle></g></svg>',
    imap: '<svg viewBox="0 0 48 48" width="44" height="44" fill="none"><rect x="6" y="8" width="36" height="32" rx="3" stroke="#C8961A" stroke-width="1.3" fill="rgba(200,150,26,.07)"/><line x1="6" y1="18" x2="42" y2="18" stroke="#C8961A" stroke-width=".8" opacity=".3"/><line x1="6" y1="28" x2="42" y2="28" stroke="#C8961A" stroke-width=".8" opacity=".3"/><line x1="18" y1="8" x2="18" y2="40" stroke="#C8961A" stroke-width=".8" opacity=".3"/><line x1="30" y1="8" x2="30" y2="40" stroke="#C8961A" stroke-width=".8" opacity=".3"/><circle cx="24" cy="23" r="5" fill="rgba(200,150,26,.2)" stroke="#C8961A" stroke-width="1.5"><animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite"/></circle><circle cx="24" cy="23" r="2.5" fill="#C8961A"/><circle cx="14" cy="14" r="2" fill="#E9C176" opacity=".7"><animate attributeName="opacity" values=".4;1;.4" dur="2.5s" begin=".3s" repeatCount="indefinite"/></circle><circle cx="34" cy="32" r="2" fill="#E9C176" opacity=".7"><animate attributeName="opacity" values="1;.4;1" dur="2.5s" begin="1.1s" repeatCount="indefinite"/></circle><circle cx="36" cy="14" r="2" fill="#E9C176" opacity=".7"><animate attributeName="opacity" values=".5;1;.5" dur="2.5s" begin=".7s" repeatCount="indefinite"/></circle></svg>',
    tour: '<svg viewBox="0 0 48 48" width="44" height="44" fill="none"><circle cx="24" cy="24" r="18" stroke="#38bdf8" stroke-width="1.3" fill="rgba(56,189,248,.07)"/><circle cx="24" cy="24" r="18" stroke="#38bdf8" stroke-width="1.3" fill="none" stroke-dasharray="56 57" opacity=".3"><animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="8s" repeatCount="indefinite"/></circle><ellipse cx="24" cy="24" rx="18" ry="7" stroke="#38bdf8" stroke-width="1" fill="none" opacity=".4"/><line x1="24" y1="6" x2="24" y2="42" stroke="#38bdf8" stroke-width="1" opacity=".4"/><circle cx="24" cy="24" r="4" fill="#38bdf8"><animate attributeName="r" values="3;5;3" dur="1.8s" repeatCount="indefinite"/></circle><path d="M20 21 L28 24 L20 27 Z" fill="#fff" opacity=".9"/></svg>',
    chat: '<svg viewBox="0 0 48 48" width="44" height="44" fill="none"><path d="M7 9 Q7 5 11 5 L37 5 Q41 5 41 9 L41 29 Q41 33 37 33 L28 33 L22 41 L22 33 L11 33 Q7 33 7 29 Z" fill="rgba(200,150,26,.12)" stroke="#C8961A" stroke-width="1.3"/><rect x="13" y="22" width="3" height="7" rx="1.5" fill="#C8961A"><animate attributeName="height" values="3;13;3" dur="1.1s" begin="0s" repeatCount="indefinite"/><animate attributeName="y" values="26;16;26" dur="1.1s" begin="0s" repeatCount="indefinite"/></rect><rect x="19.5" y="18" width="3" height="11" rx="1.5" fill="#C8961A"><animate attributeName="height" values="5;19;5" dur="1.1s" begin=".22s" repeatCount="indefinite"/><animate attributeName="y" values="24;10;24" dur="1.1s" begin=".22s" repeatCount="indefinite"/></rect><rect x="26" y="20" width="3" height="9" rx="1.5" fill="#C8961A"><animate attributeName="height" values="4;15;4" dur="1.1s" begin=".44s" repeatCount="indefinite"/><animate attributeName="y" values="25;14;25" dur="1.1s" begin=".44s" repeatCount="indefinite"/></rect><rect x="32.5" y="22" width="3" height="7" rx="1.5" fill="#C8961A"><animate attributeName="height" values="3;11;3" dur="1.1s" begin=".66s" repeatCount="indefinite"/><animate attributeName="y" values="26;18;26" dur="1.1s" begin=".66s" repeatCount="indefinite"/></rect></svg>'
  };

  var tools = [
  { k: 'engine', label: isAr ? 'محرك الذكاء 3.0' : 'AI Engine 3.0', sub: isAr ? 'نموذج AVM لتحليل الأسعار والعائد في الوقت الفعلي' : 'Real-time AVM pricing, ROI signals & Q2 2026 market data', live: true, accent: '#C8961A' },
  { k: 'match', label: isAr ? 'التوافق الذكي' : 'Smart Match', sub: isAr ? 'مطابقة دقيقة بالذكاء الاصطناعي' : 'AI pairs your criteria to the perfect listing', accent: '#4ade80' },
  { k: 'roi', label: isAr ? 'تحليل العائد' : 'ROI Analysis', sub: isAr ? 'قوائم العائد وحاسبة الاستثمار' : 'Yield leaderboard, cap rate & cashflow', accent: '#f59e0b' },
  { k: 'price', label: isAr ? 'تسعير دقيق' : 'Precise Pricing', sub: isAr ? 'نطاق السعر العادل بالسوق' : 'AVM-calibrated fair-market price range', accent: '#a78bfa' },
  { k: 'dream', label: isAr ? 'منزل الأحلام' : 'Dream Home Finder', sub: isAr ? 'أجب على 4 أسئلة واكتشف مركبك' : '4 questions → your compound match', accent: '#f472b6' },
  { k: 'imap', label: isAr ? 'خريطة الذكاء' : 'Intelligence Map', sub: isAr ? 'خريطة تفاعلية لكل الكمبوندات والوحدات في القاهرة الجديدة' : 'Live compound map — tap any pin to explore units & prices', accent: '#C8961A' },
  { k: 'tour', label: isAr ? 'جولة افتراضية' : 'Virtual Tour', sub: isAr ? 'جولة 360° في أفضل الشقق والفيلات' : '360° immersive walkthrough of top units', accent: '#38bdf8' }];


  return (
    <section id="s-ai" style={{ background: '#07121E', paddingBottom: 32, transition: 'background .3s', position: 'relative', overflow: 'hidden' }}>
      <MorphBlob size={520} opacity={.12} color1="#C8961A" color2="#8B4A1E" style={{ top: -160, left: '50%', marginLeft: -260 }} />
      <div ref={ref} className="sec-inner" style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(20px)', transition: 'all .55s cubic-bezier(.16,1,.3,1)', position: 'relative' }}>
        <div style={{ padding: '28px 20px 0' }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: '#C8961A', marginBottom: 6, opacity: .7 }}>{isAr ? '7 أدوات · مباشر' : 'AI · 7 TOOLS ONLINE'}</div>
          <div style={{ fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT, fontSize: isAr ? 26 : 30, fontWeight: isAr ? 700 : 400, color: '#fff', lineHeight: 1.1, marginBottom: 6 }}>{isAr ? 'أول نظام ذكاء عقاري في الشرق الأوسط' : 'First AI Real Estate Ecosystem in the Middle East'}</div>
          <div style={{ fontFamily: 'Inter', fontSize: 11, color: 'rgba(255,255,255,.38)', lineHeight: 1.55 }}>{isAr ? 'أدوات ذكاء اصطناعي حية لكل خطوة في رحلتك العقارية' : 'Live AI tools for every step of your property journey'}</div>
        </div>
        <div style={{ margin: '18px 20px 18px', height: 1, background: 'linear-gradient(90deg,transparent,#C8961A,transparent)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -3, left: 0, right: 0, height: 7, background: 'linear-gradient(90deg,transparent,rgba(200,150,26,.22),transparent)', animation: 'scanLine 3s linear infinite' }} />
        </div>
        {/* Moving stats ticker */}
        <div style={{ overflow: 'hidden', borderTop: '1px solid rgba(200,150,26,.1)', borderBottom: '1px solid rgba(200,150,26,.1)', padding: '9px 0', marginBottom: 16 }}>
          <div style={{ display: 'flex', animation: 'ticker 14s linear infinite', whiteSpace: 'nowrap', width: 'max-content' }}>
            {[0, 1].map(function (rep) {return (
                <div key={rep} style={{ display: 'flex' }}>
                {[['98%', 'Match Rate'], ['1.8s', 'Avg Response'], ['<24h', 'Viewing'], ['1,200+', 'Units'], ['25', 'Compounds'], ['6', 'AI Tools']].map(function (p, i) {return (
                      <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 18px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: '#C8961A' }}>{p[0]}</span>
                    <span style={{ fontSize: 7.5, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,.28)', fontFamily: 'Inter' }}>{p[1]}</span>
                    <span style={{ color: 'rgba(200,150,26,.25)', fontSize: 12, marginLeft: 6 }}>·</span>
                  </div>);
                  })}
              </div>);
            })}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 20px' }}>
          {tools.map(function (tool, i) {
            var Mo = (window.Motion || {}).motion;
            var Wrap = Mo ? Mo.button : 'button';
            var motionProps = Mo ? { initial: { opacity: 0, y: 18, scale: .95 }, whileInView: { opacity: 1, y: 0, scale: 1 }, viewport: { once: true, amount: .35 }, transition: { duration: .4, delay: i % 6 * .06, ease: 'easeOut' }, whileHover: { y: -4, scale: 1.015, borderColor: 'rgba(200,150,26,.35)' }, whileTap: { scale: .97 } } : { style: { animation: 'popIn .5s ' + (.06 + i * .07) + 's both' } };
            return (
              <Wrap key={tool.k} onClick={function () {onTool(tool.k);}} className="ai-card"
              style={{ gridColumn: tool.span ? '1 / -1' : undefined, padding: '18px 15px', borderRadius: 16, background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.07)', cursor: 'pointer', textAlign: isAr ? 'right' : 'left', fontFamily: 'inherit', position: 'relative', overflow: 'hidden', direction: isAr ? 'rtl' : 'ltr', display: tool.span ? 'flex' : 'block', alignItems: tool.span ? 'center' : undefined, gap: tool.span ? 16 : undefined }} {...motionProps}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 110%,rgba(200,150,26,.06),transparent 70%)', pointerEvents: 'none' }} />
                <div className="icon-spring" style={{ marginBottom: tool.span ? 0 : 11, flexShrink: 0, display: 'inline-block' }} dangerouslySetInnerHTML={{ __html: IC[tool.k] }} />
                <div style={{ flex: tool.span ? 1 : undefined }}>
                  <div style={{ fontSize: tool.span ? 14 : 12.5, fontWeight: 700, color: '#fff', marginBottom: 4, lineHeight: 1.2, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{tool.label}</div>
                  <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,.42)', lineHeight: 1.5, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{tool.sub}</div>
                  {tool.live && <div style={{ marginTop: 8, fontSize: 8.5, color: '#4ade80', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Inter' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'block', animation: 'blink 2s ease infinite' }} />LIVE
                  </div>}
                </div>
                {tool.span && <div style={{ fontSize: 20, color: 'rgba(200,150,26,.45)', flexShrink: 0, marginLeft: isAr ? 0 : 8, marginRight: isAr ? 8 : 0 }}>{isAr ? '←' : '→'}</div>}
              </Wrap>);

          })}
        </div>
      </div>
    </section>);

}

/* ── WHY ── */
function WhySec() {
  var c = useApp();var dark = c.dark,lang = c.lang;
  var isAr = lang === 'ar';var C = th(dark);
  var rv = useScrollAnim(50);var ref = rv[0],vis = rv[1];

  var SVGs = {
    scan: '<svg viewBox="0 0 40 40" width="32" height="32" fill="none"><rect x="4" y="4" width="32" height="32" rx="8" stroke="#C8961A" stroke-width="1.2" opacity=".3"/><line x1="4" y1="20" x2="36" y2="20" stroke="#C8961A" stroke-width="1.5" stroke-linecap="round"><animate attributeName="y1" values="8;32;8" dur="2s" repeatCount="indefinite"/><animate attributeName="y2" values="8;32;8" dur="2s" repeatCount="indefinite"/></line><circle cx="13" cy="15" r="2.5" fill="#C8961A"><animate attributeName="opacity" values="1;.2;1" dur="1.5s" begin="0s" repeatCount="indefinite"/></circle><circle cx="20" cy="22" r="2.5" fill="#E9C176"><animate attributeName="opacity" values=".2;1;.2" dur="1.5s" begin=".4s" repeatCount="indefinite"/></circle><circle cx="28" cy="17" r="2.5" fill="#C8961A"><animate attributeName="opacity" values=".5;1;.5" dur="1.5s" begin=".8s" repeatCount="indefinite"/></circle></svg>',
    wizard: '<svg viewBox="0 0 40 40" width="32" height="32" fill="none"><path d="M20 6 L24 16 L35 16 L26 23 L29 34 L20 27 L11 34 L14 23 L5 16 L16 16 Z" stroke="#f472b6" stroke-width="1.3" fill="rgba(244,114,182,.1)"><animate attributeName="opacity" values="1;.5;1" dur="2s" repeatCount="indefinite"/></path><circle cx="33" cy="8" r="2" fill="#f472b6"><animate attributeName="r" values="1.5;3;1.5" dur="1.8s" repeatCount="indefinite"/></circle><circle cx="8" cy="10" r="1.3" fill="#E9C176"><animate attributeName="r" values="1;2;1" dur="2.2s" begin=".5s" repeatCount="indefinite"/></circle></svg>',
    avm: '<svg viewBox="0 0 40 40" width="32" height="32" fill="none"><circle cx="20" cy="20" r="14" stroke="#a78bfa" stroke-width="1.2" stroke-dasharray="3 2"><animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="6s" repeatCount="indefinite"/></circle><text x="20" y="25" text-anchor="middle" font-size="13" font-weight="800" fill="#a78bfa" font-family="JetBrains Mono,monospace">AVM<animate attributeName="opacity" values="1;.4;1" dur="2s" repeatCount="indefinite"/></text></svg>',
    close: '<svg viewBox="0 0 40 40" width="32" height="32" fill="none"><circle cx="14" cy="20" r="7" stroke="#4ade80" stroke-width="1.3"/><circle cx="26" cy="20" r="7" stroke="#C8961A" stroke-width="1.3"/><line x1="14" y1="13" x2="26" y2="13" stroke="rgba(255,255,255,.2)" stroke-width="1"/><line x1="14" y1="27" x2="26" y2="27" stroke="rgba(255,255,255,.2)" stroke-width="1"/><path d="M22 17 L25 20 L22 23" stroke="#C8961A" stroke-width="1.5" stroke-linecap="round" fill="none"><animate attributeName="opacity" values="1;.3;1" dur="1.6s" repeatCount="indefinite"/></path></svg>',
    verify: '<svg viewBox="0 0 40 40" width="32" height="32" fill="none"><path d="M20 4 L34 10 L34 20 C34 28 27 35 20 37 C13 35 6 28 6 20 L6 10 Z" stroke="#C8961A" stroke-width="1.3" fill="rgba(200,150,26,.08)"/><path d="M13 20 L18 25 L28 14" stroke="#4ade80" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><animate attributeName="stroke-dasharray" values="0 30;30 0;30 0" dur="1.8s" begin="0s" repeatCount="indefinite"/><animate attributeName="stroke-dashoffset" values="30;0;0" dur="1.8s" begin="0s" repeatCount="indefinite"/></path></svg>',
    speed: '<svg viewBox="0 0 40 40" width="32" height="32" fill="none"><path d="M6 32 A16 16 0 0 1 34 32" stroke="rgba(200,150,26,.2)" stroke-width="3" stroke-linecap="round"/><path d="M6 32 A16 16 0 0 1 34 32" stroke="#C8961A" stroke-width="3" stroke-linecap="round" stroke-dasharray="50" stroke-dashoffset="10"><animate attributeName="stroke-dashoffset" values="50;5;50" dur="2.4s" repeatCount="indefinite"/></path><line x1="20" y1="32" x2="28" y2="18" stroke="#E9C176" stroke-width="2" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="-40 20 32" to="40 20 32" dur="2.4s" repeatCount="indefinite"/></line><circle cx="20" cy="32" r="3" fill="#C8961A"/></svg>'
  };

  var pts = isAr ? [
  { svg: 'scan', t: 'ماسح فرص لحظي', s: 'يفحص سيرا +1,200 وحدة يومياً بـ 6 أدوات ذكاء اصطناعي ليُوصلك بأفضل الصفقات أولاً.', accent: '#C8961A' },
  { svg: 'wizard', t: 'مستشار المنزل المثالي', s: '4 أسئلة فقط — وسيرا يرشّح لك الكمبوند والوحدة المثالية وفق ميزانيتك وأسلوب حياتك.', accent: '#f472b6' },
  { svg: 'avm', t: 'تسعير AVM حقيقي', s: 'محرك تقييم لحظي يقارن كل وحدة بـ 25 كمبوند. لا تدفع أكثر من القيمة الفعلية أبداً.', accent: '#a78bfa' },
  { svg: 'close', t: 'إغلاق بشري + ذكاء', s: 'فرص يكتشفها الذكاء الاصطناعي، يُنجزها مستشار خبير. من أول توافق حتى التوقيع خلال 48 ساعة.', accent: '#4ade80' },
  { svg: 'verify', t: 'وحدات موثّقة 100%', s: 'كل وحدة مُفعّلة تمر بـ 11 نقطة تحقق. لا فجوات، لا مفاجآت.', accent: '#C8961A' },
  { svg: 'speed', t: 'الأسرع في القاهرة الجديدة', s: 'متوسط 1.8 ثانية للرد الذكي. متوسط 18 يوماً من الاستفسار لتسليم المفاتيح.', accent: '#f59e0b' }] :
  [
  { svg: 'scan', t: 'Live Opportunity Scanner', s: 'Sierra scans 1,200+ units daily with 6 AI tools — ROI, AVM pricing, smart matching — surfacing the best deals first.', accent: '#C8961A' },
  { svg: 'wizard', t: 'Dream Home Wizard', s: '4 questions, one perfect match. Sierra pinpoints your exact compound and unit type by budget and lifestyle.', accent: '#f472b6' },
  { svg: 'avm', t: 'Real-Time AVM Pricing', s: 'Live valuation engine benchmarks every unit across 25 compounds. You never overpay.', accent: '#a78bfa' },
  { svg: 'close', t: 'Human + AI Closing', s: 'AI-sourced deals paired with expert advisors. First match to signed contract in 48 hours.', accent: '#4ade80' },
  { svg: 'verify', t: '100% Verified Inventory', s: 'Every active unit passes an 11-point verification check. No gaps, no surprises.', accent: '#C8961A' },
  { svg: 'speed', t: "New Cairo's Fastest", s: '1.8s avg AI response. 18-day avg inquiry-to-keys. No other firm comes close.', accent: '#f59e0b' }];


  var bg = dark ? '#050E18' : '#FFFFFF';

  return (
    <section id="s-why" style={{ background: bg, padding: '0 0 32px', transition: 'background .3s' }}>
      <div ref={ref} className="sec-inner" style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(24px)', transition: 'all .6s cubic-bezier(.16,1,.3,1)' }}>

        {/* Hero statement */}
        <div style={{ padding: '36px 20px 0', textAlign: isAr ? 'right' : 'left', direction: isAr ? 'rtl' : 'ltr' }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, letterSpacing: '.22em', textTransform: 'uppercase', color: '#C8961A', marginBottom: 10, opacity: .8 }}>{isAr ? 'سيرا إستيتس · القاهرة الجديدة' : 'SIERRA ESTATES · NEW CAIRO'}</div>
          <div style={{ fontFamily: isAr ? "'Cairo',sans-serif" : "'Cormorant Garamond',serif", fontSize: isAr ? 34 : 42, fontWeight: isAr ? 700 : 400, lineHeight: 1.0, color: dark ? '#fff' : '#0D2035', marginBottom: 6 }}>
            {isAr ? 'أبعد من الوساطة' : React.createElement(React.Fragment, null, 'Beyond', React.createElement('br', null), 'Brokerage')}
          </div>
          <div style={{ fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', fontSize: 11.5, color: dark ? 'rgba(255,255,255,.4)' : 'rgba(13,32,53,.45)', lineHeight: 1.65, maxWidth: 300 }}>
            {isAr ? 'نجمع الخبرة البشرية العميقة بذكاء اصطناعي حي — للكشف عن الفرص التي يفوّتها الوسطاء التقليديون.' : 'We pair deep local expertise with live AI to surface deals traditional brokers never see.'}
          </div>
        </div>

        {/* Divider */}
        <div style={{ margin: '20px 20px 18px', height: 1, background: dark ? 'linear-gradient(90deg,transparent,rgba(200,150,26,.35),transparent)' : 'linear-gradient(90deg,transparent,rgba(13,32,53,.12),transparent)' }} />

        {/* Cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, padding: '0 20px' }}>
          {pts.map(function (pt, i) {
            return (
              <div key={i} style={{ padding: '16px 14px', borderRadius: 16, background: dark ? 'rgba(255,255,255,.03)' : '#fff', border: '1px solid ' + (dark ? 'rgba(200,150,26,.09)' : 'rgba(13,32,53,.07)'), animation: vis ? 'popIn .5s ' + (.05 + i * .08) + 's both' : 'none', direction: isAr ? 'rtl' : 'ltr', boxShadow: dark ? 'none' : '0 2px 12px rgba(13,32,53,.05)' }}>
                <div style={{ marginBottom: 10 }} dangerouslySetInnerHTML={{ __html: pt.svg === 'scan' ? SVGs.scan : pt.svg === 'wizard' ? SVGs.wizard : pt.svg === 'avm' ? SVGs.avm : pt.svg === 'close' ? SVGs.close : pt.svg === 'verify' ? SVGs.verify : SVGs.speed }} />
                <div style={{ fontSize: 11.5, fontWeight: 700, color: dark ? '#fff' : '#0D2035', marginBottom: 4, lineHeight: 1.25, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{pt.t}</div>
                <div style={{ fontSize: 9.5, color: dark ? 'rgba(255,255,255,.38)' : 'rgba(13,32,53,.5)', lineHeight: 1.55, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{pt.s}</div>
                <div style={{ marginTop: 10, height: 2, borderRadius: 2, background: pt.accent, opacity: .5, width: '40%' }} />
              </div>);

          })}
        </div>

        {/* Bottom stat strip */}
        <div style={{ margin: '14px 20px 0', padding: '14px 0', borderTop: '1px solid ' + (dark ? 'rgba(200,150,26,.1)' : 'rgba(13,32,53,.07)'), borderBottom: '1px solid ' + (dark ? 'rgba(200,150,26,.1)' : 'rgba(13,32,53,.07)'), display: 'flex', justifyContent: 'space-around' }}>
          {[['25', isAr ? 'كمبوند' : 'Compounds'], ['+1,200', isAr ? 'وحدة نشطة' : 'Live Units'], ['48h', isAr ? 'عقد موقّع' : 'To Contract']].map(function (s, i) {
            return (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700, color: '#C8961A' }}>{s[0]}</div>
                <div style={{ fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', fontSize: 7.5, textTransform: 'uppercase', letterSpacing: '.08em', color: dark ? 'rgba(255,255,255,.28)' : 'rgba(13,32,53,.38)', marginTop: 2 }}>{s[1]}</div>
              </div>);

          })}
        </div>
      </div>
    </section>);

}

/* ── ABOUT US ── */
function AboutUs() {
  var c = useApp();var dark = c.dark,lang = c.lang;
  var isAr = lang === 'ar';var C = th(dark);
  var rv = useScrollAnim(60);var ref = rv[0],vis = rv[1];
  return (
    <section style={{ background: C.bgAlt, padding: '0 0 28px', transition: 'background .3s' }}>
      <div ref={ref} className="sec-inner" style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(20px)', transition: 'all .55s cubic-bezier(.16,1,.3,1)' }}>
        {/* Big logo banner */}
        <div style={{ padding: '24px 20px 20px', display: 'flex', alignItems: 'center', gap: 18, direction: isAr ? 'rtl' : 'ltr', borderBottom: '1px solid ' + (dark ? 'rgba(200,150,26,.12)' : 'rgba(13,32,53,.07)'), marginBottom: 2 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: -2, borderRadius: 20, background: 'linear-gradient(135deg,rgba(200,150,26,.6),transparent 55%,rgba(233,193,118,.4))', zIndex: 0 }} />
            <img src="../../assets/logo-gold.png" alt="Sierra Estates" style={{ position: 'relative', zIndex: 1, width: 76, height: 76, borderRadius: 18, objectFit: 'contain', display: 'block', background: '#07121E' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT, fontSize: isAr ? 24 : 28, fontWeight: isAr ? 700 : 400, color: dark ? '#F0EDE5' : N, lineHeight: 1.05, marginBottom: 5 }}>{isAr ? 'سيرا إستيتس' : 'Sierra Estates'}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, letterSpacing: '.16em', color: G, textTransform: 'uppercase', marginBottom: 6, opacity: .85 }}>FUTURE OF REAL ESTATES</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['New Cairo', '25 Cpds', 'AI-Powered'].map(function (tag) {return <span key={tag} style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: dark ? 'rgba(200,150,26,.12)' : 'rgba(13,32,53,.07)', color: dark ? G : N, fontFamily: 'Inter' }}>{tag}</span>;})}
            </div>
          </div>
        </div>
        <SH eye={isAr ? 'عن شركتنا' : 'ABOUT US'} title={isAr ? 'قصتنا' : 'Our Story'} light={dark} />
        <div style={{ margin: '0 20px', padding: '18px', borderRadius: 16, background: C.whyCard, border: '1px solid ' + (dark ? 'rgba(200,150,26,.12)' : 'rgba(13,32,53,.09)'), boxShadow: '0 4px 20px rgba(13,32,53,.07)', direction: isAr ? 'rtl' : 'ltr' }}>
          <p style={{ fontSize: 12, color: C.txM, lineHeight: 1.75, marginBottom: 16, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>
            {isAr ?
            'سيرا إستيتس شركة عقارية رائدة في القاهرة الجديدة، تجمع الخبرة البشرية العميقة بأحدث أدوات الذكاء الاصطناعي لتقديم أفضل الفرص العقارية في مصر. نغطي 25 كمبوند وأكثر من 1200 وحدة.' :
            "Sierra Estates is New Cairo's leading AI-powered real estate firm — combining deep local expertise with 6 proprietary AI tools to surface the best opportunities across 25 compounds and 1,200+ verified units."}
          </p>

        </div>
      </div>
    </section>);

}

/* ── CONTACT US ── */
function ContactUs(props) {
  var onReq = props.onReq;
  var c = useApp();var lang = c.lang;var isAr = lang === 'ar';
  var rv = useScrollAnim(60);var ref = rv[0],vis = rv[1];
  var rows = [
  { ic: '💬', l: 'WhatsApp', v: '+20 106 139 9688', sub: isAr ? 'رد خلال 4 ساعات' : 'Reply within 4 hours', href: 'https://wa.me/201061399688', accent: '#25D366' },
  { ic: '📞', l: isAr ? 'اتصل بنا' : 'Call Us', v: '+20 106 139 9688', sub: isAr ? 'يومياً 9ص – 10م' : 'Daily 9AM – 10PM', href: 'tel:+201061399688', accent: G },
  { ic: '✉️', l: isAr ? 'البريد الإلكتروني' : 'Email', v: 'Info@sierra-estates.net', sub: isAr ? 'للاستفسارات والشراكات' : 'Enquiries & partnerships', href: 'mailto:Info@sierra-estates.net', accent: '#5B99DC' }];
  return (
    <section id="s-contact" style={{ background: N2, padding: '0 0 30px', transition: 'background .3s' }}>
      <div ref={ref} className="sec-inner" style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(24px)', transition: 'all .6s cubic-bezier(.16,1,.3,1)' }}>
        <div style={{ padding: '32px 20px 4px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.24em', color: G, textTransform: 'uppercase', marginBottom: 8, opacity: .85 }}>{isAr ? 'تواصل معنا' : 'CONTACT US'}</div>
          <div style={{ fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT, fontSize: isAr ? 26 : 32, fontWeight: isAr ? 700 : 400, color: '#fff', lineHeight: 1.1, marginBottom: 6 }}>{isAr ? 'لنجد منزلك المثالي' : "Let's Find Your Home"}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>{isAr ? 'فريقنا ومستشارنا الذكي في خدمتك على مدار الساعة.' : 'Our advisors and Sierra AI are at your service around the clock.'}</div>
        </div>
        <div style={{ margin: '18px 20px 16px', height: 1, background: 'linear-gradient(90deg,transparent,rgba(200,150,26,.4),transparent)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '0 20px' }}>
          {rows.map(function (r, i) {return (
              <a key={i} href={r.href} target={r.href.indexOf('https') === 0 ? '_blank' : undefined} rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', borderRadius: 15, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(200,150,26,.14)', textDecoration: 'none', direction: isAr ? 'rtl' : 'ltr', animation: vis ? 'popIn .5s ' + (.08 + i * .09) + 's both' : 'none' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>{r.ic}</div>
              <div style={{ flex: 1, minWidth: 0, textAlign: isAr ? 'right' : 'left' }}>
                <div style={{ fontSize: 8.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', fontWeight: 700, marginBottom: 3 }}>{r.l}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.v}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', marginTop: 2 }}>{r.sub}</div>
              </div>
              <span style={{ color: r.accent, fontSize: 16, flexShrink: 0 }}>{isAr ? '‹' : '›'}</span>
            </a>);
          })}
        </div>
        {/* Request CTA */}
        <div style={{ padding: '14px 20px 0' }}>
          <button onClick={onReq} style={{ width: '100%', padding: '14px', borderRadius: 13, background: 'linear-gradient(135deg,' + G + ',' + GL + ')', color: N, fontSize: 11.5, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', boxShadow: '0 8px 28px rgba(200,150,26,.35)' }}>{isAr ? 'اطلب عقارك الآن — خصم 25%' : 'Request Your Property — 25% OFF'}</button>
     