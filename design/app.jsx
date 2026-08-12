/* Sierra Estates — Client Portal (mobile-first, responsive) */
const { useState, useEffect, useRef, useMemo, createContext, useContext } = React;

/* ── FAB (Enhanced with AI/Chat menu) ── */
function FAB(props) {
  var onChat = props.onChat;
  var onAIAssist = props.onAIAssist;
  var pulse = useState(false);var setPulse = pulse[1];pulse = pulse[0];
  var [showMenu, setShowMenu] = useState(false);

  useEffect(function () {var id = setTimeout(function () {setPulse(true);}, 3000);return function () {clearTimeout(id);};}, []);

  return (
    <>
      {showMenu && (
        <div style={{ position: 'fixed', bottom: 140, right: 16, zIndex: 84, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => {onAIAssist();setShowMenu(false);}} style={{ width: 45, height: 45, borderRadius: '50%', background: 'linear-gradient(135deg,#1E88D9,#5B99DC)', border: '2px solid ' + G, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(30,136,217,.4)', fontSize: 18 }} title="AI Assist">🧠</button>
          <button onClick={() => {onChat();setShowMenu(false);}} style={{ width: 45, height: 45, borderRadius: '50%', background: 'linear-gradient(135deg,#34D399,#5ECB8A)', border: '2px solid ' + G, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(52,211,153,.4)', fontSize: 18 }} title="Chat">💬</button>
        </div>
      )}

      <button onClick={() => setShowMenu(!showMenu)} style={{ position: 'fixed', bottom: 78, right: 16, width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg,' + N + ',' + N3 + ')', border: '2px solid ' + G, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 85, boxShadow: '0 6px 24px rgba(13,32,53,.5)', animation: pulse ? 'glowRing 2.5s ease infinite' : 'none' }}>
        <img src="../../assets/logo-gold.png" style={{ width: 30, height: 30, objectFit: 'contain', borderRadius: 4 }} />
        <span style={{ position: 'absolute', top: -3, right: -3, background: '#dc2626', color: '#fff', fontSize: 7, fontWeight: 900, padding: '2px 5px', borderRadius: 8, border: '1.5px solid #fff' }}>AI</span>
      </button>
    </>
  );
}

/* ── BOTTOM NAV (Enhanced with comparison badge) ── */
function BottomNav(props) {
  var tab = props.tab,setTab = props.setTab,onAI = props.onAI,scrollTo = props.scrollTo,onSaved = props.onSaved,comparisonCount = props.comparisonCount;
  var c = useApp();var dark = c.dark,lang = c.lang;
  var t = LANG[lang];var isAr = lang === 'ar';
  var C = th(dark);
  var items = [
  { id: 'home', ic: '⌂', l: t.nav[0], sec: 's-hero' },
  { id: 'search', ic: '⊹', l: t.nav[1], sec: 's-listings' },
  { id: 'map', ic: '◎', l: t.nav[2], sec: 's-map' },
  { id: 'ai', ic: '✦', l: t.nav[3], sec: 's-ai' },
  { id: 'saved', ic: '♡', l: t.nav[4] }];

  function handle(it) {
    if (it.id === 'saved') {setTab('saved');if (onSaved) onSaved();return;}
    setTab(it.id);if (it.sec) scrollTo(it.sec);
  }
  return (
    <div className="bottom-nav" style={{ position: 'sticky', bottom: 0, background: C.navBg, backdropFilter: 'blur(22px)', borderTop: '1px solid ' + C.bd, display: 'flex', zIndex: 85, paddingBottom: 22, flexShrink: 0, flexDirection: isAr ? 'row-reverse' : 'row', transition: 'background .3s' }}>
      {items.map(function (it) {return (
          <button key={it.id} onClick={function () {handle(it);}} style={{ flex: 1, padding: '10px 0 2px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontFamily: 'inherit', position: 'relative' }}>
          <span className={tab === it.id ? 'icon-spring icon-on' : 'icon-spring'} style={{ fontSize: 20, lineHeight: 1, color: tab === it.id ? G : 'rgba(120,120,140,.7)', transition: 'color .2s, transform .4s cubic-bezier(.34,1.56,.64,1)', display: 'inline-block' }}>{it.ic}</span>
          <span style={{ fontSize: 8.5, fontWeight: 600, color: tab === it.id ? G : 'rgba(120,120,140,.7)', transition: 'color .2s', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{it.l}</span>
          {tab === it.id && <span style={{ width: 4, height: 4, borderRadius: '50%', background: G, display: 'block' }} />}
          {it.id === 'search' && comparisonCount > 0 && <span style={{ position: 'absolute', top: 0, right: 8, width: 16, height: 16, borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{comparisonCount}</span>}
        </button>);
      })}
    </div>);

}

/* ── BANNER (Enhanced with dismissible state) ── */
function Banner(props) {
  var onDismiss = props.onDismiss,onClaim = props.onClaim,visible = props.visible;
  var c = useApp();var dark = c.dark,lang = c.lang;
  var t = LANG[lang];var isAr = lang === 'ar';
  var C = th(dark);

  if (!visible) return null;

  return (
    <div style={{ background: C.annBg, borderBottom: '1px solid rgba(200,150,26,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '7px 16px', position: 'relative', flexShrink: 0, direction: isAr ? 'rtl' : 'ltr', transition: 'background .3s' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: G, display: 'block', animation: 'blink 1.8s ease infinite', flexShrink: 0 }} />
      <span style={{ background: 'linear-gradient(135deg,' + G + ',' + GL + ')', color: N, fontSize: 8.5, fontWeight: 900, padding: '2px 7px', borderRadius: 4, flexShrink: 0 }}>25% OFF</span>
      <span style={{ color: dark ? 'rgba(255,255,255,.65)' : 'rgba(13,32,53,.62)', fontSize: 10, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{t.reqSub}</span>
      <span style={{ color: G, fontSize: 9, fontWeight: 700, fontFamily: 'Inter', whiteSpace: 'nowrap' }}>🌍 +10% non-EG</span>
      <button onClick={onClaim} style={{ color: GL, fontSize: 9.5, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, textDecoration: 'underline', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter' }}>{t.req}</button>
      <button onClick={onDismiss} style={{ position: 'absolute', right: isAr ? 'auto' : 10, left: isAr ? 10 : 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(120,120,120,.5)', fontSize: 18, lineHeight: 1 }}>×</button>
    </div>);

}

/* ── GLASS HEADER (Enhanced with comparison button) ── */
function GlassHeader(props) {
  var onReq = props.onReq,onFilters = props.onFilters,comparisonCount = props.comparisonCount,onShowComparison = props.onShowComparison;
  var c = useApp();var dark = c.dark,setDark = c.setDark,lang = c.lang,setLang = c.setLang;
  var t = LANG[lang];var isAr = lang === 'ar';
  return (
    <div style={{ padding: '10px 14px 6px', flexShrink: 0 }}>
      <div className="glass-card" style={{ background: 'rgba(7,18,30,.9)', backdropFilter: 'blur(28px) saturate(1.6)', WebkitBackdropFilter: 'blur(28px) saturate(1.6)', border: '1px solid rgba(200,150,26,.2)', borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,.5), 0 0 0 1px rgba(200,150,26,.06) inset', overflow: 'hidden' }}>
        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', direction: isAr ? 'rtl' : 'ltr' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexDirection: isAr ? 'row-reverse' : 'row' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ position: 'absolute', inset: -1.5, borderRadius: 11, background: 'linear-gradient(135deg,' + G + ',transparent 60%,' + GL + ')', zIndex: 0 }} />
              <img src="../../assets/logo-gold.png" alt="Sierra Estates" style={{ position: 'relative', zIndex: 1, width: 34, height: 34, borderRadius: 9, objectFit: 'contain', display: 'block', background: '#0D2035', padding: 2 }} />
            </div>
            <div style={{ textAlign: isAr ? 'right' : 'left' }}>
              <div style={{ fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT, fontSize: isAr ? 15 : 17, fontWeight: isAr ? 700 : 500, letterSpacing: isAr ? '.01em' : '.15em', color: '#fff', lineHeight: 1 }}>{t.brand}</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 6.5, letterSpacing: '.22em', color: G, marginTop: 3, opacity: .7, textTransform: 'uppercase' }}>{t.brandSub}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={function () {setLang(isAr ? 'en' : 'ar');}} style={{ width: 32, height: 28, borderRadius: 8, background: 'rgba(200,150,26,.1)', border: '1px solid rgba(200,150,26,.25)', color: G, fontSize: 10, fontWeight: 900, cursor: 'pointer', fontFamily: 'Inter', letterSpacing: '.04em' }}>{isAr ? 'EN' : 'ع'}</button>
            <button onClick={function () {setDark(function (d) {return !d;});}} aria-label="theme" style={{ width: 50, height: 26, borderRadius: 20, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(200,150,26,.2)', position: 'relative', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 3, left: dark ? 26 : 3, width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg,' + GL + ',' + G + ')', transition: 'left .28s cubic-bezier(.4,0,.2,1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, boxShadow: '0 2px 8px rgba(200,150,26,.5)' }}>{dark ? '☀' : '🌙'}</span>
            </button>
          </div>
        </div>
        {/* Promo + Action strip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 14px 10px', borderTop: '1px solid rgba(200,150,26,.12)', direction: isAr ? 'rtl' : 'ltr', background: 'linear-gradient(90deg,rgba(200,150,26,.07),rgba(200,150,26,.03))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: isAr ? 'row-reverse' : 'row', minWidth: 0 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', flexShrink: 0, boxShadow: '0 0 8px rgba(74,222,128,.6)', animation: 'blink 2s ease infinite' }} />
            <div style={{ minWidth: 0, textAlign: isAr ? 'right' : 'left' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.2, fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', whiteSpace: 'nowrap' }}>{t.claim} <span style={{ color: G, fontWeight: 900 }}>25% OFF</span></div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,.38)', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', marginTop: 1 }}>{t.claimSub}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {comparisonCount > 0 && (
              <button onClick={onShowComparison} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#ef4444', fontSize: 11, position: 'relative' }} title="Show comparison">
                ⚖ {comparisonCount}
              </button>
            )}
            <button onClick={onFilters} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(200,150,26,.1)', border: '1px solid rgba(200,150,26,.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Filters">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.5"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            </button>
            <button onClick={onReq} style={{ padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,' + G + ',' + GL + ')', color: N, fontSize: 10.5, fontWeight: 900, letterSpacing: '.05em', border: 'none', cursor: 'pointer', fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter', boxShadow: '0 4px 18px rgba(200,150,26,.4)', whiteSpace: 'nowrap' }}>{t.reqNow} {isAr ? '←' : '→'}</button>
          </div>
        </div>
      </div>
    </div>);

}

/* ── APP ── */
function App() {
  var dark = useState(true);var setDark = dark[1];dark = dark[0];
  var lang = useState('en');var setLang = lang[1];lang = lang[0];
  var purpose = useState('resale');var setPurpose = purpose[1];purpose = purpose[0];
  var search = useState('');var setSearch = search[1];search = search[0];
  var beds = useState(null);var setBeds = beds[1];beds = beds[0];
  var savedIds = useState(new Set());var setSavedIds = savedIds[1];savedIds = savedIds[0];

  /* New Houzez features */
  var comparingIds = useState(new Set());var setComparingIds = comparingIds[1];comparingIds = comparingIds[0];
  var quickViewItem = useState(null);var setQuickViewItem = quickViewItem[1];quickViewItem = quickViewItem[0];
  var showComparison = useState(false);var setShowComparison = showComparison[1];showComparison = showComparison[0];
  var advFiltersOpen = useState(false);var setAdvFiltersOpen = advFiltersOpen[1];advFiltersOpen = advFiltersOpen[0];

  var tab = useState('home');var setTab = tab[1];tab = tab[0];
  var ann = useState(true);var setAnn = ann[1];ann = ann[0];
  var cpd = useState(null);var setCpd = cpd[1];cpd = cpd[0];
  var unitD = useState(null);var setUnitD = unitD[1];unitD = unitD[0];
  var listing = useState(null);var setListing = listing[1];listing = listing[0];
  var chatOpen = useState(false);var setChatOpen = chatOpen[1];chatOpen = chatOpen[0];
  var chatQ = useState('');var setChatQ = chatQ[1];chatQ = chatQ[0];
  var savedOpen = useState(false);var setSavedOpen = savedOpen[1];savedOpen = savedOpen[0];
  var reqOpen = useState(false);var setReqOpen = reqOpen[1];reqOpen = reqOpen[0];
  var tool = useState(null);var setTool = tool[1];tool = tool[0];
  var filterOpen = useState(false);var setFilterOpen = filterOpen[1];filterOpen = filterOpen[0];
  var reqMode = useState(false);var setReqMode = reqMode[1];reqMode = reqMode[0];

  function openRequest() {setReqMode(true);setFilterOpen(true);}
  function openFiltersOnly() {setReqMode(false);setFilterOpen(true);}
  function toggleComparison(id) {setComparingIds(function (s) {var n = new Set(s);if (n.has(id)) n.delete(id);else n.add(id);return n;});}

  /* ── TWEAKS ── */
  var ACCENT_PALETTES = {
    '#C8961A': ['#C8961A', '#E9C176'], /* Desert Gold  */
    '#2A7A4F': ['#2A7A4F', '#5EC98A'], /* Emerald      */
    '#1A5B8F': ['#1A5B8F', '#5B99DC'], /* Sapphire     */
    '#8B4A1E': ['#8B4A1E', '#D4845A'] /* Burnt Copper */
  };
  var ATMOSPHERES = {
    'Deep Space': ['#071524', '#1A3354'],
    'Dusk': ['#150E08', '#2A1A10'],
    'Abyss': ['#06060C', '#0E0E1C']
  };
  var tw = window.useTweaks ? window.useTweaks({
    accent: '#C8961A',
    typeVoice: 'Serif',
    atmosphere: 'Deep Space'
  }) : [{ accent: '#C8961A', typeVoice: 'Serif', atmosphere: 'Deep Space' }, function () {}];
  var tweakVals = tw[0];var setTweak = tw[1];

  /* Apply globals synchronously before render so all children see updated values */
  var _ac = ACCENT_PALETTES[tweakVals.accent] || ACCENT_PALETTES['#C8961A'];
  G = _ac[0];GL = _ac[1];
  HEADING_FONT = tweakVals.typeVoice === 'Sans' ? "'Inter',sans-serif" :
  tweakVals.typeVoice === 'Mono' ? "'JetBrains Mono',monospace" :
  "'Cormorant Garamond',serif";
  var _atm = ATMOSPHERES[tweakVals.atmosphere] || ATMOSPHERES['Deep Space'];
  N2 = _atm[0];N3 = _atm[1];

  var C = th(dark);
  function scrollTo(id) {var el = document.getElementById(id);var sc = document.getElementById('root-scroll');if (el && sc) sc.scrollTo({ top: el.offsetTop - 138, behavior: 'smooth' });}
  function handleTool(k) {
    if (k === 'imap') {scrollTo('s-map');} else if (k === 'tour') {scrollTo('s-tour');} else if (k === 'chat') {setChatQ('');setChatOpen(true);} else {setTool(k);}
  }
  function handleSave(id) {setSavedIds(function (s) {var n = new Set(s);if (n.has(id)) n.delete(id);else n.add(id);return n;});}
  return (
    React.createElement(Ctx.Provider, { value: { dark: dark, setDark: setDark, lang: lang, setLang: setLang, tweakSig: tweakVals.accent + tweakVals.typeVoice + tweakVals.atmosphere } },
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: C.bg, transition: 'background .3s' }}>
        {window.TweaksPanel && <window.TweaksPanel>
          <window.TweakSection label="Accent Palette" />
          <window.TweakColor
          label="Color"
          value={tweakVals.accent}
          options={['#C8961A', '#2A7A4F', '#1A5B8F', '#8B4A1E']}
          onChange={function (v) {setTweak('accent', v);}} />
        
          <window.TweakSection label="Type Voice" />
          <window.TweakRadio
          label="Heading"
          value