/* @ds-bundle: {"format":4,"namespace":"SierraEstatesDesignSystem_210542","components":[{"name":"AITile","sourcePath":"components/ai/AITile.jsx"},{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Chip","sourcePath":"components/core/Chip.jsx"},{"name":"Eyebrow","sourcePath":"components/core/Eyebrow.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"RangeSlider","sourcePath":"components/forms/RangeSlider.jsx"},{"name":"SegmentedControl","sourcePath":"components/forms/SegmentedControl.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"PropertyCard","sourcePath":"components/property/PropertyCard.jsx"},{"name":"StatBlock","sourcePath":"components/property/StatBlock.jsx"}],"sourceHashes":{"app.jsx":"079df7945c46","components/ai/AITile.jsx":"611c534b6b46","components/core/Avatar.jsx":"c53eff394c98","components/core/Badge.jsx":"4c05b5161905","components/core/Button.jsx":"821254f11ad1","components/core/Card.jsx":"1a2b548ed678","components/core/Chip.jsx":"c7e6eeafd87d","components/core/Eyebrow.jsx":"3499de4d2d3e","components/core/IconButton.jsx":"d0a13eb85488","components/forms/Input.jsx":"6a60f46c61b9","components/forms/RangeSlider.jsx":"ae67c03a0ded","components/forms/SegmentedControl.jsx":"5715548e96c0","components/forms/Select.jsx":"7807fa657962","components/forms/Switch.jsx":"5180e66099bc","components/navigation/Tabs.jsx":"408086235cc8","components/property/PropertyCard.jsx":"7b1de134126c","components/property/StatBlock.jsx":"77c1943301a7","sections.jsx":"11d167d7c58b","ui_kits/admin/app.jsx":"80dc2408b2d8","ui_kits/admin/data.js":"b1616a358122","ui_kits/admin/parts.jsx":"8202040b2335","ui_kits/houzez-portal/data.js":"ac974205650c","ui_kits/houzez-portal/image-slot.js":"4cffaf8e50f6","ui_kits/houzez-portal/shared.js":"e8fbdc01456b","ui_kits/sierra-mobile-light/tweaks-panel.jsx":"6591467622ed","ui_kits/web-app/app.jsx":"9637858dbc14","ui_kits/web-app/core.jsx":"b4a569ac42c3","ui_kits/web-app/data.js":"2d78a4ee23d8","ui_kits/web-app/sections.jsx":"5229c7649970","ui_kits/web-app/sheets.jsx":"86220f150350","ui_kits/web-app/tweaks-panel.jsx":"6591467622ed"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SierraEstatesDesignSystem_210542 = window.SierraEstatesDesignSystem_210542 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// app.jsx
try { (() => {
/* Sierra Estates — Client Portal (mobile-first, responsive) */
const {
  useState,
  useEffect,
  useRef,
  useMemo,
  createContext,
  useContext
} = React;

/* ── FAB ── */
function FAB(props) {
  var onChat = props.onChat;
  var pulse = useState(false);
  var setPulse = pulse[1];
  pulse = pulse[0];
  useEffect(function () {
    var id = setTimeout(function () {
      setPulse(true);
    }, 3000);
    return function () {
      clearTimeout(id);
    };
  }, []);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onChat,
    style: {
      position: 'fixed',
      bottom: 78,
      right: 16,
      width: 50,
      height: 50,
      borderRadius: '50%',
      background: 'linear-gradient(135deg,' + N + ',' + N3 + ')',
      border: '2px solid ' + G,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 85,
      boxShadow: '0 6px 24px rgba(13,32,53,.5)',
      animation: pulse ? 'glowRing 2.5s ease infinite' : 'none'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-gold.png",
    style: {
      width: 30,
      height: 30,
      objectFit: 'contain',
      borderRadius: 4
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: -3,
      right: -3,
      background: '#dc2626',
      color: '#fff',
      fontSize: 7,
      fontWeight: 900,
      padding: '2px 5px',
      borderRadius: 8,
      border: '1.5px solid #fff'
    }
  }, "AI"));
}

/* ── BOTTOM NAV ── */
function BottomNav(props) {
  var tab = props.tab,
    setTab = props.setTab,
    onAI = props.onAI,
    scrollTo = props.scrollTo,
    onSaved = props.onSaved;
  var c = useApp();
  var dark = c.dark,
    lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var C = th(dark);
  var items = [{
    id: 'home',
    ic: '⌂',
    l: t.nav[0],
    sec: 's-hero'
  }, {
    id: 'search',
    ic: '⊹',
    l: t.nav[1],
    sec: 's-listings'
  }, {
    id: 'map',
    ic: '◎',
    l: t.nav[2],
    sec: 's-map'
  }, {
    id: 'ai',
    ic: '✦',
    l: t.nav[3],
    sec: 's-ai'
  }, {
    id: 'saved',
    ic: '♡',
    l: t.nav[4]
  }];
  function handle(it) {
    if (it.id === 'saved') {
      setTab('saved');
      if (onSaved) onSaved();
      return;
    }
    setTab(it.id);
    if (it.sec) scrollTo(it.sec);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "bottom-nav",
    style: {
      position: 'sticky',
      bottom: 0,
      background: C.navBg,
      backdropFilter: 'blur(22px)',
      borderTop: '1px solid ' + C.bd,
      display: 'flex',
      zIndex: 85,
      paddingBottom: 22,
      flexShrink: 0,
      flexDirection: isAr ? 'row-reverse' : 'row',
      transition: 'background .3s'
    }
  }, items.map(function (it) {
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      onClick: function () {
        handle(it);
      },
      style: {
        flex: 1,
        padding: '10px 0 2px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        fontFamily: 'inherit'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: tab === it.id ? 'icon-spring icon-on' : 'icon-spring',
      style: {
        fontSize: 20,
        lineHeight: 1,
        color: tab === it.id ? G : 'rgba(120,120,140,.7)',
        transition: 'color .2s, transform .4s cubic-bezier(.34,1.56,.64,1)',
        display: 'inline-block'
      }
    }, it.ic), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8.5,
        fontWeight: 600,
        color: tab === it.id ? G : 'rgba(120,120,140,.7)',
        transition: 'color .2s',
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
      }
    }, it.l), tab === it.id && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 4,
        height: 4,
        borderRadius: '50%',
        background: G,
        display: 'block'
      }
    }));
  }));
}

/* ── BANNER ── */
function Banner(props) {
  var onDismiss = props.onDismiss,
    onClaim = props.onClaim;
  var c = useApp();
  var dark = c.dark,
    lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var C = th(dark);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.annBg,
      borderBottom: '1px solid rgba(200,150,26,.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      padding: '7px 16px',
      position: 'relative',
      flexShrink: 0,
      direction: isAr ? 'rtl' : 'ltr',
      transition: 'background .3s'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 5,
      height: 5,
      borderRadius: '50%',
      background: G,
      display: 'block',
      animation: 'blink 1.8s ease infinite',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      background: 'linear-gradient(135deg,' + G + ',' + GL + ')',
      color: N,
      fontSize: 8.5,
      fontWeight: 900,
      padding: '2px 7px',
      borderRadius: 4,
      flexShrink: 0
    }
  }, "25% OFF"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: dark ? 'rgba(255,255,255,.65)' : 'rgba(13,32,53,.62)',
      fontSize: 10,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, t.reqSub), /*#__PURE__*/React.createElement("span", {
    style: {
      color: G,
      fontSize: 9,
      fontWeight: 700,
      fontFamily: 'Inter',
      whiteSpace: 'nowrap'
    }
  }, "\uD83C\uDF0D +10% non-EG"), /*#__PURE__*/React.createElement("button", {
    onClick: onClaim,
    style: {
      color: GL,
      fontSize: 9.5,
      fontWeight: 700,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      flexShrink: 0,
      textDecoration: 'underline',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, t.req), /*#__PURE__*/React.createElement("button", {
    onClick: onDismiss,
    style: {
      position: 'absolute',
      right: isAr ? 'auto' : 10,
      left: isAr ? 10 : 'auto',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'rgba(120,120,120,.5)',
      fontSize: 18,
      lineHeight: 1
    }
  }, "\xD7"));
}

/* ── GLASS HEADER (floating) ── */
function GlassHeader(props) {
  var onReq = props.onReq,
    onFilters = props.onFilters;
  var c = useApp();
  var dark = c.dark,
    setDark = c.setDark,
    lang = c.lang,
    setLang = c.setLang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px 6px',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "glass-card",
    style: {
      background: 'rgba(7,18,30,.9)',
      backdropFilter: 'blur(28px) saturate(1.6)',
      WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
      border: '1px solid rgba(200,150,26,.2)',
      borderRadius: 20,
      boxShadow: '0 8px 32px rgba(0,0,0,.5), 0 0 0 1px rgba(200,150,26,.06) inset',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 14px',
      direction: isAr ? 'rtl' : 'ltr'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      flexDirection: isAr ? 'row-reverse' : 'row'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: -1.5,
      borderRadius: 11,
      background: 'linear-gradient(135deg,' + G + ',transparent 60%,' + GL + ')',
      zIndex: 0
    }
  }), /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-gold.png",
    alt: "Sierra Estates",
    style: {
      position: 'relative',
      zIndex: 1,
      width: 34,
      height: 34,
      borderRadius: 9,
      objectFit: 'contain',
      display: 'block',
      background: '#0D2035',
      padding: 2
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: isAr ? 'right' : 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
      fontSize: isAr ? 15 : 17,
      fontWeight: isAr ? 700 : 500,
      letterSpacing: isAr ? '.01em' : '.15em',
      color: '#fff',
      lineHeight: 1
    }
  }, t.brand), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 6.5,
      letterSpacing: '.22em',
      color: G,
      marginTop: 3,
      opacity: .7,
      textTransform: 'uppercase'
    }
  }, t.brandSub))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setLang(isAr ? 'en' : 'ar');
    },
    style: {
      width: 32,
      height: 28,
      borderRadius: 8,
      background: 'rgba(200,150,26,.1)',
      border: '1px solid rgba(200,150,26,.25)',
      color: G,
      fontSize: 10,
      fontWeight: 900,
      cursor: 'pointer',
      fontFamily: 'Inter',
      letterSpacing: '.04em'
    }
  }, isAr ? 'EN' : 'ع'), /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setDark(function (d) {
        return !d;
      });
    },
    "aria-label": "theme",
    style: {
      width: 50,
      height: 26,
      borderRadius: 20,
      background: 'rgba(255,255,255,.06)',
      border: '1px solid rgba(200,150,26,.2)',
      position: 'relative',
      cursor: 'pointer',
      padding: 0,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: dark ? 26 : 3,
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: 'linear-gradient(135deg,' + GL + ',' + G + ')',
      transition: 'left .28s cubic-bezier(.4,0,.2,1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 9,
      boxShadow: '0 2px 8px rgba(200,150,26,.5)'
    }
  }, dark ? '☀' : '🌙')))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      padding: '8px 14px 10px',
      borderTop: '1px solid rgba(200,150,26,.12)',
      direction: isAr ? 'rtl' : 'ltr',
      background: 'linear-gradient(90deg,rgba(200,150,26,.07),rgba(200,150,26,.03))'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexDirection: isAr ? 'row-reverse' : 'row',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: '#4ade80',
      flexShrink: 0,
      boxShadow: '0 0 8px rgba(74,222,128,.6)',
      animation: 'blink 2s ease infinite'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      textAlign: isAr ? 'right' : 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#fff',
      lineHeight: 1.2,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      whiteSpace: 'nowrap'
    }
  }, t.claim, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: G,
      fontWeight: 900
    }
  }, "25% OFF")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.38)',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      marginTop: 1
    }
  }, t.claimSub))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onFilters,
    style: {
      width: 34,
      height: 34,
      borderRadius: 10,
      background: 'rgba(200,150,26,.1)',
      border: '1px solid rgba(200,150,26,.3)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    "aria-label": "Filters"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: G,
    strokeWidth: "2.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 6h16M7 12h10M10 18h4"
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: onReq,
    style: {
      padding: '8px 16px',
      borderRadius: 10,
      background: 'linear-gradient(135deg,' + G + ',' + GL + ')',
      color: N,
      fontSize: 10.5,
      fontWeight: 900,
      letterSpacing: '.05em',
      border: 'none',
      cursor: 'pointer',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      boxShadow: '0 4px 18px rgba(200,150,26,.4)',
      whiteSpace: 'nowrap'
    }
  }, t.reqNow, " ", isAr ? '←' : '→')))));
}

/* ── APP ── */
function App() {
  var dark = useState(true);
  var setDark = dark[1];
  dark = dark[0];
  var lang = useState('en');
  var setLang = lang[1];
  lang = lang[0];
  var purpose = useState('resale');
  var setPurpose = purpose[1];
  purpose = purpose[0];
  var search = useState('');
  var setSearch = search[1];
  search = search[0];
  var beds = useState(null);
  var setBeds = beds[1];
  beds = beds[0];
  var savedIds = useState(new Set());
  var setSavedIds = savedIds[1];
  savedIds = savedIds[0];
  var tab = useState('home');
  var setTab = tab[1];
  tab = tab[0];
  var ann = useState(true);
  var setAnn = ann[1];
  ann = ann[0];
  var cpd = useState(null);
  var setCpd = cpd[1];
  cpd = cpd[0];
  var unitD = useState(null);
  var setUnitD = unitD[1];
  unitD = unitD[0];
  var listing = useState(null);
  var setListing = listing[1];
  listing = listing[0];
  var chatOpen = useState(false);
  var setChatOpen = chatOpen[1];
  chatOpen = chatOpen[0];
  var chatQ = useState('');
  var setChatQ = chatQ[1];
  chatQ = chatQ[0];
  var savedOpen = useState(false);
  var setSavedOpen = savedOpen[1];
  savedOpen = savedOpen[0];
  var reqOpen = useState(false);
  var setReqOpen = reqOpen[1];
  reqOpen = reqOpen[0];
  var tool = useState(null);
  var setTool = tool[1];
  tool = tool[0];
  var filterOpen = useState(false);
  var setFilterOpen = filterOpen[1];
  filterOpen = filterOpen[0];
  var reqMode = useState(false);
  var setReqMode = reqMode[1];
  reqMode = reqMode[0];
  function openRequest() {
    setReqMode(true);
    setFilterOpen(true);
  }
  function openFiltersOnly() {
    setReqMode(false);
    setFilterOpen(true);
  }

  /* ── TWEAKS ── */
  var ACCENT_PALETTES = {
    '#C8961A': ['#C8961A', '#E9C176'],
    /* Desert Gold  */
    '#2A7A4F': ['#2A7A4F', '#5EC98A'],
    /* Emerald      */
    '#1A5B8F': ['#1A5B8F', '#5B99DC'],
    /* Sapphire     */
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
  }) : [{
    accent: '#C8961A',
    typeVoice: 'Serif',
    atmosphere: 'Deep Space'
  }, function () {}];
  var tweakVals = tw[0];
  var setTweak = tw[1];

  /* Apply globals synchronously before render so all children see updated values */
  var _ac = ACCENT_PALETTES[tweakVals.accent] || ACCENT_PALETTES['#C8961A'];
  G = _ac[0];
  GL = _ac[1];
  HEADING_FONT = tweakVals.typeVoice === 'Sans' ? "'Inter',sans-serif" : tweakVals.typeVoice === 'Mono' ? "'JetBrains Mono',monospace" : "'Cormorant Garamond',serif";
  var _atm = ATMOSPHERES[tweakVals.atmosphere] || ATMOSPHERES['Deep Space'];
  N2 = _atm[0];
  N3 = _atm[1];
  var C = th(dark);
  function scrollTo(id) {
    var el = document.getElementById(id);
    var sc = document.getElementById('root-scroll');
    if (el && sc) sc.scrollTo({
      top: el.offsetTop - 138,
      behavior: 'smooth'
    });
  }
  function handleTool(k) {
    if (k === 'imap') {
      scrollTo('s-map');
    } else if (k === 'tour') {
      scrollTo('s-tour');
    } else if (k === 'chat') {
      setChatQ('');
      setChatOpen(true);
    } else {
      setTool(k);
    }
  }
  function handleSave(id) {
    setSavedIds(function (s) {
      var n = new Set(s);
      if (n.has(id)) n.delete(id);else n.add(id);
      return n;
    });
  }
  return React.createElement(Ctx.Provider, {
    value: {
      dark: dark,
      setDark: setDark,
      lang: lang,
      setLang: setLang,
      tweakSig: tweakVals.accent + tweakVals.typeVoice + tweakVals.atmosphere
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: C.bg,
      transition: 'background .3s'
    }
  }, window.TweaksPanel && /*#__PURE__*/React.createElement(window.TweaksPanel, null, /*#__PURE__*/React.createElement(window.TweakSection, {
    label: "Accent Palette"
  }), /*#__PURE__*/React.createElement(window.TweakColor, {
    label: "Color",
    value: tweakVals.accent,
    options: ['#C8961A', '#2A7A4F', '#1A5B8F', '#8B4A1E'],
    onChange: function (v) {
      setTweak('accent', v);
    }
  }), /*#__PURE__*/React.createElement(window.TweakSection, {
    label: "Type Voice"
  }), /*#__PURE__*/React.createElement(window.TweakRadio, {
    label: "Heading",
    value: tweakVals.typeVoice,
    options: ['Serif', 'Sans', 'Mono'],
    onChange: function (v) {
      setTweak('typeVoice', v);
    }
  }), /*#__PURE__*/React.createElement(window.TweakSection, {
    label: "Atmosphere"
  }), /*#__PURE__*/React.createElement(window.TweakRadio, {
    label: "Mood",
    value: tweakVals.atmosphere,
    options: ['Deep Space', 'Dusk', 'Abyss'],
    onChange: function (v) {
      setTweak('atmosphere', v);
    }
  })), /*#__PURE__*/React.createElement(StatusBar, null), /*#__PURE__*/React.createElement(GlassHeader, {
    onReq: openRequest,
    onFilters: openFiltersOnly
  }), /*#__PURE__*/React.createElement(SmartFilterSheet, {
    open: filterOpen,
    showLead: reqMode,
    onClose: function () {
      setFilterOpen(false);
    },
    purpose: purpose,
    setPurpose: setPurpose,
    beds: beds,
    setBeds: setBeds,
    setSearch: setSearch
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Hero, {
    purpose: purpose,
    setPurpose: setPurpose,
    beds: beds,
    setBeds: setBeds,
    search: search,
    setSearch: setSearch,
    onReq: openRequest,
    filterOpen: filterOpen,
    setFilterOpen: openFiltersOnly
  }), /*#__PURE__*/React.createElement(AIHub, {
    onTool: handleTool,
    onMap: function () {
      scrollTo('s-map');
    },
    onContact: openRequest
  }), /*#__PURE__*/React.createElement(TourSec, null), /*#__PURE__*/React.createElement(Listings, {
    purpose: purpose,
    search: search,
    beds: beds,
    onTap: setListing,
    saved: savedIds,
    onSave: handleSave
  }), /*#__PURE__*/React.createElement(MapSec, {
    purpose: purpose,
    onCpdTap: setCpd,
    onFilters: openFiltersOnly
  }), /*#__PURE__*/React.createElement(WhySec, {
    "data-comment-anchor": "190f0e183b-div-522-17"
  }), /*#__PURE__*/React.createElement(AboutUs, null), /*#__PURE__*/React.createElement(ContactUs, {
    onReq: openRequest
  })), /*#__PURE__*/React.createElement(BottomNav, {
    tab: tab,
    setTab: setTab,
    onAI: handleTool,
    scrollTo: scrollTo,
    onSaved: function () {
      setSavedOpen(true);
    }
  }), /*#__PURE__*/React.createElement(FAB, {
    onChat: function () {
      setChatQ('');
      setChatOpen(true);
    }
  }), /*#__PURE__*/React.createElement(CpdSheet, {
    cpd: cpd,
    purpose: purpose,
    onClose: function () {
      setCpd(null);
    },
    onUnit: function (u) {
      setUnitD({
        u: u,
        cpd: cpd
      });
    }
  }), /*#__PURE__*/React.createElement(UnitSheet, {
    data: unitD,
    purpose: purpose,
    onClose: function () {
      setUnitD(null);
    }
  }), /*#__PURE__*/React.createElement(ListSheet, {
    item: listing,
    purpose: purpose,
    onClose: function () {
      setListing(null);
    },
    saved: savedIds,
    onSave: handleSave
  }), /*#__PURE__*/React.createElement(ChatSheet, {
    open: chatOpen,
    initQ: chatQ,
    onClose: function () {
      setChatOpen(false);
      setChatQ('');
    }
  }), /*#__PURE__*/React.createElement(ROISheet, {
    open: tool === 'roi',
    onClose: function () {
      setTool(null);
    }
  }), /*#__PURE__*/React.createElement(PriceSheet, {
    open: tool === 'price',
    onClose: function () {
      setTool(null);
    }
  }), /*#__PURE__*/React.createElement(MatchSheet, {
    open: tool === 'match',
    onClose: function () {
      setTool(null);
    },
    purpose: purpose
  }), /*#__PURE__*/React.createElement(DreamSheet, {
    open: tool === 'dream',
    onClose: function () {
      setTool(null);
    }
  }), /*#__PURE__*/React.createElement(AIEngineSheet, {
    open: tool === 'engine',
    onClose: function () {
      setTool(null);
    }
  }), /*#__PURE__*/React.createElement(SavedSheet, {
    open: savedOpen,
    onClose: function () {
      setSavedOpen(false);
    },
    savedIds: savedIds,
    listings: FEATURED,
    purpose: purpose
  })));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
})(); } catch (e) { __ds_ns.__errors.push({ path: "app.jsx", error: String((e && e.message) || e) }); }

// components/ai/AITile.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.se-aitile{display:flex;align-items:center;gap:14px;text-align:start;cursor:pointer;width:100%;
  padding:15px 16px;border-radius:var(--radius-md);
  background:var(--surf);border:1px solid rgba(233,193,118,.14);color:var(--tx);text-decoration:none;
  transition:all var(--dur-slow) var(--ease-silk);}
.se-aitile:hover{background:rgba(233,193,118,.10);border-color:var(--bd-gold);transform:translateX(-4px);color:var(--tx);}
.se-aitile__ic{flex-shrink:0;width:44px;height:44px;display:grid;place-items:center;font-size:22px;
  border-radius:var(--radius-sm);background:var(--bg-d);}
.se-aitile__txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;}
.se-aitile__t{font-family:var(--font-ui);font-weight:600;font-size:14px;color:var(--tx-s);}
.se-aitile__d{font-family:var(--font-ui);font-size:11px;color:var(--tx-m);}
.se-aitile__arrow{color:var(--gold-lt);font-size:16px;transition:transform var(--dur-base) var(--ease-silk);}
.se-aitile:hover .se-aitile__arrow{transform:translateX(4px);}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-aitile-css')) {
  const s = document.createElement('style');
  s.id = 'se-aitile-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * AI Support module tile — the one place emoji glyphs are on-brand.
 * Used in the floating AI Support drawer / hub grid.
 */
function AITile({
  icon,
  title,
  desc,
  href,
  as = 'a',
  onClick,
  className = '',
  ...rest
}) {
  const Tag = as;
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: ['se-aitile', className].filter(Boolean).join(' '),
    href: as === 'a' ? href : undefined,
    onClick: onClick
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "se-aitile__ic"
  }, icon), /*#__PURE__*/React.createElement("span", {
    className: "se-aitile__txt"
  }, /*#__PURE__*/React.createElement("span", {
    className: "se-aitile__t"
  }, title), desc && /*#__PURE__*/React.createElement("span", {
    className: "se-aitile__d"
  }, desc)), /*#__PURE__*/React.createElement("span", {
    className: "se-aitile__arrow"
  }, "\u2192"));
}
Object.assign(__ds_scope, { AITile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ai/AITile.jsx", error: String((e && e.message) || e) }); }

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.se-avatar{display:inline-grid;place-items:center;overflow:hidden;flex-shrink:0;
  font-family:var(--font-ui);font-weight:600;color:var(--bg-d);
  background:var(--grad-gold);border-radius:var(--radius-pill);}
.se-avatar img{width:100%;height:100%;object-fit:cover;}
.se-avatar--sm{width:32px;height:32px;font-size:12px;}
.se-avatar--md{width:42px;height:42px;font-size:15px;}
.se-avatar--lg{width:56px;height:56px;font-size:19px;}
.se-avatar--ring{box-shadow:0 0 0 2px var(--bg),0 0 0 3px var(--gold);}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-avatar-css')) {
  const s = document.createElement('style');
  s.id = 'se-avatar-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Agent/user avatar. Shows an image, else gold-gradient initials. */
function Avatar({
  src,
  name = '',
  size = 'md',
  ring = false,
  className = '',
  ...rest
}) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const cls = ['se-avatar', `se-avatar--${size}`, ring ? 'se-avatar--ring' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name
  }) : initials);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.se-badge{display:inline-flex;align-items:center;gap:6px;
  font-family:var(--font-mono);font-weight:700;font-size:9px;
  letter-spacing:.14em;text-transform:uppercase;
  padding:5px 11px;border-radius:var(--radius-pill);white-space:nowrap;line-height:1;}
.se-badge svg{width:11px;height:11px;}
.se-badge--dot::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor;}
/* tone variants — translucent fill, full-saturation text */
.se-badge--gold{background:rgba(200,150,26,.16);color:var(--gold-lt);}
.se-badge--red{background:rgba(230,57,70,.16);color:var(--red);}
.se-badge--blue{background:rgba(30,136,217,.16);color:var(--blue);}
.se-badge--emerald{background:rgba(52,211,153,.16);color:var(--emerald);}
.se-badge--violet{background:rgba(124,58,237,.18);color:#a78bfa;}
.se-badge--neutral{background:var(--surf);color:var(--tx-m);}
/* solid — for listing corner badges over photos */
.se-badge--solid{color:#fff;}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-badge-css')) {
  const s = document.createElement('style');
  s.id = 'se-badge-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Small status/label pill. `tone` sets a translucent-fill colour;
 * pass `solidColor` for an opaque badge over imagery (listing corner badge).
 */
function Badge({
  tone = 'gold',
  dot = false,
  solidColor,
  icon = null,
  children,
  className = '',
  style = {},
  ...rest
}) {
  const cls = ['se-badge', `se-badge--${tone}`, dot ? 'se-badge--dot' : '', solidColor ? 'se-badge--solid' : '', className].filter(Boolean).join(' ');
  const st = solidColor ? {
    background: solidColor,
    ...style
  } : style;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls,
    style: st
  }, rest), icon, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Inject component CSS once (keeps hover/active/focus states clean). */
const CSS = `
.se-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;
  font-family:var(--font-ui);font-weight:600;letter-spacing:var(--label-tracking);
  text-transform:uppercase;cursor:pointer;border:1px solid transparent;
  border-radius:var(--radius-sm);white-space:nowrap;text-decoration:none;
  transition:transform var(--dur-base) var(--ease-silk),box-shadow var(--dur-base) var(--ease-silk),background var(--dur-base) var(--ease-std),border-color var(--dur-base) var(--ease-std),color var(--dur-base) var(--ease-std);}
.se-btn:active{transform:scale(.98);}
.se-btn:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none;}
.se-btn svg{width:1.05em;height:1.05em;}
/* sizes */
.se-btn--sm{height:var(--control-sm);padding:0 16px;font-size:11px;}
.se-btn--md{height:var(--control-md);padding:0 22px;font-size:12px;}
.se-btn--lg{height:var(--control-lg);padding:0 30px;font-size:13px;}
/* variants */
.se-btn--primary{background:var(--grad-gold);color:var(--bg-d);box-shadow:0 6px 18px rgba(200,150,26,.28);}
.se-btn--primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 30px rgba(200,150,26,.42);}
.se-btn--secondary{background:transparent;border-color:var(--bd-s);color:var(--tx);}
.se-btn--secondary:hover:not(:disabled){border-color:var(--gold);color:var(--gold);}
.se-btn--ghost{background:var(--surf);border-color:var(--bd);color:var(--tx);}
.se-btn--ghost:hover:not(:disabled){background:var(--surf-2);border-color:var(--bd-gold);}
.se-btn--danger{background:var(--grad-red);color:#fff;box-shadow:0 6px 18px rgba(230,57,70,.28);}
.se-btn--danger:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 30px rgba(230,57,70,.42);}
.se-btn--block{width:100%;}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-btn-css')) {
  const s = document.createElement('style');
  s.id = 'se-btn-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Primary action button. Gold-gradient primary is the signature CTA;
 * secondary/ghost recede; danger uses the red gradient.
 */
function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  as = 'button',
  children,
  className = '',
  ...rest
}) {
  const Tag = as;
  const cls = ['se-btn', `se-btn--${variant}`, `se-btn--${size}`, block ? 'se-btn--block' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls,
    disabled: Tag === 'button' ? disabled : undefined
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.se-card{background:var(--bg-e);border:1px solid var(--bd);border-radius:var(--radius-lg);
  transition:transform var(--dur-slow) var(--ease-silk),box-shadow var(--dur-slow) var(--ease-silk),border-color var(--dur-slow) var(--ease-silk);}
.se-card--pad{padding:var(--space-lg);}
.se-card--hover:hover{transform:translateY(-4px);border-color:var(--bd-gold);box-shadow:var(--shd-gold);}
.se-card--glass{background:var(--surf);backdrop-filter:blur(14px);}
.se-card--well{background:var(--bg-d);}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-card-css')) {
  const s = document.createElement('style');
  s.id = 'se-card-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Generic surface container. */
function Card({
  variant = 'solid',
  pad = true,
  hover = false,
  children,
  className = '',
  ...rest
}) {
  const cls = ['se-card', variant === 'glass' ? 'se-card--glass' : '', variant === 'well' ? 'se-card--well' : '', pad ? 'se-card--pad' : '', hover ? 'se-card--hover' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Chip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.se-chip{display:inline-flex;align-items:center;gap:7px;cursor:pointer;user-select:none;
  font-family:var(--font-ui);font-weight:600;font-size:13px;
  padding:0 16px;height:38px;border-radius:var(--radius-pill);
  background:var(--surf);border:1px solid var(--bd);color:var(--tx);
  transition:all var(--dur-base) var(--ease-silk);}
.se-chip:hover{border-color:var(--bd-gold);}
.se-chip svg{width:15px;height:15px;}
.se-chip--on{background:var(--grad-gold);border-color:var(--gold);color:var(--bg-d);
  box-shadow:0 3px 16px rgba(200,150,26,.28);}
.se-chip--sm{height:32px;font-size:12px;padding:0 13px;}
.se-chip:disabled{opacity:.4;cursor:not-allowed;}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-chip-css')) {
  const s = document.createElement('style');
  s.id = 'se-chip-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Toggleable filter chip / pill. Turns gold when `active`. */
function Chip({
  active = false,
  size = 'md',
  icon = null,
  children,
  className = '',
  ...rest
}) {
  const cls = ['se-chip', active ? 'se-chip--on' : '', size === 'sm' ? 'se-chip--sm' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls,
    "aria-pressed": active
  }, rest), icon, children);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Chip.jsx", error: String((e && e.message) || e) }); }

// components/core/Eyebrow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.se-eyebrow{display:inline-flex;align-items:center;gap:10px;
  font-family:var(--font-mono);font-size:var(--mono-sm);font-weight:600;
  text-transform:uppercase;letter-spacing:var(--eyebrow-tracking);color:var(--gold);}
.se-eyebrow::before{content:'';width:22px;height:1px;background:var(--gold);flex-shrink:0;}
.se-eyebrow--center{justify-content:center;}
.se-eyebrow--center::after{content:'';width:22px;height:1px;background:var(--gold);flex-shrink:0;}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-eyebrow-css')) {
  const s = document.createElement('style');
  s.id = 'se-eyebrow-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** The signature section eyebrow — mono uppercase gold with a leading rule. */
function Eyebrow({
  center = false,
  children,
  className = '',
  ...rest
}) {
  const cls = ['se-eyebrow', center ? 'se-eyebrow--center' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), children);
}
Object.assign(__ds_scope, { Eyebrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Eyebrow.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.se-iconbtn{display:inline-grid;place-items:center;cursor:pointer;
  background:var(--surf);border:1px solid var(--bd);color:var(--tx);
  border-radius:var(--radius-sm);
  transition:all var(--dur-base) var(--ease-silk);}
.se-iconbtn:hover:not(:disabled){border-color:var(--gold);color:var(--gold);}
.se-iconbtn:active{transform:scale(.94);}
.se-iconbtn:disabled{opacity:.4;cursor:not-allowed;}
.se-iconbtn svg{width:1.15em;height:1.15em;}
.se-iconbtn--sm{width:34px;height:34px;font-size:15px;}
.se-iconbtn--md{width:44px;height:44px;font-size:18px;}
.se-iconbtn--lg{width:54px;height:54px;font-size:21px;}
.se-iconbtn--round{border-radius:var(--radius-pill);}
.se-iconbtn--solid{background:var(--grad-gold);border-color:transparent;color:var(--bg-d);box-shadow:0 4px 14px rgba(200,150,26,.3);}
.se-iconbtn--solid:hover:not(:disabled){color:var(--bg-d);transform:translateY(-2px);box-shadow:0 8px 22px rgba(200,150,26,.42);}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-iconbtn-css')) {
  const s = document.createElement('style');
  s.id = 'se-iconbtn-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Square/round icon-only button. Provide an aria-label. */
function IconButton({
  size = 'md',
  round = false,
  solid = false,
  disabled = false,
  children,
  className = '',
  ...rest
}) {
  const cls = ['se-iconbtn', `se-iconbtn--${size}`, round ? 'se-iconbtn--round' : '', solid ? 'se-iconbtn--solid' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls,
    disabled: disabled
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.se-field{display:flex;flex-direction:column;gap:7px;width:100%;}
.se-field__label{font-family:var(--font-ui);font-size:12px;font-weight:600;color:var(--tx-m);}
.se-field__wrap{display:flex;align-items:center;gap:9px;
  background:var(--surf);border:1px solid var(--bd);border-radius:var(--radius-sm);
  padding:0 14px;height:var(--control-md);transition:border-color var(--dur-base) var(--ease-std),box-shadow var(--dur-base) var(--ease-std);}
.se-field__wrap:focus-within{border-color:var(--gold);box-shadow:0 0 0 3px rgba(200,150,26,.14);}
.se-field__wrap svg{width:17px;height:17px;color:var(--tx-f);flex-shrink:0;}
.se-field__input{flex:1;min-width:0;background:none;border:none;outline:none;
  font-family:var(--font-ui);font-size:14px;color:var(--tx);}
.se-field__input::placeholder{color:var(--tx-f);}
.se-field--error .se-field__wrap{border-color:var(--red);}
.se-field__hint{font-family:var(--font-ui);font-size:11px;color:var(--tx-f);}
.se-field--error .se-field__hint{color:var(--red);}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-field-css')) {
  const s = document.createElement('style');
  s.id = 'se-field-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Labelled text input with optional leading icon, hint and error state. */
function Input({
  label,
  hint,
  error = false,
  icon = null,
  iconRight = null,
  className = '',
  id,
  ...rest
}) {
  const fid = id || (label ? 'in-' + label.replace(/\s+/g, '-').toLowerCase() : undefined);
  const cls = ['se-field', error ? 'se-field--error' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: cls
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "se-field__label",
    htmlFor: fid
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "se-field__wrap"
  }, icon, /*#__PURE__*/React.createElement("input", _extends({
    id: fid,
    className: "se-field__input"
  }, rest)), iconRight), hint && /*#__PURE__*/React.createElement("span", {
    className: "se-field__hint"
  }, hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/RangeSlider.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.se-range{display:flex;flex-direction:column;gap:10px;width:100%;}
.se-range__head{display:flex;align-items:baseline;justify-content:space-between;}
.se-range__label{font-family:var(--font-ui);font-size:12px;font-weight:600;color:var(--tx-m);}
.se-range__val{font-family:var(--font-mono);font-size:13px;font-weight:700;color:var(--gold-lt);}
.se-range__input{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;outline:none;
  background:var(--bd-s);}
.se-range__input::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;cursor:pointer;
  background:var(--grad-gold);box-shadow:0 3px 10px rgba(200,150,26,.4);transition:transform var(--dur-fast) var(--ease-std);}
.se-range__input::-webkit-slider-thumb:hover{transform:scale(1.2);}
.se-range__input::-moz-range-thumb{width:18px;height:18px;border:none;border-radius:50%;cursor:pointer;
  background:var(--gold);box-shadow:0 3px 10px rgba(200,150,26,.4);}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-range-css')) {
  const s = document.createElement('style');
  s.id = 'se-range-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Labelled range slider with a live formatted value (price, area…). */
function RangeSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  format,
  className = '',
  ...rest
}) {
  const shown = format ? format(value) : value;
  const pct = (value - min) / (max - min) * 100;
  return /*#__PURE__*/React.createElement("div", {
    className: ['se-range', className].filter(Boolean).join(' ')
  }, /*#__PURE__*/React.createElement("div", {
    className: "se-range__head"
  }, label && /*#__PURE__*/React.createElement("span", {
    className: "se-range__label"
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "se-range__val"
  }, shown)), /*#__PURE__*/React.createElement("input", _extends({
    type: "range",
    className: "se-range__input",
    min: min,
    max: max,
    step: step,
    value: value,
    style: {
      background: `linear-gradient(90deg, var(--gold) ${pct}%, var(--bd-s) ${pct}%)`
    },
    onChange: e => onChange && onChange(Number(e.target.value))
  }, rest)));
}
Object.assign(__ds_scope, { RangeSlider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/RangeSlider.jsx", error: String((e && e.message) || e) }); }

// components/forms/SegmentedControl.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.se-seg{display:inline-flex;padding:4px;gap:2px;
  background:var(--surf);border:1px solid var(--bd);border-radius:var(--radius-pill);}
.se-seg__opt{border:none;cursor:pointer;background:none;
  font-family:var(--font-ui);font-weight:600;font-size:13px;color:var(--tx-m);
  padding:0 20px;height:36px;border-radius:var(--radius-pill);white-space:nowrap;
  transition:all var(--dur-base) var(--ease-silk);}
.se-seg__opt:hover{color:var(--tx);}
.se-seg__opt--on{background:var(--grad-gold);color:var(--bg-d);box-shadow:0 3px 14px rgba(200,150,26,.28);}
.se-seg__opt--on:hover{color:var(--bg-d);}
.se-seg--sm .se-seg__opt{height:30px;font-size:12px;padding:0 15px;}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-seg-css')) {
  const s = document.createElement('style');
  s.id = 'se-seg-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Segmented control — the All / Rent / Resale style toggle. */
function SegmentedControl({
  options = [],
  value,
  onChange,
  size = 'md',
  className = '',
  ...rest
}) {
  const cls = ['se-seg', size === 'sm' ? 'se-seg--sm' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    role: "tablist"
  }, rest), options.map(o => {
    const val = typeof o === 'string' ? o : o.value;
    const lbl = typeof o === 'string' ? o : o.label;
    const on = val === value;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      role: "tab",
      "aria-selected": on,
      className: ['se-seg__opt', on ? 'se-seg__opt--on' : ''].filter(Boolean).join(' '),
      onClick: () => onChange && onChange(val)
    }, lbl);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.se-select{position:relative;display:flex;flex-direction:column;gap:7px;width:100%;}
.se-select__label{font-family:var(--font-ui);font-size:12px;font-weight:600;color:var(--tx-m);}
.se-select__control{appearance:none;width:100%;cursor:pointer;
  background:var(--surf);border:1px solid var(--bd);border-radius:var(--radius-sm);
  padding:0 38px 0 14px;height:var(--control-md);
  font-family:var(--font-ui);font-size:14px;color:var(--tx);
  transition:border-color var(--dur-base) var(--ease-std);}
.se-select__control:hover{border-color:var(--bd-gold);}
.se-select__control:focus{outline:none;border-color:var(--gold);box-shadow:0 0 0 3px rgba(200,150,26,.14);}
.se-select__chev{position:absolute;right:14px;bottom:13px;width:16px;height:16px;color:var(--tx-f);pointer-events:none;}
.se-select__control option{background:var(--bg-e);color:var(--tx);}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-select-css')) {
  const s = document.createElement('style');
  s.id = 'se-select-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Native select styled to the system, with a chevron. */
function Select({
  label,
  options = [],
  placeholder,
  className = '',
  id,
  children,
  ...rest
}) {
  const fid = id || (label ? 'sel-' + label.replace(/\s+/g, '-').toLowerCase() : undefined);
  return /*#__PURE__*/React.createElement("div", {
    className: ['se-select', className].filter(Boolean).join(' ')
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "se-select__label",
    htmlFor: fid
  }, label), /*#__PURE__*/React.createElement("select", _extends({
    id: fid,
    className: "se-select__control"
  }, rest), placeholder && /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, placeholder), children || options.map(o => {
    const val = typeof o === 'string' ? o : o.value;
    const lbl = typeof o === 'string' ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: val,
      value: val
    }, lbl);
  })), /*#__PURE__*/React.createElement("svg", {
    className: "se-select__chev",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.se-switch{display:inline-flex;align-items:center;gap:10px;cursor:pointer;user-select:none;
  font-family:var(--font-ui);font-size:13px;color:var(--tx);}
.se-switch__track{width:42px;height:24px;border-radius:var(--radius-pill);background:var(--bd-s);
  position:relative;transition:background var(--dur-base) var(--ease-std);flex-shrink:0;}
.se-switch__thumb{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;
  background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform var(--dur-base) var(--ease-silk);}
.se-switch--on .se-switch__track{background:var(--gold);}
.se-switch--on .se-switch__thumb{transform:translateX(18px);}
.se-switch--disabled{opacity:.4;cursor:not-allowed;}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-switch-css')) {
  const s = document.createElement('style');
  s.id = 'se-switch-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** On/off toggle switch with optional label. */
function Switch({
  checked = false,
  onChange,
  label,
  disabled = false,
  className = '',
  ...rest
}) {
  const cls = ['se-switch', checked ? 'se-switch--on' : '', disabled ? 'se-switch--disabled' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", _extends({
    className: cls
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "se-switch__track",
    role: "switch",
    "aria-checked": checked,
    onClick: () => !disabled && onChange && onChange(!checked)
  }, /*#__PURE__*/React.createElement("span", {
    className: "se-switch__thumb"
  })), label && /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.se-tabs{display:flex;gap:4px;border-bottom:1px solid var(--bd);}
.se-tab{position:relative;border:none;background:none;cursor:pointer;
  font-family:var(--font-ui);font-weight:600;font-size:13px;color:var(--tx-m);
  padding:12px 18px;transition:color var(--dur-base) var(--ease-std);}
.se-tab:hover{color:var(--tx);}
.se-tab--on{color:var(--gold);}
.se-tab__ink{position:absolute;left:14px;right:14px;bottom:-1px;height:2px;background:var(--gold);border-radius:2px;
  transform:scaleX(0);transform-origin:center;transition:transform var(--dur-base) var(--ease-silk);}
.se-tab--on .se-tab__ink{transform:scaleX(1);}
.se-tab__count{margin-inline-start:7px;font-family:var(--font-mono);font-size:10px;color:var(--tx-f);}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-tabs-css')) {
  const s = document.createElement('style');
  s.id = 'se-tabs-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Underline tab bar. Options: string | {value,label,count}. */
function Tabs({
  tabs = [],
  value,
  onChange,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['se-tabs', className].filter(Boolean).join(' '),
    role: "tablist"
  }, rest), tabs.map(t => {
    const val = typeof t === 'string' ? t : t.value;
    const lbl = typeof t === 'string' ? t : t.label;
    const count = typeof t === 'object' ? t.count : undefined;
    const on = val === value;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      role: "tab",
      "aria-selected": on,
      className: ['se-tab', on ? 'se-tab--on' : ''].filter(Boolean).join(' '),
      onClick: () => onChange && onChange(val)
    }, lbl, count != null && /*#__PURE__*/React.createElement("span", {
      className: "se-tab__count"
    }, count), /*#__PURE__*/React.createElement("span", {
      className: "se-tab__ink"
    }));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/property/PropertyCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.se-pcard{position:relative;display:flex;flex-direction:column;text-align:start;cursor:pointer;
  background:var(--bg-e);border:1px solid var(--bd);border-radius:var(--radius-lg);overflow:hidden;
  transition:transform var(--dur-slow) var(--ease-silk),box-shadow var(--dur-slow) var(--ease-silk),border-color var(--dur-slow) var(--ease-silk);}
.se-pcard:hover{transform:translateY(-5px);border-color:var(--bd-gold);box-shadow:var(--shd-gold);}
.se-pcard__media{position:relative;aspect-ratio:4/3;overflow:hidden;background:var(--bg-e2);}
.se-pcard__img{width:100%;height:100%;object-fit:cover;transition:transform var(--dur-xslow) var(--ease-silk);}
.se-pcard:hover .se-pcard__img{transform:scale(1.06);}
.se-pcard__scrim{position:absolute;inset:0;background:linear-gradient(to top,var(--ov-c),transparent 55%);}
.se-pcard__code{position:absolute;top:11px;left:11px;font-family:var(--font-mono);font-weight:700;font-size:9px;
  letter-spacing:.12em;color:var(--gold-lt);background:rgba(8,21,38,.7);backdrop-filter:blur(6px);
  padding:5px 9px;border-radius:var(--radius-pill);border:1px solid rgba(233,193,118,.25);}
.se-pcard__badge{position:absolute;top:11px;right:11px;font-family:var(--font-mono);font-weight:700;font-size:9px;
  letter-spacing:.1em;text-transform:uppercase;color:#fff;padding:5px 10px;border-radius:var(--radius-pill);}
.se-pcard__ai{position:absolute;bottom:11px;left:11px;display:flex;align-items:center;gap:6px;
  font-family:var(--font-mono);font-weight:700;font-size:10px;color:var(--emerald);
  background:rgba(8,21,38,.62);backdrop-filter:blur(6px);padding:4px 9px;border-radius:var(--radius-pill);}
.se-pcard__ai .live-dot{background:var(--emerald);animation:pulseGold 2s infinite;}
.se-pcard__save{position:absolute;bottom:11px;right:11px;width:34px;height:34px;display:grid;place-items:center;
  border:none;cursor:pointer;border-radius:50%;background:rgba(8,21,38,.62);backdrop-filter:blur(6px);
  color:#fff;transition:all var(--dur-base) var(--ease-silk);}
.se-pcard__save:hover{background:rgba(8,21,38,.85);}
.se-pcard__save svg{width:16px;height:16px;}
.se-pcard__save--on{color:var(--red);}
.se-pcard__save--on svg{fill:var(--red);}
.se-pcard__body{padding:15px 16px 17px;display:flex;flex-direction:column;gap:9px;}
.se-pcard__loc{font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--tx-f);}
.se-pcard__title{font-family:var(--font-display);font-weight:600;font-size:19px;line-height:1.15;color:var(--tx-s);}
.se-pcard__price{font-family:var(--font-mono);font-weight:700;font-size:16px;color:var(--gold-lt);}
.se-pcard__specs{display:flex;gap:14px;margin-top:2px;padding-top:11px;border-top:1px solid var(--bd);}
.se-pcard__spec{display:flex;align-items:center;gap:6px;font-family:var(--font-ui);font-size:12px;color:var(--tx-m);}
.se-pcard__spec svg{width:15px;height:15px;color:var(--tx-f);}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-pcard-css')) {
  const s = document.createElement('style');
  s.id = 'se-pcard-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
const svg = {
  bed: 'M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9',
  bath: 'M10 4 8 6M17 19v2M2 12h20M7 19v2M9 5 7.621 3.621A2.121 2.121 0 0 0 4 5v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5',
  area: 'M4 4h16v16H4z',
  heart: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'
};
function I({
  d
}) {
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: d
  }));
}

/**
 * Signature property listing card: photo with SBR code, listing badge,
 * live AI score and save button; title, price and beds/baths/area specs.
 * Hover lifts the card, glows the border gold and zooms the image.
 */
function PropertyCard({
  image,
  code,
  title,
  location,
  price,
  badge,
  badgeColor = '#C8961A',
  aiScore,
  beds,
  baths,
  area,
  saved = false,
  onSave,
  onClick,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['se-pcard', className].filter(Boolean).join(' '),
    onClick: onClick
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "se-pcard__media"
  }, image && /*#__PURE__*/React.createElement("img", {
    className: "se-pcard__img",
    src: image,
    alt: title,
    loading: "lazy"
  }), /*#__PURE__*/React.createElement("div", {
    className: "se-pcard__scrim"
  }), code && /*#__PURE__*/React.createElement("span", {
    className: "se-pcard__code"
  }, code), badge && /*#__PURE__*/React.createElement("span", {
    className: "se-pcard__badge",
    style: {
      background: badgeColor
    }
  }, badge), aiScore != null && /*#__PURE__*/React.createElement("span", {
    className: "se-pcard__ai"
  }, /*#__PURE__*/React.createElement("span", {
    className: "live-dot"
  }), "AI ", aiScore), /*#__PURE__*/React.createElement("button", {
    className: ['se-pcard__save', saved ? 'se-pcard__save--on' : ''].filter(Boolean).join(' '),
    "aria-label": saved ? 'Saved' : 'Save',
    onClick: e => {
      e.stopPropagation();
      onSave && onSave(!saved);
    }
  }, /*#__PURE__*/React.createElement(I, {
    d: svg.heart
  }))), /*#__PURE__*/React.createElement("div", {
    className: "se-pcard__body"
  }, location && /*#__PURE__*/React.createElement("span", {
    className: "se-pcard__loc"
  }, location), title && /*#__PURE__*/React.createElement("h3", {
    className: "se-pcard__title"
  }, title), price && /*#__PURE__*/React.createElement("span", {
    className: "se-pcard__price"
  }, price), (beds != null || baths != null || area != null) && /*#__PURE__*/React.createElement("div", {
    className: "se-pcard__specs"
  }, beds != null && /*#__PURE__*/React.createElement("span", {
    className: "se-pcard__spec"
  }, /*#__PURE__*/React.createElement(I, {
    d: svg.bed
  }), beds), baths != null && /*#__PURE__*/React.createElement("span", {
    className: "se-pcard__spec"
  }, /*#__PURE__*/React.createElement(I, {
    d: svg.bath
  }), baths), area != null && /*#__PURE__*/React.createElement("span", {
    className: "se-pcard__spec"
  }, /*#__PURE__*/React.createElement(I, {
    d: svg.area
  }), area, " m\xB2"))));
}
Object.assign(__ds_scope, { PropertyCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/property/PropertyCard.jsx", error: String((e && e.message) || e) }); }

// components/property/StatBlock.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.se-stats{display:grid;background:var(--surf);border:1px solid var(--bd);border-radius:var(--radius-lg);overflow:hidden;}
.se-stat{text-align:center;padding:18px 12px;border-right:1px solid var(--bd);border-bottom:1px solid var(--bd);}
.se-stat__v{font-family:var(--font-mono);font-weight:700;font-size:24px;line-height:1;color:var(--gold);}
.se-stat__l{font-family:var(--font-ui);font-size:9px;text-transform:uppercase;letter-spacing:.2em;color:var(--tx-f);margin-top:8px;}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-stats-css')) {
  const s = document.createElement('style');
  s.id = 'se-stats-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Grid of headline stats (hero / dashboard KPI strip). Mono value + label. */
function StatBlock({
  stats = [],
  columns,
  className = '',
  style = {},
  ...rest
}) {
  const cols = columns || stats.length || 1;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['se-stats', className].filter(Boolean).join(' '),
    style: {
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      ...style
    }
  }, rest), stats.map((s, i) => /*#__PURE__*/React.createElement("div", {
    className: "se-stat",
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "se-stat__v"
  }, s.value), /*#__PURE__*/React.createElement("div", {
    className: "se-stat__l"
  }, s.label))));
}
Object.assign(__ds_scope, { StatBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/property/StatBlock.jsx", error: String((e && e.message) || e) }); }

// sections.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Sierra Estates — Client Portal (mobile-first, responsive) */
const {
  useState,
  useEffect,
  useRef,
  useMemo,
  createContext,
  useContext
} = React;

/* ── HERO ── */
function Hero(props) {
  var purpose = props.purpose,
    setPurpose = props.setPurpose,
    beds = props.beds,
    setBeds = props.setBeds,
    search = props.search,
    setSearch = props.setSearch,
    onReq = props.onReq,
    filterOpen = props.filterOpen,
    setFilterOpen = props.setFilterOpen;
  var c = useApp();
  var dark = c.dark,
    lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var SLIDES = [{
    pre: 'FIRST & ONLY WEBSITE IN EGYPT DESIGNED FOR NEW CAIRO',
    main: 'The First Exclusive Destination for New Cairo Properties. Rent & Resale.',
    img: 'https://images.unsplash.com/photo-1613977257592-4a9a32f9141a?w=1200&q=90'
  }, {
    pre: 'BEST-IN-CLASS DESIGN',
    main: 'Redefining Luxury Living with AI-Driven Excellence',
    img: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200&q=90'
  }, {
    pre: 'AI-DRIVEN EXCELLENCE',
    main: 'Smart Matches for Smart Investors',
    img: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?w=1200&q=90'
  }, {
    pre: 'EXCLUSIVE NETWORK',
    main: 'Unrivaled Access to Premium Compounds',
    img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=90'
  }, {
    pre: 'CURATED PORTFOLIO',
    main: 'Your Journey to Exceptional Homes Begins Here',
    img: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=1200&q=90'
  }];
  var imgI = useState(0);
  var setImgI = imgI[1];
  imgI = imgI[0];
  useEffect(function () {
    SLIDES.forEach(function (sl) {
      var im = new Image();
      im.src = sl.img;
    });
    var id = setInterval(function () {
      setImgI(function (i) {
        return (i + 1) % SLIDES.length;
      });
    }, 3200);
    return function () {
      clearInterval(id);
    };
  }, []);
  return /*#__PURE__*/React.createElement("section", {
    id: "s-hero",
    style: {
      position: 'relative',
      background: '#00131f',
      minHeight: 380,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      padding: '18px 0 0',
      overflow: 'hidden'
    }
  }, SLIDES.map(function (sl, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url(' + sl.img + ')',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: i === imgI ? 1 : 0,
        transition: 'opacity .5s ease',
        zIndex: 0
      }
    });
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(172deg,rgba(0,10,25,.95) 0%,rgba(0,25,55,.72) 50%,rgba(0,0,0,.2) 100%)',
      zIndex: 0,
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "hero-inner",
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px',
      marginBottom: 14,
      direction: 'ltr'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 1.5,
      background: G,
      display: 'block',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "hero-eye",
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 6.5,
      color: G,
      letterSpacing: '.16em',
      textTransform: 'uppercase',
      lineHeight: 1.5
    }
  }, SLIDES[imgI].pre)), /*#__PURE__*/React.createElement("h1", {
    className: "hero-h1",
    style: {
      fontFamily: HEADING_FONT,
      fontSize: 28,
      fontWeight: 500,
      lineHeight: 1.1,
      marginBottom: 14,
      color: '#fff',
      textShadow: '0 2px 26px rgba(0,0,0,.88), 0 0 56px rgba(200,150,26,.3)',
      letterSpacing: '-.01em'
    }
  }, SLIDES[imgI].main), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 5,
      alignItems: 'center'
    }
  }, SLIDES.map(function (sl, i) {
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: function () {
        setImgI(i);
      },
      style: {
        height: 3,
        width: i === imgI ? 24 : 7,
        borderRadius: 2,
        background: i === imgI ? G : 'rgba(255,255,255,.3)',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        transition: 'all .4s cubic-bezier(.16,1,.3,1)'
      }
    });
  }))), /*#__PURE__*/React.createElement("div", {
    className: "hero-filter",
    style: {
      padding: '0 20px',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 3,
      background: 'rgba(7,21,36,.65)',
      backdropFilter: 'blur(14px)',
      border: '1px solid rgba(200,150,26,.3)',
      borderRadius: 11,
      padding: 3,
      flex: 1
    }
  }, [['resale', isAr ? 'بيع' : 'Resale'], ['rent', isAr ? 'إيجار' : 'Rent']].map(function (p) {
    return /*#__PURE__*/React.createElement("button", {
      key: p[0],
      onClick: function () {
        setPurpose(p[0]);
      },
      style: {
        flex: 1,
        padding: '9px 4px',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        border: 'none',
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
        transition: 'all .22s cubic-bezier(.4,0,.2,1)',
        background: purpose === p[0] ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'transparent',
        color: purpose === p[0] ? N : 'rgba(255,255,255,.55)'
      }
    }, p[1]);
  })), /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setFilterOpen(true);
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '11px 16px',
      borderRadius: 11,
      background: 'linear-gradient(135deg,' + G + ',' + GL + ')',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 4px 18px rgba(200,150,26,.4)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: N,
    strokeWidth: "2.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 6h16M7 12h10M10 18h4"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 900,
      color: N,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, isAr ? 'فلتر' : 'Filters')))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      paddingBottom: 18
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      var el = document.getElementById('s-map');
      var sc = document.getElementById('root-scroll');
      if (el && sc) sc.scrollTo({
        top: el.offsetTop - 60,
        behavior: 'smooth'
      });
    },
    style: {
      padding: '9px 28px',
      borderRadius: 50,
      background: 'rgba(7,21,36,.72)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      border: '1px solid rgba(200,150,26,.45)',
      color: 'rgba(200,150,26,.95)',
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer',
      fontFamily: 'Inter',
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      letterSpacing: '.06em',
      boxShadow: '0 0 18px rgba(200,150,26,.22)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "10",
    r: "3"
  })), "View Map"))));
}

/* ── LISTINGS ── */ /* ── LISTINGS ── */
function Listings(props) {
  var purpose = props.purpose,
    search = props.search,
    beds = props.beds,
    onTap = props.onTap,
    saved = props.saved,
    onSave = props.onSave;
  var c = useApp();
  var dark = c.dark,
    lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var C = th(dark);
  var sort = useState('ai');
  var setSort = sort[1];
  sort = sort[0];
  var cmpF = useState(new Set());
  var setCmpF = cmpF[1];
  cmpF = cmpF[0];
  var cmpOpen = useState(false);
  var setCmpOpen = cmpOpen[1];
  cmpOpen = cmpOpen[0];
  var rv = useScrollAnim(60);
  var ref = rv[0],
    vis = rv[1];
  var pg = useState(0);
  var page = pg[0],
    setPage = pg[1];
  var dxs = useState(0);
  var dragX = dxs[0],
    setDragX = dxs[1];
  var swRef = useRef({
    on: false,
    sx: 0,
    dx: 0
  });
  var sq = useState(search || '');
  var searchQ = sq[0],
    setSearchQ = sq[1];
  useEffect(function () {
    setSearchQ(search || '');
  }, [search]);
  var q = (searchQ || '').trim();
  var items = useMemo(function () {
    var l = FEATURED.slice();
    if (cmpF.size > 0) l = l.filter(function (x) {
      return cmpF.has(x.cmp);
    });
    if (q) {
      var qq = q.toLowerCase();
      l = l.filter(function (x) {
        return x.cmp.toLowerCase().indexOf(qq) >= 0 || x.type.toLowerCase().indexOf(qq) >= 0 || (x.beds + 'b').indexOf(qq) >= 0;
      });
    }
    if (beds != null && beds > 0) l = l.filter(function (x) {
      return x.beds === beds;
    });
    if (sort === 'ai') l.sort(function (a, b) {
      return b.ai - a.ai;
    });else if (sort === 'px') l.sort(function (a, b) {
      return a.egpM - b.egpM;
    });else if (sort === 'pd') l.sort(function (a, b) {
      return b.egpM - a.egpM;
    });else l.sort(function (a, b) {
      return b.area - a.area;
    });
    return l;
  }, [purpose, q, beds, sort, cmpF.size]);
  var PER = 4;
  var pages = Math.max(1, Math.ceil(items.length / PER));
  useEffect(function () {
    setPage(0);
  }, [q, beds, sort, cmpF.size, purpose]);
  var pageSafe = Math.min(page, pages - 1);
  var shown = items.slice(pageSafe * PER, pageSafe * PER + PER);
  function priceStr(item) {
    return purpose === 'rent' ? '$' + item.usd.toLocaleString() + '/mo' : 'EGP ' + item.egpM + 'M';
  }
  function swDown(e) {
    var p = e.touches ? e.touches[0] : e;
    swRef.current = {
      on: true,
      sx: p.clientX,
      dx: 0
    };
  }
  function swMove(e) {
    if (!swRef.current.on) return;
    var p = e.touches ? e.touches[0] : e;
    var dx = p.clientX - swRef.current.sx;
    if (pageSafe === 0 && dx > 0 || pageSafe >= pages - 1 && dx < 0) dx *= 0.3;
    swRef.current.dx = dx;
    setDragX(dx);
  }
  function swUp() {
    if (!swRef.current.on) return;
    var dx = swRef.current.dx;
    swRef.current.on = false;
    if (dx < -60 && pageSafe < pages - 1) setPage(pageSafe + 1);else if (dx > 60 && pageSafe > 0) setPage(pageSafe - 1);
    setDragX(0);
  }
  var Mo = (window.Motion || {}).motion;
  function cardGrid(item, i) {
    var isGold = item.tag === 'Premium' || item.tag === 'Exclusive';
    var Wrap = Mo ? Mo.div : 'div';
    var motionProps = Mo ? {
      initial: {
        opacity: 0,
        y: 22,
        scale: .96
      },
      whileInView: {
        opacity: 1,
        y: 0,
        scale: 1
      },
      viewport: {
        once: true,
        amount: .3
      },
      transition: {
        duration: .45,
        delay: i % 4 * .06,
        ease: 'easeOut'
      },
      whileHover: {
        y: -5,
        boxShadow: '0 14px 34px rgba(13,32,53,.18)'
      },
      whileTap: {
        scale: .97
      }
    } : {};
    return /*#__PURE__*/React.createElement(Wrap, _extends({
      key: item.id,
      onClick: function () {
        if (Math.abs(swRef.current.dx) > 8) return;
        onTap(item);
      },
      style: {
        background: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(13,32,53,.08)',
        cursor: 'pointer',
        boxShadow: '0 3px 16px rgba(13,32,53,.08)'
      }
    }, motionProps), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        height: 150
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: item.img,
      alt: "",
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        pointerEvents: 'none'
      },
      draggable: "false",
      loading: "lazy"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top,rgba(13,32,53,.55),transparent 50%)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 9,
        left: 9,
        background: 'rgba(7,21,36,.85)',
        border: '1px solid rgba(200,150,26,.45)',
        borderRadius: 20,
        padding: '2px 9px',
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 9,
        fontWeight: 700,
        color: G
      }
    }, "\u25B2 ", item.ai), item.tag && /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 9,
        right: 34,
        padding: '2px 9px',
        borderRadius: 20,
        fontSize: 9,
        fontWeight: 900,
        textTransform: 'uppercase',
        background: isGold ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'rgba(7,21,36,.85)',
        color: isGold ? N : 'rgba(200,150,26,.9)',
        border: isGold ? 'none' : '1px solid rgba(200,150,26,.3)'
      }
    }, item.tag), /*#__PURE__*/React.createElement("button", {
      onClick: function (e) {
        e.stopPropagation();
        onSave(item.id);
      },
      style: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 26,
        height: 26,
        borderRadius: '50%',
        background: 'rgba(0,0,0,.3)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        color: saved.has(item.id) ? '#ef4444' : 'rgba(255,255,255,.7)'
      }
    }, saved.has(item.id) ? '♥' : '♡')), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '10px 12px 12px',
        direction: isAr ? 'rtl' : 'ltr'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 8,
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        color: N,
        marginBottom: 2
      }
    }, item.cmp), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
        fontSize: 14,
        fontWeight: 600,
        color: N,
        lineHeight: 1.2,
        marginBottom: 3
      }
    }, item.beds, "B ", item.type), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 8.5,
        color: '#8A94A0',
        marginBottom: 5
      }
    }, item.bath, " BA \xB7 ", item.area, " m\xB2"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 13,
        fontWeight: 700,
        color: G
      }
    }, priceStr(item))));
  }
  var cmpLabel = cmpF.size === 0 ? t.allCpd : cmpF.size === 1 ? cmpF.size + t.nSel : cmpF.size + t[' nSelP'];
  return /*#__PURE__*/React.createElement("section", {
    id: "s-listings",
    style: {
      background: C.bg,
      paddingBottom: 4,
      transition: 'background .3s',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(MorphBlob, {
    size: 480,
    opacity: dark ? .14 : .08,
    style: {
      top: -140,
      right: -160
    }
  }), /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: "sec-inner",
    style: {
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(20px)',
      transition: 'all .55s .1s cubic-bezier(.16,1,.3,1)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px 0',
      flexDirection: isAr ? 'row-reverse' : 'row'
    }
  }, /*#__PURE__*/React.createElement(SH, {
    eye: t.eyeList,
    title: t.propTit + ' (' + items.length + ')'
  }), /*#__PURE__*/React.createElement("select", {
    value: sort,
    onChange: function (e) {
      setSort(e.target.value);
    },
    style: {
      marginTop: 12,
      padding: '6px 10px',
      borderRadius: 8,
      background: dark ? '#1A2C3F' : '#fff',
      border: '1px solid ' + (dark ? 'rgba(200,150,26,.3)' : 'rgba(13,32,53,.15)'),
      fontSize: 10,
      fontWeight: 600,
      color: dark ? G : N,
      outline: 'none',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      flexShrink: 0,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "ai"
  }, "AI \u2193"), /*#__PURE__*/React.createElement("option", {
    value: "px"
  }, "Price \u2191"), /*#__PURE__*/React.createElement("option", {
    value: "pd"
  }, "Price \u2193"), /*#__PURE__*/React.createElement("option", {
    value: "area"
  }, "Area"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 20px 8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '13px 16px',
      borderRadius: 14,
      border: '1px solid ' + (q ? G : dark ? 'rgba(200,150,26,.25)' : 'rgba(13,32,53,.12)'),
      background: dark ? '#122436' : '#fff',
      boxShadow: '0 3px 16px rgba(13,32,53,.06)',
      flexDirection: isAr ? 'row-reverse' : 'row'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 17,
      color: q ? G : '#8A94A0'
    }
  }, "\u2315"), /*#__PURE__*/React.createElement("input", {
    value: searchQ,
    onChange: function (e) {
      setSearchQ(e.target.value);
    },
    placeholder: isAr ? 'ابحث عن كومباوند، نوع الوحدة...' : 'Search compound, type, beds…',
    style: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontSize: 15,
      fontWeight: 500,
      color: dark ? '#EAF0F6' : N,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      textAlign: isAr ? 'right' : 'left',
      minWidth: 0
    }
  }), searchQ && /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setSearchQ('');
    },
    style: {
      fontSize: 16,
      color: '#8A94A0',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      lineHeight: 1,
      padding: 0
    }
  }, "\xD7")), q && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 11,
      color: C.txM,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      textAlign: isAr ? 'right' : 'left'
    }
  }, isAr ? 'نتائج لـ ' : 'Results for ', /*#__PURE__*/React.createElement("span", {
    style: {
      color: G,
      fontWeight: 700
    }
  }, "\u201C", q, "\u201D"), " \u2014 ", items.length, " ", isAr ? 'وحدة' : items.length === 1 ? 'unit' : 'units')), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px 10px',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: function (e) {
      e.stopPropagation();
      setCmpOpen(function (o) {
        return !o;
      });
    },
    style: {
      width: '100%',
      padding: '8px 12px',
      borderRadius: 9,
      border: '1px solid ' + (cmpF.size > 0 ? G : 'rgba(13,32,53,.12)'),
      background: cmpF.size > 0 ? 'rgba(200,150,26,.07)' : 'rgba(13,32,53,.03)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
      fontFamily: 'Inter',
      transition: 'all .2s'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10.5,
      fontWeight: 600,
      color: cmpF.size > 0 ? G : '#8A94A0'
    }
  }, cmpLabel), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, cmpF.size > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: function (e) {
      e.stopPropagation();
      setCmpF(new Set());
    },
    style: {
      fontSize: 13,
      color: '#8A94A0',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      lineHeight: 1
    }
  }, "\xD7"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: '#8A94A0'
    }
  }, "\u25BE"))), cmpOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 'calc(100% - 2px)',
      left: 20,
      right: 20,
      zIndex: 20,
      background: '#fff',
      border: '1px solid rgba(13,32,53,.12)',
      borderRadius: 11,
      boxShadow: '0 8px 32px rgba(13,32,53,.14)',
      padding: '8px',
      maxHeight: 180,
      overflowY: 'auto'
    },
    onClick: function (e) {
      e.stopPropagation();
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      flexWrap: 'wrap'
    }
  }, CPDS.map(function (cpd, i) {
    var on = cmpF.has(cpd.n);
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: function () {
        setCmpF(function (p) {
          var s = new Set(p);
          if (s.has(cpd.n)) s.delete(cpd.n);else s.add(cpd.n);
          return s;
        });
      },
      style: {
        padding: '3px 9px',
        borderRadius: 20,
        fontSize: 9,
        fontWeight: 600,
        cursor: 'pointer',
        border: '1px solid',
        fontFamily: 'Inter',
        transition: 'all .15s',
        whiteSpace: 'nowrap',
        borderColor: on ? G : 'rgba(13,32,53,.12)',
        background: on ? N : 'transparent',
        color: on ? G : '#8A94A0'
      }
    }, on ? '✓ ' : '', cpd.n);
  })))), items.length > 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: 'hidden',
      padding: '4px 0 0',
      touchAction: 'pan-y'
    },
    onMouseDown: swDown,
    onMouseMove: swMove,
    onMouseUp: swUp,
    onMouseLeave: swUp,
    onTouchStart: swDown,
    onTouchMove: swMove,
    onTouchEnd: swUp
  }, /*#__PURE__*/React.createElement("div", {
    className: "cards-grid",
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
      padding: '0 20px',
      transform: 'translateX(' + dragX + 'px)',
      transition: swRef.current.on ? 'none' : 'transform .35s cubic-bezier(.16,1,.3,1)',
      cursor: pages > 1 ? 'grab' : 'default'
    }
  }, shown.map(function (item, i) {
    return cardGrid(item, i);
  }))) : /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '30px',
      color: '#8A94A0',
      fontSize: 12,
      textAlign: 'center',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, isAr ? 'لا توجد نتائج.' : 'No matches.'), pages > 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      padding: '14px 20px 0'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setPage(Math.max(0, pageSafe - 1));
    },
    disabled: pageSafe === 0,
    style: {
      padding: '8px 20px',
      borderRadius: 20,
      border: '1px solid rgba(13,32,53,.15)',
      background: 'transparent',
      color: pageSafe === 0 ? '#B7C0CB' : N,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      cursor: pageSafe === 0 ? 'default' : 'pointer',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      opacity: pageSafe === 0 ? .5 : 1
    }
  }, isAr ? 'السابق' : 'Prev'), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 11,
      fontWeight: 700,
      color: C.txM
    }
  }, pageSafe + 1, " / ", pages), /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setPage(Math.min(pages - 1, pageSafe + 1));
    },
    disabled: pageSafe >= pages - 1,
    style: {
      padding: '8px 20px',
      borderRadius: 20,
      border: 'none',
      background: pageSafe >= pages - 1 ? 'rgba(13,32,53,.3)' : N,
      color: G,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      cursor: pageSafe >= pages - 1 ? 'default' : 'pointer',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      opacity: pageSafe >= pages - 1 ? .5 : 1
    }
  }, isAr ? 'التالي' : 'Next')), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 20px 22px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '12px',
      borderRadius: 10,
      background: N,
      color: 'rgba(200,150,26,.9)',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      border: 'none',
      cursor: 'pointer',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, t.viewAll, " Units \u2192"))));
}

/* ── MAP ── */
function MapSec(props) {
  var onCpdTap = props.onCpdTap,
    onFilters = props.onFilters,
    purpose = props.purpose;
  var c = useApp();
  var dark = c.dark,
    lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var C = th(dark);
  var mapRef = useRef(null);
  var leafRef = useRef(null);
  var markersRef = useRef([]);
  var landmarkRef = useRef([]);
  var rv = useScrollAnim(50);
  var ref = rv[0],
    vis = rv[1];
  var DEFAULT_SEL = ['Hyde Park New Cairo', 'Mountain View iCity', 'Mivida'];
  var selS = useState(DEFAULT_SEL);
  var setSel = selS[1];
  var sel = selS[0];
  var HAS_UNITS = CPDS.filter(function (x) {
    return (UNITS[x.n] || []).length > 0;
  });
  var LANDMARKS = [{
    n: isAr ? 'الجامعة الأمريكية' : 'AUC — American Univ.',
    c: [30.0189, 31.4991],
    ic: '🎓'
  }, {
    n: isAr ? 'كايرو فيستيفال سيتي' : 'Cairo Festival City',
    c: [30.0287, 31.4061],
    ic: '🛍️'
  }, {
    n: isAr ? 'مطار القاهرة' : 'Cairo Intl. Airport',
    c: [30.1219, 31.4056],
    ic: '✈️'
  }, {
    n: isAr ? 'وسط البلد' : 'Downtown Cairo',
    c: [30.0444, 31.2357],
    ic: '🏛️'
  }];
  function priceStr(cpd) {
    return purpose === 'rent' ? '$' + cpd.rent.toLocaleString() + '/mo' : 'EGP ' + cpd.priceM + 'M';
  }

  /* Init map once */
  useEffect(function () {
    if (!mapRef.current || leafRef.current) return;
    var LL = window.L;
    if (!LL || typeof LL.map !== 'function') return;
    var map = LL.map(mapRef.current, {
      center: [30.03, 31.58],
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false
    });
    LL.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);
    LL.control.zoom({
      position: 'bottomright'
    }).addTo(map);
    leafRef.current = map;
    /* Landmark POIs — one-time */
    LANDMARKS.forEach(function (lm) {
      var lmHtml = '<div class="s-landmark"><span>' + lm.ic + '</span></div>';
      var icon = LL.divIcon({
        className: '',
        html: lmHtml,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      var mk = LL.marker(lm.c, {
        icon: icon,
        zIndexOffset: -100
      }).addTo(map);
      mk.bindTooltip(lm.n, {
        permanent: false,
        direction: 'top',
        className: 's-landmark-tip'
      });
      landmarkRef.current.push(mk);
    });
    setTimeout(function () {
      try {
        map.invalidateSize();
      } catch (e) {}
    }, 200);
    return function () {
      try {
        map.remove();
      } catch (e) {}
      leafRef.current = null;
    };
  }, []);

  /* Sync markers with selection */
  useEffect(function () {
    var map = leafRef.current;
    var LL = window.L;
    if (!map || !LL) return;
    markersRef.current.forEach(function (m) {
      try {
        map.removeLayer(m);
      } catch (e) {}
    });
    markersRef.current = [];
    var pts = [];
    sel.forEach(function (name) {
      var cpd = CPDS.find(function (x) {
        return x.n === name;
      });
      if (!cpd) return;
      var cnt = (UNITS[cpd.n] || []).length;
      var pr = priceStr(cpd);
      var mHtml = '<div class="s-marker"><div class="s-pin"><span class="s-pin-L">' + cnt + '</span></div><button class="s-count">' + cnt + ' UNITS · ' + pr + '</button></div>';
      var icon = LL.divIcon({
        className: '',
        html: mHtml,
        iconSize: [130, 66],
        iconAnchor: [65, 60]
      });
      var mk = LL.marker(cpd.c, {
        icon: icon
      }).addTo(map);
      mk.on('click', function () {
        onCpdTap(cpd);
      });
      markersRef.current.push(mk);
      pts.push(cpd.c);
    });
    if (pts.length > 0) {
      try {
        map.fitBounds(pts, {
          padding: [50, 50],
          maxZoom: 13
        });
      } catch (e) {}
    }
  }, [sel.join('|'), purpose]);
  function toggle(name) {
    setSel(function (s) {
      return s.indexOf(name) >= 0 ? s.filter(function (x) {
        return x !== name;
      }) : s.concat([name]);
    });
  }
  return /*#__PURE__*/React.createElement("section", {
    id: "s-map",
    style: {
      background: C.bg,
      transition: 'background .3s',
      paddingBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: "sec-inner",
    style: {
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(20px)',
      transition: 'all .55s cubic-bezier(.16,1,.3,1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 20px 12px',
      direction: isAr ? 'rtl' : 'ltr'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
      flexDirection: isAr ? 'row-reverse' : 'row'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 10,
      height: 10,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: '50%',
      border: '1.5px solid ' + G,
      animation: 'radarPing 2s ease-out infinite'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: G,
      position: 'absolute',
      top: 2,
      left: 2,
      boxShadow: '0 0 6px ' + G,
      animation: 'blink 2s ease infinite'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 7.5,
      letterSpacing: '.22em',
      color: G,
      textTransform: 'uppercase'
    }
  }, t.eyeMap)), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
      fontSize: isAr ? 22 : 26,
      fontWeight: isAr ? 700 : 400,
      color: dark ? '#F0EDE5' : N,
      lineHeight: 1.1,
      marginBottom: 4
    }
  }, isAr ? 'خريطة الكمبوندات' : 'Compound Map'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: dark ? 'rgba(255,255,255,.35)' : 'rgba(13,32,53,.4)',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, isAr ? 'اضغط على أي علامة لعرض الوحدات المتاحة' : 'Tap any marker to browse its units')), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px 10px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onFilters,
    style: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '11px',
      borderRadius: 11,
      background: 'linear-gradient(135deg,' + G + ',' + GL + ')',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 4px 16px rgba(200,150,26,.3)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: N,
    strokeWidth: "2.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 6h16M7 12h10M10 18h4"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11.5,
      fontWeight: 900,
      color: N,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, isAr ? 'الفلتر الذكي · ' + (purpose === 'rent' ? 'إيجار' : 'بيع') : 'Smart Filter · ' + (purpose === 'rent' ? 'Rent' : 'Resale')))), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto',
      paddingBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      padding: '0 20px',
      width: 'max-content'
    }
  }, HAS_UNITS.map(function (cpd) {
    var on = sel.indexOf(cpd.n) >= 0;
    var cnt = (UNITS[cpd.n] || []).length;
    return /*#__PURE__*/React.createElement("button", {
      key: cpd.n,
      onClick: function () {
        toggle(cpd.n);
      },
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid',
        fontFamily: 'Inter',
        transition: 'all .18s',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        borderColor: on ? G : dark ? 'rgba(255,255,255,.14)' : 'rgba(13,32,53,.14)',
        background: on ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : dark ? 'rgba(255,255,255,.04)' : '#fff',
        color: on ? N : dark ? 'rgba(255,255,255,.55)' : '#5A6472'
      }
    }, cpd.n, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 8,
        fontWeight: 800,
        padding: '1px 6px',
        borderRadius: 10,
        background: on ? 'rgba(13,32,53,.18)' : 'rgba(200,150,26,.14)',
        color: on ? N : G
      }
    }, cnt));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '0 16px',
      borderRadius: 18,
      overflow: 'hidden',
      border: '1.5px solid ' + (dark ? 'rgba(200,150,26,.28)' : 'rgba(13,32,53,.12)'),
      boxShadow: '0 10px 36px rgba(13,32,53,.22)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: mapRef,
    style: {
      height: 340,
      width: '100%'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 10,
      left: 10,
      zIndex: 400,
      background: 'rgba(7,21,36,.88)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(200,150,26,.35)',
      borderRadius: 10,
      padding: '6px 11px',
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: '#4ade80',
      display: 'block',
      animation: 'blink 2s ease infinite'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8,
      letterSpacing: '.12em',
      color: G,
      textTransform: 'uppercase'
    }
  }, sel.length, " ", isAr ? 'كمبوند' : 'COMPOUNDS', " \xB7 ", isAr ? 'مباشر' : 'LIVE'))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 20px 0',
      textAlign: 'center',
      fontSize: 9.5,
      color: dark ? 'rgba(255,255,255,.3)' : 'rgba(13,32,53,.35)',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, isAr ? '👆 اضغط على العلامة الذهبية لفتح قائمة الوحدات' : '👆 Tap a gold marker to open the unit list')));
}

/* ── VIRTUAL TOUR ── */
function TourSec() {
  var c = useApp();
  var dark = c.dark,
    lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var C = th(dark);
  var openS = useState(false);
  var setOpen = openS[1];
  var open = openS[0];
  var rv = useScrollAnim(60);
  var ref = rv[0],
    vis = rv[1];
  return /*#__PURE__*/React.createElement("section", {
    id: "s-tour",
    style: {
      background: dark ? '#050E18' : '#F4F6F8',
      transition: 'background .3s',
      paddingBottom: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: "sec-inner",
    style: {
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(20px)',
      transition: 'all .55s cubic-bezier(.16,1,.3,1)'
    }
  }, /*#__PURE__*/React.createElement(SH, {
    eye: t.eyeTour,
    title: t.tourTit
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto',
      paddingBottom: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 9,
      padding: '0 20px',
      width: 'max-content'
    }
  }, ROOMS.map(function (rm, i) {
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: function () {
        setOpen(true);
      },
      style: {
        position: 'relative',
        width: 148,
        height: 104,
        borderRadius: 14,
        overflow: 'hidden',
        border: '2px solid transparent',
        cursor: 'pointer',
        flexShrink: 0,
        padding: 0
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: rm.img,
      alt: rm.name,
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
      },
      loading: "lazy"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top,rgba(7,17,30,.88) 0%,transparent 55%)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '8px 10px',
        textAlign: 'left'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
        fontSize: 11,
        fontWeight: isAr ? 600 : 400,
        color: '#fff',
        lineHeight: 1.2
      }
    }, rm.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 6.5,
        color: G,
        letterSpacing: '.1em',
        marginTop: 2,
        opacity: .8
      }
    }, "TAP TO EXPLORE")), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 8,
        right: 8,
        background: 'rgba(200,150,26,.88)',
        borderRadius: 20,
        padding: '2px 7px',
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 7.5,
        fontWeight: 700,
        color: N
      }
    }, "360\xB0"));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 20px 22px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setOpen(true);
    },
    style: {
      width: '100%',
      padding: '14px 18px',
      borderRadius: 14,
      background: 'linear-gradient(135deg,' + N + ',#1A3354)',
      border: '1px solid rgba(200,150,26,.35)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontFamily: 'inherit'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#C8961A",
    strokeWidth: "2"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2 12h20"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: isAr ? 'right' : 'left',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: '#fff',
      letterSpacing: '.03em'
    }
  }, isAr ? 'ابدأ الجولة الثلاثية الأبعاد' : 'Launch 3D Virtual Tour'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: G,
      fontFamily: 'Inter',
      marginTop: 2,
      opacity: .75
    }
  }, isAr ? 'Three.js · 360° · 6 गرف' : 'Three.js · 360° drag · 6 rooms')), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#C8961A",
    strokeWidth: "2.5"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "5 3 19 12 5 21 5 3"
  }))))), open && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 500,
      background: '#07111E'
    }
  }, /*#__PURE__*/React.createElement("iframe", {
    src: "virtual-tour.html",
    style: {
      width: '100%',
      height: '100%',
      border: 'none',
      display: 'block'
    },
    title: "Sierra Estates Virtual Tour",
    allow: "fullscreen"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setOpen(false);
    },
    style: {
      position: 'absolute',
      top: 14,
      right: 14,
      width: 38,
      height: 38,
      borderRadius: '50%',
      background: 'rgba(7,17,30,.92)',
      border: '1px solid rgba(200,150,26,.45)',
      color: G,
      fontSize: 20,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      lineHeight: 1
    }
  }, "\xD7")));
}

/* ── AI HUB ── */
function AIHub(props) {
  var onTool = props.onTool;
  var onMap = props.onMap;
  var onContact = props.onContact;
  var c = useApp();
  var dark = c.dark,
    lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var C = th(dark);
  var rv = useScrollAnim(60);
  var ref = rv[0],
    vis = rv[1];
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
  var tools = [{
    k: 'engine',
    label: isAr ? 'محرك الذكاء 3.0' : 'AI Engine 3.0',
    sub: isAr ? 'نموذج AVM لتحليل الأسعار والعائد في الوقت الفعلي' : 'Real-time AVM pricing, ROI signals & Q2 2026 market data',
    live: true,
    accent: '#C8961A'
  }, {
    k: 'match',
    label: isAr ? 'التوافق الذكي' : 'Smart Match',
    sub: isAr ? 'مطابقة دقيقة بالذكاء الاصطناعي' : 'AI pairs your criteria to the perfect listing',
    accent: '#4ade80'
  }, {
    k: 'roi',
    label: isAr ? 'تحليل العائد' : 'ROI Analysis',
    sub: isAr ? 'قوائم العائد وحاسبة الاستثمار' : 'Yield leaderboard, cap rate & cashflow',
    accent: '#f59e0b'
  }, {
    k: 'price',
    label: isAr ? 'تسعير دقيق' : 'Precise Pricing',
    sub: isAr ? 'نطاق السعر العادل بالسوق' : 'AVM-calibrated fair-market price range',
    accent: '#a78bfa'
  }, {
    k: 'dream',
    label: isAr ? 'منزل الأحلام' : 'Dream Home Finder',
    sub: isAr ? 'أجب على 4 أسئلة واكتشف مركبك' : '4 questions → your compound match',
    accent: '#f472b6'
  }, {
    k: 'imap',
    label: isAr ? 'خريطة الذكاء' : 'Intelligence Map',
    sub: isAr ? 'خريطة تفاعلية لكل الكمبوندات والوحدات في القاهرة الجديدة' : 'Live compound map — tap any pin to explore units & prices',
    accent: '#C8961A'
  }, {
    k: 'tour',
    label: isAr ? 'جولة افتراضية' : 'Virtual Tour',
    sub: isAr ? 'جولة 360° في أفضل الشقق والفيلات' : '360° immersive walkthrough of top units',
    accent: '#38bdf8'
  }];
  return /*#__PURE__*/React.createElement("section", {
    id: "s-ai",
    style: {
      background: '#07121E',
      paddingBottom: 32,
      transition: 'background .3s',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(MorphBlob, {
    size: 520,
    opacity: .12,
    color1: "#C8961A",
    color2: "#8B4A1E",
    style: {
      top: -160,
      left: '50%',
      marginLeft: -260
    }
  }), /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: "sec-inner",
    style: {
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(20px)',
      transition: 'all .55s cubic-bezier(.16,1,.3,1)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '28px 20px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 9,
      letterSpacing: '.2em',
      textTransform: 'uppercase',
      color: '#C8961A',
      marginBottom: 6,
      opacity: .7
    }
  }, isAr ? '7 أدوات · مباشر' : 'AI · 7 TOOLS ONLINE'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
      fontSize: isAr ? 26 : 30,
      fontWeight: isAr ? 700 : 400,
      color: '#fff',
      lineHeight: 1.1,
      marginBottom: 6
    }
  }, isAr ? 'أول نظام ذكاء عقاري في الشرق الأوسط' : 'First AI Real Estate Ecosystem in the Middle East'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'Inter',
      fontSize: 11,
      color: 'rgba(255,255,255,.38)',
      lineHeight: 1.55
    }
  }, isAr ? 'أدوات ذكاء اصطناعي حية لكل خطوة في رحلتك العقارية' : 'Live AI tools for every step of your property journey')), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '18px 20px 18px',
      height: 1,
      background: 'linear-gradient(90deg,transparent,#C8961A,transparent)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: -3,
      left: 0,
      right: 0,
      height: 7,
      background: 'linear-gradient(90deg,transparent,rgba(200,150,26,.22),transparent)',
      animation: 'scanLine 3s linear infinite'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: 'hidden',
      borderTop: '1px solid rgba(200,150,26,.1)',
      borderBottom: '1px solid rgba(200,150,26,.1)',
      padding: '9px 0',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      animation: 'ticker 14s linear infinite',
      whiteSpace: 'nowrap',
      width: 'max-content'
    }
  }, [0, 1].map(function (rep) {
    return /*#__PURE__*/React.createElement("div", {
      key: rep,
      style: {
        display: 'flex'
      }
    }, [['98%', 'Match Rate'], ['1.8s', 'Avg Response'], ['<24h', 'Viewing'], ['1,200+', 'Units'], ['25', 'Compounds'], ['6', 'AI Tools']].map(function (p, i) {
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 18px'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: 13,
          fontWeight: 700,
          color: '#C8961A'
        }
      }, p[0]), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 7.5,
          letterSpacing: '.09em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,.28)',
          fontFamily: 'Inter'
        }
      }, p[1]), /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'rgba(200,150,26,.25)',
          fontSize: 12,
          marginLeft: 6
        }
      }, "\xB7"));
    }));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10,
      padding: '0 20px'
    }
  }, tools.map(function (tool, i) {
    var Mo = (window.Motion || {}).motion;
    var Wrap = Mo ? Mo.button : 'button';
    var motionProps = Mo ? {
      initial: {
        opacity: 0,
        y: 18,
        scale: .95
      },
      whileInView: {
        opacity: 1,
        y: 0,
        scale: 1
      },
      viewport: {
        once: true,
        amount: .35
      },
      transition: {
        duration: .4,
        delay: i % 6 * .06,
        ease: 'easeOut'
      },
      whileHover: {
        y: -4,
        scale: 1.015,
        borderColor: 'rgba(200,150,26,.35)'
      },
      whileTap: {
        scale: .97
      }
    } : {
      style: {
        animation: 'popIn .5s ' + (.06 + i * .07) + 's both'
      }
    };
    return /*#__PURE__*/React.createElement(Wrap, _extends({
      key: tool.k,
      onClick: function () {
        onTool(tool.k);
      },
      className: "ai-card",
      style: {
        gridColumn: tool.span ? '1 / -1' : undefined,
        padding: '18px 15px',
        borderRadius: 16,
        background: 'rgba(255,255,255,.035)',
        border: '1px solid rgba(255,255,255,.07)',
        cursor: 'pointer',
        textAlign: isAr ? 'right' : 'left',
        fontFamily: 'inherit',
        position: 'relative',
        overflow: 'hidden',
        direction: isAr ? 'rtl' : 'ltr',
        display: tool.span ? 'flex' : 'block',
        alignItems: tool.span ? 'center' : undefined,
        gap: tool.span ? 16 : undefined
      }
    }, motionProps), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 110%,rgba(200,150,26,.06),transparent 70%)',
        pointerEvents: 'none'
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "icon-spring",
      style: {
        marginBottom: tool.span ? 0 : 11,
        flexShrink: 0,
        display: 'inline-block'
      },
      dangerouslySetInnerHTML: {
        __html: IC[tool.k]
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: tool.span ? 1 : undefined
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: tool.span ? 14 : 12.5,
        fontWeight: 700,
        color: '#fff',
        marginBottom: 4,
        lineHeight: 1.2,
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
      }
    }, tool.label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9.5,
        color: 'rgba(255,255,255,.42)',
        lineHeight: 1.5,
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
      }
    }, tool.sub), tool.live && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        fontSize: 8.5,
        color: '#4ade80',
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'Inter'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: '#4ade80',
        display: 'block',
        animation: 'blink 2s ease infinite'
      }
    }), "LIVE")), tool.span && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 20,
        color: 'rgba(200,150,26,.45)',
        flexShrink: 0,
        marginLeft: isAr ? 0 : 8,
        marginRight: isAr ? 8 : 0
      }
    }, isAr ? '←' : '→'));
  }))));
}

/* ── WHY ── */
function WhySec() {
  var c = useApp();
  var dark = c.dark,
    lang = c.lang;
  var isAr = lang === 'ar';
  var C = th(dark);
  var rv = useScrollAnim(50);
  var ref = rv[0],
    vis = rv[1];
  var SVGs = {
    scan: '<svg viewBox="0 0 40 40" width="32" height="32" fill="none"><rect x="4" y="4" width="32" height="32" rx="8" stroke="#C8961A" stroke-width="1.2" opacity=".3"/><line x1="4" y1="20" x2="36" y2="20" stroke="#C8961A" stroke-width="1.5" stroke-linecap="round"><animate attributeName="y1" values="8;32;8" dur="2s" repeatCount="indefinite"/><animate attributeName="y2" values="8;32;8" dur="2s" repeatCount="indefinite"/></line><circle cx="13" cy="15" r="2.5" fill="#C8961A"><animate attributeName="opacity" values="1;.2;1" dur="1.5s" begin="0s" repeatCount="indefinite"/></circle><circle cx="20" cy="22" r="2.5" fill="#E9C176"><animate attributeName="opacity" values=".2;1;.2" dur="1.5s" begin=".4s" repeatCount="indefinite"/></circle><circle cx="28" cy="17" r="2.5" fill="#C8961A"><animate attributeName="opacity" values=".5;1;.5" dur="1.5s" begin=".8s" repeatCount="indefinite"/></circle></svg>',
    wizard: '<svg viewBox="0 0 40 40" width="32" height="32" fill="none"><path d="M20 6 L24 16 L35 16 L26 23 L29 34 L20 27 L11 34 L14 23 L5 16 L16 16 Z" stroke="#f472b6" stroke-width="1.3" fill="rgba(244,114,182,.1)"><animate attributeName="opacity" values="1;.5;1" dur="2s" repeatCount="indefinite"/></path><circle cx="33" cy="8" r="2" fill="#f472b6"><animate attributeName="r" values="1.5;3;1.5" dur="1.8s" repeatCount="indefinite"/></circle><circle cx="8" cy="10" r="1.3" fill="#E9C176"><animate attributeName="r" values="1;2;1" dur="2.2s" begin=".5s" repeatCount="indefinite"/></circle></svg>',
    avm: '<svg viewBox="0 0 40 40" width="32" height="32" fill="none"><circle cx="20" cy="20" r="14" stroke="#a78bfa" stroke-width="1.2" stroke-dasharray="3 2"><animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="6s" repeatCount="indefinite"/></circle><text x="20" y="25" text-anchor="middle" font-size="13" font-weight="800" fill="#a78bfa" font-family="JetBrains Mono,monospace">AVM<animate attributeName="opacity" values="1;.4;1" dur="2s" repeatCount="indefinite"/></text></svg>',
    close: '<svg viewBox="0 0 40 40" width="32" height="32" fill="none"><circle cx="14" cy="20" r="7" stroke="#4ade80" stroke-width="1.3"/><circle cx="26" cy="20" r="7" stroke="#C8961A" stroke-width="1.3"/><line x1="14" y1="13" x2="26" y2="13" stroke="rgba(255,255,255,.2)" stroke-width="1"/><line x1="14" y1="27" x2="26" y2="27" stroke="rgba(255,255,255,.2)" stroke-width="1"/><path d="M22 17 L25 20 L22 23" stroke="#C8961A" stroke-width="1.5" stroke-linecap="round" fill="none"><animate attributeName="opacity" values="1;.3;1" dur="1.6s" repeatCount="indefinite"/></path></svg>',
    verify: '<svg viewBox="0 0 40 40" width="32" height="32" fill="none"><path d="M20 4 L34 10 L34 20 C34 28 27 35 20 37 C13 35 6 28 6 20 L6 10 Z" stroke="#C8961A" stroke-width="1.3" fill="rgba(200,150,26,.08)"/><path d="M13 20 L18 25 L28 14" stroke="#4ade80" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><animate attributeName="stroke-dasharray" values="0 30;30 0;30 0" dur="1.8s" begin="0s" repeatCount="indefinite"/><animate attributeName="stroke-dashoffset" values="30;0;0" dur="1.8s" begin="0s" repeatCount="indefinite"/></path></svg>',
    speed: '<svg viewBox="0 0 40 40" width="32" height="32" fill="none"><path d="M6 32 A16 16 0 0 1 34 32" stroke="rgba(200,150,26,.2)" stroke-width="3" stroke-linecap="round"/><path d="M6 32 A16 16 0 0 1 34 32" stroke="#C8961A" stroke-width="3" stroke-linecap="round" stroke-dasharray="50" stroke-dashoffset="10"><animate attributeName="stroke-dashoffset" values="50;5;50" dur="2.4s" repeatCount="indefinite"/></path><line x1="20" y1="32" x2="28" y2="18" stroke="#E9C176" stroke-width="2" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="-40 20 32" to="40 20 32" dur="2.4s" repeatCount="indefinite"/></line><circle cx="20" cy="32" r="3" fill="#C8961A"/></svg>'
  };
  var pts = isAr ? [{
    svg: 'scan',
    t: 'ماسح فرص لحظي',
    s: 'يفحص سيرا +1,200 وحدة يومياً بـ 6 أدوات ذكاء اصطناعي ليُوصلك بأفضل الصفقات أولاً.',
    accent: '#C8961A'
  }, {
    svg: 'wizard',
    t: 'مستشار المنزل المثالي',
    s: '4 أسئلة فقط — وسيرا يرشّح لك الكمبوند والوحدة المثالية وفق ميزانيتك وأسلوب حياتك.',
    accent: '#f472b6'
  }, {
    svg: 'avm',
    t: 'تسعير AVM حقيقي',
    s: 'محرك تقييم لحظي يقارن كل وحدة بـ 25 كمبوند. لا تدفع أكثر من القيمة الفعلية أبداً.',
    accent: '#a78bfa'
  }, {
    svg: 'close',
    t: 'إغلاق بشري + ذكاء',
    s: 'فرص يكتشفها الذكاء الاصطناعي، يُنجزها مستشار خبير. من أول توافق حتى التوقيع خلال 48 ساعة.',
    accent: '#4ade80'
  }, {
    svg: 'verify',
    t: 'وحدات موثّقة 100%',
    s: 'كل وحدة مُفعّلة تمر بـ 11 نقطة تحقق. لا فجوات، لا مفاجآت.',
    accent: '#C8961A'
  }, {
    svg: 'speed',
    t: 'الأسرع في القاهرة الجديدة',
    s: 'متوسط 1.8 ثانية للرد الذكي. متوسط 18 يوماً من الاستفسار لتسليم المفاتيح.',
    accent: '#f59e0b'
  }] : [{
    svg: 'scan',
    t: 'Live Opportunity Scanner',
    s: 'Sierra scans 1,200+ units daily with 6 AI tools — ROI, AVM pricing, smart matching — surfacing the best deals first.',
    accent: '#C8961A'
  }, {
    svg: 'wizard',
    t: 'Dream Home Wizard',
    s: '4 questions, one perfect match. Sierra pinpoints your exact compound and unit type by budget and lifestyle.',
    accent: '#f472b6'
  }, {
    svg: 'avm',
    t: 'Real-Time AVM Pricing',
    s: 'Live valuation engine benchmarks every unit across 25 compounds. You never overpay.',
    accent: '#a78bfa'
  }, {
    svg: 'close',
    t: 'Human + AI Closing',
    s: 'AI-sourced deals paired with expert advisors. First match to signed contract in 48 hours.',
    accent: '#4ade80'
  }, {
    svg: 'verify',
    t: '100% Verified Inventory',
    s: 'Every active unit passes an 11-point verification check. No gaps, no surprises.',
    accent: '#C8961A'
  }, {
    svg: 'speed',
    t: "New Cairo's Fastest",
    s: '1.8s avg AI response. 18-day avg inquiry-to-keys. No other firm comes close.',
    accent: '#f59e0b'
  }];
  var bg = dark ? '#050E18' : '#FFFFFF';
  return /*#__PURE__*/React.createElement("section", {
    id: "s-why",
    style: {
      background: bg,
      padding: '0 0 32px',
      transition: 'background .3s'
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: "sec-inner",
    style: {
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(24px)',
      transition: 'all .6s cubic-bezier(.16,1,.3,1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '36px 20px 0',
      textAlign: isAr ? 'right' : 'left',
      direction: isAr ? 'rtl' : 'ltr'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8.5,
      letterSpacing: '.22em',
      textTransform: 'uppercase',
      color: '#C8961A',
      marginBottom: 10,
      opacity: .8
    }
  }, isAr ? 'سيرا إستيتس · القاهرة الجديدة' : 'SIERRA ESTATES · NEW CAIRO'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : "'Cormorant Garamond',serif",
      fontSize: isAr ? 34 : 42,
      fontWeight: isAr ? 700 : 400,
      lineHeight: 1.0,
      color: dark ? '#fff' : '#0D2035',
      marginBottom: 6
    },
    "data-comment-anchor": "4edb831098-div-506-11"
  }, isAr ? 'أبعد من الوساطة' : React.createElement(React.Fragment, null, 'Beyond', React.createElement('br', null), 'Brokerage')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      fontSize: 11.5,
      color: dark ? 'rgba(255,255,255,.4)' : 'rgba(13,32,53,.45)',
      lineHeight: 1.65,
      maxWidth: 300
    }
  }, isAr ? 'نجمع الخبرة البشرية العميقة بذكاء اصطناعي حي — للكشف عن الفرص التي يفوّتها الوسطاء التقليديون.' : 'We pair deep local expertise with live AI to surface deals traditional brokers never see.')), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '20px 20px 18px',
      height: 1,
      background: dark ? 'linear-gradient(90deg,transparent,rgba(200,150,26,.35),transparent)' : 'linear-gradient(90deg,transparent,rgba(13,32,53,.12),transparent)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 9,
      padding: '0 20px'
    }
  }, pts.map(function (pt, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        padding: '16px 14px',
        borderRadius: 16,
        background: dark ? 'rgba(255,255,255,.03)' : '#fff',
        border: '1px solid ' + (dark ? 'rgba(200,150,26,.09)' : 'rgba(13,32,53,.07)'),
        animation: vis ? 'popIn .5s ' + (.05 + i * .08) + 's both' : 'none',
        direction: isAr ? 'rtl' : 'ltr',
        boxShadow: dark ? 'none' : '0 2px 12px rgba(13,32,53,.05)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 10
      },
      dangerouslySetInnerHTML: {
        __html: pt.svg === 'scan' ? SVGs.scan : pt.svg === 'wizard' ? SVGs.wizard : pt.svg === 'avm' ? SVGs.avm : pt.svg === 'close' ? SVGs.close : pt.svg === 'verify' ? SVGs.verify : SVGs.speed
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        fontWeight: 700,
        color: dark ? '#fff' : '#0D2035',
        marginBottom: 4,
        lineHeight: 1.25,
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
      }
    }, pt.t), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9.5,
        color: dark ? 'rgba(255,255,255,.38)' : 'rgba(13,32,53,.5)',
        lineHeight: 1.55,
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
      }
    }, pt.s), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10,
        height: 2,
        borderRadius: 2,
        background: pt.accent,
        opacity: .5,
        width: '40%'
      }
    }));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '14px 20px 0',
      padding: '14px 0',
      borderTop: '1px solid ' + (dark ? 'rgba(200,150,26,.1)' : 'rgba(13,32,53,.07)'),
      borderBottom: '1px solid ' + (dark ? 'rgba(200,150,26,.1)' : 'rgba(13,32,53,.07)'),
      display: 'flex',
      justifyContent: 'space-around'
    }
  }, [['25', isAr ? 'كمبوند' : 'Compounds'], ['+1,200', isAr ? 'وحدة نشطة' : 'Live Units'], ['48h', isAr ? 'عقد موقّع' : 'To Contract']].map(function (s, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 16,
        fontWeight: 700,
        color: '#C8961A'
      }
    }, s[0]), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
        fontSize: 7.5,
        textTransform: 'uppercase',
        letterSpacing: '.08em',
        color: dark ? 'rgba(255,255,255,.28)' : 'rgba(13,32,53,.38)',
        marginTop: 2
      }
    }, s[1]));
  }))));
}

/* ── ABOUT US ── */
function AboutUs() {
  var c = useApp();
  var dark = c.dark,
    lang = c.lang;
  var isAr = lang === 'ar';
  var C = th(dark);
  var rv = useScrollAnim(60);
  var ref = rv[0],
    vis = rv[1];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: C.bgAlt,
      padding: '0 0 28px',
      transition: 'background .3s'
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: "sec-inner",
    style: {
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(20px)',
      transition: 'all .55s cubic-bezier(.16,1,.3,1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 20px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      direction: isAr ? 'rtl' : 'ltr',
      borderBottom: '1px solid ' + (dark ? 'rgba(200,150,26,.12)' : 'rgba(13,32,53,.07)'),
      marginBottom: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: -2,
      borderRadius: 20,
      background: 'linear-gradient(135deg,rgba(200,150,26,.6),transparent 55%,rgba(233,193,118,.4))',
      zIndex: 0
    }
  }), /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-gold.png",
    alt: "Sierra Estates",
    style: {
      position: 'relative',
      zIndex: 1,
      width: 76,
      height: 76,
      borderRadius: 18,
      objectFit: 'contain',
      display: 'block',
      background: '#07121E'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
      fontSize: isAr ? 24 : 28,
      fontWeight: isAr ? 700 : 400,
      color: dark ? '#F0EDE5' : N,
      lineHeight: 1.05,
      marginBottom: 5
    }
  }, isAr ? 'سيرا إستيتس' : 'Sierra Estates'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 7.5,
      letterSpacing: '.16em',
      color: G,
      textTransform: 'uppercase',
      marginBottom: 6,
      opacity: .85
    }
  }, "FUTURE OF REAL ESTATES"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, ['New Cairo', '25 Cpds', 'AI-Powered'].map(function (tag) {
    return /*#__PURE__*/React.createElement("span", {
      key: tag,
      style: {
        fontSize: 8,
        fontWeight: 700,
        padding: '2px 7px',
        borderRadius: 20,
        background: dark ? 'rgba(200,150,26,.12)' : 'rgba(13,32,53,.07)',
        color: dark ? G : N,
        fontFamily: 'Inter'
      }
    }, tag);
  })))), /*#__PURE__*/React.createElement(SH, {
    eye: isAr ? 'عن شركتنا' : 'ABOUT US',
    title: isAr ? 'قصتنا' : 'Our Story',
    light: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '0 20px',
      padding: '18px',
      borderRadius: 16,
      background: C.whyCard,
      border: '1px solid ' + (dark ? 'rgba(200,150,26,.12)' : 'rgba(13,32,53,.09)'),
      boxShadow: '0 4px 20px rgba(13,32,53,.07)',
      direction: isAr ? 'rtl' : 'ltr'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: C.txM,
      lineHeight: 1.75,
      marginBottom: 16,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, isAr ? 'سيرا إستيتس شركة عقارية رائدة في القاهرة الجديدة، تجمع الخبرة البشرية العميقة بأحدث أدوات الذكاء الاصطناعي لتقديم أفضل الفرص العقارية في مصر. نغطي 25 كمبوند وأكثر من 1200 وحدة.' : "Sierra Estates is New Cairo's leading AI-powered real estate firm — combining deep local expertise with 6 proprietary AI tools to surface the best opportunities across 25 compounds and 1,200+ verified units."))));
}

/* ── CONTACT US ── */
function ContactUs(props) {
  var onReq = props.onReq;
  var c = useApp();
  var lang = c.lang;
  var isAr = lang === 'ar';
  var rv = useScrollAnim(60);
  var ref = rv[0],
    vis = rv[1];
  var rows = [{
    ic: '💬',
    l: 'WhatsApp',
    v: '+20 106 139 9688',
    sub: isAr ? 'رد خلال 4 ساعات' : 'Reply within 4 hours',
    href: 'https://wa.me/201061399688',
    accent: '#25D366'
  }, {
    ic: '📞',
    l: isAr ? 'اتصل بنا' : 'Call Us',
    v: '+20 106 139 9688',
    sub: isAr ? 'يومياً 9ص – 10م' : 'Daily 9AM – 10PM',
    href: 'tel:+201061399688',
    accent: G
  }, {
    ic: '✉️',
    l: isAr ? 'البريد الإلكتروني' : 'Email',
    v: 'Info@sierra-estates.net',
    sub: isAr ? 'للاستفسارات والشراكات' : 'Enquiries & partnerships',
    href: 'mailto:Info@sierra-estates.net',
    accent: '#5B99DC'
  }];
  return /*#__PURE__*/React.createElement("section", {
    id: "s-contact",
    style: {
      background: N2,
      padding: '0 0 30px',
      transition: 'background .3s'
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: "sec-inner",
    style: {
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(24px)',
      transition: 'all .6s cubic-bezier(.16,1,.3,1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px 20px 4px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8,
      letterSpacing: '.24em',
      color: G,
      textTransform: 'uppercase',
      marginBottom: 8,
      opacity: .85
    }
  }, isAr ? 'تواصل معنا' : 'CONTACT US'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
      fontSize: isAr ? 26 : 32,
      fontWeight: isAr ? 700 : 400,
      color: '#fff',
      lineHeight: 1.1,
      marginBottom: 6
    }
  }, isAr ? 'لنجد منزلك المثالي' : "Let's Find Your Home"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'rgba(255,255,255,.38)',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      lineHeight: 1.6,
      maxWidth: 280,
      margin: '0 auto'
    }
  }, isAr ? 'فريقنا ومستشارنا الذكي في خدمتك على مدار الساعة.' : 'Our advisors and Sierra AI are at your service around the clock.')), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '18px 20px 16px',
      height: 1,
      background: 'linear-gradient(90deg,transparent,rgba(200,150,26,.4),transparent)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 9,
      padding: '0 20px'
    }
  }, rows.map(function (r, i) {
    return /*#__PURE__*/React.createElement("a", {
      key: i,
      href: r.href,
      target: r.href.indexOf('https') === 0 ? '_blank' : undefined,
      rel: "noopener noreferrer",
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: '14px 16px',
        borderRadius: 15,
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(200,150,26,.14)',
        textDecoration: 'none',
        direction: isAr ? 'rtl' : 'ltr',
        animation: vis ? 'popIn .5s ' + (.08 + i * .09) + 's both' : 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 42,
        height: 42,
        borderRadius: 12,
        background: 'rgba(255,255,255,.05)',
        border: '1px solid rgba(255,255,255,.09)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 19,
        flexShrink: 0
      }
    }, r.ic), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        textAlign: isAr ? 'right' : 'left'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8.5,
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,.35)',
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
        fontWeight: 700,
        marginBottom: 3
      }
    }, r.l), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 12.5,
        fontWeight: 700,
        color: '#fff',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, r.v), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: 'rgba(255,255,255,.3)',
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
        marginTop: 2
      }
    }, r.sub)), /*#__PURE__*/React.createElement("span", {
      style: {
        color: r.accent,
        fontSize: 16,
        flexShrink: 0
      }
    }, isAr ? '‹' : '›'));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 20px 0'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onReq,
    style: {
      width: '100%',
      padding: '14px',
      borderRadius: 13,
      background: 'linear-gradient(135deg,' + G + ',' + GL + ')',
      color: N,
      fontSize: 11.5,
      fontWeight: 900,
      letterSpacing: '.06em',
      textTransform: 'uppercase',
      border: 'none',
      cursor: 'pointer',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      boxShadow: '0 8px 28px rgba(200,150,26,.35)'
    }
  }, isAr ? 'اطلب عقارك الآن — خصم 25%' : 'Request Your Property — 25% OFF')), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      paddingTop: 20,
      borderTop: '1px solid rgba(200,150,26,.12)',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-gold.png",
    style: {
      width: 40,
      height: 40,
      objectFit: 'contain',
      borderRadius: 10
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: HEADING_FONT,
      fontSize: 15,
      fontWeight: 600,
      letterSpacing: '.18em',
      color: G,
      marginTop: 8,
      marginBottom: 4
    }
  }, "SIERRA ESTATES"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8.5,
      color: 'rgba(255,255,255,.22)',
      letterSpacing: '.14em',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      textTransform: 'uppercase'
    }
  }, isAr ? 'القاهرة الجديدة · ذكاء اصطناعي · 2026' : 'New Cairo · AI-Driven · 2026'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 7.5,
      color: 'rgba(255,255,255,.16)',
      marginTop: 10,
      letterSpacing: '.08em'
    }
  }, "Info@sierra-estates.net \xB7 +20 106 139 9688"))));
}
Object.assign(window, {
  Hero,
  Listings,
  MapSec,
  TourSec,
  AIHub,
  WhySec,
  AboutUs,
  ContactUs
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "sections.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/app.jsx
try { (() => {
/* Sierra Estates — Admin Intelligence OS root. */
function AdminApp() {
  const [active, setActive] = React.useState('Intelligence OS');
  React.useEffect(() => {
    window.aRefresh();
  });
  const screen = active === 'Agents & Bots' ? /*#__PURE__*/React.createElement(Agents, null) : active === 'CRM Leads' ? /*#__PURE__*/React.createElement(CRM, null) : active === 'OpenClaw' ? /*#__PURE__*/React.createElement(Terminal, null) : /*#__PURE__*/React.createElement(Overview, null);
  const title = active === 'Intelligence OS' ? 'Command Overview' : active === 'Agents & Bots' ? 'Agents & Bots' : active === 'CRM Leads' ? 'CRM Leads' : active === 'OpenClaw' ? 'OpenClaw Terminal' : active;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      minHeight: '100vh'
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    nav: window.SE_NAV,
    active: active,
    setActive: setActive
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Topbar, {
    title: title
  }), screen));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(AdminApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/data.js
try { (() => {
/* Sierra Estates — Admin "Intelligence OS" sample data. */
window.SE_KPIS = [{
  label: 'Active Listings',
  value: '1,504',
  delta: '+42',
  up: true
}, {
  label: 'Hot Leads',
  value: '87',
  delta: '+13',
  up: true
}, {
  label: 'Viewings (wk)',
  value: '214',
  delta: '+8%',
  up: true
}, {
  label: 'Deals Closing',
  value: '19',
  delta: '+3',
  up: true
}, {
  label: 'Avg AI Score',
  value: '9.1',
  delta: '+0.2',
  up: true
}, {
  label: 'Response Time',
  value: '2.4m',
  delta: '-11%',
  up: true
}, {
  label: 'Compounds',
  value: '19',
  delta: '0',
  up: true
}, {
  label: 'GMV (mo)',
  value: 'EGP 214M',
  delta: '+18%',
  up: true
}];
window.SE_PIPELINE = [{
  stage: 'S1 Ingest',
  n: 1504
}, {
  stage: 'S2 Verify',
  n: 1120
}, {
  stage: 'S3 Price',
  n: 860
}, {
  stage: 'S4 Match',
  n: 540
}, {
  stage: 'S5 Contact',
  n: 310
}, {
  stage: 'S6 Viewing',
  n: 214
}, {
  stage: 'S7 Offer',
  n: 96
}, {
  stage: 'S8 Negotiate',
  n: 47
}, {
  stage: 'S9 Close',
  n: 19
}];
window.SE_AGENTS = [{
  name: 'Sierra Bot',
  role: 'Primary AI concierge',
  stack: 'Next.js · Gemini',
  status: 'online',
  load: 82,
  icon: 'bot'
}, {
  name: 'Leila / Lola',
  role: 'Arabic specialist',
  stack: 'Bilingual routes',
  status: 'online',
  load: 64,
  icon: 'message-circle'
}, {
  name: 'Stage-9 Closer',
  role: 'Contracts & payment',
  stack: 'Python · Stripe',
  status: 'online',
  load: 38,
  icon: 'file-signature'
}, {
  name: 'WhatsApp Scraper',
  role: 'Lead harvesting',
  stack: 'Playwright · Node',
  status: 'paused',
  load: 0,
  icon: 'radar'
}, {
  name: 'The Scribe',
  role: 'S1–S2 ingestion',
  stack: 'FastAPI',
  status: 'online',
  load: 71,
  icon: 'scroll-text'
}, {
  name: 'The Curator',
  role: 'S3–S5 pricing / AVM',
  stack: 'FastAPI',
  status: 'online',
  load: 55,
  icon: 'gem'
}];
window.SE_LEADS = [{
  name: 'Mostafa Kamel',
  phone: '+20 100 221 4567',
  compound: 'Hyde Park',
  budget: 'EGP 22M',
  score: 9.6,
  stage: 'Viewing',
  hot: true
}, {
  name: 'Yasmine Adel',
  phone: '+20 101 553 8890',
  compound: 'Mivida',
  budget: 'EGP 850K/yr',
  score: 9.1,
  stage: 'Offer',
  hot: true
}, {
  name: 'Karim Nabil',
  phone: '+20 122 447 1120',
  compound: 'Madinaty',
  budget: 'EGP 8.5M',
  score: 8.7,
  stage: 'Contact',
  hot: false
}, {
  name: 'Salma Farid',
  phone: '+20 128 990 3345',
  compound: 'Villette',
  budget: 'EGP 11.5M',
  score: 9.3,
  stage: 'Negotiate',
  hot: true
}, {
  name: 'Omar Hesham',
  phone: '+20 106 334 7781',
  compound: 'Taj City',
  budget: 'EGP 19.5M',
  score: 8.9,
  stage: 'Match',
  hot: false
}, {
  name: 'Nadia Wael',
  phone: '+20 111 228 6654',
  compound: 'Eastown',
  budget: 'EGP 9.2M',
  score: 8.4,
  stage: 'Contact',
  hot: false
}];
window.SE_NAV = [['layout-dashboard', 'Intelligence OS', true], ['bot', 'Agents & Bots'], ['workflow', 'Workflows'], ['terminal', 'OpenClaw'], ['users', 'CRM Leads'], ['building-2', 'Listings Hub'], ['sparkles', 'Curator'], ['scroll-text', 'Scribe'], ['handshake', 'Stage-9 Closer'], ['bar-chart-3', 'Reports'], ['settings', 'Settings']];
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/data.js", error: String((e && e.message) || e) }); }

// ui_kits/admin/parts.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Sierra Estates — Admin Intelligence OS screens. */
const A = window.SierraEstatesDesignSystem_210542;
const AIc = (n, p = {}) => /*#__PURE__*/React.createElement("i", _extends({
  "data-lucide": n
}, p));
const aRefresh = () => setTimeout(() => window.lucide && lucide.createIcons(), 30);

/* ── Sidebar ────────────────────────────────────────────────────────── */
function Sidebar({
  nav,
  active,
  setActive
}) {
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 248,
      flexShrink: 0,
      background: 'var(--bg-d)',
      borderRight: '1px solid var(--bd)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 14px',
      height: '100vh',
      position: 'sticky',
      top: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      padding: '0 8px 20px',
      borderBottom: '1px solid var(--bd)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-red.png",
    alt: "Sierra",
    style: {
      width: 34,
      height: 34,
      objectFit: 'contain'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      lineHeight: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 16,
      letterSpacing: '.1em',
      color: 'var(--tx-s)'
    }
  }, "SIERRA"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 7.5,
      letterSpacing: '.24em',
      color: 'var(--gold)',
      marginTop: 3
    }
  }, "INTELLIGENCE OS"))), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      marginTop: 14,
      flex: 1
    }
  }, nav.map(([ic, label]) => {
    const on = label === active;
    return /*#__PURE__*/React.createElement("button", {
      key: label,
      onClick: () => setActive(label),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '10px 12px',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'start',
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: on ? 600 : 500,
        background: on ? 'var(--surf)' : 'transparent',
        color: on ? 'var(--gold)' : 'var(--tx-m)',
        borderLeft: '2px solid ' + (on ? 'var(--gold)' : 'transparent')
      }
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": ic,
      style: {
        width: 16,
        height: 16
      }
    }), label);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 8px 0',
      borderTop: '1px solid var(--bd)'
    }
  }, /*#__PURE__*/React.createElement(A.Avatar, {
    name: "Tarek Hassan",
    ring: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      lineHeight: 1.3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--tx-s)'
    }
  }, "Tarek Hassan"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 10,
      color: 'var(--tx-f)'
    }
  }, "Lead broker \xB7 Admin"))));
}

/* ── Topbar ─────────────────────────────────────────────────────────── */
function Topbar({
  title
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 28px',
      borderBottom: '1px solid var(--bd)',
      position: 'sticky',
      top: 0,
      zIndex: 20,
      background: 'var(--nav-s)',
      backdropFilter: 'blur(18px)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '.24em',
      textTransform: 'uppercase',
      color: 'var(--gold)'
    }
  }, "Intelligence OS"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 500,
      fontSize: 28,
      color: 'var(--tx-s)',
      margin: '4px 0 0'
    }
  }, title)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 280
    }
  }, /*#__PURE__*/React.createElement(A.Input, {
    placeholder: "Search leads, listings, agents\u2026",
    icon: AIc('search')
  })), /*#__PURE__*/React.createElement(A.IconButton, {
    "aria-label": "Notifications"
  }, AIc('bell')), /*#__PURE__*/React.createElement(A.Button, {
    variant: "primary",
    size: "sm",
    iconLeft: AIc('plus')
  }, "New lead")));
}

/* ── Overview ───────────────────────────────────────────────────────── */
function Overview() {
  const max = Math.max(...window.SE_PIPELINE.map(s => s.n));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 28px',
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 14
    }
  }, window.SE_KPIS.map(k => /*#__PURE__*/React.createElement(A.Card, {
    key: k.label,
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '.14em',
      color: 'var(--tx-f)'
    }
  }, k.label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 8,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontWeight: 700,
      fontSize: 24,
      color: 'var(--tx-s)'
    }
  }, k.value), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--emerald)'
    }
  }, k.delta))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.5fr 1fr',
      gap: 18,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(A.Card, {
    style: {
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(A.Eyebrow, null, "Demand funnel"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 500,
      fontSize: 20,
      color: 'var(--tx-s)',
      marginTop: 6
    }
  }, "S1 \u2192 S9 pipeline")), /*#__PURE__*/React.createElement(A.Badge, {
    tone: "red",
    dot: true
  }, "Live")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 9
    }
  }, window.SE_PIPELINE.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.stage,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 90,
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--tx-m)'
    }
  }, s.stage), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 16,
      background: 'var(--surf)',
      borderRadius: 8,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: s.n / max * 100 + '%',
      height: '100%',
      background: 'var(--grad-gold)',
      borderRadius: 8
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      textAlign: 'right',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--gold-lt)'
    }
  }, s.n))))), /*#__PURE__*/React.createElement(A.Card, {
    style: {
      padding: 20
    }
  }, /*#__PURE__*/React.createElement(A.Eyebrow, null, "Agent status"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      marginTop: 16
    }
  }, window.SE_AGENTS.slice(0, 5).map(a => /*#__PURE__*/React.createElement("div", {
    key: a.name,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: a.status === 'online' ? 'var(--emerald)' : 'var(--tx-f)',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--tx-s)'
    }
  }, a.name), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      background: 'var(--surf)',
      borderRadius: 2,
      marginTop: 5,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: a.load + '%',
      height: '100%',
      background: a.status === 'online' ? 'var(--gold)' : 'var(--tx-f)'
    }
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--tx-m)'
    }
  }, a.load, "%")))))));
}

/* ── Agents ─────────────────────────────────────────────────────────── */
function Agents() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 28px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 16
    }
  }, window.SE_AGENTS.map(a => /*#__PURE__*/React.createElement(A.Card, {
    key: a.name,
    hover: true,
    style: {
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      display: 'grid',
      placeItems: 'center',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--bg-d)',
      color: 'var(--gold-lt)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": a.icon,
    style: {
      width: 22,
      height: 22
    }
  })), /*#__PURE__*/React.createElement(A.Badge, {
    tone: a.status === 'online' ? 'emerald' : 'neutral',
    dot: true
  }, a.status)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 18,
      color: 'var(--tx-s)'
    }
  }, a.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 12,
      color: 'var(--tx-m)',
      marginTop: 3
    }
  }, a.role)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--tx-f)',
      textTransform: 'uppercase',
      letterSpacing: '.1em'
    }
  }, a.stack), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement(A.Button, {
    variant: "ghost",
    size: "sm"
  }, "Logs"), /*#__PURE__*/React.createElement(A.Button, {
    variant: a.status === 'online' ? 'secondary' : 'primary',
    size: "sm"
  }, a.status === 'online' ? 'Pause' : 'Resume'))))));
}

/* ── CRM Leads ──────────────────────────────────────────────────────── */
function CRM() {
  const cols = ['Lead', 'Compound', 'Budget', 'AI', 'Stage', ''];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 28px'
    }
  }, /*#__PURE__*/React.createElement(A.Card, {
    pad: false,
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      borderBottom: '1px solid var(--bd)'
    }
  }, cols.map((c, i) => /*#__PURE__*/React.createElement("th", {
    key: i,
    style: {
      textAlign: i >= 2 && i < 5 ? 'center' : 'start',
      padding: '14px 18px',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.14em',
      color: 'var(--tx-f)'
    }
  }, c)))), /*#__PURE__*/React.createElement("tbody", null, window.SE_LEADS.map(l => /*#__PURE__*/React.createElement("tr", {
    key: l.name,
    style: {
      borderBottom: '1px solid var(--bd)'
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '13px 18px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(A.Avatar, {
    name: l.name,
    size: "sm"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--tx-s)'
    }
  }, l.name), l.hot && /*#__PURE__*/React.createElement(A.Badge, {
    tone: "red"
  }, "Hot")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--tx-f)'
    }
  }, l.phone)))), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '13px 18px',
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      color: 'var(--tx-m)'
    }
  }, l.compound), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '13px 18px',
      textAlign: 'center',
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--gold-lt)'
    }
  }, l.budget), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '13px 18px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(A.Badge, {
    tone: "emerald"
  }, l.score)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '13px 18px',
      textAlign: 'center',
      fontFamily: 'var(--font-ui)',
      fontSize: 12,
      color: 'var(--tx)'
    }
  }, l.stage), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '13px 18px',
      textAlign: 'end'
    }
  }, /*#__PURE__*/React.createElement(A.IconButton, {
    "aria-label": "WhatsApp",
    size: "sm"
  }, AIc('message-circle')))))))));
}

/* ── OpenClaw terminal ──────────────────────────────────────────────── */
function Terminal() {
  const [lines, setLines] = React.useState([{
    t: 'sys',
    v: 'Sierra OpenClaw · type "help" for commands'
  }, {
    t: 'in',
    v: 'status'
  }, {
    t: 'out',
    v: '✓ 6 agents · 5 online · 1 paused · GMV EGP 214M · 87 hot leads'
  }]);
  const [cmd, setCmd] = React.useState('');
  const run = e => {
    e.preventDefault();
    if (!cmd.trim()) return;
    const map = {
      help: 'commands: status · sync · leads · agents · clear',
      sync: '⟳ syncing Firestore listings… 42 new · 11 updated · done',
      leads: '87 hot leads · top: Mostafa Kamel (9.6) · Salma Farid (9.3)',
      agents: 'Sierra 82% · Leila 64% · Scribe 71% · Curator 55% · Closer 38%'
    };
    if (cmd.trim() === 'clear') {
      setLines([]);
      setCmd('');
      return;
    }
    setLines(l => [...l, {
      t: 'in',
      v: cmd
    }, {
      t: 'out',
      v: map[cmd.trim()] || 'unknown command: ' + cmd
    }]);
    setCmd('');
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 28px'
    }
  }, /*#__PURE__*/React.createElement(A.Card, {
    pad: false,
    variant: "well",
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '12px 16px',
      borderBottom: '1px solid var(--bd)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: 'var(--red)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: 'var(--gold)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: 'var(--emerald)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--tx-f)',
      marginLeft: 8
    }
  }, "openclaw \u2014 sierra-2026")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      fontFamily: 'var(--font-mono)',
      fontSize: 12.5,
      lineHeight: 1.8,
      minHeight: 200
    }
  }, lines.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      color: l.t === 'in' ? 'var(--tx-s)' : l.t === 'sys' ? 'var(--tx-f)' : 'var(--emerald)'
    }
  }, l.t === 'in' && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--gold)'
    }
  }, "\u279C "), l.v)), /*#__PURE__*/React.createElement("form", {
    onSubmit: run,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--gold)'
    }
  }, "\u279C"), /*#__PURE__*/React.createElement("input", {
    value: cmd,
    onChange: e => setCmd(e.target.value),
    autoFocus: true,
    placeholder: "type a command\u2026",
    style: {
      flex: 1,
      background: 'none',
      border: 'none',
      outline: 'none',
      color: 'var(--tx-s)',
      fontFamily: 'var(--font-mono)',
      fontSize: 12.5
    }
  })))));
}
Object.assign(window, {
  Sidebar,
  Topbar,
  Overview,
  Agents,
  CRM,
  Terminal,
  aRefresh
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/parts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/houzez-portal/data.js
try { (() => {
/* Sierra Estates × Houzez portal — shared data (from Sierra Estates Mobile v23-7 source) */
window.HZDATA = {
  slides: [{
    pre: 'FIRST & ONLY WEBSITE IN EGYPT DESIGNED FOR NEW CAIRO',
    preAr: 'الموقع الأول والوحيد في مصر المصمم للقاهرة الجديدة',
    main: 'The First Exclusive Destination for New Cairo Properties. Rent & Resale.',
    mainAr: 'الوجهة الحصرية الأولى لعقارات القاهرة الجديدة. إيجار وبيع.',
    img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1920&q=85'
  }, {
    pre: 'BEST-IN-CLASS DESIGN',
    preAr: 'تصميم من الطراز الأول',
    main: 'Redefining Luxury Living with AI-Driven Excellence',
    mainAr: 'نعيد تعريف الفخامة بتميّز الذكاء الاصطناعي',
    img: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1920&q=85'
  }, {
    pre: 'AI-DRIVEN EXCELLENCE',
    preAr: 'تميّز بالذكاء الاصطناعي',
    main: 'Smart Matches for Smart Investors',
    mainAr: 'توافق ذكي لمستثمرين أذكياء',
    img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&q=85'
  }, {
    pre: 'EXCLUSIVE NETWORK',
    preAr: 'شبكة حصرية',
    main: 'Unrivaled Access to Premium Compounds',
    mainAr: 'وصول لا يُضاهى لأرقى الكمبوندات',
    img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1920&q=85'
  }, {
    pre: 'CURATED PORTFOLIO',
    preAr: 'محفظة منتقاة',
    main: 'Your Journey to Exceptional Homes Begins Here',
    mainAr: 'رحلتك نحو منزل استثنائي تبدأ هنا',
    img: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=1920&q=85'
  }],
  listings: [{
    id: 1,
    code: 'HP-VL-01',
    cmp: 'Hyde Park',
    zone: '5th Settlement',
    type: 'Villa',
    beds: 5,
    bath: 5,
    area: 480,
    egpM: 28.5,
    usd: 5200,
    ai: 9.8,
    tag: 'Premium',
    mode: 'sale',
    agent: 'Layla Mansour',
    ago: '2d ago',
    img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=85'
  }, {
    id: 2,
    code: 'MVW-TH-02',
    cmp: 'Mountain View iCity',
    zone: '5th Settlement',
    type: 'Twin House',
    beds: 4,
    bath: 3,
    area: 280,
    egpM: 15.5,
    usd: 2400,
    ai: 9.6,
    tag: 'Featured',
    mode: 'sale',
    agent: 'Karim Fahmy',
    ago: '5h ago',
    img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=85'
  }, {
    id: 3,
    code: 'MV-AP-03',
    cmp: 'Mivida',
    zone: '5th Settlement',
    type: 'Apartment',
    beds: 3,
    bath: 2,
    area: 145,
    egpM: 6.8,
    usd: 1650,
    ai: 9.1,
    tag: 'Smart Match',
    mode: 'rent',
    agent: 'Nour Saleh',
    ago: '1d ago',
    img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=85'
  }, {
    id: 4,
    code: 'UPC-PH-04',
    cmp: 'Uptown Cairo',
    zone: 'Mokattam',
    type: 'Penthouse',
    beds: 4,
    bath: 3,
    area: 300,
    egpM: 18.5,
    usd: 3800,
    ai: 9.5,
    tag: 'Exclusive',
    mode: 'sale',
    agent: 'Omar Magdy',
    ago: '6h ago',
    img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=85'
  }, {
    id: 5,
    code: 'TAJ-VL-05',
    cmp: 'Taj City',
    zone: 'New Cairo',
    type: 'Villa',
    beds: 5,
    bath: 5,
    area: 500,
    egpM: 35.0,
    usd: 6500,
    ai: 9.5,
    tag: 'Premium',
    mode: 'sale',
    agent: 'Yara Hakim',
    ago: '4d ago',
    img: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&q=85'
  }, {
    id: 6,
    code: 'VLT-VL-06',
    cmp: 'Villette',
    zone: '5th Settlement',
    type: 'Villa',
    beds: 4,
    bath: 4,
    area: 390,
    egpM: 24.5,
    usd: 4400,
    ai: 9.3,
    tag: 'New',
    mode: 'sale',
    agent: 'Rana Adel',
    ago: '3d ago',
    img: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=85'
  }, {
    id: 7,
    code: 'PH-VL-07',
    cmp: 'Palm Hills NC',
    zone: '5th Settlement',
    type: 'Villa',
    beds: 4,
    bath: 3,
    area: 380,
    egpM: 23.5,
    usd: 4200,
    ai: 9.2,
    tag: 'Best ROI',
    mode: 'sale',
    agent: 'Layla Mansour',
    ago: '1w ago',
    img: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=85'
  }, {
    id: 8,
    code: 'EST-DX-08',
    cmp: 'Eastown',
    zone: '5th Settlement',
    type: 'Duplex',
    beds: 3,
    bath: 2,
    area: 220,
    egpM: 11.5,
    usd: 2400,
    ai: 9.1,
    tag: null,
    mode: 'rent',
    agent: 'Karim Fahmy',
    ago: '2d ago',
    img: 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=800&q=85'
  }],
  rooms: [{
    name: 'Luxury Living Room',
    sub: 'Hyde Park · Grand Villa · 5th Settlement',
    img: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=1400&q=85'
  }, {
    name: 'Master Bedroom Suite',
    sub: 'Mountain View iCity · Penthouse Level',
    img: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1400&q=85'
  }, {
    name: 'Garden Courtyard',
    sub: 'Villette · Villa G-Type',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=85'
  }, {
    name: 'Infinity Pool & Deck',
    sub: 'Taj City · Signature Villa',
    img: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1400&q=85'
  }, {
    name: 'Rooftop Sky Terrace',
    sub: 'Uptown Cairo · Penthouse Level',
    img: 'https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?w=1400&q=85'
  }],
  interiors: ['https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=85', 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1200&q=85', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=85', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200&q=85', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85'],
  agentImg: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=300&q=80',
  compounds: [{
    n: 'Katameya Heights',
    c: [29.99, 31.48],
    g: '+10%',
    ai: 9.0,
    z: 'Katameya',
    priceM: 26,
    rent: 5000
  }, {
    n: 'Katameya Dunes',
    c: [29.985, 31.492],
    g: '+12%',
    ai: 8.8,
    z: 'Katameya',
    priceM: 18,
    rent: 3400
  }, {
    n: 'Swan Lake Residence',
    c: [30.045, 31.635],
    g: '+15%',
    ai: 8.9,
    z: '5th Settlement',
    priceM: 8.5,
    rent: 1700
  }, {
    n: 'Mivida',
    c: [30.007, 31.589],
    g: '+18%',
    ai: 9.1,
    z: '5th Settlement',
    priceM: 10.5,
    rent: 2100
  }, {
    n: 'Cairo Festival City Residences',
    c: [30.016, 31.469],
    g: '+12%',
    ai: 8.7,
    z: 'New Cairo',
    priceM: 7.5,
    rent: 1500
  }, {
    n: 'Hyde Park New Cairo',
    c: [30.008, 31.645],
    g: '+22%',
    ai: 9.8,
    z: '5th Settlement',
    priceM: 28.5,
    rent: 5200
  }, {
    n: 'Taj City',
    c: [30.065, 31.531],
    g: '+19%',
    ai: 9.5,
    z: 'New Cairo',
    priceM: 35,
    rent: 6500
  }, {
    n: 'Eastown (SODIC)',
    c: [30.018, 31.587],
    g: '+19%',
    ai: 9.0,
    z: '5th Settlement',
    priceM: 11.5,
    rent: 2400
  }, {
    n: 'Mountain View iCity',
    c: [30.014, 31.618],
    g: '+24%',
    ai: 9.6,
    z: '5th Settlement',
    priceM: 22,
    rent: 3200
  }, {
    n: 'Zed East (Ora)',
    c: [30.095, 31.61],
    g: '+13%',
    ai: 8.7,
    z: 'New Cairo',
    priceM: 8,
    rent: 1600
  }, {
    n: 'Palm Hills New Cairo',
    c: [30.002, 31.608],
    g: '+21%',
    ai: 9.2,
    z: '5th Settlement',
    priceM: 25,
    rent: 4800
  }, {
    n: 'The Waterway',
    c: [30.04, 31.47],
    g: '+14%',
    ai: 8.8,
    z: 'New Cairo',
    priceM: 12,
    rent: 2300
  }, {
    n: 'Lake View Residence',
    c: [30.022, 31.532],
    g: '+13%',
    ai: 8.7,
    z: 'New Cairo',
    priceM: 9.5,
    rent: 1900
  }, {
    n: 'Fifth Square (Al Marasem)',
    c: [30.025, 31.578],
    g: '+17%',
    ai: 9.0,
    z: '5th Settlement',
    priceM: 8.5,
    rent: 1750
  }, {
    n: 'Villette (SODIC)',
    c: [30.053, 31.598],
    g: '+20%',
    ai: 9.3,
    z: '5th Settlement',
    priceM: 24.5,
    rent: 4400
  }, {
    n: 'Stone Residence (Rooya)',
    c: [30.028, 31.557],
    g: '+15%',
    ai: 8.8,
    z: 'New Cairo',
    priceM: 7.8,
    rent: 1550
  }, {
    n: 'The Square (Al Ahly Sabbour)',
    c: [30.033, 31.542],
    g: '+16%',
    ai: 8.9,
    z: 'New Cairo',
    priceM: 9,
    rent: 1800
  }, {
    n: 'El Patio Oro (La Vista)',
    c: [30.029, 31.56],
    g: '+15%',
    ai: 8.9,
    z: 'New Cairo',
    priceM: 10,
    rent: 2000
  }, {
    n: 'El Patio 7 (La Vista)',
    c: [30.035, 31.565],
    g: '+14%',
    ai: 8.8,
    z: 'New Cairo',
    priceM: 8.5,
    rent: 1700
  }, {
    n: 'Katameya Gardens',
    c: [29.992, 31.488],
    g: '+11%',
    ai: 8.6,
    z: 'Katameya',
    priceM: 15,
    rent: 2800
  }, {
    n: 'Village Gardens Katameya',
    c: [29.988, 31.484],
    g: '+11%',
    ai: 8.6,
    z: 'Katameya',
    priceM: 16,
    rent: 3000
  }, {
    n: 'Galleria Moon Valley',
    c: [30.02, 31.55],
    g: '+13%',
    ai: 8.7,
    z: 'New Cairo',
    priceM: 7,
    rent: 1400
  }, {
    n: '90 Avenue (Tabarak)',
    c: [30.028, 31.572],
    g: '+14%',
    ai: 8.8,
    z: '5th Settlement',
    priceM: 8,
    rent: 1600
  }, {
    n: 'Azzar New Cairo',
    c: [30.022, 31.568],
    g: '+13%',
    ai: 8.7,
    z: 'New Cairo',
    priceM: 7.5,
    rent: 1500
  }, {
    n: 'District 5 (Marakez)',
    c: [30.012, 31.5],
    g: '+16%',
    ai: 8.9,
    z: 'New Cairo',
    priceM: 9.5,
    rent: 1900
  }, {
    n: 'The Brooks (PRE)',
    c: [30.07, 31.57],
    g: '+17%',
    ai: 8.9,
    z: 'Mostakbal',
    priceM: 7,
    rent: 1400
  }, {
    n: 'STEI8HT (LMD)',
    c: [30.075, 31.575],
    g: '+16%',
    ai: 8.8,
    z: 'Mostakbal',
    priceM: 6.5,
    rent: 1300
  }, {
    n: 'The Crest (IL Cazar)',
    c: [30.068, 31.562],
    g: '+15%',
    ai: 8.7,
    z: 'Mostakbal',
    priceM: 7.2,
    rent: 1450
  }, {
    n: 'Azad & Azad Views',
    c: [30.078, 31.558],
    g: '+14%',
    ai: 8.6,
    z: 'Mostakbal',
    priceM: 6.8,
    rent: 1350
  }, {
    n: 'Sarai (MNHD)',
    c: [30.005, 31.66],
    g: '+16%',
    ai: 9.0,
    z: 'Mostakbal',
    priceM: 9.5,
    rent: 1900
  }, {
    n: 'Bloomfields (Tatweer Misr)',
    c: [30.06, 31.67],
    g: '+18%',
    ai: 9.1,
    z: 'Mostakbal',
    priceM: 8.5,
    rent: 1700
  }, {
    n: 'Taj Sultan',
    c: [30.062, 31.535],
    g: '+13%',
    ai: 8.7,
    z: 'New Cairo',
    priceM: 8,
    rent: 1600
  }, {
    n: 'La Mirada (Inertia)',
    c: [30.058, 31.685],
    g: '+14%',
    ai: 8.6,
    z: 'Mostakbal',
    priceM: 7,
    rent: 1400
  }, {
    n: 'Aeon (Tabarak)',
    c: [30.03, 31.58],
    g: '+15%',
    ai: 8.8,
    z: '5th Settlement',
    priceM: 8.2,
    rent: 1650
  }, {
    n: 'Mountain View Executive',
    c: [30.018, 31.61],
    g: '+20%',
    ai: 9.2,
    z: '5th Settlement',
    priceM: 18,
    rent: 3000
  }, {
    n: 'Hyde Park Phase 2',
    c: [30.012, 31.652],
    g: '+22%',
    ai: 9.6,
    z: '5th Settlement',
    priceM: 27,
    rent: 5000
  }, {
    n: 'Madinaty District 1',
    c: [30.108, 31.62],
    g: '+13%',
    ai: 8.8,
    z: 'Madinaty',
    priceM: 9,
    rent: 1600
  }, {
    n: 'Madinaty District 3',
    c: [30.098, 31.63],
    g: '+13%',
    ai: 8.7,
    z: 'Madinaty',
    priceM: 8.5,
    rent: 1550
  }, {
    n: 'Madinaty District 7',
    c: [30.09, 31.64],
    g: '+14%',
    ai: 8.9,
    z: 'Madinaty',
    priceM: 10,
    rent: 1800
  }, {
    n: 'Madinaty District 8',
    c: [30.102, 31.648],
    g: '+14%',
    ai: 8.9,
    z: 'Madinaty',
    priceM: 11,
    rent: 1900
  }, {
    n: 'Madinaty Executive Villas',
    c: [30.115, 31.635],
    g: '+17%',
    ai: 9.3,
    z: 'Madinaty',
    priceM: 24,
    rent: 4200
  }, {
    n: 'Madinaty Lake Park',
    c: [30.088, 31.655],
    g: '+16%',
    ai: 9.1,
    z: 'Madinaty',
    priceM: 15,
    rent: 2600
  }, {
    n: 'El Shorouk City',
    c: [30.128, 31.62],
    g: '+11%',
    ai: 8.4,
    z: 'Shorouk',
    priceM: 6.5,
    rent: 1300
  }, {
    n: 'El Shorouk Springs',
    c: [30.135, 31.615],
    g: '+12%',
    ai: 8.5,
    z: 'Shorouk',
    priceM: 7,
    rent: 1350
  }, {
    n: 'Al Burouj (Capital Group)',
    c: [30.155, 31.63],
    g: '+18%',
    ai: 9.2,
    z: 'Shorouk',
    priceM: 13,
    rent: 2400
  }, {
    n: 'El Patio 5 East (La Vista)',
    c: [30.14, 31.6],
    g: '+14%',
    ai: 8.7,
    z: 'Shorouk',
    priceM: 8,
    rent: 1600
  }, {
    n: 'Dar Misr El Shorouk',
    c: [30.132, 31.635],
    g: '+10%',
    ai: 8.3,
    z: 'Shorouk',
    priceM: 5.5,
    rent: 1150
  }, {
    n: 'Green Square (Sabbour)',
    c: [30.148, 31.61],
    g: '+15%',
    ai: 8.8,
    z: 'Shorouk',
    priceM: 8.8,
    rent: 1750
  }, {
    n: 'Mivida Parks',
    c: [30.003, 31.595],
    g: '+17%',
    ai: 9.0,
    z: '5th Settlement',
    priceM: 11,
    rent: 2200
  }, {
    n: 'Fifth Square Boulevard',
    c: [30.027, 31.582],
    g: '+16%',
    ai: 8.9,
    z: '5th Settlement',
    priceM: 9,
    rent: 1850
  }, {
    n: 'Layan Residence (MNHD)',
    c: [30.01, 31.655],
    g: '+14%',
    ai: 8.7,
    z: 'Mostakbal',
    priceM: 7.5,
    rent: 1500
  }, {
    n: 'Jayd (IWAN)',
    c: [30.045, 31.665],
    g: '+15%',
    ai: 8.8,
    z: 'Mostakbal',
    priceM: 8,
    rent: 1600
  }],
  compoundImgs: {
    'Hyde Park New Cairo': 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    'Mivida': 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    'Mountain View iCity': 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
    'Eastown (SODIC)': 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=800&q=80',
    'Taj City': 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&q=80',
    'Villette (SODIC)': 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80',
    'Palm Hills New Cairo': 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80',
    'Katameya Heights': 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80'
  },
  price: function (p) {
    return p.mode === 'rent' ? '$' + p.usd.toLocaleString() + '/mo' : 'EGP ' + p.egpM.toFixed(1) + 'M';
  }
};

/* deterministic per-compound unit inventory (excel-sheet view) */
(function (D) {
  var cache = {};
  var TYPES = ['Apartment', 'Apartment', 'Apartment', 'Duplex', 'Twin House', 'Townhouse', 'Penthouse', 'Villa', 'Villa'];
  var AGENTS = ['Layla Mansour', 'Karim Fahmy', 'Nour Saleh', 'Omar Magdy', 'Yara Hakim', 'Rana Adel'];
  var IMGS = ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=85', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=85', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=85', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=85', 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=85', 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=85', 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=800&q=85', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&q=85'];
  function hash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = h * 31 + s.charCodeAt(i) >>> 0;
    }
    return h;
  }
  function rng(seed) {
    var x = seed || 1;
    return function () {
      x = x * 1103515245 + 12345 >>> 0;
      return (x >>> 8) / 16777216;
    };
  }
  var AREAS = {
    'Apartment': [110, 220],
    'Duplex': [200, 320],
    'Twin House': [250, 340],
    'Townhouse': [220, 300],
    'Penthouse': [240, 380],
    'Villa': [350, 620]
  };
  var MULT = {
    'Apartment': 0.32,
    'Duplex': 0.5,
    'Twin House': 0.62,
    'Townhouse': 0.55,
    'Penthouse': 0.75,
    'Villa': 1
  };
  D.unitsFor = function (name) {
    if (cache[name]) return cache[name];
    var c = D.compounds.find(function (x) {
      return x.n === name;
    });
    if (!c) return [];
    var r = rng(hash(name));
    var count = 8 + Math.floor(r() * 17); // 8–24 units
    var abbr = name.replace(/\(.*\)/, '').trim().split(/\s+/).map(function (w) {
      return w[0];
    }).join('').toUpperCase().slice(0, 3);
    var units = [];
    for (var i = 0; i < count; i++) {
      var type = TYPES[Math.floor(r() * TYPES.length)];
      var span = AREAS[type];
      var area = Math.round((span[0] + r() * (span[1] - span[0])) / 5) * 5;
      var mode = r() < 0.3 ? 'rent' : 'sale';
      var beds = type === 'Villa' ? 4 + Math.floor(r() * 2) : type === 'Apartment' ? 2 + Math.floor(r() * 2) : 3 + Math.floor(r() * 2);
      var bath = Math.max(2, beds - Math.floor(r() * 2));
      var egpM = Math.round(c.priceM * MULT[type] * (0.85 + r() * 0.5) * 10) / 10;
      var usd = Math.round(c.rent * MULT[type] * (0.85 + r() * 0.5) / 50) * 50;
      var ai = Math.round(Math.min(9.9, Math.max(7.8, c.ai + (r() - 0.5) * 0.8)) * 10) / 10;
      var floor = type === 'Villa' || type === 'Twin House' || type === 'Townhouse' ? 'G+2' : 1 + Math.floor(r() * 8) + '';
      units.push({
        code: abbr + '-' + type.charAt(0) + (101 + i),
        type: type,
        beds: beds,
        bath: bath,
        area: area,
        floor: floor,
        mode: mode,
        egpM: egpM,
        usd: usd,
        ai: ai,
        status: r() < 0.14 ? 'reserved' : 'available',
        agent: AGENTS[Math.floor(r() * AGENTS.length)],
        img: IMGS[Math.floor(r() * IMGS.length)]
      });
    }
    cache[name] = units;
    return units;
  };
})(window.HZDATA);
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/houzez-portal/data.js", error: String((e && e.message) || e) }); }

// ui_kits/houzez-portal/image-slot.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
/* BEGIN USAGE */
/**
 * <image-slot> — user-fillable image placeholder.
 *
 * Drop this into a deck, mockup, or page wherever you want the user to
 * supply an image. You control the slot's shape and size; the user fills it
 * by dragging an image file onto it (or clicking to browse). The dropped
 * image persists across reloads via a .image-slots.state.json sidecar —
 * same read-via-fetch / write-via-window.omelette pattern as
 * design_canvas.jsx, so the filled slot shows on share links, downloaded
 * zips, and PPTX export. Outside the omelette runtime the slot is read-only.
 *
 * The host bridge only allows sidecar writes at the project root, so the
 * HTML that uses this component is assumed to live at the project root too
 * (same constraint as design_canvas.jsx).
 *
 * Attributes:
 *   id           Persistence key. REQUIRED for the drop to survive reload —
 *                every slot on the page needs a distinct id.
 *   shape        'rect' | 'rounded' | 'circle' | 'pill'   (default 'rounded')
 *                'circle' applies 50% border-radius; on a non-square slot
 *                that's an ellipse — set equal width and height for a true
 *                circle.
 *   radius       Corner radius in px for 'rounded'.       (default 12)
 *   mask         Any CSS clip-path value. Overrides `shape` — use this for
 *                hexagons, blobs, arbitrary polygons.
 *   fit          object-fit: cover | contain | fill.       (default 'cover')
 *                With cover (the default) double-clicking the filled slot
 *                enters a reframe mode: the whole image spills past the mask
 *                (translucent outside, opaque inside), drag to reposition,
 *                corner-drag to scale. The crop persists alongside the image
 *                in the sidecar. contain/fill stay static.
 *   position     object-position for fit=contain|fill.     (default '50% 50%')
 *   placeholder  Empty-state caption.                      (default 'Drop an image')
 *   src          Optional initial/fallback image URL. A user drop overrides
 *                it; clearing the drop reveals src again.
 *   credit       Optional attribution text (e.g. 'Photo by Jane Doe on
 *                Unsplash') shown as a small overlay at the bottom-left of
 *                the filled slot. It belongs to the src image, so it only
 *                shows while src is what's displayed — a user-dropped
 *                image hides it.
 *   credit-href  Optional link for the credit overlay (e.g. the
 *                photographer's profile). http(s) URLs only — anything
 *                else renders the credit as plain text.
 *
 * Size and layout come from ordinary CSS on the element — width/height
 * inline or from a parent grid — so it composes with any layout.
 *
 * Usage:
 *   <image-slot id="hero"   style="width:800px;height:450px" shape="rounded" radius="20"
 *               placeholder="Drop a hero image"></image-slot>
 *   <image-slot id="avatar" style="width:120px;height:120px" shape="circle"></image-slot>
 *   <image-slot id="kite"   style="width:300px;height:300px"
 *               mask="polygon(50% 0, 100% 50%, 50% 100%, 0 50%)"></image-slot>
 */
/* END USAGE */

(() => {
  const STATE_FILE = '.image-slots.state.json';
  // 2× a ~600px slot in a 1920-wide deck — retina-sharp without making the
  // sidecar enormous. A 1200px WebP at q=0.85 is ~150-300KB.
  const MAX_DIM = 1200;
  // Raster formats only. SVG is excluded (can carry script; createImageBitmap
  // on SVG blobs is inconsistent). GIF is excluded because the canvas
  // re-encode keeps only the first frame, so an animated GIF would silently
  // go still — better to reject than surprise.
  const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];

  // ── Shared sidecar store ────────────────────────────────────────────────
  // One fetch + immediate write-on-change for every <image-slot> on the
  // page. Reads via fetch() so viewing works anywhere the HTML and sidecar
  // are served together; writes go through window.omelette.writeFile, which
  // the host allowlists to *.state.json basenames only.
  const subs = new Set();
  let slots = {};
  // ids explicitly cleared before the sidecar fetch resolved — otherwise
  // the merge below can't tell "never set" from "just deleted" and would
  // resurrect the sidecar's stale value.
  const tombstones = new Set();
  let loaded = false;
  let loadP = null;
  function load() {
    if (loadP) return loadP;
    loadP = fetch(STATE_FILE).then(r => r.ok ? r.json() : null).then(j => {
      // Merge: sidecar loses to any in-memory change that raced ahead of
      // the fetch (drop or clear) so neither is clobbered by hydration.
      if (j && typeof j === 'object') {
        const merged = Object.assign({}, j, slots);
        // A framing-only write that raced ahead of hydration must not
        // drop a user image that's only on disk — inherit u from the
        // sidecar for any in-memory entry that lacks one.
        for (const k in slots) {
          if (merged[k] && !merged[k].u && j[k]) {
            merged[k].u = typeof j[k] === 'string' ? j[k] : j[k].u;
          }
        }
        for (const id of tombstones) delete merged[id];
        slots = merged;
      }
      tombstones.clear();
    }).catch(() => {}).then(() => {
      loaded = true;
      subs.forEach(fn => fn());
    });
    return loadP;
  }

  // Serialize writes so two near-simultaneous drops on different slots
  // can't reorder at the backend and leave the sidecar with only the
  // first. A save requested mid-flight just marks dirty and re-fires on
  // completion with the then-current slots.
  let saving = false;
  let saveDirty = false;
  function save() {
    if (saving) {
      saveDirty = true;
      return;
    }
    const w = window.omelette && window.omelette.writeFile;
    if (!w) return;
    saving = true;
    Promise.resolve(w(STATE_FILE, JSON.stringify(slots))).catch(() => {}).then(() => {
      saving = false;
      if (saveDirty) {
        saveDirty = false;
        save();
      }
    });
  }
  const S_MAX = 5;
  const clampS = s => Math.max(1, Math.min(S_MAX, s));

  // Normalize a stored slot value. Pre-reframe sidecars stored a bare
  // data-URL string; newer ones store {u, s, x, y}. Either shape is valid.
  function getSlot(id) {
    const v = slots[id];
    if (!v) return null;
    return typeof v === 'string' ? {
      u: v,
      s: 1,
      x: 0,
      y: 0
    } : v;
  }
  function setSlot(id, val) {
    if (!id) return;
    if (val) {
      slots[id] = val;
      tombstones.delete(id);
    } else {
      delete slots[id];
      if (!loaded) tombstones.add(id);
    }
    subs.forEach(fn => fn());
    // A drop is rare + high-value — write immediately so nav-away can't lose
    // it. Gate on the initial read so we don't overwrite a sidecar we haven't
    // merged yet; the merge in load() keeps this change once the read lands.
    if (loaded) save();else load().then(save);
  }

  // ── Image downscale ─────────────────────────────────────────────────────
  // Encode through a canvas so the sidecar carries resized bytes, not the
  // raw upload. Longest side is capped at 2× the slot's rendered width
  // (retina) and at MAX_DIM. WebP keeps alpha and is ~10× smaller than PNG
  // for photos, so there's no need for per-image format picking.
  async function toDataUrl(file, targetW) {
    const bitmap = await createImageBitmap(file);
    try {
      const cap = Math.min(MAX_DIM, Math.max(1, Math.round(targetW * 2)) || MAX_DIM);
      const scale = Math.min(1, cap / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
      return canvas.toDataURL('image/webp', 0.85);
    } finally {
      bitmap.close && bitmap.close();
    }
  }

  // ── Custom element ──────────────────────────────────────────────────────
  const stylesheet = ':host{display:inline-block;position:relative;vertical-align:top;' + '  font:13px/1.3 system-ui,-apple-system,sans-serif;color:rgba(0,0,0,.55);width:240px;height:160px}' + '.frame{position:absolute;inset:0;overflow:hidden;background:rgba(0,0,0,.04)}' +
  // .frame img (clipped) and .spill (unclipped ghost + handles) share the
  // same left/top/width/height in frame-%, computed by _applyView(), so the
  // inside-mask crop and the outside-mask spill stay pixel-aligned.
  '.frame img{position:absolute;max-width:none;transform:translate(-50%,-50%);' + '  -webkit-user-drag:none;user-select:none;touch-action:none}' +
  // Reframe mode (double-click): the full image spills past the mask. The
  // spill layer is sized to the IMAGE bounds so its corners are where the
  // resize handles belong. The ghost <img> inside is translucent; the real
  // clipped <img> underneath shows the opaque in-mask crop.
  '.spill{position:absolute;transform:translate(-50%,-50%);display:none;z-index:1;' + '  cursor:grab;touch-action:none}' + ':host([data-panning]) .spill{cursor:grabbing}' + '.spill .ghost{position:absolute;inset:0;width:100%;height:100%;opacity:.35;' + '  pointer-events:none;-webkit-user-drag:none;user-select:none;' + '  box-shadow:0 0 0 1px rgba(0,0,0,.2),0 12px 32px rgba(0,0,0,.2)}' + '.spill .handle{position:absolute;width:12px;height:12px;border-radius:50%;' + '  background:#fff;box-shadow:0 0 0 1.5px #c96442,0 1px 3px rgba(0,0,0,.3);' + '  transform:translate(-50%,-50%)}' + '.spill .handle[data-c=nw]{left:0;top:0;cursor:nwse-resize}' + '.spill .handle[data-c=ne]{left:100%;top:0;cursor:nesw-resize}' + '.spill .handle[data-c=sw]{left:0;top:100%;cursor:nesw-resize}' + '.spill .handle[data-c=se]{left:100%;top:100%;cursor:nwse-resize}' + ':host([data-reframe]){z-index:10}' + ':host([data-reframe]) .spill{display:block}' + ':host([data-reframe]) .frame{box-shadow:0 0 0 2px #c96442}' + '.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' + '  justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;' + '  cursor:pointer;user-select:none}' + '.empty svg{opacity:.45}' + '.empty .cap{max-width:90%;font-weight:500;letter-spacing:.01em}' + '.empty .sub{font-size:11px}' + '.empty .sub u{text-underline-offset:2px;text-decoration-color:rgba(0,0,0,.25)}' + '.empty:hover .sub u{color:rgba(0,0,0,.75);text-decoration-color:currentColor}' + ':host([data-over]) .frame{outline:2px solid #c96442;outline-offset:-2px;' + '  background:rgba(201,100,66,.10)}' + '.ring{position:absolute;inset:0;pointer-events:none;border:1.5px dashed rgba(0,0,0,.25);' + '  transition:border-color .12s}' + ':host([data-over]) .ring{border-color:#c96442}' + ':host([data-filled]) .ring{display:none}' +
  // Controls sit BELOW the mask (top:100%), absolutely positioned so the
  // author-declared slot height is unaffected. The gap is padding, not a
  // top offset, so the hover target stays contiguous with the frame.
  '.ctl{position:absolute;top:100%;left:50%;transform:translateX(-50%);padding-top:8px;' + '  display:flex;gap:6px;opacity:0;pointer-events:none;transition:opacity .12s;z-index:2;' + '  white-space:nowrap}' + ':host([data-filled][data-editable]:hover) .ctl,:host([data-reframe]) .ctl' + '  {opacity:1;pointer-events:auto}' + '.ctl button{appearance:none;border:0;border-radius:6px;padding:5px 10px;cursor:pointer;' + '  background:rgba(0,0,0,.65);color:#fff;font:11px/1 system-ui,-apple-system,sans-serif;' + '  backdrop-filter:blur(6px)}' + '.ctl button:hover{background:rgba(0,0,0,.8)}' + '.err{position:absolute;left:8px;bottom:8px;right:8px;color:#b3261e;font-size:11px;' + '  background:rgba(255,255,255,.85);padding:4px 6px;border-radius:5px;pointer-events:none}' + '.credit{position:absolute;left:6px;bottom:6px;max-width:calc(100% - 12px);display:none;' + '  padding:3px 7px;border-radius:5px;background:rgba(0,0,0,.55);color:#fff;' + '  font:10px/1.2 system-ui,-apple-system,sans-serif;text-decoration:none;' + '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;backdrop-filter:blur(6px)}' + '.credit[href]:hover{background:rgba(0,0,0,.8);text-decoration:underline}' + ':host([data-filled][data-credit]) .credit{display:block}';
  const icon = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>' + '<path d="m21 15-5-5L5 21"/></svg>';
  class ImageSlot extends HTMLElement {
    static get observedAttributes() {
      return ['shape', 'radius', 'mask', 'fit', 'position', 'placeholder', 'src', 'id', 'credit', 'credit-href'];
    }
    constructor() {
      super();
      const root = this.attachShadow({
        mode: 'open'
      });
      // .spill and .ctl sit OUTSIDE .frame so overflow:hidden + border-radius
      // on the frame (circle, pill, rounded) can't clip them.
      root.innerHTML = '<style>' + stylesheet + '</style>' + '<div class="frame" part="frame">' + '  <img part="image" alt="" draggable="false" style="display:none">' + '  <div class="empty" part="empty">' + icon + '    <div class="cap"></div>' + '    <div class="sub">or <u>browse files</u></div></div>' + '  <div class="ring" part="ring"></div>' + '</div>' +
      // Outside .frame, like .spill/.ctl — the frame's overflow:hidden +
      // border-radius/clip-path would cut the credit off on circle/pill/mask.
      '<a class="credit" part="credit" target="_blank" rel="noopener noreferrer"></a>' + '<div class="spill">' + '  <img class="ghost" alt="" draggable="false">' + '  <div class="handle" data-c="nw"></div><div class="handle" data-c="ne"></div>' + '  <div class="handle" data-c="sw"></div><div class="handle" data-c="se"></div>' + '</div>' + '<div class="ctl"><button data-act="replace" title="Replace image">Replace</button>' + '  <button data-act="clear" title="Remove image">Remove</button></div>' + '<input type="file" accept="' + ACCEPT.join(',') + '" hidden>';
      this._frame = root.querySelector('.frame');
      this._ring = root.querySelector('.ring');
      this._img = root.querySelector('.frame img');
      this._empty = root.querySelector('.empty');
      this._cap = root.querySelector('.cap');
      this._sub = root.querySelector('.sub');
      this._spill = root.querySelector('.spill');
      this._credit = root.querySelector('.credit');
      // Credit clicks open the link, not browse/reframe.
      this._credit.addEventListener('click', e => e.stopPropagation());
      this._credit.addEventListener('dblclick', e => e.stopPropagation());
      this._ghost = root.querySelector('.ghost');
      this._err = null;
      this._input = root.querySelector('input');
      this._depth = 0;
      this._gen = 0;
      this._view = {
        s: 1,
        x: 0,
        y: 0
      };
      this._subFn = () => this._render();
      // Shadow-DOM listeners live with the shadow DOM — bound once here so
      // disconnect/reconnect (e.g. React remount) doesn't stack handlers.
      this._empty.addEventListener('click', () => this._input.click());
      root.addEventListener('click', e => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (act === 'replace') {
          this._exitReframe(true);
          this._input.click();
        }
        if (act === 'clear') {
          this._exitReframe(false);
          this._gen++;
          this._local = null;
          if (this.id) setSlot(this.id, null);else this._render();
        }
      });
      this._input.addEventListener('change', () => {
        const f = this._input.files && this._input.files[0];
        if (f) this._ingest(f);
        this._input.value = '';
      });
      // naturalWidth/Height aren't known until load — re-apply so the cover
      // baseline is computed from real dimensions, not the 100%×100% fallback.
      this._img.addEventListener('load', () => this._applyView());
      // Gated on editable + fit=cover so share links and contain/fill slots
      // stay static.
      this.addEventListener('dblclick', e => {
        if (!this.hasAttribute('data-editable') || !this._reframes()) return;
        e.preventDefault();
        if (this.hasAttribute('data-reframe')) this._exitReframe(true);else this._enterReframe();
      });
      // Pan + resize both originate on the spill layer. A handle pointerdown
      // drives an aspect-locked resize anchored at the opposite corner; any
      // other pointerdown on the spill pans. Offsets are frame-% so a
      // reframed slot survives responsive resize / PPTX export.
      this._spill.addEventListener('pointerdown', e => {
        if (e.button !== 0 || !this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        e.stopPropagation();
        this._spill.setPointerCapture(e.pointerId);
        const rect = this.getBoundingClientRect();
        const fw = rect.width || 1,
          fh = rect.height || 1;
        const corner = e.target.getAttribute && e.target.getAttribute('data-c');
        let move;
        if (corner) {
          // Resize about the OPPOSITE corner. Viewport-px throughout (rect
          // fw/fh, not clientWidth) so the math survives a transform:scale()
          // ancestor — deck_stage renders slides scaled-to-fit.
          const iw = this._img.naturalWidth || 1,
            ih = this._img.naturalHeight || 1;
          const base = Math.max(fw / iw, fh / ih);
          const sx = corner.includes('e') ? 1 : -1;
          const sy = corner.includes('s') ? 1 : -1;
          const s0 = this._view.s;
          const w0 = iw * base * s0,
            h0 = ih * base * s0;
          const cx0 = (50 + this._view.x) / 100 * fw;
          const cy0 = (50 + this._view.y) / 100 * fh;
          const ox = cx0 - sx * w0 / 2,
            oy = cy0 - sy * h0 / 2;
          const diag0 = Math.hypot(w0, h0);
          const ux = sx * w0 / diag0,
            uy = sy * h0 / diag0;
          move = ev => {
            const proj = (ev.clientX - rect.left - ox) * ux + (ev.clientY - rect.top - oy) * uy;
            const s = clampS(s0 * proj / diag0);
            const d = diag0 * s / s0;
            this._view.s = s;
            this._view.x = (ox + ux * d / 2) / fw * 100 - 50;
            this._view.y = (oy + uy * d / 2) / fh * 100 - 50;
            this._clampView();
            this._applyView();
          };
        } else {
          this.setAttribute('data-panning', '');
          const start = {
            px: e.clientX,
            py: e.clientY,
            x: this._view.x,
            y: this._view.y
          };
          move = ev => {
            this._view.x = start.x + (ev.clientX - start.px) / fw * 100;
            this._view.y = start.y + (ev.clientY - start.py) / fh * 100;
            this._clampView();
            this._applyView();
          };
        }
        const up = () => {
          try {
            this._spill.releasePointerCapture(e.pointerId);
          } catch {}
          this._spill.removeEventListener('pointermove', move);
          this._spill.removeEventListener('pointerup', up);
          this._spill.removeEventListener('pointercancel', up);
          this.removeAttribute('data-panning');
          this._dragUp = null;
        };
        // Stashed so _exitReframe (Escape / outside-click mid-drag) can
        // tear the capture + listeners down synchronously.
        this._dragUp = up;
        this._spill.addEventListener('pointermove', move);
        this._spill.addEventListener('pointerup', up);
        this._spill.addEventListener('pointercancel', up);
      });
      // Wheel zoom stays available inside reframe mode as a trackpad nicety —
      // zooms toward the cursor (offset' = cursor·(1-k) + offset·k).
      this.addEventListener('wheel', e => {
        if (!this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        const r = this.getBoundingClientRect();
        const cx = (e.clientX - r.left) / r.width * 100 - 50;
        const cy = (e.clientY - r.top) / r.height * 100 - 50;
        const prev = this._view.s;
        const next = clampS(prev * Math.pow(1.0015, -e.deltaY));
        if (next === prev) return;
        const k = next / prev;
        this._view.s = next;
        this._view.x = cx * (1 - k) + this._view.x * k;
        this._view.y = cy * (1 - k) + this._view.y * k;
        this._clampView();
        this._applyView();
      }, {
        passive: false
      });
    }
    connectedCallback() {
      // Warn once per page — an id-less slot works for the session but
      // cannot persist, and two id-less slots would share nothing.
      if (!this.id && !ImageSlot._warned) {
        ImageSlot._warned = true;
        console.warn('<image-slot> without an id will not persist its dropped image.');
      }
      this.addEventListener('dragenter', this);
      this.addEventListener('dragover', this);
      this.addEventListener('dragleave', this);
      this.addEventListener('drop', this);
      subs.add(this._subFn);
      // width%/height% in _applyView encode the frame aspect at call time —
      // a host resize (responsive grid, pane divider) would stretch the
      // image until the next _render. Re-render on size change: _render()
      // re-seeds _view from stored before clamp/apply, so a shrink→grow
      // cycle round-trips instead of ratcheting x/y toward the narrower
      // frame's clamp range.
      this._ro = new ResizeObserver(() => this._render());
      this._ro.observe(this);
      load();
      this._render();
    }
    disconnectedCallback() {
      subs.delete(this._subFn);
      this.removeEventListener('dragenter', this);
      this.removeEventListener('dragover', this);
      this.removeEventListener('dragleave', this);
      this.removeEventListener('drop', this);
      if (this._ro) {
        this._ro.disconnect();
        this._ro = null;
      }
      this._exitReframe(false);
    }
    _enterReframe() {
      if (this.hasAttribute('data-reframe')) return;
      this.setAttribute('data-reframe', '');
      this._applyView();
      // Close on click outside (the spill handler stopPropagation()s so
      // in-image drags don't reach this) and on Escape. Listeners are held
      // on the instance so _exitReframe / disconnectedCallback can detach
      // exactly what was attached.
      this._outside = e => {
        if (e.composedPath && e.composedPath().includes(this)) return;
        this._exitReframe(true);
      };
      this._esc = e => {
        if (e.key === 'Escape') this._exitReframe(true);
      };
      document.addEventListener('pointerdown', this._outside, true);
      document.addEventListener('keydown', this._esc, true);
    }
    _exitReframe(commit) {
      if (!this.hasAttribute('data-reframe')) return;
      if (this._dragUp) this._dragUp();
      this.removeAttribute('data-reframe');
      this.removeAttribute('data-panning');
      if (this._outside) document.removeEventListener('pointerdown', this._outside, true);
      if (this._esc) document.removeEventListener('keydown', this._esc, true);
      this._outside = this._esc = null;
      if (commit) this._commitView();
    }
    attributeChangedCallback() {
      if (this.shadowRoot) this._render();
    }

    // handleEvent — one listener object for all four drag events keeps the
    // add/remove symmetric and the depth counter correct.
    handleEvent(e) {
      if (e.type === 'dragenter' || e.type === 'dragover') {
        // Without preventDefault the browser never fires 'drop'.
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (e.type === 'dragenter') this._depth++;
        this.setAttribute('data-over', '');
      } else if (e.type === 'dragleave') {
        // dragenter/leave fire for every descendant crossing — count depth
        // so hovering the icon inside the empty state doesn't flicker.
        if (--this._depth <= 0) {
          this._depth = 0;
          this.removeAttribute('data-over');
        }
      } else if (e.type === 'drop') {
        e.preventDefault();
        e.stopPropagation();
        this._depth = 0;
        this.removeAttribute('data-over');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) this._ingest(f);
      }
    }
    async _ingest(file) {
      this._setError(null);
      if (!file || ACCEPT.indexOf(file.type) < 0) {
        this._setError('Drop a PNG, JPEG, WebP, or AVIF image.');
        return;
      }
      // toDataUrl can take hundreds of ms on a large photo. A Clear or a
      // newer drop during that window would be clobbered when this await
      // resumes — bump + capture a generation so stale encodes bail.
      const gen = ++this._gen;
      try {
        const w = this.clientWidth || this.offsetWidth || MAX_DIM;
        const url = await toDataUrl(file, w);
        if (gen !== this._gen) return;
        // Only exit reframe once the new image is in hand — a rejected type
        // or decode failure leaves the in-progress crop untouched.
        this._exitReframe(false);
        const val = {
          u: url,
          s: 1,
          x: 0,
          y: 0
        };
        setSlot(this.id || '', val);
        // Keep a session-local copy for id-less slots so the drop still
        // shows, even though it cannot persist.
        if (!this.id) {
          this._local = val;
          this._render();
        }
      } catch (err) {
        if (gen !== this._gen) return;
        this._setError('Could not read that image.');
        console.warn('<image-slot> ingest failed:', err);
      }
    }
    _setError(msg) {
      if (this._err) {
        this._err.remove();
        this._err = null;
      }
      if (!msg) return;
      const d = document.createElement('div');
      d.className = 'err';
      d.textContent = msg;
      this.shadowRoot.appendChild(d);
      this._err = d;
      setTimeout(() => {
        if (this._err === d) {
          d.remove();
          this._err = null;
        }
      }, 3000);
    }

    // Reframing (pan/resize) is only meaningful for fit=cover — contain/fill
    // keep the old object-fit path and double-click is a no-op.
    _reframes() {
      return this.hasAttribute('data-filled') && (this.getAttribute('fit') || 'cover') === 'cover';
    }

    // Cover-baseline geometry, shared by clamp/apply/resize. Null until the
    // img has loaded (naturalWidth is 0 before that) or when the slot has no
    // layout box — ResizeObserver fires with a 0×0 rect under display:none,
    // and clamping against a degenerate 1×1 frame would silently pull the
    // stored pan toward zero.
    _geom() {
      const iw = this._img.naturalWidth,
        ih = this._img.naturalHeight;
      const fw = this.clientWidth,
        fh = this.clientHeight;
      if (!iw || !ih || !fw || !fh) return null;
      return {
        iw,
        ih,
        fw,
        fh,
        base: Math.max(fw / iw, fh / ih)
      };
    }
    _clampView() {
      // Pan range on each axis is half the overflow past the frame edge.
      const g = this._geom();
      if (!g) return;
      const mx = Math.max(0, (g.iw * g.base * this._view.s / g.fw - 1) * 50);
      const my = Math.max(0, (g.ih * g.base * this._view.s / g.fh - 1) * 50);
      this._view.x = Math.max(-mx, Math.min(mx, this._view.x));
      this._view.y = Math.max(-my, Math.min(my, this._view.y));
    }
    _applyView() {
      const g = this._geom();
      const fit = this.getAttribute('fit') || 'cover';
      if (fit !== 'cover' || !g) {
        // Non-cover, or dimensions not known yet (before img load).
        this._img.style.width = '100%';
        this._img.style.height = '100%';
        this._img.style.left = '50%';
        this._img.style.top = '50%';
        this._img.style.objectFit = fit;
        this._img.style.objectPosition = this.getAttribute('position') || '50% 50%';
        return;
      }
      // Cover baseline: img fills the frame on its tighter axis at s=1, so
      // pan works immediately on the overflowing axis without zooming first.
      // Width/height and left/top are all frame-% — depends only on the
      // frame aspect ratio, so a responsive resize keeps the same crop. The
      // spill layer mirrors the same box so its corners = image corners.
      const k = g.base * this._view.s;
      const w = g.iw * k / g.fw * 100 + '%';
      const h = g.ih * k / g.fh * 100 + '%';
      const l = 50 + this._view.x + '%';
      const t = 50 + this._view.y + '%';
      this._img.style.width = w;
      this._img.style.height = h;
      this._img.style.left = l;
      this._img.style.top = t;
      this._img.style.objectFit = '';
      this._spill.style.width = w;
      this._spill.style.height = h;
      this._spill.style.left = l;
      this._spill.style.top = t;
    }
    _commitView() {
      const v = {
        s: this._view.s,
        x: this._view.x,
        y: this._view.y
      };
      if (this._userUrl) v.u = this._userUrl;
      // Framing-only (no u) persists too so an author-src slot remembers its
      // crop; clearing the sidecar still falls through to src=.
      if (this.id) setSlot(this.id, v);else {
        this._local = v;
      }
    }
    _render() {
      // Shape / mask. Presets use border-radius so the dashed ring can
      // follow the rounded outline; clip-path is only applied for an
      // explicit `mask` (the ring is hidden there since a rectangle
      // dashed border chopped by an arbitrary polygon looks broken).
      const mask = this.getAttribute('mask');
      const shape = (this.getAttribute('shape') || 'rounded').toLowerCase();
      let radius = '';
      if (shape === 'circle') radius = '50%';else if (shape === 'pill') radius = '9999px';else if (shape === 'rounded') {
        const n = parseFloat(this.getAttribute('radius'));
        radius = (Number.isFinite(n) ? n : 12) + 'px';
      }
      this._frame.style.borderRadius = mask ? '' : radius;
      this._frame.style.clipPath = mask || '';
      this._ring.style.borderRadius = mask ? '' : radius;
      this._ring.style.display = mask ? 'none' : '';

      // Controls and reframe entry gate on this so share links stay read-only.
      const editable = !!(window.omelette && window.omelette.writeFile);
      this.toggleAttribute('data-editable', editable);
      this._sub.style.display = editable ? '' : 'none';

      // Content. The sidecar is also writable by the agent's write_file
      // tool, so its value isn't guaranteed canvas-originated — only accept
      // data:image/ URLs from it. The `src` attribute is author-controlled
      // (Claude wrote it into the HTML) so it passes through unchanged.
      let stored = this.id ? getSlot(this.id) : this._local;
      if (stored && stored.u && !/^data:image\//i.test(stored.u)) stored = null;
      const srcAttr = this.getAttribute('src') || '';
      this._userUrl = stored && stored.u || null;
      const url = this._userUrl || srcAttr;
      // Don't clobber an in-flight reframe with a store-triggered re-render.
      if (!this.hasAttribute('data-reframe')) {
        this._view = {
          s: stored && Number.isFinite(stored.s) ? clampS(stored.s) : 1,
          x: stored && Number.isFinite(stored.x) ? stored.x : 0,
          y: stored && Number.isFinite(stored.y) ? stored.y : 0
        };
      }
      this._cap.textContent = this.getAttribute('placeholder') || 'Drop an image';
      // Toggle via style.display — the [hidden] attribute alone loses to
      // the display:flex / display:block rules in the stylesheet above.
      if (url) {
        if (this._img.getAttribute('src') !== url) {
          this._img.src = url;
          this._ghost.src = url;
        }
        this._img.style.display = 'block';
        this._empty.style.display = 'none';
        this.setAttribute('data-filled', '');
        this._clampView();
        this._applyView();
      } else {
        this._img.style.display = 'none';
        this._img.removeAttribute('src');
        this._ghost.removeAttribute('src');
        this._empty.style.display = 'flex';
        this.removeAttribute('data-filled');
      }

      // Credit belongs to the author src, so a user drop hides it.
      // textContent + http(s)-only href keep external strings inert.
      const credit = this.getAttribute('credit');
      const showCredit = !!(url && credit && !this._userUrl);
      if (showCredit) {
        this._credit.textContent = credit;
        let href = '';
        const rawHref = this.getAttribute('credit-href') || '';
        if (rawHref) {
          try {
            const u = new URL(rawHref, document.baseURI);
            if (u.protocol === 'http:' || u.protocol === 'https:') href = u.href;
          } catch {}
        }
        if (href) this._credit.setAttribute('href', href);else this._credit.removeAttribute('href');
      } else {
        this._credit.textContent = '';
        this._credit.removeAttribute('href');
      }
      this.toggleAttribute('data-credit', showCredit);
    }
  }
  if (!customElements.get('image-slot')) {
    customElements.define('image-slot', ImageSlot);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/houzez-portal/image-slot.js", error: String((e && e.message) || e) }); }

// ui_kits/houzez-portal/shared.js
try { (() => {
/* Sierra Estates × Houzez portal — shared chrome, i18n, theme, motion */
(function () {
  var D = window.HZDATA;

  /* ── i18n ── */
  var I18N = {
    en: {
      dir: 'ltr',
      brandSub: 'Future of Real Estate',
      navHome: 'Home',
      navProps: 'Properties',
      navCpds: 'Show Map',
      navAgents: 'Agents',
      navContact: 'Contact',
      navAI: 'AI Tools',
      addListing: 'Add Listing',
      signIn: 'Sign In',
      langBtn: 'العربية',
      themeLight: 'Light',
      themeDark: 'Dark',
      addr: 'Banafseg 2, Villa 402, New Cairo',
      heroEyebrow: 'AI Driven · New Cairo 2026',
      heroSub: '50+ compounds · 1,900+ units · AI-curated for you.',
      q1: '1,900+ verified listings',
      q2: '50+ compounds',
      q3: 'RERA-licensed brokers',
      exploreMapBtn: 'Explore compounds on the map',
      tabBuy: 'Resale',
      tabRent: 'Rent',
      tabNew: 'New Projects',
      fLoc: 'Location',
      fType: 'Property Type',
      fBeds: 'Bedrooms',
      fPrice: 'Max Price',
      search: 'Search',
      vLoc: 'New Cairo, Egypt',
      vType: 'Villa',
      vBeds: '4+ Beds',
      vPrice: 'EGP 25M',
      eyeList: 'AI-curated inventory',
      featTit: 'Featured Properties',
      featSub: 'The most sought-after homes on the market this week across New Cairo.',
      viewAll: 'View all listings',
      eyeCpd: 'Explore by area',
      cpdTit: 'Browse New Cairo Compounds',
      cpdSub: 'From gated family communities to waterfront lifestyle districts.',
      allCpds: 'All 50+ compounds',
      eyeTour: 'Immersive 360° tour',
      tourTit: 'Tour a signature luxury villa in 360°',
      tourSub: 'Walk through our flagship New Cairo villa — drag to look around every room.',
      stat1: 'Active Listings',
      stat2: 'Compounds Covered',
      stat3: 'Licensed Agents',
      stat4: 'Closed in 2025',
      eyeWhy: 'The Sierra advantage',
      whyTit: 'Why Sierra Estates',
      whySub: 'Verified listings, live-market pricing, and a broker who knows the compound — powered by the widest deal network in New Cairo.',
      netEye: 'The most powerful thing about Sierra',
      netTit: 'We don\u2019t sell only our own units — we search the entire market for you',
      netBody: 'Sierra isn\u2019t limited to its own inventory. We\u2019re connected to 1,500+ independent brokers and 240+ brokerage firms — every one of them working New Cairo. Our AI gathers their live listings into one place and benchmarks every deal, so what reaches you is the single best option on the market, not just what we happen to hold.',
      netS1: '1,500+',
      netS1L: 'Partner freelance brokers',
      netS2: '240+',
      netS2L: 'Brokerage firms',
      netS3: '100%',
      netS3L: 'Focused on New Cairo',
      w1t: 'One market, one search',
      w1s: 'Aggregated inventory from 1,700+ sources — AI-scanned daily so the best deal surfaces first, wherever it sits.',
      w2t: 'Precise AVM Pricing',
      w2s: 'Real-time valuation engine benchmarks every unit against 25 compounds. No overpaying.',
      w3t: 'Human + AI Closing',
      w3s: 'AI-sourced opportunities paired with expert advisors. First match to signed contract in 48h.',
      w4t: 'Verified Inventory',
      w4s: 'Every listing personally verified on-site before appearing in your feed.',
      ctaTit: 'Have a property in New Cairo to sell or rent?',
      ctaSub: 'List with Sierra Estates and reach 40,000+ qualified buyers every month.',
      ctaBtn1: 'List your property',
      ctaBtn2: 'Talk to an agent',
      footBlurb: 'Curated luxury rentals and resale across New Cairo\u2019s premier compounds. Verified listings, licensed brokers, real market data.',
      footNews: 'Get new listings by email',
      fExplore: 'Explore',
      fBuy: 'Buy a home',
      fRent: 'Rent a home',
      fNew: 'New projects',
      fCpds: 'Compounds',
      fAgent: 'Find an agent',
      fCompany: 'Company',
      fAbout: 'About Sierra',
      fBrokers: 'Our brokers',
      fJournal: 'Journal',
      fCareers: 'Careers',
      fContact: 'Contact',
      fTouch: 'Get in touch',
      fAddr: 'Banafseg 2, Villa 402, New Cairo, Egypt',
      rights: '© 2026 Sierra Estates. All rights reserved.',
      crumbHome: 'Home',
      propsTit: 'Properties',
      propsSub: 'AI-curated rent & resale inventory across New Cairo — every unit verified on-site.',
      cpdsTit: 'Compound Intelligence Map',
      cpdsSub: 'Live — 50+ compounds across New Cairo, Madinaty & Shorouk, benchmarked by AI score, growth and price.',
      searchCpdPh: 'Search by compound name…',
      filterByZone: 'Filter by zone',
      allZones: 'All zones',
      browseMap: 'Browse map',
      noCpd: 'No compounds match your filters.',
      cpdCount: 'compounds',
      filterAll: 'All',
      filterVilla: 'Villas',
      filterApt: 'Apartments',
      filterTown: 'Townhouses & Twins',
      filterPent: 'Penthouses & Duplex',
      modeAll: 'All',
      modeSale: 'Resale',
      modeRent: 'Rent',
      results: 'results',
      sortBy: 'Sort: AI Score',
      mapHint: 'Choose a compound — or tap a spot on the map — and its available units will appear.',
      beds: 'Beds',
      baths: 'Baths',
      avg: 'Avg. villa',
      growth: 'YoY growth',
      aiScore: 'AI Score',
      rentAvg: 'Rent avg.',
      backProps: 'Back to properties',
      schedule: 'Schedule a viewing',
      wa: 'WhatsApp',
      call: 'Call Agent',
      overview: 'Overview',
      gallery: 'Gallery',
      location: 'Location',
      similar: 'Similar homes',
      advisor: 'Listing Advisor',
      eyeLife: 'Explore lifestyles',
      lifeTit: 'Browse by property type',
      lifeSub: 'From compact apartments to signature villas — every type, verified.',
      lVilla: 'Villas',
      lApt: 'Apartments',
      lTwin: 'Twin & Townhouses',
      lPent: 'Penthouses & Duplexes',
      listingsWord: 'listings',
      eyeZone: 'Explore zones',
      zoneTit: 'Neighborhoods we cover',
      zoneSub: 'New Cairo, Madinaty & Shorouk — one curated market.',
      cpdsWord: 'compounds',
      z1: '5th Settlement',
      z2: 'Katameya',
      z3: 'New Cairo Core',
      z4: 'Mostakbal City',
      z5: 'Madinaty',
      z6: 'Shorouk',
      eyeTesti: 'Client stories',
      testiTit: 'What our clients say',
      testiSub: 'Real moves, closed by Sierra advisors.',
      t1q: 'Sierra\u2019s AI match found our Hyde Park villa in two days — after three months of searching everywhere else.',
      t1n: 'Ahmed & Dina El-Shazly',
      t1r: 'Bought in Hyde Park',
      t2q: 'The AVM pricing report saved us from overpaying by EGP 2M. Data first, pressure never.',
      t2n: 'Mohamed Ezz',
      t2r: 'Bought in Mivida',
      t3q: 'Listed on Monday, three qualified viewings by Thursday, signed within the week.',
      t3n: 'Sara Mansour',
      t3r: 'Rented out in Eastown',
      eyePerfect: 'Why choose us',
      perfTit: 'Sierra is the perfect choice',
      perfSub: 'Three reasons New Cairo\u2019s smartest buyers start here.',
      pc1t: 'Largest verified inventory',
      pc1s: '1,900+ rent & resale units across 50+ compounds — every one walked and photographed by our team.',
      pc2t: 'Data you can act on',
      pc2s: 'Live AVM valuations, growth benchmarks and AI scores on every unit — not broker guesswork.',
      pc3t: 'Advisors, not salespeople',
      pc3s: 'RERA-licensed compound specialists paid on your satisfaction, not just the close.',
      inqTit: 'Real-estate inquiry',
      inqSub: 'Tell us what you need — an advisor replies within 2 hours.',
      inqLook: 'I\u2019m looking to',
      inqBuy: 'Buy',
      inqRent: 'Rent',
      inqSell: 'Sell',
      inqName: 'Full name',
      inqEmail: 'Email',
      inqPhone: 'Phone',
      inqZone: 'Preferred zone',
      inqType2: 'Property type',
      inqBudget: 'Budget (EGP)',
      inqSend: 'Send inquiry',
      partEye: 'Trusted developer partners',
      fDiscover: 'Discover',
      aiEye: 'AI · 7 tools online',
      aiTit: 'First AI real-estate ecosystem in the Middle East',
      aiSub: 'Live AI tools for every step of your property journey.',
      ai1t: 'AI Engine 3.0',
      ai1s: 'Real-time AVM pricing, ROI signals & Q2 2026 market data.',
      ai2t: 'Smart Match',
      ai2s: 'AI pairs your criteria to the perfect listing.',
      ai3t: 'ROI Analysis',
      ai3s: 'Yield leaderboard, cap rate & cashflow.',
      ai4t: 'Precise Pricing',
      ai4s: 'AVM-calibrated fair-market price range.',
      ai5t: 'Dream Home Finder',
      ai5s: '4 questions → your compound match.',
      ai6t: 'Intelligence Map',
      ai6s: 'Live compound map — tap any pin to explore units.',
      ai7t: 'Virtual Tour',
      ai7s: '360° immersive walkthrough of top units.',
      aiLive: 'Live',
      aiTryTool: 'Open tool',
      tourEye: 'Immersive 360°',
      tourLaunchTit: 'Launch 3D virtual tour',
      tourLaunchSub: 'Three.js · 360° drag · 6 rooms',
      tourLaunch: 'Start tour',
      unitsAvail: 'Units available',
      unitsTit: 'Available units',
      unitsSub: 'Live inventory — click any row to open full specs.',
      thCode: 'Code',
      thType: 'Type',
      thBeds: 'Beds',
      thBath: 'Baths',
      thArea: 'Area',
      thFloor: 'Floor',
      thPrice: 'Price',
      thAI: 'AI',
      thStatus: 'Status',
      stAvail: 'Available',
      stReserved: 'Reserved',
      closeWord: 'Close',
      unitsWord: 'units',
      shCompound: 'Compound',
      shBeds: 'Bedrooms',
      shAnyBeds: 'Any',
      shShowing: 'Showing',
      shOf: 'of',
      shNoUnits: 'No units match these filters.',
      nearHint: 'Or tap anywhere on the map — we\u2019ll find the compounds nearest to that spot.',
      nearTit: 'Nearest compounds',
      nearSub: 'Closest to the point you tapped',
      kmAway: 'km away',
      viewUnitsBtn: 'View units',
      clearPin: 'Clear'
    },
    ar: {
      dir: 'rtl',
      brandSub: 'مستقبل العقارات',
      navHome: 'الرئيسية',
      navProps: 'العقارات',
      navCpds: 'اعرض الخريطة',
      navAgents: 'المستشارون',
      navContact: 'تواصل',
      navAI: 'أدوات الذكاء',
      addListing: 'أضف عقارك',
      signIn: 'دخول',
      langBtn: 'English',
      themeLight: 'فاتح',
      themeDark: 'غامق',
      addr: 'البنفسج 2، فيلا 402، القاهرة الجديدة',
      heroEyebrow: 'ذكاء اصطناعي · القاهرة الجديدة 2026',
      heroSub: '+50 كمبوند · +1900 وحدة · منتقاة بالذكاء الاصطناعي.',
      q1: '+1900 عقار موثّق',
      q2: '+50 كمبوند',
      q3: 'وسطاء مرخّصون',
      exploreMapBtn: 'استكشف الكمبوندات على الخريطة',
      tabBuy: 'بيع',
      tabRent: 'إيجار',
      tabNew: 'مشروعات جديدة',
      fLoc: 'الموقع',
      fType: 'نوع العقار',
      fBeds: 'الغرف',
      fPrice: 'أقصى سعر',
      search: 'ابحث',
      vLoc: 'القاهرة الجديدة، مصر',
      vType: 'فيلا',
      vBeds: '+4 غرف',
      vPrice: '25 مليون جنيه',
      eyeList: 'المخزون بالذكاء الاصطناعي',
      featTit: 'عقارات مميزة',
      featSub: 'أكثر المنازل طلباً هذا الأسبوع في القاهرة الجديدة.',
      viewAll: 'عرض كل العقارات',
      eyeCpd: 'استكشف حسب المنطقة',
      cpdTit: 'تصفح كمبوندات القاهرة الجديدة',
      cpdSub: 'من مجتمعات عائلية مغلقة إلى أحياء حياة عصرية.',
      allCpds: 'كل الكمبوندات (+50)',
      eyeTour: 'جولة 360° غامرة',
      tourTit: 'جولة 360° داخل فيلا فاخرة',
      tourSub: 'تجول داخل فيلا القاهرة الجديدة — اسحب لتستكشف كل غرفة.',
      stat1: 'عقار نشط',
      stat2: 'كمبوند',
      stat3: 'مستشار مرخّص',
      stat4: 'مبيعات 2025',
      eyeWhy: 'ميزة سيرا',
      whyTit: 'لماذا سيرا إستيتس',
      whySub: 'عقارات موثّقة، تسعير بأسعار السوق الحية، ومستشار يعرف الكمبوند — مدعومة بأوسع شبكة صفقات في القاهرة الجديدة.',
      netEye: 'أقوى ما يميز سيرا',
      netTit: 'لا نبيع وحداتنا فقط — بل نبحث في السوق كله من أجلك',
      netBody: 'سيرا لا تقتصر على مخزونها الخاص. نحن متصلون بأكثر من 1500 وسيط مستقل وأكثر من 240 شركة وساطة — جميعهم يعملون في القاهرة الجديدة. ذكاؤنا الاصطناعي يجمع عروضهم الحية في مكان واحد ويقيّم كل صفقة، ليصلك أفضل خيار في السوق — لا مجرد ما نملكه.',
      netS1: '+1500',
      netS1L: 'وسيط مستقل شريك',
      netS2: '+240',
      netS2L: 'شركة وساطة',
      netS3: '100%',
      netS3L: 'تركيز على القاهرة الجديدة',
      w1t: 'سوق واحد، بحث واحد',
      w1s: 'مخزون مجمّع من +1700 مصدر — يفحصه الذكاء يومياً ليظهر أفضل عرض أولاً، أينما كان.',
      w2t: 'تسعير AVM دقيق',
      w2s: 'محرك تقييم فوري يقارن كل وحدة مع 25 كمبوند في الوقت الفعلي.',
      w3t: 'إغلاق بشري + ذكاء',
      w3s: 'فرص يكتشفها الذكاء الاصطناعي مع مستشارين خبراء. من التوافق حتى التوقيع خلال 48 ساعة.',
      w4t: 'مخزون موثّق',
      w4s: 'كل عقار يُعاين ميدانياً قبل ظهوره أمامك.',
      ctaTit: 'لديك عقار في القاهرة الجديدة للبيع أو الإيجار؟',
      ctaSub: 'اعرضه مع سيرا إستيتس وصِل إلى +40 ألف مشترٍ جاد شهرياً.',
      ctaBtn1: 'اعرض عقارك',
      ctaBtn2: 'تحدث مع مستشار',
      footBlurb: 'إيجار وبيع فاخر منتقى في أرقى كمبوندات القاهرة الجديدة. عقارات موثّقة، وسطاء مرخّصون، بيانات سوق حقيقية.',
      footNews: 'استقبل العقارات الجديدة بالبريد',
      fExplore: 'استكشف',
      fBuy: 'اشترِ منزلاً',
      fRent: 'استأجر منزلاً',
      fNew: 'مشروعات جديدة',
      fCpds: 'الكمبوندات',
      fAgent: 'ابحث عن مستشار',
      fCompany: 'الشركة',
      fAbout: 'عن سيرا',
      fBrokers: 'مستشارونا',
      fJournal: 'المدونة',
      fCareers: 'وظائف',
      fContact: 'تواصل',
      fTouch: 'تواصل معنا',
      fAddr: 'البنفسج 2، فيلا 402، القاهرة الجديدة، مصر',
      rights: '© 2026 سيرا إستيتس. جميع الحقوق محفوظة.',
      crumbHome: 'الرئيسية',
      propsTit: 'العقارات',
      propsSub: 'مخزون إيجار وبيع منتقى بالذكاء الاصطناعي في القاهرة الجديدة — كل وحدة موثّقة ميدانياً.',
      cpdsTit: 'خريطة الذكاء العقاري',
      cpdsSub: 'مباشر — +50 كمبوند في القاهرة الجديدة ومدينتي والشروق، مقيّمة بالذكاء الاصطناعي والنمو والسعر.',
      searchCpdPh: 'ابحث باسم الكمبوند…',
      filterByZone: 'تصفية حسب المنطقة',
      allZones: 'كل المناطق',
      browseMap: 'تصفح الخريطة',
      noCpd: 'لا توجد كمبوندات مطابقة.',
      cpdCount: 'كمبوند',
      filterAll: 'الكل',
      filterVilla: 'فيلات',
      filterApt: 'شقق',
      filterTown: 'تاون هاوس وتوين',
      filterPent: 'بنتهاوس ودوبلكس',
      modeAll: 'الكل',
      modeSale: 'بيع',
      modeRent: 'إيجار',
      results: 'نتيجة',
      sortBy: 'ترتيب: تقييم الذكاء',
      mapHint: 'اختر كمبونداً — أو اضغط على مكان في الخريطة — وستظهر لك الوحدات المتاحة.',
      beds: 'غرف',
      baths: 'حمامات',
      avg: 'متوسط الفيلا',
      growth: 'نمو سنوي',
      aiScore: 'تقييم الذكاء',
      rentAvg: 'متوسط الإيجار',
      backProps: 'عودة إلى العقارات',
      schedule: 'احجز معاينة',
      wa: 'واتساب',
      call: 'اتصل بالمستشار',
      overview: 'نظرة عامة',
      gallery: 'المعرض',
      location: 'الموقع',
      similar: 'منازل مشابهة',
      advisor: 'مستشار العقار',
      eyeLife: 'استكشف أنماط السكن',
      lifeTit: 'تصفح حسب نوع العقار',
      lifeSub: 'من الشقق العملية إلى الفيلات المميزة — كل الأنواع، موثّقة.',
      lVilla: 'فيلات',
      lApt: 'شقق',
      lTwin: 'توين وتاون هاوس',
      lPent: 'بنتهاوس ودوبلكس',
      listingsWord: 'عقار',
      eyeZone: 'استكشف المناطق',
      zoneTit: 'المناطق التي نغطيها',
      zoneSub: 'القاهرة الجديدة ومدينتي والشروق — سوق واحد منتقى.',
      cpdsWord: 'كمبوند',
      z1: 'التجمع الخامس',
      z2: 'القطامية',
      z3: 'قلب القاهرة الجديدة',
      z4: 'مدينة المستقبل',
      z5: 'مدينتي',
      z6: 'الشروق',
      eyeTesti: 'قصص عملائنا',
      testiTit: 'ماذا يقول عملاؤنا',
      testiSub: 'صفقات حقيقية أغلقها مستشارو سيرا.',
      t1q: 'توافق سيرا الذكي وجد فيلتنا في هايد بارك خلال يومين — بعد ثلاثة أشهر من البحث في كل مكان.',
      t1n: 'أحمد ودينا الشاذلي',
      t1r: 'شراء في هايد بارك',
      t2q: 'تقرير التسعير AVM وفّر علينا مليوني جنيه. بيانات أولاً، ولا ضغوط إطلاقاً.',
      t2n: 'محمد عز',
      t2r: 'شراء في ميفيدا',
      t3q: 'عرضنا الوحدة الإثنين، ثلاث معاينات جادة الخميس، ووقّعنا خلال أسبوع.',
      t3n: 'سارة منصور',
      t3r: 'تأجير في إيستاون',
      eyePerfect: 'لماذا نحن',
      perfTit: 'سيرا هي الاختيار الأمثل',
      perfSub: 'ثلاثة أسباب تجعل أذكى المشترين يبدأون من هنا.',
      pc1t: 'أكبر مخزون موثّق',
      pc1s: '+1900 وحدة إيجار وبيع في +50 كمبوند — كل وحدة عوينت وصوّرت ميدانياً.',
      pc2t: 'بيانات قابلة للتنفيذ',
      pc2s: 'تقييمات AVM حية ومؤشرات نمو وتقييم ذكاء لكل وحدة — لا تخمينات وسطاء.',
      pc3t: 'مستشارون لا بائعون',
      pc3s: 'متخصصو كمبوندات مرخّصون يُقيّمون برضاك، لا بالإغلاق فقط.',
      inqTit: 'طلب عقاري',
      inqSub: 'أخبرنا بما تحتاج — يرد مستشار خلال ساعتين.',
      inqLook: 'أبحث عن',
      inqBuy: 'شراء',
      inqRent: 'إيجار',
      inqSell: 'بيع',
      inqName: 'الاسم بالكامل',
      inqEmail: 'البريد الإلكتروني',
      inqPhone: 'الهاتف',
      inqZone: 'المنطقة المفضلة',
      inqType2: 'نوع العقار',
      inqBudget: 'الميزانية (جنيه)',
      inqSend: 'أرسل الطلب',
      partEye: 'شركاء التطوير الموثوقون',
      fDiscover: 'اكتشف',
      aiEye: 'ذكاء اصطناعي · 7 أدوات تعمل',
      aiTit: 'أول نظام ذكاء عقاري في الشرق الأوسط',
      aiSub: 'أدوات ذكاء اصطناعي حية لكل خطوة في رحلتك العقارية.',
      ai1t: 'محرك الذكاء 3.0',
      ai1s: 'تسعير AVM لحظي، مؤشرات عائد، وبيانات سوق 2026.',
      ai2t: 'التوافق الذكي',
      ai2s: 'يطابق الذكاء معاييرك مع العقار المثالي.',
      ai3t: 'تحليل العائد',
      ai3s: 'قوائم العائد ومعدل الربح والتدفق النقدي.',
      ai4t: 'تسعير دقيق',
      ai4s: 'نطاق سعر عادل معاير بـ AVM.',
      ai5t: 'مستشار منزل الأحلام',
      ai5s: '4 أسئلة ← الكمبوند المثالي لك.',
      ai6t: 'خريطة الذكاء',
      ai6s: 'خريطة كمبوندات حية — اضغط أي علامة لاستكشاف الوحدات.',
      ai7t: 'جولة افتراضية',
      ai7s: 'جولة 360° غامرة في أفضل الوحدات.',
      aiLive: 'مباشر',
      aiTryTool: 'افتح الأداة',
      tourEye: 'جولة 360° غامرة',
      tourLaunchTit: 'ابدأ الجولة الثلاثية الأبعاد',
      tourLaunchSub: 'Three.js · 360° · 6 غرف',
      tourLaunch: 'ابدأ الجولة',
      unitsAvail: 'الوحدات المتاحة',
      unitsTit: 'الوحدات المتاحة',
      unitsSub: 'مخزون مباشر — اضغط أي صف لفتح المواصفات كاملة.',
      thCode: 'الكود',
      thType: 'النوع',
      thBeds: 'غرف',
      thBath: 'حمامات',
      thArea: 'المساحة',
      thFloor: 'الدور',
      thPrice: 'السعر',
      thAI: 'ذكاء',
      thStatus: 'الحالة',
      stAvail: 'متاحة',
      stReserved: 'محجوزة',
      closeWord: 'إغلاق',
      unitsWord: 'وحدة',
      shCompound: 'الكمبوند',
      shBeds: 'غرف النوم',
      shAnyBeds: 'الكل',
      shShowing: 'عرض',
      shOf: 'من',
      shNoUnits: 'لا توجد وحدات مطابقة.',
      nearHint: 'أو اضغط في أي مكان على الخريطة — وسنجد أقرب الكمبوندات لتلك النقطة.',
      nearTit: 'أقرب الكمبوندات',
      nearSub: 'الأقرب إلى النقطة التي حددتها',
      kmAway: 'كم',
      viewUnitsBtn: 'عرض الوحدات',
      clearPin: 'مسح'
    }
  };
  var lang = localStorage.getItem('hzp-lang') || 'en';
  var theme = localStorage.getItem('hzp-theme') || 'light';
  function t(k) {
    return I18N[lang] && I18N[lang][k] || I18N.en[k] || k;
  }

  /* ── chrome templates ── */
  function chromeHTML(active) {
    function act(k) {
      return active === k ? ' class="active"' : '';
    }
    return '' + '<div class="topbar"><div class="wrap">' + '<div class="tb-left">' + '<span><i data-lucide="phone" class="i" style="width:14px;height:14px"></i> +2 01092048333</span>' + '<span><i data-lucide="mail" class="i" style="width:14px;height:14px"></i> Info@sierra-estates.net</span>' + '<span><i data-lucide="map-pin" class="i" style="width:14px;height:14px"></i> <span data-i18n="addr">' + t('addr') + '</span></span>' + '</div>' + '<div class="tb-right">' + '<button class="tb-toggle" id="theme-toggle" type="button"><i data-lucide="' + (theme === 'dark' ? 'sun' : 'moon') + '" class="i"></i><span id="theme-label">' + (theme === 'dark' ? t('themeLight') : t('themeDark')) + '</span></button>' + '<button class="tb-toggle" id="lang-toggle" type="button"><i data-lucide="languages" class="i"></i><span>' + t('langBtn') + '</span></button>' + '<div class="divider"></div>' + '<a href="#"><i data-lucide="user" class="i" style="width:14px;height:14px"></i> <span data-i18n="signIn">' + t('signIn') + '</span></a>' + '</div>' + '</div></div>' + '<nav class="nav" id="main-nav"><div class="wrap">' + '<a href="index.html" class="brand">' + '<span class="mark logo"><img src="logo-gold.png" alt="Sierra Estates"/></span>' + '<span><b>Sierra Estates</b><small data-i18n="brandSub">' + t('brandSub') + '</small></span>' + '</a>' + '<div class="menu">' + '<a href="index.html"' + act('home') + ' data-i18n="navHome">' + t('navHome') + '</a>' + '<a href="properties.html"' + act('props') + ' data-i18n="navProps">' + t('navProps') + '</a>' + '<a href="compounds.html"' + act('cpds') + ' data-i18n="navCpds">' + t('navCpds') + '</a>' + '<a href="index.html#ai" data-i18n="navAI">' + t('navAI') + '</a>' + '<a href="index.html#agents"' + ' data-i18n="navAgents">' + t('navAgents') + '</a>' + '<a href="index.html#contact" data-i18n="navContact">' + t('navContact') + '</a>' + '</div>' + '<div class="nav-right">' + '<a href="#" class="nav-icon"><i data-lucide="heart" class="i" style="width:21px;height:21px"></i><span class="dot">3</span></a>' + '<button class="btn btn-pri" type="button"><i data-lucide="plus" class="i"></i> <span data-i18n="addListing">' + t('addListing') + '</span></button>' + '</div>' + '</div></nav>';
  }
  function footerHTML() {
    return '' + '<div class="wrap">' + '<div class="foot-grid">' + '<div>' + '<a href="index.html" class="brand">' + '<span class="mark logo"><img src="logo-gold.png" alt="Sierra Estates"/></span>' + '<span><b>Sierra Estates</b><small data-i18n="brandSub">' + t('brandSub') + '</small></span>' + '</a>' + '<p class="blurb" data-i18n="footBlurb">' + t('footBlurb') + '</p>' + '<div class="news"><input data-i18n-ph="footNews" placeholder="' + t('footNews') + '"/><button type="button"><i data-lucide="arrow-right" class="i"></i></button></div>' + '</div>' + '<div class="fcol"><h5 data-i18n="fExplore">' + t('fExplore') + '</h5>' + '<a href="properties.html" data-i18n="fBuy">' + t('fBuy') + '</a><a href="properties.html" data-i18n="fRent">' + t('fRent') + '</a>' + '<a href="properties.html" data-i18n="fNew">' + t('fNew') + '</a><a href="compounds.html" data-i18n="fCpds">' + t('fCpds') + '</a>' + '<a href="#" data-i18n="fAgent">' + t('fAgent') + '</a></div>' + '<div class="fcol"><h5 data-i18n="fCompany">' + t('fCompany') + '</h5>' + '<a href="#" data-i18n="fAbout">' + t('fAbout') + '</a><a href="#" data-i18n="fBrokers">' + t('fBrokers') + '</a>' + '<a href="#" data-i18n="fJournal">' + t('fJournal') + '</a><a href="#" data-i18n="fCareers">' + t('fCareers') + '</a>' + '<a href="#" data-i18n="fContact">' + t('fContact') + '</a></div>' + '<div class="fcol"><h5 data-i18n="fDiscover">' + t('fDiscover') + '</h5>' + '<a href="compounds.html" data-i18n="z1">' + t('z1') + '</a><a href="compounds.html" data-i18n="z2">' + t('z2') + '</a>' + '<a href="compounds.html" data-i18n="z3">' + t('z3') + '</a><a href="compounds.html" data-i18n="z4">' + t('z4') + '</a></div>' + '<div class="fcol"><h5 data-i18n="fTouch">' + t('fTouch') + '</h5>' + '<div class="contact-line"><i data-lucide="map-pin" class="i"></i><span data-i18n="fAddr">' + t('fAddr') + '</span></div>' + '<div class="contact-line"><i data-lucide="phone" class="i"></i><span>+2 01092048333</span></div>' + '<div class="contact-line"><i data-lucide="mail" class="i"></i><span>Info@sierra-estates.net</span></div>' + '</div>' + '</div>' + '<div class="foot-bottom">' + '<span data-i18n="rights">' + t('rights') + '</span>' + '<div class="socials">' + '<a href="#"><i data-lucide="facebook" class="i"></i></a><a href="#"><i data-lucide="instagram" class="i"></i></a>' + '<a href="#"><i data-lucide="linkedin" class="i"></i></a><a href="#"><i data-lucide="twitter" class="i"></i></a>' + '</div>' + '</div>' + '</div>';
  }

  /* ── property card ── */
  function pcard(p, i) {
    var initials = p.agent.split(' ').map(function (w) {
      return w[0];
    }).join('');
    var modeTag = p.mode === 'rent' ? '<span class="tag rent" data-i18n="modeRent">' + t('modeRent') + '</span>' : '<span class="tag sale" data-i18n="modeSale">' + t('modeSale') + '</span>';
    var extra = p.tag ? '<span class="tag featured">' + p.tag + '</span>' : '';
    return '<article class="pcard rv d' + (i % 3 + 1) + '" data-type="' + p.type + '" data-mode="' + p.mode + '">' + '<div class="photo">' + '<a href="property.html?id=' + p.id + '"><img src="' + p.img + '" alt="' + p.type + ' in ' + p.cmp + '" loading="lazy"/></a>' + '<div class="badges">' + extra + modeTag + '</div>' + '<div class="heart" onclick="this.classList.toggle(\'on\')"><i data-lucide="heart" class="i" style="width:18px;height:18px"></i></div>' + '<div class="price-float">' + D.price(p) + '</div>' + '<div class="ai-score">AI ' + p.ai.toFixed(1) + '</div>' + '</div>' + '<div class="body">' + '<div class="ptype">' + p.code + ' · ' + p.type + '</div>' + '<h3><a href="property.html?id=' + p.id + '">' + p.type + ' in ' + p.cmp + '</a></h3>' + '<div class="addr"><i data-lucide="map-pin" class="i"></i> ' + p.cmp + ', ' + p.zone + '</div>' + '<div class="specs">' + '<div><i data-lucide="bed-double" class="i"></i><b>' + p.beds + '</b><span data-i18n="beds">' + t('beds') + '</span></div>' + '<div><i data-lucide="bath" class="i"></i><b>' + p.bath + '</b><span data-i18n="baths">' + t('baths') + '</span></div>' + '<div><i data-lucide="scaling" class="i"></i><b>' + p.area + '</b><span>m²</span></div>' + '</div>' + '</div>' + '<div class="foot">' + '<div class="agent"><span class="av">' + initials + '</span><small><b>' + p.agent + '</b>' + p.ago + '</small></div>' + '<div class="foot-icons">' + '<a href="#"><i data-lucide="git-compare" class="i"></i></a>' + '<a href="#"><i data-lucide="share-2" class="i"></i></a>' + '</div>' + '</div>' + '</article>';
  }

  /* ── reveal on scroll ── */
  function initReveal() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.rv').forEach(function (el) {
        el.classList.add('in');
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });
    document.querySelectorAll('.rv:not(.in)').forEach(function (el) {
      io.observe(el);
    });
    window.HZ._io = io;
  }

  /* ── animated counters ── */
  function initCounters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var el = e.target,
          target = parseFloat(el.getAttribute('data-count'));
        var prefix = el.getAttribute('data-prefix') || '',
          suffix = el.getAttribute('data-suffix') || '';
        var dec = (String(target).split('.')[1] || '').length;
        var start = null;
        function step(ts) {
          if (!start) start = ts;
          var pr = Math.min((ts - start) / 1400, 1);
          var eased = 1 - Math.pow(1 - pr, 3);
          el.textContent = prefix + (target * eased).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix;
          if (pr < 1) requestAnimationFrame(step);
        }
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          el.textContent = prefix + target.toLocaleString() + suffix;
        } else {
          requestAnimationFrame(step);
        }
      });
    }, {
      threshold: 0.5
    });
    els.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ── toggles ── */
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme);
  }
  function applyLang() {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', I18N[lang].dir);
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    document.dispatchEvent(new CustomEvent('hzp:lang', {
      detail: lang
    }));
  }

  /* ── mount ── */
  function mount(active) {
    applyTheme();
    var top = document.getElementById('site-chrome');
    if (top) top.innerHTML = chromeHTML(active);
    var foot = document.getElementById('site-footer');
    if (foot) foot.innerHTML = footerHTML();
    document.getElementById('theme-toggle').addEventListener('click', function () {
      theme = theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('hzp-theme', theme);
      applyTheme();
      this.querySelector('i, svg').outerHTML = '<i data-lucide="' + (theme === 'dark' ? 'sun' : 'moon') + '" class="i"></i>';
      document.getElementById('theme-label').textContent = theme === 'dark' ? t('themeLight') : t('themeDark');
      if (window.lucide) lucide.createIcons();
      document.dispatchEvent(new CustomEvent('hzp:theme', {
        detail: theme
      }));
    });
    document.getElementById('lang-toggle').addEventListener('click', function () {
      lang = lang === 'en' ? 'ar' : 'en';
      localStorage.setItem('hzp-lang', lang);
      location.reload();
    });
    var nav = document.getElementById('main-nav');
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 8);
    }, {
      passive: true
    });
    applyLang();
    if (window.lucide) lucide.createIcons();
    initReveal();
    initCounters();
  }
  window.HZ = {
    mount: mount,
    t: t,
    pcard: pcard,
    lang: function () {
      return lang;
    },
    theme: function () {
      return theme;
    },
    refreshIcons: function () {
      if (window.lucide) lucide.createIcons();
    },
    reveal: initReveal
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/houzez-portal/shared.js", error: String((e && e.message) || e) }); }

// ui_kits/sierra-mobile-light/tweaks-panel.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
// Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
//   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
// TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
// options are many or long. For color tweaks always curate 3-4 options rather than
// a free picker; an option can also be a whole 2–5 color palette (the stored value
// is the array). The Tweak* controls are a floor, not a ceiling — build custom
// controls inside the panel if a tweak calls for UI they don't cover.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sierra-mobile-light/tweaks-panel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/app.jsx
try { (() => {
/* Sierra Estates — Client Portal (mobile-first, responsive) */
const {
  useState,
  useEffect,
  useRef,
  useMemo,
  createContext,
  useContext
} = React;

/* ── FAB ── */
function FAB(props) {
  var onChat = props.onChat;
  var pulse = useState(false);
  var setPulse = pulse[1];
  pulse = pulse[0];
  useEffect(function () {
    var id = setTimeout(function () {
      setPulse(true);
    }, 3000);
    return function () {
      clearTimeout(id);
    };
  }, []);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onChat,
    style: {
      position: 'fixed',
      bottom: 78,
      right: 16,
      width: 50,
      height: 50,
      borderRadius: '50%',
      background: 'linear-gradient(135deg,' + N + ',' + N3 + ')',
      border: '2px solid ' + G,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 85,
      boxShadow: '0 6px 24px rgba(13,32,53,.5)',
      animation: pulse ? 'glowRing 2.5s ease infinite' : 'none'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-gold.png",
    alt: "Sierra",
    style: {
      width: 30,
      height: 30,
      objectFit: 'contain',
      borderRadius: 4
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: -3,
      right: -3,
      background: '#dc2626',
      color: '#fff',
      fontSize: 7,
      fontWeight: 900,
      padding: '2px 5px',
      borderRadius: 8,
      border: '1.5px solid #fff'
    }
  }, "AI"));
}

/* ── BOTTOM NAV ── */
function BottomNav(props) {
  var tab = props.tab,
    setTab = props.setTab,
    onAI = props.onAI,
    scrollTo = props.scrollTo,
    onSaved = props.onSaved;
  var c = useApp();
  var dark = c.dark,
    lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var C = th(dark);
  var items = [{
    id: 'home',
    ic: '⌂',
    l: t.nav[0],
    sec: 's-hero'
  }, {
    id: 'search',
    ic: '⊹',
    l: t.nav[1],
    sec: 's-listings'
  }, {
    id: 'map',
    ic: '◎',
    l: t.nav[2],
    sec: 's-map'
  }, {
    id: 'ai',
    ic: '✦',
    l: t.nav[3],
    sec: 's-ai'
  }, {
    id: 'saved',
    ic: '♡',
    l: t.nav[4]
  }];

  /* Dock-style magnify: nearest icon to the pointer scales up, falloff to neighbors */
  var navRef = useRef(null);
  var itemRefs = useRef([]);
  var hoverSt = useState(null);
  var hoverX = hoverSt[0],
    setHoverX = hoverSt[1];
  function onMove(e) {
    var nav = navRef.current;
    if (!nav) return;
    var r = nav.getBoundingClientRect();
    setHoverX(e.clientX - r.left);
  }
  function onLeave() {
    setHoverX(null);
  }
  function magnify(i) {
    if (hoverX == null) return {
      scale: 1,
      lift: 0
    };
    var el = itemRefs.current[i];
    if (!el) return {
      scale: 1,
      lift: 0
    };
    var cx = el.offsetLeft + el.offsetWidth / 2;
    var dist = Math.abs(hoverX - cx);
    var sigma = 62;
    var factor = Math.exp(-(dist * dist) / (2 * sigma * sigma));
    return {
      scale: 1 + 0.42 * factor,
      lift: -9 * factor
    };
  }
  function handle(it) {
    if (it.id === 'saved') {
      setTab('saved');
      if (onSaved) onSaved();
      return;
    }
    setTab(it.id);
    if (it.sec) scrollTo(it.sec);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "bottom-nav",
    ref: navRef,
    onMouseMove: onMove,
    onMouseLeave: onLeave,
    style: {
      position: 'sticky',
      bottom: 0,
      background: C.navBg,
      backdropFilter: 'blur(22px)',
      borderTop: '1px solid ' + C.bd,
      display: 'flex',
      zIndex: 85,
      paddingBottom: 22,
      flexShrink: 0,
      flexDirection: isAr ? 'row-reverse' : 'row',
      transition: 'background .3s'
    }
  }, items.map(function (it, i) {
    var m = magnify(i);
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      ref: function (el) {
        itemRefs.current[i] = el;
      },
      onClick: function () {
        handle(it);
      },
      style: {
        flex: 1,
        padding: '10px 0 2px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        fontFamily: 'inherit',
        transform: 'translateY(' + m.lift + 'px) scale(' + m.scale + ')',
        transformOrigin: 'bottom center',
        transition: 'transform .18s cubic-bezier(.34,1.56,.64,1)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: tab === it.id ? 'icon-spring icon-on' : 'icon-spring',
      style: {
        fontSize: 20,
        lineHeight: 1,
        color: tab === it.id ? G : 'rgba(120,120,140,.7)',
        transition: 'color .2s, transform .4s cubic-bezier(.34,1.56,.64,1)',
        display: 'inline-block'
      }
    }, it.ic), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8.5,
        fontWeight: 600,
        color: tab === it.id ? G : 'rgba(120,120,140,.7)',
        transition: 'color .2s',
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
      }
    }, it.l), tab === it.id && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 4,
        height: 4,
        borderRadius: '50%',
        background: G,
        display: 'block'
      }
    }));
  }));
}

/* ── BANNER ── */
function Banner(props) {
  var onDismiss = props.onDismiss,
    onClaim = props.onClaim;
  var c = useApp();
  var dark = c.dark,
    lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var C = th(dark);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.annBg,
      borderBottom: '1px solid rgba(200,150,26,.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      padding: '7px 16px',
      position: 'relative',
      flexShrink: 0,
      direction: isAr ? 'rtl' : 'ltr',
      transition: 'background .3s'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 5,
      height: 5,
      borderRadius: '50%',
      background: G,
      display: 'block',
      animation: 'blink 1.8s ease infinite',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      background: 'linear-gradient(135deg,' + G + ',' + GL + ')',
      color: N,
      fontSize: 8.5,
      fontWeight: 900,
      padding: '2px 7px',
      borderRadius: 4,
      flexShrink: 0
    }
  }, "25% OFF"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: dark ? 'rgba(255,255,255,.65)' : 'rgba(13,32,53,.62)',
      fontSize: 10,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, t.reqSub), /*#__PURE__*/React.createElement("span", {
    style: {
      color: G,
      fontSize: 9,
      fontWeight: 700,
      fontFamily: 'Inter',
      whiteSpace: 'nowrap'
    }
  }, "\uD83C\uDF0D +10% non-EG"), /*#__PURE__*/React.createElement("button", {
    onClick: onClaim,
    style: {
      color: GL,
      fontSize: 9.5,
      fontWeight: 700,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      flexShrink: 0,
      textDecoration: 'underline',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, t.req), /*#__PURE__*/React.createElement("button", {
    onClick: onDismiss,
    style: {
      position: 'absolute',
      right: isAr ? 'auto' : 10,
      left: isAr ? 10 : 'auto',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'rgba(120,120,120,.5)',
      fontSize: 18,
      lineHeight: 1
    }
  }, "\xD7"));
}

/* ── GLASS HEADER (floating) ── */
function GlassHeader(props) {
  var onReq = props.onReq,
    onFilters = props.onFilters;
  var c = useApp();
  var dark = c.dark,
    setDark = c.setDark,
    lang = c.lang,
    setLang = c.setLang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px 6px',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "glass-card",
    style: {
      background: 'rgba(7,18,30,.9)',
      backdropFilter: 'blur(28px) saturate(1.6)',
      WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
      border: '1px solid rgba(200,150,26,.2)',
      borderRadius: 20,
      boxShadow: '0 8px 32px rgba(0,0,0,.5), 0 0 0 1px rgba(200,150,26,.06) inset',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 14px',
      direction: isAr ? 'rtl' : 'ltr'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      flexDirection: isAr ? 'row-reverse' : 'row'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: -1.5,
      borderRadius: 11,
      background: 'linear-gradient(135deg,' + G + ',transparent 60%,' + GL + ')',
      zIndex: 0
    }
  }), /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-gold.png",
    alt: "Sierra Estates",
    style: {
      position: 'relative',
      zIndex: 1,
      width: 34,
      height: 34,
      borderRadius: 9,
      objectFit: 'contain',
      display: 'block',
      background: '#0D2035',
      padding: 2
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: isAr ? 'right' : 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
      fontSize: isAr ? 15 : 17,
      fontWeight: isAr ? 700 : 500,
      letterSpacing: isAr ? '.01em' : '.15em',
      color: '#fff',
      lineHeight: 1
    }
  }, t.brand), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 6.5,
      letterSpacing: '.22em',
      color: G,
      marginTop: 3,
      opacity: .7,
      textTransform: 'uppercase'
    }
  }, t.brandSub))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setLang(isAr ? 'en' : 'ar');
    },
    style: {
      width: 32,
      height: 28,
      borderRadius: 8,
      background: 'rgba(200,150,26,.1)',
      border: '1px solid rgba(200,150,26,.25)',
      color: G,
      fontSize: 10,
      fontWeight: 900,
      cursor: 'pointer',
      fontFamily: 'Inter',
      letterSpacing: '.04em'
    }
  }, isAr ? 'EN' : 'ع'), /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setDark(function (d) {
        return !d;
      });
    },
    "aria-label": "theme",
    style: {
      width: 50,
      height: 26,
      borderRadius: 20,
      background: 'rgba(255,255,255,.06)',
      border: '1px solid rgba(200,150,26,.2)',
      position: 'relative',
      cursor: 'pointer',
      padding: 0,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: dark ? 26 : 3,
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: 'linear-gradient(135deg,' + GL + ',' + G + ')',
      transition: 'left .28s cubic-bezier(.4,0,.2,1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 9,
      boxShadow: '0 2px 8px rgba(200,150,26,.5)'
    }
  }, dark ? '☀' : '🌙')))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      padding: '8px 14px 10px',
      borderTop: '1px solid rgba(200,150,26,.12)',
      direction: isAr ? 'rtl' : 'ltr',
      background: 'linear-gradient(90deg,rgba(200,150,26,.07),rgba(200,150,26,.03))'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexDirection: isAr ? 'row-reverse' : 'row',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: '#4ade80',
      flexShrink: 0,
      boxShadow: '0 0 8px rgba(74,222,128,.6)',
      animation: 'blink 2s ease infinite'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      textAlign: isAr ? 'right' : 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#fff',
      lineHeight: 1.2,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      whiteSpace: 'nowrap'
    }
  }, t.claim, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: G,
      fontWeight: 900
    }
  }, "25% OFF")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.38)',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      marginTop: 1
    }
  }, t.claimSub))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onFilters,
    style: {
      width: 34,
      height: 34,
      borderRadius: 10,
      background: 'rgba(200,150,26,.1)',
      border: '1px solid rgba(200,150,26,.3)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    "aria-label": "Filters"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: G,
    strokeWidth: "2.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 6h16M7 12h10M10 18h4"
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: function (e) {
      onReq();
      if (window.emitParticles) window.emitParticles(e.clientX, e.clientY);
    },
    style: {
      position: 'relative',
      padding: '8px 16px',
      borderRadius: 10,
      background: 'linear-gradient(135deg,' + G + ',' + GL + ')',
      color: N,
      fontSize: 10.5,
      fontWeight: 900,
      letterSpacing: '.05em',
      border: 'none',
      cursor: 'pointer',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      boxShadow: '0 4px 18px rgba(200,150,26,.4)',
      whiteSpace: 'nowrap'
    }
  }, t.reqNow, " ", isAr ? '←' : '→', /*#__PURE__*/React.createElement("div", {
    className: "text",
    style: {
      position: 'absolute',
      left: '50%',
      top: '100%',
      transform: 'translateX(-50%)',
      marginTop: 4,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("h4", {
    className: "braces",
    style: {
      margin: 0,
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 6.5,
      fontWeight: 600,
      letterSpacing: '.06em',
      color: 'rgba(200,150,26,.6)',
      whiteSpace: 'nowrap'
    }
  }, "click for particles")))))), /*#__PURE__*/React.createElement("div", {
    id: "emitter",
    style: {
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 300,
      overflow: 'hidden'
    }
  }));
}

/* ── APP ── */
function App() {
  var dark = useState(true);
  var setDark = dark[1];
  dark = dark[0];
  useEffect(function () {
    document.body.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);
  var lang = useState('en');
  var setLang = lang[1];
  lang = lang[0];
  var purpose = useState('resale');
  var setPurpose = purpose[1];
  purpose = purpose[0];
  var search = useState('');
  var setSearch = search[1];
  search = search[0];
  var beds = useState(null);
  var setBeds = beds[1];
  beds = beds[0];
  var savedIds = useState(new Set());
  var setSavedIds = savedIds[1];
  savedIds = savedIds[0];
  var tab = useState('home');
  var setTab = tab[1];
  tab = tab[0];
  var ann = useState(true);
  var setAnn = ann[1];
  ann = ann[0];
  var cpd = useState(null);
  var setCpd = cpd[1];
  cpd = cpd[0];
  var unitD = useState(null);
  var setUnitD = unitD[1];
  unitD = unitD[0];
  var listing = useState(null);
  var setListing = listing[1];
  listing = listing[0];
  var chatOpen = useState(false);
  var setChatOpen = chatOpen[1];
  chatOpen = chatOpen[0];
  var chatQ = useState('');
  var setChatQ = chatQ[1];
  chatQ = chatQ[0];
  var savedOpen = useState(false);
  var setSavedOpen = savedOpen[1];
  savedOpen = savedOpen[0];
  var reqOpen = useState(false);
  var setReqOpen = reqOpen[1];
  reqOpen = reqOpen[0];
  var tool = useState(null);
  var setTool = tool[1];
  tool = tool[0];
  var filterOpen = useState(false);
  var setFilterOpen = filterOpen[1];
  filterOpen = filterOpen[0];
  var reqMode = useState(false);
  var setReqMode = reqMode[1];
  reqMode = reqMode[0];
  function openRequest() {
    setReqMode(true);
    setFilterOpen(true);
  }
  function openFiltersOnly() {
    setReqMode(false);
    setFilterOpen(true);
  }

  /* ── TWEAKS ── */
  var ACCENT_PALETTES = {
    '#C8961A': ['#C8961A', '#E9C176'],
    /* Desert Gold  */
    '#2A7A4F': ['#2A7A4F', '#5EC98A'],
    /* Emerald      */
    '#1A5B8F': ['#1A5B8F', '#5B99DC'],
    /* Sapphire     */
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
  }) : [{
    accent: '#C8961A',
    typeVoice: 'Serif',
    atmosphere: 'Deep Space'
  }, function () {}];
  var tweakVals = tw[0];
  var setTweak = tw[1];

  /* Apply globals synchronously before render so all children see updated values */
  var _ac = ACCENT_PALETTES[tweakVals.accent] || ACCENT_PALETTES['#C8961A'];
  G = _ac[0];
  GL = _ac[1];
  HEADING_FONT = tweakVals.typeVoice === 'Sans' ? "'Inter',sans-serif" : tweakVals.typeVoice === 'Mono' ? "'JetBrains Mono',monospace" : "'Cormorant Garamond',serif";
  var _atm = ATMOSPHERES[tweakVals.atmosphere] || ATMOSPHERES['Deep Space'];
  N2 = _atm[0];
  N3 = _atm[1];
  var C = th(dark);
  function scrollTo(id) {
    var el = document.getElementById(id);
    var sc = document.getElementById('root-scroll');
    if (el && sc) sc.scrollTo({
      top: el.offsetTop - 138,
      behavior: 'smooth'
    });
  }
  function handleTool(k) {
    if (k === 'imap') {
      scrollTo('s-map');
    } else if (k === 'tour') {
      scrollTo('s-tour');
    } else if (k === 'chat') {
      setChatQ('');
      setChatOpen(true);
    } else {
      setTool(k);
    }
  }
  function handleSave(id) {
    setSavedIds(function (s) {
      var n = new Set(s);
      if (n.has(id)) n.delete(id);else n.add(id);
      return n;
    });
  }
  return React.createElement(Ctx.Provider, {
    value: {
      dark: dark,
      setDark: setDark,
      lang: lang,
      setLang: setLang,
      tweakSig: tweakVals.accent + tweakVals.typeVoice + tweakVals.atmosphere
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: C.bg,
      transition: 'background .3s'
    }
  }, window.TweaksPanel && /*#__PURE__*/React.createElement(window.TweaksPanel, null, /*#__PURE__*/React.createElement(window.TweakSection, {
    label: "Accent Palette"
  }), /*#__PURE__*/React.createElement(window.TweakColor, {
    label: "Color",
    value: tweakVals.accent,
    options: ['#C8961A', '#2A7A4F', '#1A5B8F', '#8B4A1E'],
    onChange: function (v) {
      setTweak('accent', v);
    }
  }), /*#__PURE__*/React.createElement(window.TweakSection, {
    label: "Type Voice"
  }), /*#__PURE__*/React.createElement(window.TweakRadio, {
    label: "Heading",
    value: tweakVals.typeVoice,
    options: ['Serif', 'Sans', 'Mono'],
    onChange: function (v) {
      setTweak('typeVoice', v);
    }
  }), /*#__PURE__*/React.createElement(window.TweakSection, {
    label: "Atmosphere"
  }), /*#__PURE__*/React.createElement(window.TweakRadio, {
    label: "Mood",
    value: tweakVals.atmosphere,
    options: ['Deep Space', 'Dusk', 'Abyss'],
    onChange: function (v) {
      setTweak('atmosphere', v);
    }
  })), /*#__PURE__*/React.createElement(StatusBar, null), /*#__PURE__*/React.createElement(GlassHeader, {
    onReq: openRequest,
    onFilters: openFiltersOnly
  }), /*#__PURE__*/React.createElement(SmartFilterSheet, {
    open: filterOpen,
    showLead: reqMode,
    onClose: function () {
      setFilterOpen(false);
    },
    purpose: purpose,
    setPurpose: setPurpose,
    beds: beds,
    setBeds: setBeds,
    setSearch: setSearch
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Hero, {
    purpose: purpose,
    setPurpose: setPurpose,
    beds: beds,
    setBeds: setBeds,
    search: search,
    setSearch: setSearch,
    onReq: openRequest,
    filterOpen: filterOpen,
    setFilterOpen: openFiltersOnly
  }), /*#__PURE__*/React.createElement(Ticker, null), /*#__PURE__*/React.createElement(AIHub, {
    onTool: handleTool,
    onMap: function () {
      scrollTo('s-map');
    },
    onContact: openRequest
  }), /*#__PURE__*/React.createElement(TourSec, null), /*#__PURE__*/React.createElement(Listings, {
    purpose: purpose,
    search: search,
    beds: beds,
    onTap: setListing,
    saved: savedIds,
    onSave: handleSave
  }), /*#__PURE__*/React.createElement(MapSec, {
    purpose: purpose,
    onCpdTap: setCpd,
    onFilters: openFiltersOnly,
    onOffer: openRequest
  }), /*#__PURE__*/React.createElement(WhySec, null), /*#__PURE__*/React.createElement(AboutUs, null), /*#__PURE__*/React.createElement(ContactUs, {
    onReq: openRequest
  })), /*#__PURE__*/React.createElement(BottomNav, {
    tab: tab,
    setTab: setTab,
    onAI: handleTool,
    scrollTo: scrollTo,
    onSaved: function () {
      setSavedOpen(true);
    }
  }), /*#__PURE__*/React.createElement(FAB, {
    onChat: function () {
      setChatQ('');
      setChatOpen(true);
    }
  }), /*#__PURE__*/React.createElement(CpdSheet, {
    cpd: cpd,
    purpose: purpose,
    onClose: function () {
      setCpd(null);
    },
    onUnit: function (u) {
      setUnitD({
        u: u,
        cpd: cpd
      });
    }
  }), /*#__PURE__*/React.createElement(UnitSheet, {
    data: unitD,
    purpose: purpose,
    onClose: function () {
      setUnitD(null);
    }
  }), /*#__PURE__*/React.createElement(ListSheet, {
    item: listing,
    purpose: purpose,
    onClose: function () {
      setListing(null);
    },
    saved: savedIds,
    onSave: handleSave
  }), /*#__PURE__*/React.createElement(ChatSheet, {
    open: chatOpen,
    initQ: chatQ,
    onClose: function () {
      setChatOpen(false);
      setChatQ('');
    }
  }), /*#__PURE__*/React.createElement(ROISheet, {
    open: tool === 'roi',
    onClose: function () {
      setTool(null);
    }
  }), /*#__PURE__*/React.createElement(PriceSheet, {
    open: tool === 'price',
    onClose: function () {
      setTool(null);
    }
  }), /*#__PURE__*/React.createElement(MatchSheet, {
    open: tool === 'match',
    onClose: function () {
      setTool(null);
    },
    purpose: purpose
  }), /*#__PURE__*/React.createElement(DreamSheet, {
    open: tool === 'dream',
    onClose: function () {
      setTool(null);
    }
  }), /*#__PURE__*/React.createElement(AIEngineSheet, {
    open: tool === 'engine',
    onClose: function () {
      setTool(null);
    }
  }), /*#__PURE__*/React.createElement(SavedSheet, {
    open: savedOpen,
    onClose: function () {
      setSavedOpen(false);
    },
    savedIds: savedIds,
    listings: FEATURED,
    purpose: purpose
  })));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/core.jsx
try { (() => {
const {
  useState,
  useEffect,
  useRef,
  useMemo,
  createContext,
  useContext
} = React;

/* ── CONTEXT ── */
const Ctx = createContext({
  dark: true,
  lang: 'en'
});
const useApp = () => useContext(Ctx);

/* ── COLORS · aligned to repo colors_and_type.css (Design Tokens V2.0) ── */
window.N = '#071422';
window.N2 = '#050B14';
window.N3 = '#0D2444';
window.G = '#C8961A';
window.GL = '#E9C176';
window.IV = '#EFF8F7';
window.HEADING_FONT = "'Cormorant Garamond',serif";

/* ── THEME FN · repo colors_and_type.css tokens ── */
function th(dark) {
  /* Light theme = Houzez demo11 values: bg #f8f8f8, cards #fff, headings #222, body #636363, borders #dce0e0 */
  return {
    bg: dark ? '#071422' : '#FFFFFF',
    bgAlt: dark ? '#0D2444' : '#F8F8F8',
    surf: dark ? 'rgba(255,255,255,.04)' : '#FFFFFF',
    bd: dark ? 'rgba(233,193,118,.15)' : '#DCE0E0',
    tx: dark ? '#EFF8F7' : '#222222',
    txM: dark ? 'rgba(239,248,247,.60)' : '#636363',
    txF: dark ? 'rgba(239,248,247,.35)' : '#9A9A9A',
    navBg: dark ? 'rgba(7,20,34,.96)' : 'rgba(255,255,255,.98)',
    statBg: dark ? '#071422' : '#FFFFFF',
    annBg: dark ? '#0A1E35' : '#F8F8F8',
    cardBg: dark ? '#0A1E35' : '#FFFFFF',
    whyCard: dark ? 'rgba(255,255,255,.04)' : '#FFFFFF',
    bdGold: 'rgba(200,150,26,.25)'
  };
}

/* ── SCROLL ANIM HOOK ── */
function useScrollAnim(t) {
  if (t === undefined) t = 80;
  var ref = useRef(null);
  var vis = useState(false);
  var setVis = vis[1];
  vis = vis[0];
  useEffect(function () {
    var check = function () {
      var sc = document.getElementById('root-scroll');
      if (!sc || !ref.current) return;
      var cr = sc.getBoundingClientRect(),
        er = ref.current.getBoundingClientRect();
      if (er.top < cr.bottom + t) setVis(true);
    };
    var sc = document.getElementById('root-scroll');
    check();
    if (sc) sc.addEventListener('scroll', check, {
      passive: true
    });
    return function () {
      if (sc) sc.removeEventListener('scroll', check);
    };
  }, [t]);
  return [ref, vis];
}

/* ── SHIELD ── */
function Shield(props) {
  var sz = props.sz || 28;
  var gid = 'shg' + Math.round(sz);
  return React.createElement('svg', {
    width: sz,
    height: sz * 1.08,
    viewBox: '0 0 40 44',
    fill: 'none'
  }, React.createElement('defs', null, React.createElement('linearGradient', {
    id: gid,
    x1: '0',
    y1: '0',
    x2: '1',
    y2: '1'
  }, React.createElement('stop', {
    offset: '0',
    stopColor: GL
  }), React.createElement('stop', {
    offset: '1',
    stopColor: G
  }))), React.createElement('path', {
    d: 'M20 2L37 10.5V27Q37 39 20 43Q3 39 3 27V10.5Z',
    fill: N,
    stroke: 'url(#' + gid + ')',
    strokeWidth: '2.4'
  }), React.createElement('rect', {
    x: '12.5',
    y: '17',
    width: '3.6',
    height: '11',
    rx: '.7',
    fill: 'url(#' + gid + ')'
  }), React.createElement('rect', {
    x: '18.2',
    y: '13',
    width: '3.6',
    height: '15',
    rx: '.7',
    fill: 'url(#' + gid + ')'
  }), React.createElement('rect', {
    x: '23.9',
    y: '19',
    width: '3.6',
    height: '9',
    rx: '.7',
    fill: 'url(#' + gid + ')',
    opacity: '.7'
  }), React.createElement('path', {
    d: 'M11 32.5 L19.5 27.5 L28.5 30.5',
    stroke: 'url(#' + gid + ')',
    strokeWidth: '2',
    fill: 'none',
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  }), React.createElement('path', {
    d: 'M28.6 30.6 L25.4 30 M28.6 30.6 L27.4 33.6',
    stroke: 'url(#' + gid + ')',
    strokeWidth: '2',
    fill: 'none',
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  }));
}

/* ── SECTION HEAD ── */
function SH(props) {
  var eye = props.eye,
    title = props.title,
    light = props.light;
  var wide = useWide();
  var c = useApp();
  var dark = c.dark,
    lang = c.lang;
  var isAr = lang === 'ar';
  var clr = light ? '#fff' : dark ? '#F0EDE5' : N;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 20px 14px',
      direction: isAr ? 'rtl' : 'ltr'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 5,
      flexDirection: isAr ? 'row-reverse' : 'row'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 1.5,
      background: G,
      display: 'block',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : "'JetBrains Mono',monospace",
      fontSize: isAr ? 9 : 7.5,
      letterSpacing: isAr ? 0 : '.22em',
      color: G,
      textTransform: 'uppercase'
    }
  }, eye)), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
      fontSize: wide ? isAr ? 30 : 34 : isAr ? 23 : 26,
      fontWeight: isAr ? 700 : 400,
      color: clr,
      lineHeight: 1.1
    }
  }, title));
}

/* ── SHEET SHELL ── */
function Sheet(props) {
  var open = props.open,
    onClose = props.onClose,
    children = props.children,
    maxH = props.maxH || '85%',
    z = props.z || 500;
  var wide = useWide();
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: z,
      background: 'rgba(4,8,15,.72)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: wide ? 'center' : 'flex-end',
      justifyContent: 'center',
      padding: wide ? 24 : 0
    },
    onClick: function (e) {
      if (e.target === e.currentTarget) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: wide ? 24 : '22px 22px 0 0',
      width: wide ? 'min(720px, 94vw)' : '100%',
      maxHeight: wide ? 'min(85vh, 860px)' : maxH,
      display: 'flex',
      flexDirection: 'column',
      animation: (wide ? 'popIn .3s' : 'slideUp .38s') + ' cubic-bezier(.16,1,.3,1) both',
      boxShadow: wide ? '0 40px 120px rgba(0,0,0,.5)' : '0 -20px 60px rgba(13,32,53,.22)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '10px 0 0',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 3.5,
      borderRadius: 2,
      background: 'rgba(13,32,53,.14)',
      margin: '0 auto'
    }
  })), children));
}

/* ── STATUS BAR ── */
function StatusBar() {
  var c = useApp();
  var dark = c.dark,
    setDark = c.setDark,
    lang = c.lang,
    setLang = c.setLang;
  var isAr = lang === 'ar';
  var t = useState('');
  var setT = t[1];
  t = t[0];
  useEffect(function () {
    var tick = function () {
      var d = new Date();
      setT(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
    };
    tick();
    var id = setInterval(tick, 10000);
    return function () {
      clearInterval(id);
    };
  }, []);
  var bg = dark ? N2 : '#fff';
  var tx = dark ? '#fff' : N;
  return /*#__PURE__*/React.createElement("div", {
    className: "status-bar",
    style: {
      height: 54,
      padding: '14px 16px 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: bg,
      position: 'sticky',
      top: 0,
      zIndex: 90,
      flexShrink: 0,
      direction: 'ltr',
      transition: 'background .3s'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'Inter',
      fontSize: 15,
      fontWeight: 600,
      color: tx,
      letterSpacing: '-.3px'
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "12",
    viewBox: "0 0 16 12",
    fill: tx,
    opacity: ".8"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "4",
    width: "3",
    height: "8",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.5",
    y: "2.5",
    width: "3",
    height: "9.5",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "1",
    width: "3",
    height: "11",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "13.5",
    y: "0",
    width: "2.5",
    height: "12",
    rx: "1",
    opacity: ".3"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 24,
      height: 12,
      borderRadius: 3,
      border: '1.5px solid ' + tx,
      display: 'flex',
      alignItems: 'center',
      padding: '1px',
      gap: 1,
      opacity: .8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: '100%',
      background: G,
      borderRadius: 1.5
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 5,
      height: 5,
      borderRadius: '50%',
      background: G
    }
  }))));
}

/* ── RESPONSIVE (desktop reflow) ── */
function useWide() {
  var mq = '(min-width: 860px)';
  var st = useState(function () {
    return window.matchMedia(mq).matches;
  });
  var wide = st[0],
    setWide = st[1];
  useEffect(function () {
    var m = window.matchMedia(mq);
    var h = function (e) {
      setWide(e.matches);
    };
    if (m.addEventListener) m.addEventListener('change', h);else m.addListener(h);
    return function () {
      if (m.removeEventListener) m.removeEventListener('change', h);else m.removeListener(h);
    };
  }, []);
  return wide;
}

/* ── MORPH BLOB (Framer Motion) — soft gold glow, morphs continuously ── */
/* Same 8-segment cubic-Bezier structure across all three so framer-motion morphs cleanly (no key warnings) */
var BLOB_PATHS = ['M0.0,-63.0 C12.9,-63.1 27.5,-49.5 39.0,-39.0 C50.5,-28.5 69.3,-12.7 69.0,0.0 C68.7,12.7 48.8,26.5 37.3,37.3 C25.8,48.1 12.9,64.3 0.0,64.8 C-12.9,65.3 -29.1,51.1 -40.3,40.3 C-51.5,29.5 -67.6,13.1 -67.2,0.0 C-66.8,-13.1 -49.4,-27.7 -38.2,-38.2 C-27.0,-48.7 -12.9,-62.9 0.0,-63.0 Z', 'M0.0,-54.0 C16.1,-53.8 38.0,-56.5 47.5,-47.5 C57.0,-38.5 56.6,-16.3 57.0,0.0 C57.4,16.3 59.6,41.3 50.1,50.1 C40.6,58.9 15.8,53.7 0.0,52.8 C-15.8,51.9 -35.2,53.3 -44.5,44.5 C-53.8,35.7 -55.1,15.6 -55.8,0.0 C-56.5,-15.6 -58.1,-39.8 -48.8,-48.8 C-39.5,-57.8 -16.1,-54.2 0.0,-54.0 Z', 'M0.0,-69.0 C14.5,-67.9 29.8,-51.8 40.3,-40.3 C50.8,-28.8 63.4,-13.1 63.0,0.0 C62.6,13.1 48.7,26.4 38.2,38.2 C27.7,50.0 12.6,70.9 0.0,70.8 C-12.6,70.7 -27.5,49.1 -37.3,37.3 C-47.1,25.5 -57.2,14.0 -58.8,0.0 C-60.4,-14.0 -56.5,-35.2 -46.7,-46.7 C-36.9,-58.2 -14.5,-70.1 0.0,-69.0 Z'];
function MorphBlob(props) {
  var size = props.size || 420,
    opacity = props.opacity != null ? props.opacity : 0.16,
    color1 = props.color1 || GL,
    color2 = props.color2 || G,
    style = props.style || {};
  var gid = 'blobgrad' + Math.round(size);
  var vals = BLOB_PATHS.concat([BLOB_PATHS[0]]).join(';');
  return /*#__PURE__*/React.createElement("div", {
    style: Object.assign({
      position: 'absolute',
      width: size,
      height: size,
      pointerEvents: 'none',
      filter: 'blur(38px)',
      opacity: opacity
    }, style)
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "-80 -80 160 160",
    width: "100%",
    height: "100%"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: gid,
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: color1
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: color2
  }))), /*#__PURE__*/React.createElement("path", {
    fill: 'url(#' + gid + ')',
    d: BLOB_PATHS[0]
  }, /*#__PURE__*/React.createElement("animate", {
    attributeName: "d",
    values: vals,
    dur: "18s",
    repeatCount: "indefinite"
  }))));
}
Object.assign(window, {
  Ctx,
  useApp,
  th,
  useScrollAnim,
  Shield,
  SH,
  Sheet,
  StatusBar,
  useWide,
  MorphBlob
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/core.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/data.js
try { (() => {
/* Sierra Estates — Client Portal data (translations, compounds, units, listings, tour rooms) */
/* ── TRANSLATIONS ── */
const LANG = {
  en: {
    brand: 'SIERRA ESTATES',
    brandSub: 'FUTURE OF REAL ESTATES',
    claim: 'Claim',
    claimSub: 'Service fee · First 50 clients · +10% non-EG',
    reqNow: 'Request Now',
    eyeHero: 'AI DRIVEN · NEW CAIRO 2026',
    h1a: 'Find Your',
    h1b: 'Dream Home',
    h1c: 'Rent & Resale.',
    heroSub: '21 compounds · 1,200+ units · AI-curated for you.',
    resale: 'Resale',
    rent: 'Rent',
    srch: 'Search compounds…',
    beds: 'Beds:',
    any: 'Any',
    req: 'Request',
    s1: 'Props',
    s2: 'AI',
    s3: 'Areas',
    s4: 'Reply',
    eyeTour: 'IMMERSIVE 360° TOUR',
    tourTit: '3D Virtual Tour — Coming Soon',
    drag: '360° Drag to explore',
    eyeList: 'AI-CURATED INVENTORY',
    propTit: 'Properties',
    viewAll: 'View All',
    eyeMap: 'COMPOUND INTELLIGENCE MAP',
    mapTit: 'New Cairo · Live',
    pickCpd: '← Choose compounds — units appear on map',
    tapBadge: 'TAP BADGE → UNIT TABLE',
    sel: 'selected',
    allCpd: 'All Compounds',
    nSel: ' compound selected',
    ' nSelP': ' compounds selected',
    eyeAI: 'AI SERVICES · 7 TOOLS',
    aiTit: 'Intelligence Hub',
    aiOn: 'Online · Gemini 2.0 Flash',
    aiName: 'Sierra AI',
    aiPh: 'Ask Sierra about New Cairo…',
    c1: 'Best ROI',
    c2: 'Hyde Park',
    c3: 'Mivida rent',
    c4: 'Compare',
    c5: 'Invest 2026',
    eyeWhy: 'OUR ADVANTAGE · AI-POWERED',
    whyTit: 'Why Sierra Estates',
    w1t: 'AI Opportunity Scanner',
    w1s: 'Sierra scans 1,200+ units daily using 6 AI tools — ROI, AVM pricing, smart matching — to surface best deals first.',
    w2t: 'AI Dream Home Wizard',
    w2s: 'Answer 4 questions and Sierra recommends the exact compound and unit type for your budget and goals.',
    w3t: 'Precise AVM Pricing',
    w3s: 'Real-time valuation engine benchmarks every unit against 25 compounds. No overpaying.',
    w4t: 'Human + AI Closing',
    w4s: 'AI-sourced opportunities paired with expert advisors. First match to signed contract in 48h.',
    w5t: 'Verified Inventory',
    w5s: 'Every listing personally verified on-site before appearing in your feed.',
    w6t: '4-Second Response',
    w6s: 'Sierra AI always on. Human agents follow up within 4 hours.',
    nav: ['Home', 'Search', 'Map', 'AI Hub', 'Saved'],
    wa: 'WhatsApp',
    call: 'Call Agent',
    tId: 'ID',
    tType: 'Type',
    tBd: 'Bd',
    tArea: 'm²',
    tPrice: 'Price',
    tAI: 'AI',
    tStatus: 'Status',
    tCTA: 'CTA',
    sAll: 'All',
    sAv: 'Available',
    sUO: 'Under Offer',
    sSold: 'Sold',
    pAv: 'Avail',
    pUO: 'Offer',
    pSold: 'Sold',
    allBeds: 'All Beds',
    reqTit: 'Request a Property',
    reqSub: 'Service fees · First 50 users',
    nm: 'Full Name *',
    nmPh: 'Your full name',
    ph: 'WhatsApp Number *',
    phPh: '+20 1XX XXX XXXX',
    cmt: 'Comment (optional)',
    cmtPh: 'Tell us what you\'re looking for…',
    rooms: 'No. of Rooms',
    cmps: 'Compounds (multi-select)',
    budget: 'Budget',
    photo: 'Property Photo (optional)',
    photoBtn: 'Upload a photo',
    nationality: 'Purpose',
    natEg: 'Rent',
    natNonEg: 'Resale',
    nonEgOffer: '🌍 Non-Egyptian? Extra 10% off — limited spots.',
    budgets: ['Any', 'Under EGP 5M', 'EGP 5–10M', 'EGP 10–20M', 'EGP 20M+', 'Under $1K/mo', '$1K–$3K/mo', '$3K+/mo'],
    submit: 'Submit Request — 25% OFF',
    close: 'Close',
    doneTit: 'Request Received!',
    doneSub: 'Our team contacts you within 24 hours.',
    roiTit: 'ROI Analysis',
    roiCalc: 'Yield Calculator',
    roiPrice: 'Purchase price',
    roiRent: 'Monthly rent',
    roiG: 'Gross Yield',
    roiN: 'Net Yield',
    roi5: '5yr Appreciation',
    roiCash: 'Annual Cash',
    priceTit: 'Precise Pricing',
    priceSub: 'Egypt-calibrated AVM — instant fair-market range',
    priceCpd: 'Compound',
    priceArea: 'Area (m²)',
    priceBeds: 'Bedrooms',
    priceFinish: 'Finishing',
    finOpts: ['Standard', 'Premium', 'Ultra Luxury'],
    priceResult: 'Estimated Price',
    priceConf: 'AI Confidence',
    matchTit: 'Smart Match',
    matchSub: 'AI-ranked units matched to your criteria',
    dreamTit: 'Dream Home Advisor',
    dreamSub: '4 questions → AI recommends your compound',
    dreamNext: 'Next →',
    dreamBack: '← Back',
    dq: ["What matters most?", "What's your budget?", "Lifestyle preference?", "How many rooms?"],
    dh: ['Your top priority shapes the match.', 'Set your comfortable range.', 'Where do you see yourself?', 'How many bedrooms?'],
    do: [[{
      ic: '📈',
      t: 'High ROI',
      d: 'Investment-first'
    }, {
      ic: '🏡',
      t: 'Family Life',
      d: 'Space & community'
    }, {
      ic: '🚗',
      t: 'Location',
      d: 'Commute & access'
    }, {
      ic: '🎨',
      t: 'Luxury Feel',
      d: 'Prestige & design'
    }], [{
      ic: '💰',
      t: 'Under EGP 5M',
      d: 'Entry level'
    }, {
      ic: '🏠',
      t: 'EGP 5–15M',
      d: 'Mid range'
    }, {
      ic: '🌟',
      t: 'EGP 15–30M',
      d: 'Premium'
    }, {
      ic: '💎',
      t: 'EGP 30M+',
      d: 'Ultra luxury'
    }], [{
      ic: '🏙️',
      t: 'Urban & Connected',
      d: 'Close to everything'
    }, {
      ic: '🌿',
      t: 'Green & Quiet',
      d: 'Nature & peace'
    }, {
      ic: '🏊',
      t: 'Resort Living',
      d: 'Amenities & clubs'
    }, {
      ic: '👨‍👩‍👧',
      t: 'Family Compound',
      d: 'Schools & safety'
    }], [{
      ic: '1️⃣',
      t: 'Studio / 1 Bed',
      d: 'Solo or couple'
    }, {
      ic: '2️⃣',
      t: '2–3 Beds',
      d: 'Small family'
    }, {
      ic: '3️⃣',
      t: '4–5 Beds',
      d: 'Growing family'
    }, {
      ic: '🏰',
      t: '6+ Beds',
      d: 'Villa / mansion'
    }]],
    dreamRes: {
      'High ROI': ['Uptown Cairo', 'AI 9.4 · +31% growth', 'Best capital appreciation in New Cairo.'],
      'Family Life': ['Hyde Park', 'AI 9.8 · 5th Settlement', 'Top schools, green spaces, premium community.'],
      'Location': ['Mivida', 'AI 9.1 · Emaar', 'Central 5th Settlement, best Ring Road access.'],
      'Luxury Feel': ['Taj City', 'AI 9.5 · New Cairo', 'Ultra luxury branded villas, resort amenities.']
    },
    aiResp: {
      def: "I'm Sierra, your AI concierge for New Cairo. Ask me about compounds, ROI, pricing or viewings.",
      hyde: 'Hyde Park (AI 9.8) — 5 units from EGP 8.8M. Capital appreciation +22% YoY. Best for luxury buyers.',
      mivida: 'Mivida by Emaar — best rental yield in 5th Settlement at 7.2%. 8 units from EGP 3.4M.',
      roi: 'Top ROI: ① Uptown Cairo +31% ② Mountain View +24% ③ Hyde Park +22% ④ Villette +20%.',
      rent: 'Best rentals: Al Rehab $600/mo · Madinaty $650/mo · Mivida $850/mo · Hyde Park $5,200/mo.',
      compare: 'Hyde Park vs Mivida: Hyde wins ROI (+22% vs +18%). Mivida wins rental yield (7.2%).',
      invest: 'Top 2026 picks: Uptown Cairo (+31%), Mountain View (+24%), Villette (+20%).'
    }
  },
  ar: {
    brand: 'سيرا إستيتس',
    brandSub: 'مستقبل العقارات',
    claim: 'احصل على',
    claimSub: 'رسوم الخدمة · أول 50 عميل · +10% لغير المصريين',
    reqNow: 'اطلب الآن',
    eyeHero: 'ذكاء اصطناعي · القاهرة الجديدة 2026',
    h1a: 'اعثر على',
    h1b: 'منزل أحلامك',
    h1c: 'إيجار وبيع.',
    heroSub: '21 كمبوند · +1200 وحدة · منتقاة بالذكاء الاصطناعي.',
    resale: 'بيع',
    rent: 'إيجار',
    srch: 'ابحث…',
    beds: 'غرف:',
    any: 'الكل',
    req: 'اطلب',
    s1: 'عقار',
    s2: 'توافق',
    s3: 'منطقة',
    s4: 'رد',
    eyeTour: 'جولة 360°',
    tourTit: 'جولة افتراضية',
    drag: 'اسحب 360° للاستكشاف',
    eyeList: 'المخزون بالذكاء',
    propTit: 'عقارات',
    viewAll: 'عرض الكل',
    eyeMap: 'خريطة الذكاء العقاري',
    mapTit: 'القاهرة الجديدة · مباشر',
    pickCpd: '← اختر كمبوندات — تظهر الوحدات على الخريطة',
    tapBadge: 'اضغط الشارة ← جدول الوحدات',
    sel: 'محدد',
    allCpd: 'كل الكمبوندات',
    nSel: ' كمبوند محدد',
    ' nSelP': ' كمبوندات محددة',
    eyeAI: 'خدمات الذكاء · 7 أدوات',
    aiTit: 'مركز الذكاء',
    aiOn: 'متصل · Gemini 2.0 Flash',
    aiName: 'سيرا الذكي',
    aiPh: 'اسأل سيرا عن القاهرة الجديدة…',
    c1: 'أفضل عائد',
    c2: 'هايد بارك',
    c3: 'إيجار ميفيدا',
    c4: 'قارن',
    c5: 'استثمر 2026',
    eyeWhy: 'مزايانا · بالذكاء الاصطناعي',
    whyTit: 'لماذا سيرا إستيتس',
    w1t: 'ماسح الفرص الذكي',
    w1s: 'سيرا يفحص +1200 وحدة يومياً بـ 6 أدوات ذكاء اصطناعي لإيجاد أفضل الفرص أولاً.',
    w2t: 'مستشار المنزل المثالي',
    w2s: 'أجب على 4 أسئلة وسيرا يوصي بالكمبوند والوحدة المثالية لميزانيتك وأهدافك.',
    w3t: 'تسعير AVM دقيق',
    w3s: 'محرك تقييم فوري يقارن كل وحدة مع 25 كمبوند في الوقت الفعلي.',
    w4t: 'إغلاق بشري + ذكاء',
    w4s: 'فرص يكتشفها الذكاء الاصطناعي + مستشارون خبراء. من أول توافق حتى التوقيع خلال 48 ساعة.',
    w5t: 'مخزون موثق',
    w5s: 'كل قائمة يتم التحقق منها شخصياً في الموقع قبل ظهورها.',
    w6t: 'رد في 4 ثوان',
    w6s: 'سيرا الذكي دائماً متصل. الوكلاء يتابعون خلال 4 ساعات.',
    nav: ['الرئيسية', 'بحث', 'خريطة', 'الذكاء', 'محفوظ'],
    wa: 'واتساب',
    call: 'اتصل',
    tId: 'رقم',
    tType: 'نوع',
    tBd: 'غرف',
    tArea: 'م²',
    tPrice: 'سعر',
    tAI: 'ذكاء',
    tStatus: 'الحالة',
    tCTA: 'تواصل',
    sAll: 'الكل',
    sAv: 'متاح',
    sUO: 'معروض',
    sSold: 'مُباع',
    pAv: 'متاح',
    pUO: 'معروض',
    pSold: 'مُباع',
    allBeds: 'كل الغرف',
    reqTit: 'اطلب عقاراً',
    reqSub: 'رسوم الخدمة · أول 50 مستخدم',
    nm: 'الاسم الكامل *',
    nmPh: 'اسمك الكامل',
    ph: 'رقم واتساب *',
    phPh: '+20 1XX XXX XXXX',
    cmt: 'تعليق (اختياري)',
    cmtPh: 'أخبرنا عن طلبك…',
    rooms: 'عدد الغرف',
    cmps: 'الكمبوندات (اختر أكثر)',
    budget: 'الميزانية',
    photo: 'صورة العقار (اختياري)',
    photoBtn: 'ارفع صورة',
    nationality: 'الغرض',
    natEg: 'إيجار',
    natNonEg: 'بيع',
    nonEgOffer: '🌍 غير مصري؟ خصم إضافي 10% — أماكن محدودة.',
    budgets: ['الكل', 'أقل من 5 مليون', '5-10 مليون', '10-20 مليون', 'أكثر من 20 مليون', 'أقل من 1000$', '1000-3000$', 'أكثر من 3000$'],
    submit: 'أرسل الطلب — خصم 25%',
    close: 'إغلاق',
    doneTit: 'تم استلام الطلب!',
    doneSub: 'سيتواصل معك فريقنا خلال 24 ساعة.',
    roiTit: 'تحليل العائد',
    roiCalc: 'حاسبة العائد',
    roiPrice: 'سعر الشراء',
    roiRent: 'الإيجار الشهري',
    roiG: 'العائد الإجمالي',
    roiN: 'العائد الصافي',
    roi5: 'ارتفاع 5 سنوات',
    roiCash: 'نقد سنوي',
    priceTit: 'التسعير الدقيق',
    priceSub: 'تقييم AVM مصري — نطاق سعر فوري',
    priceCpd: 'الكمبوند',
    priceArea: 'المساحة (م²)',
    priceBeds: 'عدد الغرف',
    priceFinish: 'التشطيب',
    finOpts: ['عادي', 'بريميوم', 'فاخر جداً'],
    priceResult: 'السعر المقدر',
    priceConf: 'ثقة الذكاء',
    matchTit: 'التوافق الذكي',
    matchSub: 'وحدات مرتبة بالذكاء الاصطناعي',
    dreamTit: 'مستشار المنزل المثالي',
    dreamSub: '4 أسئلة → توصية كمبوند مثالي',
    dreamNext: 'التالي →',
    dreamBack: '← السابق',
    dq: ['ما الأهم بالنسبة لك؟', 'ما ميزانيتك؟', 'أسلوب حياتك؟', 'كم غرفة تحتاج؟'],
    dh: ['أولويتك تحدد التوصية.', 'حدد نطاقك المريح.', 'أين ترى نفسك؟', 'كم عدد الغرف؟'],
    do: [[{
      ic: '📈',
      t: 'عائد مرتفع',
      d: 'الاستثمار أولاً'
    }, {
      ic: '🏡',
      t: 'حياة عائلية',
      d: 'مساحة ومجتمع'
    }, {
      ic: '🚗',
      t: 'الموقع',
      d: 'التنقل والوصول'
    }, {
      ic: '🎨',
      t: 'الفخامة',
      d: 'التصميم والرقي'
    }], [{
      ic: '💰',
      t: 'أقل من 5 مليون',
      d: 'مستوى مدخل'
    }, {
      ic: '🏠',
      t: '5-15 مليون',
      d: 'متوسط'
    }, {
      ic: '🌟',
      t: '15-30 مليون',
      d: 'بريميوم'
    }, {
      ic: '💎',
      t: '30 مليون+',
      d: 'فاخر جداً'
    }], [{
      ic: '🏙️',
      t: 'حضري ومتصل',
      d: 'قريب من كل شيء'
    }, {
      ic: '🌿',
      t: 'أخضر وهادئ',
      d: 'الطبيعة والسكينة'
    }, {
      ic: '🏊',
      t: 'حياة المنتجع',
      d: 'المرافق والنوادي'
    }, {
      ic: '👨‍👩‍👧',
      t: 'مجتمع عائلي',
      d: 'مدارس وأمان'
    }], [{
      ic: '1️⃣',
      t: 'ستوديو / 1 غرفة',
      d: 'فردي أو زوجين'
    }, {
      ic: '2️⃣',
      t: '2-3 غرف',
      d: 'عائلة صغيرة'
    }, {
      ic: '3️⃣',
      t: '4-5 غرف',
      d: 'عائلة متنامية'
    }, {
      ic: '🏰',
      t: '6+ غرف',
      d: 'فيلا / قصر'
    }]],
    dreamRes: {
      'عائد مرتفع': ['أبتاون القاهرة', 'AI 9.4 · +31% نمو', 'أفضل ارتفاع رأس المال في القاهرة الجديدة.'],
      'حياة عائلية': ['هايد بارك', 'AI 9.8 · التجمع الخامس', 'أفضل مدارس ومساحات خضراء.'],
      'الموقع': ['ميفيدا', 'AI 9.1 · إعمار', 'وسط التجمع الخامس، أفضل وصول للدائري.'],
      'الفخامة': ['تاج سيتي', 'AI 9.5 · القاهرة الجديدة', 'فيلات فاخرة مع مرافق منتجع.']
    },
    aiResp: {
      def: 'أنا سيرا، مساعدك الذكي. اسألني عن الكمبوندات أو العائد أو الأسعار.',
      hyde: 'هايد بارك (AI 9.8) — 5 وحدات من 8.8 مليون جنيه. ارتفاع سنوي +22%.',
      mivida: 'ميفيدا — أفضل عائد إيجاري في التجمع الخامس بنسبة 7.2%.',
      roi: 'أفضل عائد: ① أبتاون +31% ② ماونتن فيو +24% ③ هايد بارك +22%.',
      rent: 'أفضل إيجارات: الرحاب $600 · مدينتي $650 · ميفيدا $850 · هايد بارك $5,200.',
      compare: 'هايد بارك مقابل ميفيدا: هايد أفضل عائد. ميفيدا أفضل للإيجار.',
      invest: 'أفضل استثمارات 2026: أبتاون (+31%)، ماونتن فيو (+24%)، فيليت (+20%).'
    }
  }
};

/* ── COMPOUND DATA ── */
const CPDS = [{
  n: 'Katameya Heights',
  c: [29.99, 31.48],
  g: '+10%',
  ai: 9,
  z: 'Katameya',
  priceM: 26,
  rent: 5000
}, {
  n: 'Katameya Dunes',
  c: [29.985, 31.492],
  g: '+12%',
  ai: 8.8,
  z: 'Katameya',
  priceM: 18,
  rent: 3400
}, {
  n: 'Swan Lake Residence',
  c: [30.045, 31.635],
  g: '+15%',
  ai: 8.9,
  z: '5th Settlement',
  priceM: 8.5,
  rent: 1700
}, {
  n: 'Mivida',
  c: [30.007, 31.589],
  g: '+18%',
  ai: 9.1,
  z: '5th Settlement',
  priceM: 10.5,
  rent: 2100
}, {
  n: 'Cairo Festival City (CFC) Residences',
  c: [30.016, 31.469],
  g: '+12%',
  ai: 8.7,
  z: 'New Cairo',
  priceM: 7.5,
  rent: 1500
}, {
  n: 'Hyde Park New Cairo',
  c: [30.008, 31.645],
  g: '+22%',
  ai: 9.8,
  z: '5th Settlement',
  priceM: 28.5,
  rent: 5200
}, {
  n: 'Taj City',
  c: [30.065, 31.531],
  g: '+19%',
  ai: 9.5,
  z: 'New Cairo',
  priceM: 35,
  rent: 6500
}, {
  n: 'Eastown (SODIC)',
  c: [30.018, 31.587],
  g: '+19%',
  ai: 9,
  z: '5th Settlement',
  priceM: 11.5,
  rent: 2400
}, {
  n: 'Mountain View iCity',
  c: [30.014, 31.618],
  g: '+24%',
  ai: 9.6,
  z: '5th Settlement',
  priceM: 22,
  rent: 3200
}, {
  n: 'Zed East (Ora)',
  c: [30.095, 31.61],
  g: '+13%',
  ai: 8.7,
  z: 'New Cairo',
  priceM: 8,
  rent: 1600
}, {
  n: 'Palm Hills New Cairo',
  c: [30.002, 31.608],
  g: '+21%',
  ai: 9.2,
  z: '5th Settlement',
  priceM: 25,
  rent: 4800
}, {
  n: 'The Waterway',
  c: [30.04, 31.47],
  g: '+14%',
  ai: 8.8,
  z: 'New Cairo',
  priceM: 12,
  rent: 2300
}, {
  n: 'Lake View / Lake View Residence',
  c: [30.022, 31.532],
  g: '+13%',
  ai: 8.7,
  z: 'New Cairo',
  priceM: 9.5,
  rent: 1900
}, {
  n: 'Fifth Square (Al Marasem)',
  c: [30.025, 31.578],
  g: '+17%',
  ai: 9,
  z: '5th Settlement',
  priceM: 8.5,
  rent: 1750
}, {
  n: 'Villette (SODIC)',
  c: [30.053, 31.598],
  g: '+20%',
  ai: 9.3,
  z: '5th Settlement',
  priceM: 24.5,
  rent: 4400
}, {
  n: 'Stone Residence (Rooya Group)',
  c: [30.028, 31.557],
  g: '+15%',
  ai: 8.8,
  z: 'New Cairo',
  priceM: 7.8,
  rent: 1550
}, {
  n: 'The Square (Al Ahly Sabbour)',
  c: [30.033, 31.542],
  g: '+16%',
  ai: 8.9,
  z: 'New Cairo',
  priceM: 9,
  rent: 1800
}, {
  n: 'El Patio Oro (La Vista)',
  c: [30.029, 31.56],
  g: '+15%',
  ai: 8.9,
  z: 'New Cairo',
  priceM: 10,
  rent: 2000
}, {
  n: 'El Patio 7 (La Vista)',
  c: [30.035, 31.565],
  g: '+14%',
  ai: 8.8,
  z: 'New Cairo',
  priceM: 8.5,
  rent: 1700
}, {
  n: 'Katameya Gardens',
  c: [29.992, 31.488],
  g: '+11%',
  ai: 8.6,
  z: 'Katameya',
  priceM: 15,
  rent: 2800
}, {
  n: 'Village Gardens Katameya (Palm Hills)',
  c: [29.988, 31.484],
  g: '+11%',
  ai: 8.6,
  z: 'Katameya',
  priceM: 16,
  rent: 3000
}, {
  n: 'Galleria Moon Valley (Arabia Holding)',
  c: [30.02, 31.55],
  g: '+13%',
  ai: 8.7,
  z: 'New Cairo',
  priceM: 7,
  rent: 1400
}, {
  n: '90 Avenue (Tabarak)',
  c: [30.028, 31.572],
  g: '+14%',
  ai: 8.8,
  z: '5th Settlement',
  priceM: 8,
  rent: 1600
}, {
  n: 'Azzar New Cairo (Reedy Group)',
  c: [30.022, 31.568],
  g: '+13%',
  ai: 8.7,
  z: 'New Cairo',
  priceM: 7.5,
  rent: 1500
}, {
  n: 'District 5 (Marakez)',
  c: [30.012, 31.5],
  g: '+16%',
  ai: 8.9,
  z: 'New Cairo',
  priceM: 9.5,
  rent: 1900
}, {
  n: 'The Brooks (PRE Developments)',
  c: [30.07, 31.57],
  g: '+17%',
  ai: 8.9,
  z: 'Mostakbal',
  priceM: 7,
  rent: 1400
}, {
  n: 'STEI8HT (LMD)',
  c: [30.075, 31.575],
  g: '+16%',
  ai: 8.8,
  z: 'Mostakbal',
  priceM: 6.5,
  rent: 1300
}, {
  n: 'The Crest (IL Cazar)',
  c: [30.068, 31.562],
  g: '+15%',
  ai: 8.7,
  z: 'Mostakbal',
  priceM: 7.2,
  rent: 1450
}, {
  n: 'Azad & Azad Views (Tameer)',
  c: [30.078, 31.558],
  g: '+14%',
  ai: 8.6,
  z: 'Mostakbal',
  priceM: 6.8,
  rent: 1350
}, {
  n: 'Eastshire (Alqamzi)',
  c: [30.082, 31.565],
  g: '+13%',
  ai: 8.5,
  z: 'Mostakbal',
  priceM: 6,
  rent: 1200
}, {
  n: 'The Waterway Branded Residences',
  c: [30.042, 31.472],
  g: '+18%',
  ai: 9.1,
  z: 'New Cairo',
  priceM: 18,
  rent: 3500
}, {
  n: 'Aster Residence',
  c: [30.062, 31.548],
  g: '+14%',
  ai: 8.8,
  z: 'New Cairo',
  priceM: 8,
  rent: 1600
}, {
  n: 'The MarQ',
  c: [30.058, 31.544],
  g: '+15%',
  ai: 8.8,
  z: 'New Cairo',
  priceM: 9,
  rent: 1800
}, {
  n: 'Capital Gate (Al Marasem)',
  c: [30.026, 31.58],
  g: '+16%',
  ai: 9,
  z: '5th Settlement',
  priceM: 8.5,
  rent: 1700
}, {
  n: 'Bloomfields (Tatweer Misr)',
  c: [30.08, 31.55],
  g: '+16%',
  ai: 8.9,
  z: 'Mostakbal',
  priceM: 7,
  rent: 1500
}, {
  n: 'IL Bosco City (Misr Italia)',
  c: [30.085, 31.556],
  g: '+17%',
  ai: 9,
  z: 'Mostakbal',
  priceM: 8.5,
  rent: 1700
}, {
  n: 'Odyssia (Al Ahly Sabbour)',
  c: [30.09, 31.56],
  g: '+15%',
  ai: 8.8,
  z: 'New Cairo',
  priceM: 7.5,
  rent: 1500
}, {
  n: 'Haptown (Hassan Allam)',
  c: [30.086, 31.553],
  g: '+15%',
  ai: 8.8,
  z: 'Mostakbal',
  priceM: 6.5,
  rent: 1300
}, {
  n: 'Sarai (Madinet Masr)',
  c: [30.105, 31.662],
  g: '+14%',
  ai: 8.9,
  z: 'New Cairo',
  priceM: 7,
  rent: 1400
}, {
  n: 'Madinaty',
  c: [30.078, 31.657],
  g: '+13%',
  ai: 8.7,
  z: 'Madinaty',
  priceM: 4.5,
  rent: 900
}, {
  n: 'El Shorouk',
  c: [30.13, 31.62],
  g: '+11%',
  ai: 8.5,
  z: 'El Shorouk',
  priceM: 5.5,
  rent: 1100
}];

/* ── UNIT DATA (key compounds) ── */
const UNITS = {
  'Hyde Park': [{
    id: 'HP-001',
    type: 'Villa',
    beds: 5,
    bath: 5,
    area: 480,
    egpM: 28.5,
    usd: 5200,
    status: 'Available',
    ai: 9.8
  }, {
    id: 'HP-002',
    type: 'Villa',
    beds: 4,
    bath: 4,
    area: 380,
    egpM: 21.5,
    usd: 4200,
    status: 'Available',
    ai: 9.7
  }, {
    id: 'HP-003',
    type: 'Twin House',
    beds: 4,
    bath: 3,
    area: 320,
    egpM: 18.5,
    usd: 3800,
    status: 'Under Offer',
    ai: 9.5
  }, {
    id: 'HP-004',
    type: 'Townhouse',
    beds: 3,
    bath: 3,
    area: 240,
    egpM: 14.2,
    usd: 2900,
    status: 'Available',
    ai: 9.3
  }, {
    id: 'HP-005',
    type: 'Penthouse',
    beds: 4,
    bath: 3,
    area: 290,
    egpM: 17.2,
    usd: 3500,
    status: 'Available',
    ai: 9.6
  }, {
    id: 'HP-006',
    type: 'Apartment',
    beds: 3,
    bath: 2,
    area: 175,
    egpM: 8.8,
    usd: 1850,
    status: 'Sold',
    ai: 9.1
  }],
  'Mountain View iCity': [{
    id: 'MV-001',
    type: 'Villa',
    beds: 4,
    bath: 4,
    area: 350,
    egpM: 22.0,
    usd: 3200,
    status: 'Available',
    ai: 9.6
  }, {
    id: 'MV-002',
    type: 'Twin House',
    beds: 3,
    bath: 3,
    area: 280,
    egpM: 15.5,
    usd: 2400,
    status: 'Available',
    ai: 9.4
  }, {
    id: 'MV-003',
    type: 'Apartment',
    beds: 3,
    bath: 2,
    area: 155,
    egpM: 7.8,
    usd: 1650,
    status: 'Under Offer',
    ai: 9.2
  }, {
    id: 'MV-004',
    type: 'Duplex',
    beds: 4,
    bath: 3,
    area: 260,
    egpM: 14.0,
    usd: 2800,
    status: 'Available',
    ai: 9.5
  }, {
    id: 'MV-005',
    type: 'Apartment',
    beds: 2,
    bath: 2,
    area: 120,
    egpM: 6.2,
    usd: 1400,
    status: 'Available',
    ai: 9.0
  }],
  'Mivida': [{
    id: 'MI-001',
    type: 'Apartment',
    beds: 1,
    bath: 1,
    area: 75,
    egpM: 3.4,
    usd: 850,
    status: 'Available',
    ai: 8.8
  }, {
    id: 'MI-002',
    type: 'Apartment',
    beds: 2,
    bath: 2,
    area: 110,
    egpM: 5.2,
    usd: 1300,
    status: 'Available',
    ai: 9.0
  }, {
    id: 'MI-003',
    type: 'Apartment',
    beds: 3,
    bath: 2,
    area: 145,
    egpM: 6.8,
    usd: 1650,
    status: 'Available',
    ai: 9.1
  }, {
    id: 'MI-004',
    type: 'Twin House',
    beds: 3,
    bath: 3,
    area: 210,
    egpM: 9.5,
    usd: 2100,
    status: 'Available',
    ai: 9.3
  }, {
    id: 'MI-005',
    type: 'Villa',
    beds: 4,
    bath: 4,
    area: 310,
    egpM: 15.8,
    usd: 3200,
    status: 'Under Offer',
    ai: 9.4
  }, {
    id: 'MI-006',
    type: 'Penthouse',
    beds: 3,
    bath: 2,
    area: 200,
    egpM: 11.2,
    usd: 2400,
    status: 'Available',
    ai: 9.2
  }],
  'Uptown Cairo': [{
    id: 'UC-001',
    type: 'Apartment',
    beds: 2,
    bath: 2,
    area: 130,
    egpM: 7.2,
    usd: 1600,
    status: 'Available',
    ai: 9.3
  }, {
    id: 'UC-002',
    type: 'Penthouse',
    beds: 4,
    bath: 3,
    area: 300,
    egpM: 18.5,
    usd: 3800,
    status: 'Available',
    ai: 9.5
  }, {
    id: 'UC-003',
    type: 'Villa',
    beds: 5,
    bath: 4,
    area: 420,
    egpM: 25.0,
    usd: 4800,
    status: 'Available',
    ai: 9.4
  }, {
    id: 'UC-004',
    type: 'Duplex',
    beds: 4,
    bath: 3,
    area: 280,
    egpM: 16.0,
    usd: 3200,
    status: 'Available',
    ai: 9.3
  }],
  'Madinaty': [{
    id: 'MD-001',
    type: 'Apartment',
    beds: 1,
    bath: 1,
    area: 65,
    egpM: 2.8,
    usd: 650,
    status: 'Available',
    ai: 8.5
  }, {
    id: 'MD-002',
    type: 'Apartment',
    beds: 2,
    bath: 2,
    area: 100,
    egpM: 3.8,
    usd: 900,
    status: 'Available',
    ai: 8.7
  }, {
    id: 'MD-003',
    type: 'Apartment',
    beds: 3,
    bath: 2,
    area: 140,
    egpM: 4.5,
    usd: 1100,
    status: 'Available',
    ai: 8.8
  }, {
    id: 'MD-004',
    type: 'Villa',
    beds: 4,
    bath: 3,
    area: 280,
    egpM: 12.5,
    usd: 2200,
    status: 'Available',
    ai: 8.9
  }],
  'Villette': [{
    id: 'VL-001',
    type: 'Villa',
    beds: 5,
    bath: 5,
    area: 520,
    egpM: 32.0,
    usd: 5800,
    status: 'Available',
    ai: 9.4
  }, {
    id: 'VL-002',
    type: 'Twin House',
    beds: 4,
    bath: 4,
    area: 340,
    egpM: 19.5,
    usd: 3600,
    status: 'Available',
    ai: 9.3
  }, {
    id: 'VL-003',
    type: 'Villa',
    beds: 4,
    bath: 4,
    area: 390,
    egpM: 24.5,
    usd: 4400,
    status: 'Available',
    ai: 9.5
  }],
  'Taj City': [{
    id: 'TC-001',
    type: 'Villa',
    beds: 5,
    bath: 5,
    area: 500,
    egpM: 35.0,
    usd: 6500,
    status: 'Available',
    ai: 9.5
  }, {
    id: 'TC-002',
    type: 'Villa',
    beds: 4,
    bath: 4,
    area: 400,
    egpM: 27.5,
    usd: 5000,
    status: 'Available',
    ai: 9.4
  }, {
    id: 'TC-003',
    type: 'Penthouse',
    beds: 3,
    bath: 3,
    area: 280,
    egpM: 18.0,
    usd: 3400,
    status: 'Available',
    ai: 9.2
  }],
  'Eastown': [{
    id: 'ET-001',
    type: 'Apartment',
    beds: 2,
    bath: 2,
    area: 120,
    egpM: 6.5,
    usd: 1500,
    status: 'Available',
    ai: 8.9
  }, {
    id: 'ET-002',
    type: 'Apartment',
    beds: 3,
    bath: 2,
    area: 160,
    egpM: 8.2,
    usd: 1900,
    status: 'Available',
    ai: 9.0
  }, {
    id: 'ET-003',
    type: 'Twin House',
    beds: 4,
    bath: 3,
    area: 270,
    egpM: 14.8,
    usd: 2800,
    status: 'Available',
    ai: 9.2
  }],
  'SODIC East': [{
    id: 'SE-001',
    type: 'Apartment',
    beds: 2,
    bath: 2,
    area: 118,
    egpM: 6.0,
    usd: 1400,
    status: 'Available',
    ai: 9.1
  }, {
    id: 'SE-002',
    type: 'Townhouse',
    beds: 3,
    bath: 3,
    area: 235,
    egpM: 12.0,
    usd: 2500,
    status: 'Available',
    ai: 9.0
  }, {
    id: 'SE-003',
    type: 'Villa',
    beds: 4,
    bath: 4,
    area: 320,
    egpM: 18.5,
    usd: 3400,
    status: 'Under Offer',
    ai: 9.1
  }],
  'Palm Hills NC': [{
    id: 'PH-001',
    type: 'Villa',
    beds: 5,
    bath: 5,
    area: 460,
    egpM: 30.0,
    usd: 5500,
    status: 'Available',
    ai: 9.2
  }, {
    id: 'PH-002',
    type: 'Twin House',
    beds: 4,
    bath: 4,
    area: 310,
    egpM: 19.0,
    usd: 3400,
    status: 'Available',
    ai: 9.1
  }, {
    id: 'PH-003',
    type: 'Villa',
    beds: 4,
    bath: 4,
    area: 380,
    egpM: 23.5,
    usd: 4200,
    status: 'Under Offer',
    ai: 9.3
  }],
  'Sarai': [{
    id: 'SR-001',
    type: 'Apartment',
    beds: 2,
    bath: 2,
    area: 115,
    egpM: 4.2,
    usd: 950,
    status: 'Available',
    ai: 8.8
  }, {
    id: 'SR-002',
    type: 'Villa',
    beds: 4,
    bath: 3,
    area: 290,
    egpM: 14.0,
    usd: 2800,
    status: 'Available',
    ai: 9.1
  }],
  'El Shorouk': [{
    id: 'ES-001',
    type: 'Apartment',
    beds: 2,
    bath: 1,
    area: 95,
    egpM: 2.8,
    usd: 680,
    status: 'Available',
    ai: 8.5
  }, {
    id: 'ES-002',
    type: 'Villa',
    beds: 4,
    bath: 3,
    area: 280,
    egpM: 10.5,
    usd: 1900,
    status: 'Available',
    ai: 8.7
  }],
  'Al Rehab': [{
    id: 'AR-001',
    type: 'Apartment',
    beds: 2,
    bath: 1,
    area: 90,
    egpM: 2.5,
    usd: 600,
    status: 'Available',
    ai: 8.4
  }, {
    id: 'AR-002',
    type: 'Villa',
    beds: 4,
    bath: 3,
    area: 260,
    egpM: 9.8,
    usd: 1700,
    status: 'Available',
    ai: 8.6
  }, {
    id: 'AR-003',
    type: 'Duplex',
    beds: 3,
    bath: 2,
    area: 185,
    egpM: 6.5,
    usd: 1400,
    status: 'Available',
    ai: 8.5
  }]
};

// Name aliases for UNITS lookup
UNITS['Hyde Park New Cairo'] = UNITS['Hyde Park'] || [];
UNITS['Villette (SODIC)'] = UNITS['Villette'] || [];
UNITS['Eastown (SODIC)'] = UNITS['Eastown'] || [];
UNITS['Sarai (Madinet Masr)'] = UNITS['Sarai'] || [];
UNITS['Bloomfields (Tatweer Misr)'] = UNITS['Bloomfields'] || [];
UNITS['Fifth Square (Al Marasem)'] = UNITS['Fifth Square'] || [];
UNITS['Palm Hills New Cairo'] = UNITS['Palm Hills NC'] || [];

/* ── FEATURED LISTINGS ── */
const FEATURED = [{
  id: 1,
  cmp: 'Hyde Park',
  type: 'Villa',
  beds: 5,
  bath: 5,
  area: 480,
  egpM: 28.5,
  usd: 5200,
  ai: 9.8,
  tag: 'Premium',
  img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=85'
}, {
  id: 2,
  cmp: 'Mountain View iCity',
  type: 'Twin House',
  beds: 4,
  bath: 3,
  area: 280,
  egpM: 15.5,
  usd: 2400,
  ai: 9.6,
  tag: 'Featured',
  img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=85'
}, {
  id: 3,
  cmp: 'Mivida',
  type: 'Apartment',
  beds: 3,
  bath: 2,
  area: 145,
  egpM: 6.8,
  usd: 1650,
  ai: 9.1,
  tag: 'Smart Match',
  img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=85'
}, {
  id: 4,
  cmp: 'Uptown Cairo',
  type: 'Penthouse',
  beds: 4,
  bath: 3,
  area: 300,
  egpM: 18.5,
  usd: 3800,
  ai: 9.5,
  tag: 'Exclusive',
  img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=85'
}, {
  id: 5,
  cmp: 'Taj City',
  type: 'Villa',
  beds: 5,
  bath: 5,
  area: 500,
  egpM: 35.0,
  usd: 6500,
  ai: 9.5,
  tag: 'Premium',
  img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=85'
}, {
  id: 6,
  cmp: 'Villette',
  type: 'Villa',
  beds: 4,
  bath: 4,
  area: 390,
  egpM: 24.5,
  usd: 4400,
  ai: 9.3,
  tag: 'New',
  img: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=600&q=85'
}, {
  id: 7,
  cmp: 'Palm Hills NC',
  type: 'Villa',
  beds: 4,
  bath: 3,
  area: 380,
  egpM: 23.5,
  usd: 4200,
  ai: 9.2,
  tag: 'Best ROI',
  img: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&q=85'
}, {
  id: 8,
  cmp: 'Eastown',
  type: 'Duplex',
  beds: 3,
  bath: 2,
  area: 220,
  egpM: 11.5,
  usd: 2400,
  ai: 9.1,
  tag: null,
  img: 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=600&q=85'
}, {
  id: 9,
  cmp: 'Madinaty',
  type: 'Villa',
  beds: 4,
  bath: 3,
  area: 280,
  egpM: 12.5,
  usd: 2200,
  ai: 8.9,
  tag: null,
  img: 'https://images.unsplash.com/photo-1568605114967-8130f3a3699f?w=600&q=85'
}, {
  id: 10,
  cmp: 'SODIC East',
  type: 'Villa',
  beds: 4,
  bath: 4,
  area: 320,
  egpM: 18.5,
  usd: 3400,
  ai: 9.1,
  tag: 'New',
  img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=85'
}, {
  id: 11,
  cmp: 'Sarai',
  type: 'Villa',
  beds: 4,
  bath: 3,
  area: 290,
  egpM: 14.0,
  usd: 2800,
  ai: 9.1,
  tag: null,
  img: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=85'
}, {
  id: 12,
  cmp: 'Palm Hills NC',
  type: 'Villa',
  beds: 5,
  bath: 5,
  area: 460,
  egpM: 30.0,
  usd: 5500,
  ai: 9.2,
  tag: 'Premium',
  img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=85'
}, {
  id: 13,
  cmp: 'Villette',
  type: 'Twin House',
  beds: 4,
  bath: 4,
  area: 340,
  egpM: 19.5,
  usd: 3600,
  ai: 9.3,
  tag: null,
  img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=85'
}, {
  id: 14,
  cmp: 'Taj City',
  type: 'Penthouse',
  beds: 3,
  bath: 3,
  area: 280,
  egpM: 18.0,
  usd: 3400,
  ai: 9.2,
  tag: 'Exclusive',
  img: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=600&q=85'
}, {
  id: 15,
  cmp: 'Eastown',
  type: 'Apartment',
  beds: 3,
  bath: 2,
  area: 160,
  egpM: 8.2,
  usd: 1900,
  ai: 9.0,
  tag: null,
  img: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&q=85'
}, {
  id: 16,
  cmp: 'Hyde Park',
  type: 'Twin House',
  beds: 4,
  bath: 4,
  area: 350,
  egpM: 22.0,
  usd: 4000,
  ai: 9.4,
  tag: 'Featured',
  img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=85'
}, {
  id: 17,
  cmp: 'Mivida',
  type: 'Duplex',
  beds: 3,
  bath: 3,
  area: 210,
  egpM: 9.8,
  usd: 2200,
  ai: 9.0,
  tag: null,
  img: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=85'
}, {
  id: 18,
  cmp: 'Mountain View iCity',
  type: 'Apartment',
  beds: 2,
  bath: 2,
  area: 130,
  egpM: 5.6,
  usd: 1300,
  ai: 8.9,
  tag: null,
  img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=85'
}, {
  id: 19,
  cmp: 'Uptown Cairo',
  type: 'Apartment',
  beds: 3,
  bath: 2,
  area: 175,
  egpM: 10.2,
  usd: 2300,
  ai: 9.0,
  tag: 'Smart Match',
  img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=85'
}, {
  id: 20,
  cmp: 'Al Rehab',
  type: 'Duplex',
  beds: 3,
  bath: 2,
  area: 185,
  egpM: 6.5,
  usd: 1400,
  ai: 8.5,
  tag: null,
  img: 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=600&q=85'
}, {
  id: 21,
  cmp: 'El Shorouk',
  type: 'Villa',
  beds: 4,
  bath: 3,
  area: 280,
  egpM: 10.5,
  usd: 1900,
  ai: 8.7,
  tag: null,
  img: 'https://images.unsplash.com/photo-1568605114967-8130f3a3699f?w=600&q=85'
}, {
  id: 22,
  cmp: 'Madinaty',
  type: 'Apartment',
  beds: 3,
  bath: 2,
  area: 140,
  egpM: 4.5,
  usd: 1100,
  ai: 8.8,
  tag: null,
  img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=85'
}, {
  id: 23,
  cmp: 'Palm Hills NC',
  type: 'Twin House',
  beds: 4,
  bath: 4,
  area: 310,
  egpM: 19.0,
  usd: 3400,
  ai: 9.1,
  tag: 'Best ROI',
  img: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=85'
}, {
  id: 24,
  cmp: 'Taj City',
  type: 'Villa',
  beds: 4,
  bath: 4,
  area: 400,
  egpM: 27.5,
  usd: 5000,
  ai: 9.4,
  tag: null,
  img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=85'
}, {
  id: 25,
  cmp: 'SODIC East',
  type: 'Apartment',
  beds: 2,
  bath: 2,
  area: 118,
  egpM: 6.0,
  usd: 1400,
  ai: 9.1,
  tag: null,
  img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=85'
}, {
  id: 26,
  cmp: 'Villette',
  type: 'Villa',
  beds: 5,
  bath: 5,
  area: 520,
  egpM: 32.0,
  usd: 5800,
  ai: 9.5,
  tag: 'Premium',
  img: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=600&q=85'
}];

/* ── TOUR ROOMS ── */
const ROOMS = [{
  name: 'Luxury Living Room',
  sub: 'Hyde Park · Grand Villa · 5th Settlement',
  img: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=2400&q=90'
}, {
  name: 'Master Bedroom Suite',
  sub: 'Mountain View iCity · Penthouse Level',
  img: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=2400&q=90'
}, {
  name: 'Chef\'s Kitchen',
  sub: 'Villette · Villa G-Type',
  img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2400&q=90'
}, {
  name: 'Infinity Pool & Deck',
  sub: 'Taj City · Signature Villa',
  img: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=2400&q=90'
}, {
  name: 'Rooftop Sky Terrace',
  sub: 'Uptown Cairo · Penthouse Level',
  img: 'https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?w=2400&q=90'
}, {
  name: 'Villa Grand Exterior',
  sub: 'Palm Hills NC · Corner Plot',
  img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=2400&q=90'
}];
window.LANG = LANG;
window.CPDS = CPDS;
window.UNITS = UNITS;
window.FEATURED = FEATURED;
window.ROOMS = ROOMS;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/data.js", error: String((e && e.message) || e) }); }

// ui_kits/web-app/sections.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Sierra Estates — Client Portal (mobile-first, responsive) */
const {
  useState,
  useEffect,
  useRef,
  useMemo,
  createContext,
  useContext
} = React;

/* ── HERO ── */
function Hero(props) {
  var purpose = props.purpose,
    setPurpose = props.setPurpose,
    beds = props.beds,
    setBeds = props.setBeds,
    search = props.search,
    setSearch = props.setSearch,
    onReq = props.onReq,
    filterOpen = props.filterOpen,
    setFilterOpen = props.setFilterOpen;
  var c = useApp();
  var dark = c.dark,
    lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var SLIDES = [{
    pre: 'FIRST & ONLY WEBSITE IN EGYPT DESIGNED FOR NEW CAIRO',
    main: 'The First Exclusive Destination for New Cairo Properties. Rent & Resale.',
    img: 'https://images.unsplash.com/photo-1613977257592-4a9a32f9141a?w=1200&q=90'
  }, {
    pre: 'BEST-IN-CLASS DESIGN',
    main: 'Redefining Luxury Living with AI-Driven Excellence',
    img: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200&q=90'
  }, {
    pre: 'AI-DRIVEN EXCELLENCE',
    main: 'Smart Matches for Smart Investors',
    img: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?w=1200&q=90'
  }, {
    pre: 'EXCLUSIVE NETWORK',
    main: 'Unrivaled Access to Premium Compounds',
    img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=90'
  }, {
    pre: 'CURATED PORTFOLIO',
    main: 'Your Journey to Exceptional Homes Begins Here',
    img: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=1200&q=90'
  }];
  var imgI = useState(0);
  var setImgI = imgI[1];
  imgI = imgI[0];
  useEffect(function () {
    SLIDES.forEach(function (sl) {
      var im = new Image();
      im.src = sl.img;
    });
    var id = setInterval(function () {
      setImgI(function (i) {
        return (i + 1) % SLIDES.length;
      });
    }, 3200);
    return function () {
      clearInterval(id);
    };
  }, []);
  return /*#__PURE__*/React.createElement("section", {
    id: "s-hero",
    style: {
      position: 'relative',
      background: '#00131f',
      minHeight: 380,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      padding: '18px 0 0',
      overflow: 'hidden'
    }
  }, SLIDES.map(function (sl, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url(' + sl.img + ')',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: i === imgI ? 1 : 0,
        transition: 'opacity .5s ease',
        zIndex: 0
      }
    });
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(172deg,rgba(0,10,25,.95) 0%,rgba(0,25,55,.72) 50%,rgba(0,0,0,.2) 100%)',
      zIndex: 0,
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "hero-inner",
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-gold.png",
    alt: "Sierra Estates",
    style: {
      position: 'absolute',
      top: 6,
      left: 20,
      width: 88,
      height: 88,
      objectFit: 'contain',
      opacity: .22,
      pointerEvents: 'none',
      zIndex: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px',
      marginBottom: 14,
      direction: 'ltr'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 1.5,
      background: G,
      display: 'block',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "hero-eye",
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 6.5,
      color: G,
      letterSpacing: '.16em',
      textTransform: 'uppercase',
      lineHeight: 1.5
    }
  }, SLIDES[imgI].pre)), /*#__PURE__*/React.createElement("h1", {
    className: "hero-h1",
    style: {
      fontFamily: HEADING_FONT,
      fontSize: 28,
      fontWeight: 500,
      lineHeight: 1.1,
      marginBottom: 14,
      color: '#fff',
      textShadow: '0 2px 26px rgba(0,0,0,.88), 0 0 56px rgba(200,150,26,.3)',
      letterSpacing: '-.01em'
    }
  }, SLIDES[imgI].main), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 5,
      alignItems: 'center'
    }
  }, SLIDES.map(function (sl, i) {
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: function () {
        setImgI(i);
      },
      style: {
        height: 3,
        width: i === imgI ? 24 : 7,
        borderRadius: 2,
        background: i === imgI ? G : 'rgba(255,255,255,.3)',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        transition: 'all .4s cubic-bezier(.16,1,.3,1)'
      }
    });
  }))), /*#__PURE__*/React.createElement("div", {
    className: "hero-filter",
    style: {
      padding: '0 20px',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 3,
      background: 'rgba(7,21,36,.65)',
      backdropFilter: 'blur(14px)',
      border: '1px solid rgba(200,150,26,.3)',
      borderRadius: 11,
      padding: 3,
      flex: 1
    }
  }, [['resale', isAr ? 'بيع' : 'Resale'], ['rent', isAr ? 'إيجار' : 'Rent']].map(function (p) {
    return /*#__PURE__*/React.createElement("button", {
      key: p[0],
      onClick: function () {
        setPurpose(p[0]);
      },
      style: {
        flex: 1,
        padding: '9px 4px',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        border: 'none',
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
        transition: 'all .22s cubic-bezier(.4,0,.2,1)',
        background: purpose === p[0] ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'transparent',
        color: purpose === p[0] ? N : 'rgba(255,255,255,.55)'
      }
    }, p[1]);
  })), /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setFilterOpen(true);
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '11px 16px',
      borderRadius: 11,
      background: 'linear-gradient(135deg,' + G + ',' + GL + ')',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 4px 18px rgba(200,150,26,.4)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: N,
    strokeWidth: "2.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 6h16M7 12h10M10 18h4"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 900,
      color: N,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, isAr ? 'فلتر' : 'Filters')))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingBottom: 18,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: function (e) {
      var el = document.getElementById('s-map');
      var sc = document.getElementById('root-scroll');
      if (el && sc) sc.scrollTo({
        top: el.offsetTop - 60,
        behavior: 'smooth'
      });
      emitParticles(e.clientX, e.clientY);
    },
    style: {
      padding: '9px 28px',
      borderRadius: 50,
      background: 'rgba(7,21,36,.72)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      border: '1px solid rgba(200,150,26,.45)',
      color: 'rgba(200,150,26,.95)',
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer',
      fontFamily: 'Inter',
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      letterSpacing: '.06em',
      boxShadow: '0 0 18px rgba(200,150,26,.22)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "10",
    r: "3"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      background: 'linear-gradient(90deg,rgba(200,150,26,.75) 0%,' + G + ' 55%,' + GL + ' 100%)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent'
    }
  }, "View Map")), /*#__PURE__*/React.createElement("div", {
    className: "text",
    style: {
      position: 'absolute',
      left: '50%',
      top: '100%',
      transform: 'translateX(-50%)',
      marginTop: 6,
      textAlign: 'center',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("h4", {
    className: "braces",
    style: {
      margin: 0,
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8,
      fontWeight: 600,
      letterSpacing: '.08em',
      color: 'rgba(200,150,26,.55)',
      whiteSpace: 'nowrap'
    }
  }, "click for particles"))), /*#__PURE__*/React.createElement("div", {
    id: "emitter",
    style: {
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 300,
      overflow: 'hidden'
    }
  })));
}
window.emitParticles = emitParticles;
function emitParticles(x, y) {
  var host = document.getElementById('emitter');
  if (!host) return;
  var colors = [G, GL, '#ffffff'];
  for (var i = 0; i < 18; i++) {
    var p = document.createElement('span');
    var ang = Math.random() * Math.PI * 2;
    var dist = 40 + Math.random() * 90;
    var dx = Math.cos(ang) * dist;
    var dy = Math.sin(ang) * dist;
    var sz = 3 + Math.random() * 4;
    p.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + sz + 'px;height:' + sz + 'px;border-radius:50%;background:' + colors[i % colors.length] + ';box-shadow:0 0 6px ' + colors[i % colors.length] + ';transform:translate(-50%,-50%);opacity:1;transition:transform .7s cubic-bezier(.16,1,.3,1),opacity .7s ease;';
    host.appendChild(p);
    requestAnimationFrame(function (el, ddx, ddy) {
      return function () {
        el.style.transform = 'translate(calc(-50% + ' + ddx + 'px),calc(-50% + ' + ddy + 'px))';
        el.style.opacity = '0';
      };
    }(p, dx, dy));
    (function (el) {
      setTimeout(function () {
        el.remove();
      }, 750);
    })(p);
  }
}

/* ── LISTINGS ── */ /* ── LISTINGS ── */
function Listings(props) {
  var purpose = props.purpose,
    search = props.search,
    beds = props.beds,
    onTap = props.onTap,
    saved = props.saved,
    onSave = props.onSave;
  var c = useApp();
  var dark = c.dark,
    lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var C = th(dark);
  var sort = useState('ai');
  var setSort = sort[1];
  sort = sort[0];
  var cmpF = useState(new Set());
  var setCmpF = cmpF[1];
  cmpF = cmpF[0];
  var cmpOpen = useState(false);
  var setCmpOpen = cmpOpen[1];
  cmpOpen = cmpOpen[0];
  var rv = useScrollAnim(60);
  var ref = rv[0],
    vis = rv[1];
  var pg = useState(0);
  var page = pg[0],
    setPage = pg[1];
  var dxs = useState(0);
  var dragX = dxs[0],
    setDragX = dxs[1];
  var swRef = useRef({
    on: false,
    sx: 0,
    dx: 0
  });
  var sq = useState(search || '');
  var searchQ = sq[0],
    setSearchQ = sq[1];
  useEffect(function () {
    setSearchQ(search || '');
  }, [search]);
  var q = (searchQ || '').trim();
  var items = useMemo(function () {
    var l = FEATURED.slice();
    if (cmpF.size > 0) l = l.filter(function (x) {
      return cmpF.has(x.cmp);
    });
    if (q) {
      var qq = q.toLowerCase();
      l = l.filter(function (x) {
        return x.cmp.toLowerCase().indexOf(qq) >= 0 || x.type.toLowerCase().indexOf(qq) >= 0 || (x.beds + 'b').indexOf(qq) >= 0;
      });
    }
    if (beds != null && beds > 0) l = l.filter(function (x) {
      return x.beds === beds;
    });
    if (sort === 'ai') l.sort(function (a, b) {
      return b.ai - a.ai;
    });else if (sort === 'px') l.sort(function (a, b) {
      return a.egpM - b.egpM;
    });else if (sort === 'pd') l.sort(function (a, b) {
      return b.egpM - a.egpM;
    });else l.sort(function (a, b) {
      return b.area - a.area;
    });
    return l;
  }, [purpose, q, beds, sort, cmpF.size]);
  var PER = 4;
  var pages = Math.max(1, Math.ceil(items.length / PER));
  useEffect(function () {
    setPage(0);
  }, [q, beds, sort, cmpF.size, purpose]);
  var pageSafe = Math.min(page, pages - 1);
  var shown = items.slice(pageSafe * PER, pageSafe * PER + PER);
  function priceStr(item) {
    return purpose === 'rent' ? '$' + item.usd.toLocaleString() + '/mo' : 'EGP ' + item.egpM + 'M';
  }
  function swDown(e) {
    var p = e.touches ? e.touches[0] : e;
    swRef.current = {
      on: true,
      sx: p.clientX,
      dx: 0
    };
  }
  function swMove(e) {
    if (!swRef.current.on) return;
    var p = e.touches ? e.touches[0] : e;
    var dx = p.clientX - swRef.current.sx;
    if (pageSafe === 0 && dx > 0 || pageSafe >= pages - 1 && dx < 0) dx *= 0.3;
    swRef.current.dx = dx;
    setDragX(dx);
  }
  function swUp() {
    if (!swRef.current.on) return;
    var dx = swRef.current.dx;
    swRef.current.on = false;
    if (dx < -60 && pageSafe < pages - 1) setPage(pageSafe + 1);else if (dx > 60 && pageSafe > 0) setPage(pageSafe - 1);
    setDragX(0);
  }
  var Mo = (window.Motion || {}).motion;
  function cardGrid(item, i) {
    var isGold = item.tag === 'Premium' || item.tag === 'Exclusive';
    var Wrap = Mo ? Mo.div : 'div';
    var motionProps = Mo ? {
      initial: {
        opacity: 0,
        y: 22,
        scale: .96
      },
      whileInView: {
        opacity: 1,
        y: 0,
        scale: 1
      },
      viewport: {
        once: true,
        amount: .3
      },
      transition: {
        duration: .45,
        delay: i % 4 * .06,
        ease: 'easeOut'
      },
      whileHover: {
        y: -5,
        boxShadow: '0 14px 34px rgba(13,32,53,.18)'
      },
      whileTap: {
        scale: .97
      }
    } : {};
    return /*#__PURE__*/React.createElement(Wrap, _extends({
      key: item.id,
      onClick: function () {
        if (Math.abs(swRef.current.dx) > 8) return;
        onTap(item);
      },
      style: {
        background: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(13,32,53,.08)',
        cursor: 'pointer',
        boxShadow: '0 3px 16px rgba(13,32,53,.08)'
      }
    }, motionProps), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        height: 150
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: item.img,
      alt: "",
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        pointerEvents: 'none'
      },
      draggable: "false",
      loading: "lazy"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top,rgba(13,32,53,.55),transparent 50%)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 9,
        left: 9,
        background: 'rgba(7,21,36,.85)',
        border: '1px solid rgba(200,150,26,.45)',
        borderRadius: 20,
        padding: '2px 9px',
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 9,
        fontWeight: 700,
        color: G
      }
    }, "\u25B2 ", item.ai), item.tag && /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 9,
        right: 34,
        padding: '2px 9px',
        borderRadius: 20,
        fontSize: 9,
        fontWeight: 900,
        textTransform: 'uppercase',
        background: isGold ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'rgba(7,21,36,.85)',
        color: isGold ? N : 'rgba(200,150,26,.9)',
        border: isGold ? 'none' : '1px solid rgba(200,150,26,.3)'
      }
    }, item.tag), /*#__PURE__*/React.createElement("button", {
      onClick: function (e) {
        e.stopPropagation();
        onSave(item.id);
      },
      style: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 26,
        height: 26,
        borderRadius: '50%',
        background: 'rgba(0,0,0,.3)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        color: saved.has(item.id) ? '#ef4444' : 'rgba(255,255,255,.7)'
      }
    }, saved.has(item.id) ? '♥' : '♡')), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '10px 12px 12px',
        direction: isAr ? 'rtl' : 'ltr'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 8,
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        color: N,
        marginBottom: 2
      }
    }, item.cmp), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
        fontSize: 14,
        fontWeight: 600,
        color: N,
        lineHeight: 1.2,
        marginBottom: 3
      }
    }, item.beds, "B ", item.type), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 8.5,
        color: '#8A94A0',
        marginBottom: 5
      }
    }, item.bath, " BA \xB7 ", item.area, " m\xB2"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 13,
        fontWeight: 700,
        color: G
      }
    }, priceStr(item))));
  }
  var cmpLabel = cmpF.size === 0 ? t.allCpd : cmpF.size === 1 ? cmpF.size + t.nSel : cmpF.size + t[' nSelP'];
  return /*#__PURE__*/React.createElement("section", {
    id: "s-listings",
    style: {
      background: C.bg,
      paddingBottom: 4,
      transition: 'background .3s',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(MorphBlob, {
    size: 480,
    opacity: dark ? .14 : .08,
    style: {
      top: -140,
      right: -160
    }
  }), /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: "sec-inner",
    style: {
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(20px)',
      transition: 'all .55s .1s cubic-bezier(.16,1,.3,1)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px 0',
      flexDirection: isAr ? 'row-reverse' : 'row'
    }
  }, /*#__PURE__*/React.createElement(SH, {
    eye: t.eyeList,
    title: t.propTit + ' (' + items.length + ')'
  }), /*#__PURE__*/React.createElement("select", {
    value: sort,
    onChange: function (e) {
      setSort(e.target.value);
    },
    style: {
      marginTop: 12,
      padding: '6px 10px',
      borderRadius: 8,
      background: dark ? '#1A2C3F' : '#fff',
      border: '1px solid ' + (dark ? 'rgba(200,150,26,.3)' : 'rgba(13,32,53,.15)'),
      fontSize: 10,
      fontWeight: 600,
      color: dark ? G : N,
      outline: 'none',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      flexShrink: 0,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "ai"
  }, "AI \u2193"), /*#__PURE__*/React.createElement("option", {
    value: "px"
  }, "Price \u2191"), /*#__PURE__*/React.createElement("option", {
    value: "pd"
  }, "Price \u2193"), /*#__PURE__*/React.createElement("option", {
    value: "area"
  }, "Area"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 20px 8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '13px 16px',
      borderRadius: 14,
      border: '1px solid ' + (q ? G : dark ? 'rgba(200,150,26,.25)' : 'rgba(13,32,53,.12)'),
      background: dark ? '#122436' : '#fff',
      boxShadow: '0 3px 16px rgba(13,32,53,.06)',
      flexDirection: isAr ? 'row-reverse' : 'row'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 17,
      color: q ? G : '#8A94A0'
    }
  }, "\u2315"), /*#__PURE__*/React.createElement("input", {
    value: searchQ,
    onChange: function (e) {
      setSearchQ(e.target.value);
    },
    placeholder: isAr ? 'ابحث عن كومباوند، نوع الوحدة...' : 'Search compound, type, beds…',
    style: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontSize: 15,
      fontWeight: 500,
      color: dark ? '#EAF0F6' : N,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      textAlign: isAr ? 'right' : 'left',
      minWidth: 0
    }
  }), searchQ && /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setSearchQ('');
    },
    style: {
      fontSize: 16,
      color: '#8A94A0',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      lineHeight: 1,
      padding: 0
    }
  }, "\xD7")), q && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 11,
      color: C.txM,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      textAlign: isAr ? 'right' : 'left'
    }
  }, isAr ? 'نتائج لـ ' : 'Results for ', /*#__PURE__*/React.createElement("span", {
    style: {
      color: G,
      fontWeight: 700
    }
  }, "\u201C", q, "\u201D"), " \u2014 ", items.length, " ", isAr ? 'وحدة' : items.length === 1 ? 'unit' : 'units')), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px 10px',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: function (e) {
      e.stopPropagation();
      setCmpOpen(function (o) {
        return !o;
      });
    },
    style: {
      width: '100%',
      padding: '8px 12px',
      borderRadius: 9,
      border: '1px solid ' + (cmpF.size > 0 ? G : 'rgba(13,32,53,.12)'),
      background: cmpF.size > 0 ? 'rgba(200,150,26,.07)' : 'rgba(13,32,53,.03)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
      fontFamily: 'Inter',
      transition: 'all .2s'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10.5,
      fontWeight: 600,
      color: cmpF.size > 0 ? G : '#8A94A0'
    }
  }, cmpLabel), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, cmpF.size > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: function (e) {
      e.stopPropagation();
      setCmpF(new Set());
    },
    style: {
      fontSize: 13,
      color: '#8A94A0',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      lineHeight: 1
    }
  }, "\xD7"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: '#8A94A0'
    }
  }, "\u25BE"))), cmpOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 'calc(100% - 2px)',
      left: 20,
      right: 20,
      zIndex: 20,
      background: '#fff',
      border: '1px solid rgba(13,32,53,.12)',
      borderRadius: 11,
      boxShadow: '0 8px 32px rgba(13,32,53,.14)',
      padding: '8px',
      maxHeight: 180,
      overflowY: 'auto'
    },
    onClick: function (e) {
      e.stopPropagation();
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      flexWrap: 'wrap'
    }
  }, CPDS.map(function (cpd, i) {
    var on = cmpF.has(cpd.n);
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: function () {
        setCmpF(function (p) {
          var s = new Set(p);
          if (s.has(cpd.n)) s.delete(cpd.n);else s.add(cpd.n);
          return s;
        });
      },
      style: {
        padding: '3px 9px',
        borderRadius: 20,
        fontSize: 9,
        fontWeight: 600,
        cursor: 'pointer',
        border: '1px solid',
        fontFamily: 'Inter',
        transition: 'all .15s',
        whiteSpace: 'nowrap',
        borderColor: on ? G : 'rgba(13,32,53,.12)',
        background: on ? N : 'transparent',
        color: on ? G : '#8A94A0'
      }
    }, on ? '✓ ' : '', cpd.n);
  })))), items.length > 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: 'hidden',
      padding: '4px 0 0',
      touchAction: 'pan-y'
    },
    onMouseDown: swDown,
    onMouseMove: swMove,
    onMouseUp: swUp,
    onMouseLeave: swUp,
    onTouchStart: swDown,
    onTouchMove: swMove,
    onTouchEnd: swUp
  }, /*#__PURE__*/React.createElement("div", {
    className: "cards-grid",
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
      padding: '0 20px',
      transform: 'translateX(' + dragX + 'px)',
      transition: swRef.current.on ? 'none' : 'transform .35s cubic-bezier(.16,1,.3,1)',
      cursor: pages > 1 ? 'grab' : 'default'
    }
  }, shown.map(function (item, i) {
    return cardGrid(item, i);
  }))) : /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '30px',
      color: '#8A94A0',
      fontSize: 12,
      textAlign: 'center',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, isAr ? 'لا توجد نتائج.' : 'No matches.'), pages > 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      padding: '14px 20px 0'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setPage(Math.max(0, pageSafe - 1));
    },
    disabled: pageSafe === 0,
    style: {
      padding: '8px 20px',
      borderRadius: 20,
      border: '1px solid rgba(13,32,53,.15)',
      background: 'transparent',
      color: pageSafe === 0 ? '#B7C0CB' : N,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      cursor: pageSafe === 0 ? 'default' : 'pointer',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      opacity: pageSafe === 0 ? .5 : 1
    }
  }, isAr ? 'السابق' : 'Prev'), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 11,
      fontWeight: 700,
      color: C.txM
    }
  }, pageSafe + 1, " / ", pages), /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setPage(Math.min(pages - 1, pageSafe + 1));
    },
    disabled: pageSafe >= pages - 1,
    style: {
      padding: '8px 20px',
      borderRadius: 20,
      border: 'none',
      background: pageSafe >= pages - 1 ? 'rgba(13,32,53,.3)' : N,
      color: G,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      cursor: pageSafe >= pages - 1 ? 'default' : 'pointer',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      opacity: pageSafe >= pages - 1 ? .5 : 1
    }
  }, isAr ? 'التالي' : 'Next')), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 20px 22px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '12px',
      borderRadius: 10,
      background: N,
      color: 'rgba(200,150,26,.9)',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      border: 'none',
      cursor: 'pointer',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, t.viewAll, " Units \u2192"))));
}

/* ── MAP ── */
function MapSec(props) {
  var onCpdTap = props.onCpdTap,
    onFilters = props.onFilters,
    purpose = props.purpose,
    onOffer = props.onOffer;
  var c = useApp();
  var dark = c.dark,
    lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var C = th(dark);
  var mapRef = useRef(null);
  var leafRef = useRef(null);
  var markersRef = useRef([]);
  var landmarkRef = useRef([]);
  var rv = useScrollAnim(50);
  var ref = rv[0],
    vis = rv[1];
  var DEFAULT_SEL = ['Hyde Park New Cairo', 'Mountain View iCity', 'Mivida'];
  var selS = useState(DEFAULT_SEL);
  var setSel = selS[1];
  var sel = selS[0];
  var HAS_UNITS = CPDS.filter(function (x) {
    return (UNITS[x.n] || []).length > 0;
  });
  var LANDMARKS = [{
    n: isAr ? 'الجامعة الأمريكية' : 'AUC — American Univ.',
    c: [30.0189, 31.4991],
    ic: '🎓'
  }, {
    n: isAr ? 'كايرو فيستيفال سيتي' : 'Cairo Festival City',
    c: [30.0287, 31.4061],
    ic: '🛍️'
  }, {
    n: isAr ? 'مطار القاهرة' : 'Cairo Intl. Airport',
    c: [30.1219, 31.4056],
    ic: '✈️'
  }, {
    n: isAr ? 'وسط البلد' : 'Downtown Cairo',
    c: [30.0444, 31.2357],
    ic: '🏛️'
  }];
  function priceStr(cpd) {
    return purpose === 'rent' ? '$' + cpd.rent.toLocaleString() + '/mo' : 'EGP ' + cpd.priceM + 'M';
  }

  /* Init map once */
  useEffect(function () {
    if (!mapRef.current || leafRef.current) return;
    var LL = window.L;
    if (!LL || typeof LL.map !== 'function') return;
    var map = LL.map(mapRef.current, {
      center: [30.03, 31.58],
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false
    });
    LL.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);
    LL.control.zoom({
      position: 'bottomright'
    }).addTo(map);
    leafRef.current = map;
    /* Landmark POIs — one-time */
    LANDMARKS.forEach(function (lm) {
      var lmHtml = '<div class="s-landmark"></div>';
      var icon = LL.divIcon({
        className: '',
        html: lmHtml,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      var mk = LL.marker(lm.c, {
        icon: icon,
        zIndexOffset: -100
      }).addTo(map);
      mk.bindTooltip(lm.n, {
        permanent: false,
        direction: 'top',
        className: 's-landmark-tip'
      });
      landmarkRef.current.push(mk);
    });
    setTimeout(function () {
      try {
        map.invalidateSize();
      } catch (e) {}
    }, 200);
    return function () {
      try {
        map.remove();
      } catch (e) {}
      leafRef.current = null;
    };
  }, []);

  /* Sync markers with selection */
  useEffect(function () {
    var map = leafRef.current;
    var LL = window.L;
    if (!map || !LL) return;
    markersRef.current.forEach(function (m) {
      try {
        map.removeLayer(m);
      } catch (e) {}
    });
    markersRef.current = [];
    var pts = [];
    sel.forEach(function (name, si) {
      var cpd = CPDS.find(function (x) {
        return x.n === name;
      });
      if (!cpd) return;
      var cnt = (UNITS[cpd.n] || []).length;
      var pr = priceStr(cpd);
      var mHtml, icon;
      if (si === 0) {
        /* Primary compound: black teardrop pin (reference style) */
        mHtml = '<div class="s-marker"><div class="s-tear"><span class="s-tear-hole"></span></div></div>';
        icon = LL.divIcon({
          className: '',
          html: mHtml,
          iconSize: [40, 40],
          iconAnchor: [20, 40]
        });
      } else {
        mHtml = '<div class="s-marker"><span class="s-dot"></span><span class="s-line"></span><span class="s-lbl">' + cpd.n + ' · ' + cnt + ' · ' + pr + '</span></div>';
        icon = LL.divIcon({
          className: '',
          html: mHtml,
          iconSize: [180, 16],
          iconAnchor: [6, 8]
        });
      }
      var mk = LL.marker(cpd.c, {
        icon: icon
      }).addTo(map);
      mk.on('click', function () {
        onCpdTap(cpd);
      });
      markersRef.current.push(mk);
      pts.push(cpd.c);
    });
    if (pts.length > 0) {
      try {
        map.fitBounds(pts, {
          padding: [50, 50],
          maxZoom: 13
        });
      } catch (e) {}
    }
  }, [sel.join('|'), purpose]);
  function toggle(name) {
    setSel(function (s) {
      return s.indexOf(name) >= 0 ? s.filter(function (x) {
        return x !== name;
      }) : s.concat([name]);
    });
  }
  return /*#__PURE__*/React.createElement("section", {
    id: "s-map",
    style: {
      background: C.bg,
      transition: 'background .3s',
      paddingBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: "sec-inner",
    style: {
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(20px)',
      transition: 'all .55s cubic-bezier(.16,1,.3,1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 20px 12px',
      direction: isAr ? 'rtl' : 'ltr'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
      flexDirection: isAr ? 'row-reverse' : 'row'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 10,
      height: 10,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: '50%',
      border: '1.5px solid ' + G,
      animation: 'radarPing 2s ease-out infinite'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: G,
      position: 'absolute',
      top: 2,
      left: 2,
      boxShadow: '0 0 6px ' + G,
      animation: 'blink 2s ease infinite'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 7.5,
      letterSpacing: '.22em',
      color: G,
      textTransform: 'uppercase'
    }
  }, t.eyeMap)), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
      fontSize: isAr ? 22 : 26,
      fontWeight: isAr ? 700 : 400,
      color: dark ? '#F0EDE5' : N,
      lineHeight: 1.1,
      marginBottom: 4
    }
  }, isAr ? 'خريطة الكمبوندات' : 'Compound Map'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: dark ? 'rgba(255,255,255,.35)' : 'rgba(13,32,53,.4)',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, isAr ? 'اضغط على أي علامة لعرض الوحدات المتاحة' : 'Tap any marker to browse its units')), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px 10px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onFilters,
    style: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '11px',
      borderRadius: 11,
      background: 'linear-gradient(135deg,' + G + ',' + GL + ')',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 4px 16px rgba(200,150,26,.3)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: N,
    strokeWidth: "2.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 6h16M7 12h10M10 18h4"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11.5,
      fontWeight: 900,
      color: N,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, isAr ? 'الفلتر الذكي · ' + (purpose === 'rent' ? 'إيجار' : 'بيع') : 'Smart Filter · ' + (purpose === 'rent' ? 'Rent' : 'Resale')))), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto',
      paddingBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      padding: '0 20px',
      width: 'max-content'
    }
  }, HAS_UNITS.map(function (cpd) {
    var on = sel.indexOf(cpd.n) >= 0;
    var cnt = (UNITS[cpd.n] || []).length;
    return /*#__PURE__*/React.createElement("button", {
      key: cpd.n,
      onClick: function () {
        toggle(cpd.n);
      },
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid',
        fontFamily: 'Inter',
        transition: 'all .18s',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        borderColor: on ? G : dark ? 'rgba(255,255,255,.14)' : 'rgba(13,32,53,.14)',
        background: on ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : dark ? 'rgba(255,255,255,.04)' : '#fff',
        color: on ? N : dark ? 'rgba(255,255,255,.55)' : '#5A6472'
      }
    }, cpd.n, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 8,
        fontWeight: 800,
        padding: '1px 6px',
        borderRadius: 10,
        background: on ? 'rgba(13,32,53,.18)' : 'rgba(200,150,26,.14)',
        color: on ? N : G
      }
    }, cnt));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '0 16px',
      borderRadius: 18,
      overflow: 'hidden',
      border: '1.5px solid ' + (dark ? 'rgba(200,150,26,.28)' : 'rgba(13,32,53,.12)'),
      boxShadow: '0 10px 36px rgba(13,32,53,.22)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: mapRef,
    style: {
      height: 340,
      width: '100%',
      background: '#F4EFE6'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 10,
      left: 10,
      zIndex: 400,
      background: '#141414',
      border: 'none',
      borderRadius: 2,
      padding: '6px 11px',
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: '#4ade80',
      display: 'block',
      animation: 'blink 2s ease infinite'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
      fontSize: 8,
      letterSpacing: '.12em',
      color: '#fff',
      fontWeight: 700,
      textTransform: 'uppercase'
    }
  }, sel.length, " ", isAr ? 'كمبوند' : 'COMPOUNDS', " \xB7 ", isAr ? 'مباشر' : 'LIVE')), /*#__PURE__*/React.createElement("button", {
    onClick: onOffer,
    style: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 400,
      background: '#141414',
      color: '#fff',
      border: '1.5px solid #fff',
      borderRadius: 3,
      padding: '9px 18px',
      fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: '.06em',
      textTransform: 'uppercase',
      cursor: 'pointer',
      boxShadow: '0 4px 14px rgba(0,0,0,.3)'
    }
  }, isAr ? 'احصل على عرض' : 'GET OFFER')), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 20px 0',
      textAlign: 'center',
      fontSize: 9.5,
      color: dark ? 'rgba(255,255,255,.3)' : 'rgba(13,32,53,.35)',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, isAr ? '👆 اضغط على العلامة لفتح قائمة الوحدات' : '👆 Tap a marker to open the unit list')));
}

/* ── MARKET TICKER (from Sierra-Estates-Final motion build) ── */
function Ticker() {
  var c = useApp();
  var dark = c.dark,
    lang = c.lang;
  var isAr = lang === 'ar';
  var items = isAr ? ['ماونتن فيو آي سيتي +24%', 'أب تاون كايرو +31%', 'ميفيدا إيجارات من $1,700/شهر', 'هايد بارك تقييم AI 9.8', 'الرحاب عائد إيجاري 8.1%', 'مدينتي طلب متزايد'] : ['Mountain View iCity +24%', 'Uptown Cairo +31%', 'Mivida rentals from $1,700/mo', 'Hyde Park AI score 9.8', 'Al Rehab rental yield 8.1%', 'Madinaty demand rising'];
  var row = items.concat(items);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: dark ? '#050E18' : '#141414',
      borderTop: '1px solid ' + (dark ? 'rgba(200,150,26,.2)' : 'transparent'),
      borderBottom: '1px solid ' + (dark ? 'rgba(200,150,26,.2)' : 'transparent'),
      overflow: 'hidden',
      padding: '9px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 0,
      width: 'max-content',
      animation: 'tickerMove 26s linear infinite'
    }
  }, row.map(function (s, i) {
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 18px',
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 9,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        color: GL,
        whiteSpace: 'nowrap'
      }
    }, s, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 4,
        height: 4,
        borderRadius: '50%',
        background: G,
        display: 'inline-block',
        opacity: .7
      }
    }));
  })));
}

/* ── VIRTUAL TOUR ── */
function TourSec() {
  var c = useApp();
  var dark = c.dark,
    lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var C = th(dark);
  var openS = useState(false);
  var setOpen = openS[1];
  var open = openS[0];
  var rv = useScrollAnim(60);
  var ref = rv[0],
    vis = rv[1];
  return /*#__PURE__*/React.createElement("section", {
    id: "s-tour",
    style: {
      background: dark ? '#050E18' : '#F4F6F8',
      transition: 'background .3s',
      paddingBottom: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: "sec-inner",
    style: {
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(20px)',
      transition: 'all .55s cubic-bezier(.16,1,.3,1)'
    }
  }, /*#__PURE__*/React.createElement(SH, {
    eye: t.eyeTour,
    title: t.tourTit
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto',
      paddingBottom: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 9,
      padding: '0 20px',
      width: 'max-content'
    }
  }, ROOMS.map(function (rm, i) {
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: function () {
        setOpen(true);
      },
      style: {
        position: 'relative',
        width: 148,
        height: 104,
        borderRadius: 14,
        overflow: 'hidden',
        border: '2px solid transparent',
        cursor: 'pointer',
        flexShrink: 0,
        padding: 0
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: rm.img,
      alt: rm.name,
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
      },
      loading: "lazy"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top,rgba(7,17,30,.88) 0%,transparent 55%)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '8px 10px',
        textAlign: 'left'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
        fontSize: 11,
        fontWeight: isAr ? 600 : 400,
        color: '#fff',
        lineHeight: 1.2
      }
    }, rm.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 6.5,
        color: G,
        letterSpacing: '.1em',
        marginTop: 2,
        opacity: .8
      }
    }, "TAP TO EXPLORE")), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 8,
        right: 8,
        background: 'rgba(200,150,26,.88)',
        borderRadius: 20,
        padding: '2px 7px',
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 7.5,
        fontWeight: 700,
        color: N
      }
    }, "360\xB0"));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 20px 22px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setOpen(true);
    },
    style: {
      width: '100%',
      padding: '14px 18px',
      borderRadius: 14,
      background: 'linear-gradient(135deg,' + N + ',#1A3354)',
      border: '1px solid rgba(200,150,26,.35)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontFamily: 'inherit'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#C8961A",
    strokeWidth: "2"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2 12h20"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: isAr ? 'right' : 'left',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: '#fff',
      letterSpacing: '.03em'
    }
  }, isAr ? 'ابدأ الجولة الثلاثية الأبعاد' : 'Launch 3D Virtual Tour'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: G,
      fontFamily: 'Inter',
      marginTop: 2,
      opacity: .75
    }
  }, isAr ? 'Three.js · 360° · 6 गرف' : 'Three.js · 360° drag · 6 rooms')), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#C8961A",
    strokeWidth: "2.5"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "5 3 19 12 5 21 5 3"
  }))))), open && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 500,
      background: '#07111E'
    }
  }, /*#__PURE__*/React.createElement("iframe", {
    src: "virtual-tour.html",
    style: {
      width: '100%',
      height: '100%',
      border: 'none',
      display: 'block'
    },
    title: "Sierra Estates Virtual Tour",
    allow: "fullscreen"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setOpen(false);
    },
    style: {
      position: 'absolute',
      top: 14,
      right: 14,
      width: 38,
      height: 38,
      borderRadius: '50%',
      background: 'rgba(7,17,30,.92)',
      border: '1px solid rgba(200,150,26,.45)',
      color: G,
      fontSize: 20,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      lineHeight: 1
    }
  }, "\xD7")));
}

/* ── AI HUB ── */
function AIHub(props) {
  var onTool = props.onTool;
  var onMap = props.onMap;
  var onContact = props.onContact;
  var c = useApp();
  var dark = c.dark,
    lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var C = th(dark);
  var rv = useScrollAnim(60);
  var ref = rv[0],
    vis = rv[1];
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
  var tools = [{
    k: 'engine',
    label: isAr ? 'محرك الذكاء 3.0' : 'AI Engine 3.0',
    sub: isAr ? 'نموذج AVM لتحليل الأسعار والعائد في الوقت الفعلي' : 'Real-time AVM pricing, ROI signals & Q2 2026 market data',
    live: true,
    accent: '#C8961A'
  }, {
    k: 'match',
    label: isAr ? 'التوافق الذكي' : 'Smart Match',
    sub: isAr ? 'مطابقة دقيقة بالذكاء الاصطناعي' : 'AI pairs your criteria to the perfect listing',
    accent: '#4ade80'
  }, {
    k: 'roi',
    label: isAr ? 'تحليل العائد' : 'ROI Analysis',
    sub: isAr ? 'قوائم العائد وحاسبة الاستثمار' : 'Yield leaderboard, cap rate & cashflow',
    accent: '#f59e0b'
  }, {
    k: 'price',
    label: isAr ? 'تسعير دقيق' : 'Precise Pricing',
    sub: isAr ? 'نطاق السعر العادل بالسوق' : 'AVM-calibrated fair-market price range',
    accent: '#a78bfa'
  }, {
    k: 'dream',
    label: isAr ? 'منزل الأحلام' : 'Dream Home Finder',
    sub: isAr ? 'أجب على 4 أسئلة واكتشف مركبك' : '4 questions → your compound match',
    accent: '#f472b6'
  }, {
    k: 'imap',
    label: isAr ? 'خريطة الذكاء' : 'Intelligence Map',
    sub: isAr ? 'خريطة تفاعلية لكل الكمبوندات والوحدات في القاهرة الجديدة' : 'Live compound map — tap any pin to explore units & prices',
    accent: '#C8961A'
  }, {
    k: 'tour',
    label: isAr ? 'جولة افتراضية' : 'Virtual Tour',
    sub: isAr ? 'جولة 360° في أفضل الشقق والفيلات' : '360° immersive walkthrough of top units',
    accent: '#38bdf8'
  }];
  return /*#__PURE__*/React.createElement("section", {
    id: "s-ai",
    style: {
      background: '#07121E',
      paddingBottom: 32,
      transition: 'background .3s',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(MorphBlob, {
    size: 520,
    opacity: .12,
    color1: "#C8961A",
    color2: "#8B4A1E",
    style: {
      top: -160,
      left: '50%',
      marginLeft: -260
    }
  }), /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: "sec-inner",
    style: {
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(20px)',
      transition: 'all .55s cubic-bezier(.16,1,.3,1)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '28px 20px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 9,
      letterSpacing: '.2em',
      textTransform: 'uppercase',
      color: '#C8961A',
      marginBottom: 6,
      opacity: .7
    }
  }, isAr ? '7 أدوات · مباشر' : 'AI · 7 TOOLS ONLINE'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
      fontSize: isAr ? 26 : 30,
      fontWeight: isAr ? 700 : 400,
      color: '#fff',
      lineHeight: 1.1,
      marginBottom: 6
    }
  }, isAr ? 'أول نظام ذكاء عقاري في الشرق الأوسط' : 'First AI Real Estate Ecosystem in the Middle East'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'Inter',
      fontSize: 11,
      color: 'rgba(255,255,255,.38)',
      lineHeight: 1.55
    }
  }, isAr ? 'أدوات ذكاء اصطناعي حية لكل خطوة في رحلتك العقارية' : 'Live AI tools for every step of your property journey')), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '18px 20px 18px',
      height: 1,
      background: 'linear-gradient(90deg,transparent,#C8961A,transparent)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: -3,
      left: 0,
      right: 0,
      height: 7,
      background: 'linear-gradient(90deg,transparent,rgba(200,150,26,.22),transparent)',
      animation: 'scanLine 3s linear infinite'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: 'hidden',
      borderTop: '1px solid rgba(200,150,26,.1)',
      borderBottom: '1px solid rgba(200,150,26,.1)',
      padding: '9px 0',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      animation: 'ticker 14s linear infinite',
      whiteSpace: 'nowrap',
      width: 'max-content'
    }
  }, [0, 1].map(function (rep) {
    return /*#__PURE__*/React.createElement("div", {
      key: rep,
      style: {
        display: 'flex'
      }
    }, [['98%', 'Match Rate'], ['1.8s', 'Avg Response'], ['<24h', 'Viewing'], ['1,200+', 'Units'], ['25', 'Compounds'], ['6', 'AI Tools']].map(function (p, i) {
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 18px'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: 13,
          fontWeight: 700,
          color: '#C8961A'
        }
      }, p[0]), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 7.5,
          letterSpacing: '.09em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,.28)',
          fontFamily: 'Inter'
        }
      }, p[1]), /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'rgba(200,150,26,.25)',
          fontSize: 12,
          marginLeft: 6
        }
      }, "\xB7"));
    }));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10,
      padding: '0 20px'
    }
  }, tools.map(function (tool, i) {
    var Mo = (window.Motion || {}).motion;
    var Wrap = Mo ? Mo.button : 'button';
    var motionProps = Mo ? {
      initial: {
        opacity: 0,
        y: 18,
        scale: .95
      },
      whileInView: {
        opacity: 1,
        y: 0,
        scale: 1
      },
      viewport: {
        once: true,
        amount: .35
      },
      transition: {
        duration: .4,
        delay: i % 6 * .06,
        ease: 'easeOut'
      },
      whileHover: {
        y: -4,
        scale: 1.015,
        borderColor: 'rgba(200,150,26,.35)'
      },
      whileTap: {
        scale: .97
      }
    } : {
      style: {
        animation: 'popIn .5s ' + (.06 + i * .07) + 's both'
      }
    };
    return /*#__PURE__*/React.createElement(Wrap, _extends({
      key: tool.k,
      onClick: function () {
        onTool(tool.k);
      },
      className: "ai-card",
      style: {
        gridColumn: tool.span ? '1 / -1' : undefined,
        padding: '18px 15px',
        borderRadius: 16,
        background: 'rgba(255,255,255,.035)',
        border: '1px solid rgba(255,255,255,.07)',
        cursor: 'pointer',
        textAlign: isAr ? 'right' : 'left',
        fontFamily: 'inherit',
        position: 'relative',
        overflow: 'hidden',
        direction: isAr ? 'rtl' : 'ltr',
        display: tool.span ? 'flex' : 'block',
        alignItems: tool.span ? 'center' : undefined,
        gap: tool.span ? 16 : undefined
      }
    }, motionProps), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 110%,rgba(200,150,26,.06),transparent 70%)',
        pointerEvents: 'none'
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "icon-spring",
      style: {
        marginBottom: tool.span ? 0 : 11,
        flexShrink: 0,
        display: 'inline-block'
      },
      dangerouslySetInnerHTML: {
        __html: IC[tool.k]
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: tool.span ? 1 : undefined
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: tool.span ? 14 : 12.5,
        fontWeight: 700,
        color: '#fff',
        marginBottom: 4,
        lineHeight: 1.2,
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
      }
    }, tool.label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9.5,
        color: 'rgba(255,255,255,.42)',
        lineHeight: 1.5,
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
      }
    }, tool.sub), tool.live && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        fontSize: 8.5,
        color: '#4ade80',
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'Inter'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: '#4ade80',
        display: 'block',
        animation: 'blink 2s ease infinite'
      }
    }), "LIVE")), tool.span && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 20,
        color: 'rgba(200,150,26,.45)',
        flexShrink: 0,
        marginLeft: isAr ? 0 : 8,
        marginRight: isAr ? 8 : 0
      }
    }, isAr ? '←' : '→'));
  }))));
}

/* ── WHY ── */
function WhySec() {
  var c = useApp();
  var dark = c.dark,
    lang = c.lang;
  var isAr = lang === 'ar';
  var C = th(dark);
  var rv = useScrollAnim(50);
  var ref = rv[0],
    vis = rv[1];
  var SVGs = {
    scan: '<svg viewBox="0 0 40 40" width="32" height="32" fill="none"><rect x="4" y="4" width="32" height="32" rx="8" stroke="#C8961A" stroke-width="1.2" opacity=".3"/><line x1="4" y1="20" x2="36" y2="20" stroke="#C8961A" stroke-width="1.5" stroke-linecap="round"><animate attributeName="y1" values="8;32;8" dur="2s" repeatCount="indefinite"/><animate attributeName="y2" values="8;32;8" dur="2s" repeatCount="indefinite"/></line><circle cx="13" cy="15" r="2.5" fill="#C8961A"><animate attributeName="opacity" values="1;.2;1" dur="1.5s" begin="0s" repeatCount="indefinite"/></circle><circle cx="20" cy="22" r="2.5" fill="#E9C176"><animate attributeName="opacity" values=".2;1;.2" dur="1.5s" begin=".4s" repeatCount="indefinite"/></circle><circle cx="28" cy="17" r="2.5" fill="#C8961A"><animate attributeName="opacity" values=".5;1;.5" dur="1.5s" begin=".8s" repeatCount="indefinite"/></circle></svg>',
    wizard: '<svg viewBox="0 0 40 40" width="32" height="32" fill="none"><path d="M20 6 L24 16 L35 16 L26 23 L29 34 L20 27 L11 34 L14 23 L5 16 L16 16 Z" stroke="#f472b6" stroke-width="1.3" fill="rgba(244,114,182,.1)"><animate attributeName="opacity" values="1;.5;1" dur="2s" repeatCount="indefinite"/></path><circle cx="33" cy="8" r="2" fill="#f472b6"><animate attributeName="r" values="1.5;3;1.5" dur="1.8s" repeatCount="indefinite"/></circle><circle cx="8" cy="10" r="1.3" fill="#E9C176"><animate attributeName="r" values="1;2;1" dur="2.2s" begin=".5s" repeatCount="indefinite"/></circle></svg>',
    avm: '<svg viewBox="0 0 40 40" width="32" height="32" fill="none"><circle cx="20" cy="20" r="14" stroke="#a78bfa" stroke-width="1.2" stroke-dasharray="3 2"><animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="6s" repeatCount="indefinite"/></circle><text x="20" y="25" text-anchor="middle" font-size="13" font-weight="800" fill="#a78bfa" font-family="JetBrains Mono,monospace">AVM<animate attributeName="opacity" values="1;.4;1" dur="2s" repeatCount="indefinite"/></text></svg>',
    close: '<svg viewBox="0 0 40 40" width="32" height="32" fill="none"><circle cx="14" cy="20" r="7" stroke="#4ade80" stroke-width="1.3"/><circle cx="26" cy="20" r="7" stroke="#C8961A" stroke-width="1.3"/><line x1="14" y1="13" x2="26" y2="13" stroke="rgba(255,255,255,.2)" stroke-width="1"/><line x1="14" y1="27" x2="26" y2="27" stroke="rgba(255,255,255,.2)" stroke-width="1"/><path d="M22 17 L25 20 L22 23" stroke="#C8961A" stroke-width="1.5" stroke-linecap="round" fill="none"><animate attributeName="opacity" values="1;.3;1" dur="1.6s" repeatCount="indefinite"/></path></svg>',
    verify: '<svg viewBox="0 0 40 40" width="32" height="32" fill="none"><path d="M20 4 L34 10 L34 20 C34 28 27 35 20 37 C13 35 6 28 6 20 L6 10 Z" stroke="#C8961A" stroke-width="1.3" fill="rgba(200,150,26,.08)"/><path d="M13 20 L18 25 L28 14" stroke="#4ade80" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><animate attributeName="stroke-dasharray" values="0 30;30 0;30 0" dur="1.8s" begin="0s" repeatCount="indefinite"/><animate attributeName="stroke-dashoffset" values="30;0;0" dur="1.8s" begin="0s" repeatCount="indefinite"/></path></svg>',
    speed: '<svg viewBox="0 0 40 40" width="32" height="32" fill="none"><path d="M6 32 A16 16 0 0 1 34 32" stroke="rgba(200,150,26,.2)" stroke-width="3" stroke-linecap="round"/><path d="M6 32 A16 16 0 0 1 34 32" stroke="#C8961A" stroke-width="3" stroke-linecap="round" stroke-dasharray="50" stroke-dashoffset="10"><animate attributeName="stroke-dashoffset" values="50;5;50" dur="2.4s" repeatCount="indefinite"/></path><line x1="20" y1="32" x2="28" y2="18" stroke="#E9C176" stroke-width="2" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="-40 20 32" to="40 20 32" dur="2.4s" repeatCount="indefinite"/></line><circle cx="20" cy="32" r="3" fill="#C8961A"/></svg>'
  };
  var pts = isAr ? [{
    svg: 'scan',
    t: 'ماسح فرص لحظي',
    s: 'يفحص سيرا +1,200 وحدة يومياً بـ 6 أدوات ذكاء اصطناعي ليُوصلك بأفضل الصفقات أولاً.',
    accent: '#C8961A'
  }, {
    svg: 'wizard',
    t: 'مستشار المنزل المثالي',
    s: '4 أسئلة فقط — وسيرا يرشّح لك الكمبوند والوحدة المثالية وفق ميزانيتك وأسلوب حياتك.',
    accent: '#f472b6'
  }, {
    svg: 'avm',
    t: 'تسعير AVM حقيقي',
    s: 'محرك تقييم لحظي يقارن كل وحدة بـ 25 كمبوند. لا تدفع أكثر من القيمة الفعلية أبداً.',
    accent: '#a78bfa'
  }, {
    svg: 'close',
    t: 'إغلاق بشري + ذكاء',
    s: 'فرص يكتشفها الذكاء الاصطناعي، يُنجزها مستشار خبير. من أول توافق حتى التوقيع خلال 48 ساعة.',
    accent: '#4ade80'
  }, {
    svg: 'verify',
    t: 'وحدات موثّقة 100%',
    s: 'كل وحدة مُفعّلة تمر بـ 11 نقطة تحقق. لا فجوات، لا مفاجآت.',
    accent: '#C8961A'
  }, {
    svg: 'speed',
    t: 'الأسرع في القاهرة الجديدة',
    s: 'متوسط 1.8 ثانية للرد الذكي. متوسط 18 يوماً من الاستفسار لتسليم المفاتيح.',
    accent: '#f59e0b'
  }] : [{
    svg: 'scan',
    t: 'Live Opportunity Scanner',
    s: 'Sierra scans 1,200+ units daily with 6 AI tools — ROI, AVM pricing, smart matching — surfacing the best deals first.',
    accent: '#C8961A'
  }, {
    svg: 'wizard',
    t: 'Dream Home Wizard',
    s: '4 questions, one perfect match. Sierra pinpoints your exact compound and unit type by budget and lifestyle.',
    accent: '#f472b6'
  }, {
    svg: 'avm',
    t: 'Real-Time AVM Pricing',
    s: 'Live valuation engine benchmarks every unit across 25 compounds. You never overpay.',
    accent: '#a78bfa'
  }, {
    svg: 'close',
    t: 'Human + AI Closing',
    s: 'AI-sourced deals paired with expert advisors. First match to signed contract in 48 hours.',
    accent: '#4ade80'
  }, {
    svg: 'verify',
    t: '100% Verified Inventory',
    s: 'Every active unit passes an 11-point verification check. No gaps, no surprises.',
    accent: '#C8961A'
  }, {
    svg: 'speed',
    t: "New Cairo's Fastest",
    s: '1.8s avg AI response. 18-day avg inquiry-to-keys. No other firm comes close.',
    accent: '#f59e0b'
  }];
  var bg = dark ? '#050E18' : '#FFFFFF';
  return /*#__PURE__*/React.createElement("section", {
    id: "s-why",
    style: {
      background: bg,
      padding: '0 0 32px',
      transition: 'background .3s'
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: "sec-inner",
    style: {
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(24px)',
      transition: 'all .6s cubic-bezier(.16,1,.3,1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '36px 20px 0',
      textAlign: isAr ? 'right' : 'left',
      direction: isAr ? 'rtl' : 'ltr'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8.5,
      letterSpacing: '.22em',
      textTransform: 'uppercase',
      color: '#C8961A',
      marginBottom: 10,
      opacity: .8
    }
  }, isAr ? 'سيرا إستيتس · القاهرة الجديدة' : 'SIERRA ESTATES · NEW CAIRO'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8,
      opacity: vis ? 1 : 0,
      transform: vis ? 'scale(1) rotate(0deg)' : 'scale(.5) rotate(-20deg)',
      transformOrigin: '50% 50%',
      transition: 'all .7s cubic-bezier(.16,1,.3,1)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-gold.png",
    alt: "Sierra Estates",
    style: {
      width: 34,
      height: 34,
      objectFit: 'contain',
      borderRadius: 8,
      background: '#07121E',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("svg", {
    width: "40",
    height: "40",
    viewBox: "-1 -1 103 103",
    fill: "none",
    strokeWidth: "2.2",
    style: {
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "grad-why",
    x1: "0",
    y1: "0",
    x2: "100",
    y2: "100",
    gradientUnits: "userSpaceOnUse"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0.2",
    stopColor: "rgb(255,135,9)"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "0.8",
    stopColor: "rgb(247,189,248)"
  }))), /*#__PURE__*/React.createElement("path", {
    stroke: "url(#grad-why)",
    d: "M50.5 50.5h50v50s-19.2 1.3-37.2-16.7S56 35.4 35.5 15.5C18.5-1 .5.5.5.5v50h50s25.6-.6 38-18 12-32 12-32h-50v100H.5S.2 80.7 11.8 68.2 40 49.7 50.5 50.5Z"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : "'Cormorant Garamond',serif",
      fontSize: isAr ? 34 : 42,
      fontWeight: isAr ? 700 : 400,
      lineHeight: 1.0,
      color: dark ? '#fff' : '#0D2035',
      marginBottom: 6
    }
  }, isAr ? 'أبعد من الوساطة' : ['Beyond', 'Brokerage'].map(function (word, wi) {
    return React.createElement(React.Fragment, {
      key: wi
    }, wi > 0 ? React.createElement('br', null) : null, React.createElement('span', {
      style: {
        display: 'inline-block',
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(16px)',
        transition: 'all .5s cubic-bezier(.16,1,.3,1) ' + wi * .12 + 's'
      }
    }, word));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      fontSize: 11.5,
      color: dark ? 'rgba(255,255,255,.4)' : 'rgba(13,32,53,.45)',
      lineHeight: 1.65,
      maxWidth: 300
    }
  }, isAr ? 'نجمع الخبرة البشرية العميقة بذكاء اصطناعي حي — للكشف عن الفرص التي يفوّتها الوسطاء التقليديون.' : 'We pair deep local expertise with live AI to surface deals traditional brokers never see.')), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '20px 20px 18px',
      height: 1,
      background: dark ? 'linear-gradient(90deg,transparent,rgba(200,150,26,.35),transparent)' : 'linear-gradient(90deg,transparent,rgba(13,32,53,.12),transparent)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 9,
      padding: '0 20px'
    }
  }, pts.map(function (pt, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        padding: '16px 14px',
        borderRadius: 16,
        background: dark ? 'rgba(255,255,255,.03)' : '#fff',
        border: '1px solid ' + (dark ? 'rgba(200,150,26,.09)' : 'rgba(13,32,53,.07)'),
        animation: vis ? 'popIn .5s ' + (.05 + i * .08) + 's both' : 'none',
        direction: isAr ? 'rtl' : 'ltr',
        boxShadow: dark ? 'none' : '0 2px 12px rgba(13,32,53,.05)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 10
      },
      dangerouslySetInnerHTML: {
        __html: pt.svg === 'scan' ? SVGs.scan : pt.svg === 'wizard' ? SVGs.wizard : pt.svg === 'avm' ? SVGs.avm : pt.svg === 'close' ? SVGs.close : pt.svg === 'verify' ? SVGs.verify : SVGs.speed
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        fontWeight: 700,
        color: dark ? '#fff' : '#0D2035',
        marginBottom: 4,
        lineHeight: 1.25,
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
      }
    }, pt.t), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9.5,
        color: dark ? 'rgba(255,255,255,.38)' : 'rgba(13,32,53,.5)',
        lineHeight: 1.55,
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
      }
    }, pt.s), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10,
        height: 2,
        borderRadius: 2,
        background: pt.accent,
        opacity: .5,
        width: '40%'
      }
    }));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '14px 20px 0',
      padding: '14px 0',
      borderTop: '1px solid ' + (dark ? 'rgba(200,150,26,.1)' : 'rgba(13,32,53,.07)'),
      borderBottom: '1px solid ' + (dark ? 'rgba(200,150,26,.1)' : 'rgba(13,32,53,.07)'),
      display: 'flex',
      justifyContent: 'space-around'
    }
  }, [['25', isAr ? 'كمبوند' : 'Compounds'], ['+1,200', isAr ? 'وحدة نشطة' : 'Live Units'], ['48h', isAr ? 'عقد موقّع' : 'To Contract']].map(function (s, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 16,
        fontWeight: 700,
        color: '#C8961A'
      }
    }, s[0]), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
        fontSize: 7.5,
        textTransform: 'uppercase',
        letterSpacing: '.08em',
        color: dark ? 'rgba(255,255,255,.28)' : 'rgba(13,32,53,.38)',
        marginTop: 2
      }
    }, s[1]));
  }))));
}

/* ── ABOUT US ── */
function AboutUs() {
  var c = useApp();
  var dark = c.dark,
    lang = c.lang;
  var isAr = lang === 'ar';
  var C = th(dark);
  var rv = useScrollAnim(60);
  var ref = rv[0],
    vis = rv[1];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: C.bgAlt,
      padding: '0 0 28px',
      transition: 'background .3s'
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: "sec-inner",
    style: {
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(20px)',
      transition: 'all .55s cubic-bezier(.16,1,.3,1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 20px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      direction: isAr ? 'rtl' : 'ltr',
      borderBottom: '1px solid ' + (dark ? 'rgba(200,150,26,.12)' : 'rgba(13,32,53,.07)'),
      marginBottom: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: -2,
      borderRadius: 20,
      background: 'linear-gradient(135deg,rgba(200,150,26,.6),transparent 55%,rgba(233,193,118,.4))',
      zIndex: 0
    }
  }), /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-gold.png",
    alt: "Sierra Estates",
    style: {
      position: 'relative',
      zIndex: 1,
      width: 76,
      height: 76,
      borderRadius: 18,
      objectFit: 'contain',
      display: 'block',
      background: '#07121E'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
      fontSize: isAr ? 24 : 28,
      fontWeight: isAr ? 700 : 400,
      color: dark ? '#F0EDE5' : N,
      lineHeight: 1.05,
      marginBottom: 5
    }
  }, isAr ? 'سيرا إستيتس' : 'Sierra Estates'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 7.5,
      letterSpacing: '.16em',
      color: G,
      textTransform: 'uppercase',
      marginBottom: 6,
      opacity: .85
    }
  }, "FUTURE OF REAL ESTATES"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, ['New Cairo', '25 Cpds', 'AI-Powered'].map(function (tag) {
    return /*#__PURE__*/React.createElement("span", {
      key: tag,
      style: {
        fontSize: 8,
        fontWeight: 700,
        padding: '2px 7px',
        borderRadius: 20,
        background: dark ? 'rgba(200,150,26,.12)' : 'rgba(13,32,53,.07)',
        color: dark ? G : N,
        fontFamily: 'Inter'
      }
    }, tag);
  })))), /*#__PURE__*/React.createElement(SH, {
    eye: isAr ? 'عن شركتنا' : 'ABOUT US',
    title: isAr ? 'قصتنا' : 'Our Story',
    light: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '0 20px',
      padding: '18px',
      borderRadius: 16,
      background: C.whyCard,
      border: '1px solid ' + (dark ? 'rgba(200,150,26,.12)' : 'rgba(13,32,53,.09)'),
      boxShadow: '0 4px 20px rgba(13,32,53,.07)',
      direction: isAr ? 'rtl' : 'ltr'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: C.txM,
      lineHeight: 1.75,
      marginBottom: 16,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, isAr ? 'سيرا إستيتس شركة عقارية رائدة في القاهرة الجديدة، تجمع الخبرة البشرية العميقة بأحدث أدوات الذكاء الاصطناعي لتقديم أفضل الفرص العقارية في مصر. نغطي 25 كمبوند وأكثر من 1200 وحدة.' : "Sierra Estates is New Cairo's leading AI-powered real estate firm — combining deep local expertise with 6 proprietary AI tools to surface the best opportunities across 25 compounds and 1,200+ verified units."))));
}

/* ── CONTACT US ── */
function ContactUs(props) {
  var onReq = props.onReq;
  var c = useApp();
  var lang = c.lang;
  var isAr = lang === 'ar';
  var rv = useScrollAnim(60);
  var ref = rv[0],
    vis = rv[1];
  var rows = [{
    ic: '💬',
    l: 'WhatsApp',
    v: '+20 106 139 9688',
    sub: isAr ? 'رد خلال 4 ساعات' : 'Reply within 4 hours',
    href: 'https://wa.me/201061399688',
    accent: '#25D366'
  }, {
    ic: '📞',
    l: isAr ? 'اتصل بنا' : 'Call Us',
    v: '+20 106 139 9688',
    sub: isAr ? 'يومياً 9ص – 10م' : 'Daily 9AM – 10PM',
    href: 'tel:+201061399688',
    accent: G
  }, {
    ic: '✉️',
    l: isAr ? 'البريد الإلكتروني' : 'Email',
    v: 'Info@sierra-estates.net',
    sub: isAr ? 'للاستفسارات والشراكات' : 'Enquiries & partnerships',
    href: 'mailto:Info@sierra-estates.net',
    accent: '#5B99DC'
  }];
  return /*#__PURE__*/React.createElement("section", {
    id: "s-contact",
    style: {
      background: N2,
      padding: '0 0 30px',
      transition: 'background .3s'
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: "sec-inner",
    style: {
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(24px)',
      transition: 'all .6s cubic-bezier(.16,1,.3,1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px 20px 4px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8,
      letterSpacing: '.24em',
      color: G,
      textTransform: 'uppercase',
      marginBottom: 8,
      opacity: .85
    }
  }, isAr ? 'تواصل معنا' : 'CONTACT US'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
      fontSize: isAr ? 26 : 32,
      fontWeight: isAr ? 700 : 400,
      color: '#fff',
      lineHeight: 1.1,
      marginBottom: 6
    }
  }, isAr ? 'لنجد منزلك المثالي' : "Let's Find Your Home"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'rgba(255,255,255,.38)',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      lineHeight: 1.6,
      maxWidth: 280,
      margin: '0 auto'
    }
  }, isAr ? 'فريقنا ومستشارنا الذكي في خدمتك على مدار الساعة.' : 'Our advisors and Sierra AI are at your service around the clock.')), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '18px 20px 16px',
      height: 1,
      background: 'linear-gradient(90deg,transparent,rgba(200,150,26,.4),transparent)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 9,
      padding: '0 20px'
    }
  }, rows.map(function (r, i) {
    return /*#__PURE__*/React.createElement("a", {
      key: i,
      href: r.href,
      target: r.href.indexOf('https') === 0 ? '_blank' : undefined,
      rel: "noopener noreferrer",
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: '14px 16px',
        borderRadius: 15,
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(200,150,26,.14)',
        textDecoration: 'none',
        direction: isAr ? 'rtl' : 'ltr',
        animation: vis ? 'popIn .5s ' + (.08 + i * .09) + 's both' : 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 42,
        height: 42,
        borderRadius: 12,
        background: 'rgba(255,255,255,.05)',
        border: '1px solid rgba(255,255,255,.09)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 19,
        flexShrink: 0
      }
    }, r.ic), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        textAlign: isAr ? 'right' : 'left'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8.5,
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,.35)',
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
        fontWeight: 700,
        marginBottom: 3
      }
    }, r.l), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 12.5,
        fontWeight: 700,
        color: '#fff',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, r.v), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: 'rgba(255,255,255,.3)',
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
        marginTop: 2
      }
    }, r.sub)), /*#__PURE__*/React.createElement("span", {
      style: {
        color: r.accent,
        fontSize: 16,
        flexShrink: 0
      }
    }, isAr ? '‹' : '›'));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 20px 0'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onReq,
    style: {
      width: '100%',
      padding: '14px',
      borderRadius: 13,
      background: 'linear-gradient(135deg,' + G + ',' + GL + ')',
      color: N,
      fontSize: 11.5,
      fontWeight: 900,
      letterSpacing: '.06em',
      textTransform: 'uppercase',
      border: 'none',
      cursor: 'pointer',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      boxShadow: '0 8px 28px rgba(200,150,26,.35)'
    }
  }, isAr ? 'اطلب عقارك الآن — خصم 25%' : 'Request Your Property — 25% OFF')), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      paddingTop: 20,
      borderTop: '1px solid rgba(200,150,26,.12)',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-gold.png",
    style: {
      width: 40,
      height: 40,
      objectFit: 'contain',
      borderRadius: 10
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: HEADING_FONT,
      fontSize: 15,
      fontWeight: 600,
      letterSpacing: '.18em',
      color: G,
      marginTop: 8,
      marginBottom: 4
    }
  }, "SIERRA ESTATES"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8.5,
      color: 'rgba(255,255,255,.22)',
      letterSpacing: '.14em',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      textTransform: 'uppercase'
    }
  }, isAr ? 'القاهرة الجديدة · ذكاء اصطناعي · 2026' : 'New Cairo · AI-Driven · 2026'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 7.5,
      color: 'rgba(255,255,255,.16)',
      marginTop: 10,
      letterSpacing: '.08em'
    }
  }, "Info@sierra-estates.net \xB7 +20 106 139 9688"))));
}
Object.assign(window, {
  Hero,
  Listings,
  MapSec,
  TourSec,
  AIHub,
  WhySec,
  AboutUs,
  ContactUs,
  Ticker
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/sections.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/sheets.jsx
try { (() => {
/* Sierra Estates — Client Portal (mobile-first, responsive) */
const {
  useState,
  useEffect,
  useRef,
  useMemo,
  createContext,
  useContext
} = React;

/* ── SMART FILTER SHEET (shared by Hero + sticky header) ── */
function SmartFilterSheet(props) {
  var open = props.open,
    onClose = props.onClose,
    purpose = props.purpose,
    setPurpose = props.setPurpose,
    beds = props.beds,
    setBeds = props.setBeds,
    setSearch = props.setSearch,
    showLead = props.showLead;
  var wide = useWide();
  var c = useApp();
  var lang = c.lang;
  var isAr = lang === 'ar';
  var name = useState('');
  var setName = name[1];
  name = name[0];
  var phone = useState('');
  var setPhone = phone[1];
  phone = phone[0];
  var leadErr = useState(false);
  var setLeadErr = leadErr[1];
  leadErr = leadErr[0];
  var leadDone = useState(false);
  var setLeadDone = leadDone[1];
  leadDone = leadDone[0];
  var ALL_CPDS_FILTER = ["Katameya Heights", "Katameya Dunes", "Swan Lake Residence", "Mivida", "Cairo Festival City (CFC) Residences", "Hyde Park New Cairo", "Taj City", "Eastown (SODIC)", "Mountain View iCity", "Zed East (Ora)", "Palm Hills New Cairo", "The Waterway", "Lake View / Lake View Residence", "Fifth Square (Al Marasem)", "Villette (SODIC)", "Stone Residence (Rooya Group)", "The Square (Al Ahly Sabbour)", "El Patio Oro (La Vista)", "El Patio 7 (La Vista)", "Katameya Gardens", "Village Gardens Katameya (Palm Hills)", "Galleria Moon Valley (Arabia Holding)", "90 Avenue (Tabarak)", "Azzar New Cairo (Reedy Group)", "District 5 (Marakez)", "The Brooks (PRE Developments)", "STEI8HT (LMD)", "The Crest (IL Cazar)", "Azad & Azad Views (Tameer)", "Eastshire (Alqamzi)", "The Waterway Branded Residences", "Aster Residence", "The MarQ", "Capital Gate (Al Marasem)", "Bloomfields (Tatweer Misr)", "IL Bosco City (Misr Italia)", "Odyssia (Al Ahly Sabbour)", "Haptown (Hassan Allam)", "Sarai (Madinet Masr)", "Madinaty", "El Shorouk"];
  var PROP_TYPES = ['Villa', 'Apartment', 'Twin House', 'Townhouse', 'Duplex', 'Penthouse'];
  var propSel = useState([]);
  var setPropSel = propSel[1];
  propSel = propSel[0];
  var priceSlider = useState(50);
  var setPriceSlider = priceSlider[1];
  priceSlider = priceSlider[0];
  var cpdSrch = useState('');
  var setCpdSrch = cpdSrch[1];
  cpdSrch = cpdSrch[0];
  var cpdSel = useState([]);
  var setCpdSel = cpdSel[1];
  cpdSel = cpdSel[0];
  var bedsSel = useState([]);
  var setBedsSel = bedsSel[1];
  bedsSel = bedsSel[0];
  var comment = useState('');
  var setComment = comment[1];
  comment = comment[0];
  var openDrop = useState(null);
  var setOpenDrop = openDrop[1];
  openDrop = openDrop[0];
  useEffect(function () {
    if (setSearch) setSearch(cpdSel.length > 0 ? cpdSel[0] : '');
  }, [cpdSel]);
  useEffect(function () {
    if (setBeds) setBeds(bedsSel.length === 1 ? bedsSel[0] : null);
  }, [bedsSel.join(',')]);
  function toggleDrop(k) {
    setOpenDrop(function (o) {
      return o === k ? null : k;
    });
  }
  function toggleArr(setter, arr, v) {
    setter(arr.indexOf(v) >= 0 ? arr.filter(function (x) {
      return x !== v;
    }) : arr.concat([v]));
  }
  function submitLead() {
    if (showLead && (!name.trim() || !phone.trim())) {
      setLeadErr(true);
      return;
    }
    setLeadErr(false);
    if (showLead) {
      try {
        var leads = JSON.parse(localStorage.getItem('sierra_leads') || '[]');
        leads.push({
          name: name.trim(),
          phone: phone.trim(),
          comment: comment.trim(),
          purpose: purpose,
          compounds: cpdSel,
          propTypes: propSel,
          beds: bedsSel,
          source: 'Website Lead',
          ts: new Date().toISOString()
        });
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
    return /*#__PURE__*/React.createElement("button", {
      onClick: function () {
        toggleDrop(key);
      },
      style: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px',
        background: isOpen ? 'rgba(200,150,26,.06)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
        transition: 'background .2s'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: N
      }
    }, label), count > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 8,
        fontWeight: 800,
        padding: '2px 7px',
        borderRadius: 10,
        background: 'linear-gradient(135deg,' + G + ',' + GL + ')',
        color: N
      }
    }, count)), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }
    }, extra, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-block',
        transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        color: '#8A94A0',
        fontSize: 11
      }
    }, "\u25BE")));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 510,
      background: 'rgba(4,8,15,.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: wide ? 'center' : 'flex-end',
      justifyContent: 'center',
      padding: wide ? 24 : 0,
      animation: 'fadeIn .25s both'
    },
    onClick: function (e) {
      if (e.target === e.currentTarget) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: wide ? 24 : '22px 22px 0 0',
      width: wide ? 'min(720px, 94vw)' : '100%',
      maxHeight: wide ? 'min(85vh, 860px)' : '92%',
      overflowY: 'auto',
      animation: 'slideUp .4s cubic-bezier(.16,1,.3,1) both',
      boxShadow: '0 -20px 60px rgba(13,32,53,.24)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '10px 0 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 3.5,
      borderRadius: 2,
      background: 'rgba(13,32,53,.14)',
      margin: '0 auto'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 20px 8px',
      borderBottom: '1px solid rgba(13,32,53,.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      background: '#fff',
      zIndex: 1,
      direction: isAr ? 'rtl' : 'ltr'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 7.5,
      letterSpacing: '.18em',
      color: G,
      textTransform: 'uppercase',
      marginBottom: 2
    }
  }, isAr ? 'بحث بالذكاء الاصطناعي' : 'AI-POWERED SEARCH'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
      fontSize: isAr ? 20 : 22,
      fontWeight: isAr ? 700 : 500,
      color: N
    }
  }, showLead ? isAr ? 'اطلب عقارك' : 'Request Your Property' : isAr ? 'الفلتر الذكي' : 'Smart Filter')), /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      onClose();
      setLeadDone(false);
    },
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'rgba(13,32,53,.35)',
      fontSize: 24
    }
  }, "\xD7")), leadDone ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '48px 24px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 62,
      height: 62,
      borderRadius: '50%',
      background: '#16a34a',
      margin: '0 auto 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 26,
      color: '#fff',
      animation: 'popIn .4s both'
    }
  }, "\u2713"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
      fontSize: isAr ? 22 : 25,
      fontWeight: isAr ? 700 : 600,
      color: N,
      marginBottom: 8
    }
  }, isAr ? 'وصلنا طلبك!' : 'Request Received!'), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: '#5A6475',
      lineHeight: 1.65,
      marginBottom: 18,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, isAr ? 'سيتواصل معك فريقنا قريباً على واتساب.' : 'Our team will reach out on WhatsApp shortly.'), /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      onClose();
      setLeadDone(false);
    },
    style: {
      padding: '10px 24px',
      borderRadius: 9,
      border: '1px solid rgba(13,32,53,.14)',
      background: 'none',
      color: '#5A6475',
      fontSize: 12,
      cursor: 'pointer',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, isAr ? 'إقفال' : 'Close')) : /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 20px 28px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      direction: isAr ? 'rtl' : 'ltr'
    }
  }, showLead && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      border: '1px solid ' + (leadErr && !name.trim() ? '#dc2626' : 'rgba(13,32,53,.12)'),
      borderRadius: 10,
      padding: '10px 12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      fontWeight: 700,
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      color: '#8A94A0',
      marginBottom: 3,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, isAr ? 'الاسم *' : 'Name *'), /*#__PURE__*/React.createElement("input", {
    value: name,
    onChange: function (e) {
      setName(e.target.value);
    },
    placeholder: isAr ? 'اسمك الكامل' : 'Your full name',
    style: {
      width: '100%',
      background: 'none',
      border: 'none',
      outline: 'none',
      fontSize: 12.5,
      fontWeight: 500,
      color: N,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      border: '1px solid ' + (leadErr && !phone.trim() ? '#dc2626' : 'rgba(13,32,53,.12)'),
      borderRadius: 10,
      padding: '10px 12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      fontWeight: 700,
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      color: '#8A94A0',
      marginBottom: 3,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, isAr ? 'واتساب *' : 'WhatsApp *'), /*#__PURE__*/React.createElement("input", {
    type: "tel",
    value: phone,
    onChange: function (e) {
      setPhone(e.target.value);
    },
    placeholder: "+20 1XX XXX XXXX",
    style: {
      width: '100%',
      background: 'none',
      border: 'none',
      outline: 'none',
      fontSize: 12.5,
      fontWeight: 500,
      color: N,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }))), showLead && /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '2px 0 4px',
      height: 1,
      background: 'linear-gradient(90deg,transparent,rgba(200,150,26,.35),transparent)'
    }
  }), showLead && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      color: G,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, isAr ? 'ثم حدد الفلتر' : 'Then set your filters'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      padding: 4,
      borderRadius: 12,
      background: 'rgba(13,32,53,.07)',
      border: '1px solid rgba(13,32,53,.1)'
    }
  }, [['resale', isAr ? '🏠 بيع' : '🏠  Resale'], ['rent', isAr ? '🔑 إيجار' : '🔑  Rent']].map(function (pair) {
    return /*#__PURE__*/React.createElement("button", {
      key: pair[0],
      onClick: function () {
        setPurpose(pair[0]);
        setPriceSlider(50);
      },
      style: {
        flex: 1,
        padding: '10px 8px',
        borderRadius: 9,
        fontSize: 12,
        fontWeight: 800,
        cursor: 'pointer',
        border: 'none',
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
        transition: 'all .25s cubic-bezier(.4,0,.2,1)',
        background: purpose === pair[0] ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'transparent',
        color: purpose === pair[0] ? N : '#8A94A0',
        transform: purpose === pair[0] ? 'scale(1.02)' : 'scale(1)'
      }
    }, pair[1]);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid ' + (cpdSel.length > 0 ? 'rgba(200,150,26,.4)' : 'rgba(13,32,53,.12)'),
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'border-color .2s'
    }
  }, DropHead('cpd', isAr ? 'الكمبوند (اختيار متعدد)' : 'Compound (multi-select)', cpdSel.length, cpdSel.length > 0 && /*#__PURE__*/React.createElement("span", {
    onClick: function (e) {
      e.stopPropagation();
      setCpdSel([]);
      setCpdSrch('');
    },
    style: {
      color: '#dc2626',
      fontSize: 9,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, isAr ? 'مسح' : 'clear')), /*#__PURE__*/React.createElement("div", {
    style: {
      maxHeight: openDrop === 'cpd' ? 220 : 0,
      opacity: openDrop === 'cpd' ? 1 : 0,
      overflow: 'hidden',
      transition: 'max-height .32s cubic-bezier(.4,0,.2,1), opacity .22s',
      padding: openDrop === 'cpd' ? '0 14px 12px' : '0 14px'
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: cpdSrch,
    onChange: function (e) {
      setCpdSrch(e.target.value);
    },
    placeholder: isAr ? 'ابحث ضمن 40 كمبوند…' : 'Search 40 compounds…',
    style: {
      width: '100%',
      padding: '7px 10px',
      border: '1px solid rgba(13,32,53,.12)',
      borderRadius: 8,
      fontSize: 11,
      outline: 'none',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      color: N,
      marginBottom: 7,
      background: 'rgba(13,32,53,.02)',
      boxSizing: 'border-box'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      maxHeight: 150,
      overflowY: 'auto'
    }
  }, ALL_CPDS_FILTER.filter(function (nm) {
    return !cpdSrch || nm.toLowerCase().indexOf(cpdSrch.toLowerCase()) >= 0;
  }).map(function (nm, i) {
    var on = cpdSel.indexOf(nm) >= 0;
    return /*#__PURE__*/React.createElement("label", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '7px 8px',
        borderRadius: 7,
        cursor: 'pointer',
        background: on ? 'rgba(200,150,26,.08)' : 'transparent'
      },
      onClick: function () {
        toggleArr(setCpdSel, cpdSel, nm);
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 16,
        height: 16,
        borderRadius: 5,
        border: '1.5px solid ' + (on ? G : 'rgba(13,32,53,.25)'),
        background: on ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all .15s'
      }
    }, on && /*#__PURE__*/React.createElement("span", {
      style: {
        color: N,
        fontSize: 10,
        fontWeight: 900
      }
    }, "\u2713")), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: on ? N : '#5A6472',
        fontWeight: on ? 700 : 500,
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
      }
    }, nm));
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid ' + (propSel.length > 0 ? 'rgba(200,150,26,.4)' : 'rgba(13,32,53,.12)'),
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'border-color .2s'
    }
  }, DropHead('type', isAr ? 'نوع العقار' : 'Property Type', propSel.length), /*#__PURE__*/React.createElement("div", {
    style: {
      maxHeight: openDrop === 'type' ? 160 : 0,
      opacity: openDrop === 'type' ? 1 : 0,
      overflow: 'hidden',
      transition: 'max-height .32s cubic-bezier(.4,0,.2,1), opacity .22s',
      padding: openDrop === 'type' ? '0 14px 12px' : '0 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 5,
      flexWrap: 'wrap'
    }
  }, PROP_TYPES.map(function (tp) {
    var on = propSel.indexOf(tp) >= 0;
    return /*#__PURE__*/React.createElement("button", {
      key: tp,
      onClick: function () {
        toggleArr(setPropSel, propSel, tp);
      },
      style: {
        padding: '6px 12px',
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid',
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
        transition: 'all .18s',
        borderColor: on ? G : 'rgba(13,32,53,.12)',
        background: on ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'transparent',
        color: on ? N : '#8A94A0'
      }
    }, on ? '✓ ' : '', tp);
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid ' + (bedsSel.length > 0 ? 'rgba(200,150,26,.4)' : 'rgba(13,32,53,.12)'),
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'border-color .2s'
    }
  }, DropHead('beds', isAr ? 'عدد الغرف' : 'No. of Rooms', bedsSel.length), /*#__PURE__*/React.createElement("div", {
    style: {
      maxHeight: openDrop === 'beds' ? 120 : 0,
      opacity: openDrop === 'beds' ? 1 : 0,
      overflow: 'hidden',
      transition: 'max-height .32s cubic-bezier(.4,0,.2,1), opacity .22s',
      padding: openDrop === 'beds' ? '0 14px 12px' : '0 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 5,
      flexWrap: 'wrap'
    }
  }, [1, 2, 3, 4, 5, 6].map(function (b) {
    var on = bedsSel.indexOf(b) >= 0;
    return /*#__PURE__*/React.createElement("button", {
      key: b,
      onClick: function () {
        toggleArr(setBedsSel, bedsSel, b);
      },
      style: {
        padding: '6px 13px',
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid',
        fontFamily: 'Inter',
        transition: 'all .18s',
        borderColor: on ? G : 'rgba(13,32,53,.12)',
        background: on ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'transparent',
        color: on ? N : '#8A94A0'
      }
    }, on ? '✓ ' : '', b === 6 ? '6+' : b, isAr ? '' : 'B');
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid rgba(13,32,53,.12)',
      borderRadius: 12,
      padding: '12px 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      fontWeight: 700,
      color: N,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, isAr ? 'الميزانية' : 'Budget'), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 11,
      fontWeight: 700,
      color: G
    }
  }, purpose === 'rent' ? '$' + (500 + Math.round(priceSlider / 100 * 9500)).toLocaleString() + '/mo' : 'EGP ' + (1 + priceSlider / 100 * 49).toFixed(1) + 'M')), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0",
    max: "100",
    value: priceSlider,
    onChange: function (e) {
      setPriceSlider(Number(e.target.value));
    },
    style: {
      width: '100%',
      accentColor: G
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: 'rgba(13,32,53,.35)',
      fontFamily: 'Inter'
    }
  }, purpose === 'rent' ? '$500/mo' : 'EGP 1M'), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: 'rgba(13,32,53,.35)',
      fontFamily: 'Inter'
    }
  }, purpose === 'rent' ? '$10,000/mo' : 'EGP 50M+'))), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid rgba(13,32,53,.12)',
      borderRadius: 12,
      padding: '10px 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7.5,
      fontWeight: 700,
      letterSpacing: '.14em',
      textTransform: 'uppercase',
      color: '#8A94A0',
      marginBottom: 6,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, isAr ? 'ملاحظة (اختياري)' : 'Comment (optional)'), /*#__PURE__*/React.createElement("textarea", {
    value: comment,
    onChange: function (e) {
      setComment(e.target.value);
    },
    rows: 2,
    placeholder: isAr ? 'اكتب أي تفاصيل إضافية…' : 'Any extra detail you want us to know…',
    style: {
      width: '100%',
      border: 'none',
      outline: 'none',
      resize: 'none',
      fontSize: 12,
      color: N,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      background: 'transparent'
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: submitLead,
    style: {
      padding: '14px',
      borderRadius: 12,
      background: 'linear-gradient(135deg,' + N + ',#1A3354)',
      color: GL,
      fontSize: 11.5,
      fontWeight: 800,
      letterSpacing: '.05em',
      border: 'none',
      cursor: 'pointer',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      textTransform: 'uppercase',
      boxShadow: '0 6px 22px rgba(13,32,53,.35)',
      width: '100%',
      transition: 'transform .15s'
    }
  }, showLead ? isAr ? 'إرسال الطلب' : 'Submit Request' : isAr ? 'تطبيق الفلتر' : 'Apply Filters', " \u2192"), showLead && leadErr && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      fontSize: 9.5,
      color: '#dc2626',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, isAr ? 'الاسم والواتساب مطلوبان' : 'Name and WhatsApp are required'), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      fontSize: 9,
      color: 'rgba(13,32,53,.32)',
      fontFamily: 'Inter',
      marginTop: leadErr ? 0 : -7
    }
  }, "\u26A1 ", isAr ? 'بدعم الذكاء الاصطناعي' : 'Powered by AI'))));
}

/* ── UNIT SHEET ── */
function CpdSheet(props) {
  var cpd = props.cpd,
    purpose = props.purpose,
    onClose = props.onClose;
  var c = useApp();
  var lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var stF = useState('All');
  var setStF = stF[1];
  stF = stF[0];
  var bdF = useState(null);
  var setBdF = bdF[1];
  bdF = bdF[0];
  var sc = useState('ai');
  var setSc = sc[1];
  sc = sc[0];
  var sd = useState('desc');
  var setSd = sd[1];
  sd = sd[0];
  var allU = cpd ? UNITS[cpd.n] || [] : [];
  var av = allU.filter(function (u) {
    return u.status === 'Available';
  }).length;
  var uo = allU.filter(function (u) {
    return u.status === 'Under Offer';
  }).length;
  var so = allU.filter(function (u) {
    return u.status === 'Sold';
  }).length;
  function hSort(col) {
    if (sc === col) setSd(function (d) {
      return d === 'asc' ? 'desc' : 'asc';
    });else {
      setSc(col);
      setSd('desc');
    }
  }
  var units = useMemo(function () {
    var u = allU.slice();
    if (stF !== 'All') u = u.filter(function (x) {
      return x.status === stF;
    });
    if (bdF) u = u.filter(function (x) {
      return x.beds === bdF;
    });
    u.sort(function (a, b) {
      var av = a[sc],
        bv = b[sc];
      if (typeof av === 'string') {
        av = av.toLowerCase();
        bv = bv.toLowerCase();
      }
      return sd === 'asc' ? av > bv ? 1 : -1 : av < bv ? 1 : -1;
    });
    return u;
  }, [allU, stF, bdF, sc, sd]);
  function thS(col) {
    return sc === col ? sd === 'asc' ? ' ▲' : ' ▼' : '';
  }
  if (!cpd) return null;
  return /*#__PURE__*/React.createElement(Sheet, {
    open: !!cpd,
    onClose: onClose,
    maxH: "88%"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px 10px',
      borderBottom: '1px solid rgba(13,32,53,.07)',
      flexShrink: 0,
      direction: isAr ? 'rtl' : 'ltr'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 8,
      paddingTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8,
      letterSpacing: '.15em',
      color: G,
      textTransform: 'uppercase',
      marginBottom: 2
    }
  }, cpd.z, " \xB7 AI ", cpd.ai, "/10"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
      fontSize: 22,
      fontWeight: isAr ? 700 : 600,
      color: N,
      lineHeight: 1.1
    }
  }, cpd.n)), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'rgba(13,32,53,.3)',
      fontSize: 24,
      lineHeight: 1,
      marginTop: 2
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "pill-av"
  }, av, " ", t.pAv), /*#__PURE__*/React.createElement("span", {
    className: "pill-uo"
  }, uo, " ", t.pUO), /*#__PURE__*/React.createElement("span", {
    className: "pill-so"
  }, so, " ", t.pSold)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      flexWrap: 'wrap'
    }
  }, [[t.sAll, 'All'], [t.sAv, 'Available'], [t.sUO, 'Under Offer'], [t.sSold, 'Sold']].map(function (pair) {
    return /*#__PURE__*/React.createElement("button", {
      key: pair[0],
      onClick: function () {
        setStF(pair[1]);
      },
      style: {
        padding: '3px 9px',
        borderRadius: 20,
        fontSize: 8.5,
        fontWeight: 600,
        cursor: 'pointer',
        border: '1px solid',
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
        transition: 'all .15s',
        borderColor: stF === pair[1] ? G : 'rgba(13,32,53,.12)',
        background: stF === pair[1] ? 'rgba(200,150,26,.13)' : 'transparent',
        color: stF === pair[1] ? G : '#8A94A0'
      }
    }, pair[0]);
  }), [null, 2, 3, 4, 5].map(function (b) {
    return /*#__PURE__*/React.createElement("button", {
      key: b == null ? 'a' : b,
      onClick: function () {
        setBdF(bdF === b ? null : b);
      },
      style: {
        padding: '3px 9px',
        borderRadius: 20,
        fontSize: 8.5,
        fontWeight: 600,
        cursor: 'pointer',
        border: '1px solid',
        fontFamily: 'Inter',
        transition: 'all .15s',
        borderColor: bdF === b ? N : 'rgba(13,32,53,.12)',
        background: bdF === b ? 'rgba(13,32,53,.08)' : 'transparent',
        color: bdF === b ? N : '#8A94A0'
      }
    }, b ? b + 'B' : t.allBeds);
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '5px 16px',
      background: N2,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Shield, {
    sz: 14
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 7,
      letterSpacing: '.14em',
      color: G
    }
  }, "SIERRA ESTATES \xB7 INVENTORY PLUGIN v2.6"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 7,
      color: 'rgba(200,150,26,.4)'
    }
  }, units.length, " rows \xB7 tap row for details")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "ut",
    style: {
      direction: isAr ? 'rtl' : 'ltr'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, [[t.tId, 'id'], [t.tType, 'type'], [t.tBd, 'beds'], [t.tArea, 'area'], [t.tPrice, purpose === 'rent' ? 'usd' : 'egpM'], [t.tAI, 'ai'], [t.tStatus, 'status'], [t.tCTA, null]].map(function (pair) {
    return /*#__PURE__*/React.createElement("th", {
      key: pair[0],
      onClick: pair[1] ? function () {
        hSort(pair[1]);
      } : undefined
    }, pair[0], pair[1] ? thS(pair[1]) : '');
  }))), /*#__PURE__*/React.createElement("tbody", null, units.map(function (u) {
    return /*#__PURE__*/React.createElement("tr", {
      key: u.id,
      onClick: function () {
        if (props.onUnit) props.onUnit(u);
      },
      style: {
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 8.5,
        color: '#8A94A0'
      }
    }, u.id), /*#__PURE__*/React.createElement("td", {
      style: {
        fontWeight: 600,
        color: N,
        fontSize: 10.5,
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
      }
    }, u.type), /*#__PURE__*/React.createElement("td", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontWeight: 700
      }
    }, u.beds), /*#__PURE__*/React.createElement("td", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        color: '#5A6475'
      }
    }, u.area), /*#__PURE__*/React.createElement("td", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontWeight: 700,
        color: G,
        fontSize: 10
      }
    }, purpose === 'rent' ? '$' + u.usd.toLocaleString() : u.egpM + 'M'), /*#__PURE__*/React.createElement("td", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontWeight: 700,
        color: u.ai >= 9.5 ? '#059669' : G,
        fontSize: 10.5
      }
    }, u.ai), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
      className: u.status === 'Available' ? 'pill-av' : u.status === 'Under Offer' ? 'pill-uo' : 'pill-so'
    }, u.status === 'Available' ? t.pAv : u.status === 'Under Offer' ? t.pUO : t.pSold)), /*#__PURE__*/React.createElement("td", null, u.status !== 'Sold' && /*#__PURE__*/React.createElement("button", {
      onClick: function (e) {
        e.stopPropagation();
        window.open('https://wa.me/201061399688?text=' + encodeURIComponent('Hi Sierra! Interested in unit ' + u.id + ' (' + u.beds + 'BR ' + u.type + ', EGP ' + u.egpM + 'M)'), '_blank');
      },
      style: {
        background: '#25D366',
        color: '#fff',
        border: 'none',
        borderRadius: 5,
        padding: '3px 7px',
        fontSize: 8,
        fontWeight: 900,
        cursor: 'pointer'
      }
    }, "WA")));
  }), units.length === 0 && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "8",
    style: {
      textAlign: 'center',
      padding: '22px',
      color: '#8A94A0',
      fontSize: 12
    }
  }, "No units match."))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 16px 24px',
      borderTop: '1px solid rgba(13,32,53,.07)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '11px',
      borderRadius: 10,
      background: N,
      color: 'rgba(200,150,26,.9)',
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: '.07em',
      textTransform: 'uppercase',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'Inter'
    }
  }, "\uD83D\uDCDE Contact Agent for ", cpd.n)));
}

/* ── LISTING SHEET · FULL PROPERTY PAGE ── */
var PROP_INTERIORS = ['https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=900&q=85', 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=900&q=85', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=85', 'https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?w=900&q=85', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=85'];
function ListSheet(props) {
  var item = props.item,
    purpose = props.purpose,
    onClose = props.onClose,
    saved = props.saved,
    onSave = props.onSave;
  var c = useApp();
  var lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var gi = useState(0);
  var setGi = gi[1];
  gi = gi[0];
  var openPlan = useState(0);
  var setOpenPlan = openPlan[1];
  openPlan = openPlan[0];
  var room = useState(0);
  var setRoom = room[1];
  room = room[0];
  var pan = useState({
    x: 50,
    y: 50
  });
  var setPan = pan[1];
  pan = pan[0];
  var dragRef = useRef({
    on: false,
    lx: 0,
    ly: 0
  });
  useEffect(function () {
    if (item) {
      setGi(0);
      setRoom(0);
      setPan({
        x: 50,
        y: 50
      });
      var sc = document.getElementById('root-scroll');
    }
  }, [item && item.id]);
  if (!item) return null;
  var pr = purpose === 'rent' ? '$' + item.usd.toLocaleString() + '/mo' : 'EGP ' + item.egpM + 'M';
  var prShort = purpose === 'rent' ? '$' + (item.usd / 1000).toFixed(1) + 'K/mo' : 'EGP ' + item.egpM + 'M';
  var perUnit = purpose === 'rent' ? '$' + Math.round(item.usd / item.area) + ' / m² · mo' : 'EGP ' + Math.round(item.egpM * 1e6 / item.area).toLocaleString() + ' / m²';
  var isGold = item.tag === 'Premium' || item.tag === 'Exclusive';
  var waText = encodeURIComponent('Hi Sierra! Interested in: ' + item.beds + 'BR ' + item.type + ' at ' + item.cmp + ' — ' + pr + ' (AI ' + item.ai + '/10)');
  var gallery = [item.img].concat(PROP_INTERIORS);
  var garage = item.beds >= 5 ? 2 : 1;
  var built = 2015 + item.id % 8;
  var overview = [{
    icon: '⌂',
    value: item.type.split(' ')[0],
    label: isAr ? 'النوع' : 'Type'
  }, {
    icon: '⌥',
    value: item.beds,
    label: isAr ? 'غرف' : 'Bedrooms'
  }, {
    icon: '≋',
    value: item.bath,
    label: isAr ? 'حمامات' : 'Bathrooms'
  }, {
    icon: '⬚',
    value: item.area.toLocaleString(),
    label: isAr ? 'م²' : 'Sq M'
  }, {
    icon: '⛝',
    value: garage,
    label: isAr ? 'جراج' : 'Garage'
  }, {
    icon: '◷',
    value: built,
    label: isAr ? 'سنة البناء' : 'Built'
  }];
  var features = ['Central A/C', 'Smart Home', 'Private Garden', 'Clubhouse', 'Gym & Spa', 'Swimming Pool', '24/7 Security', 'Covered Parking', 'Kids Area', 'Landscaped', 'Backup Power', 'High-Speed Fiber'];
  var plans = [{
    name: isAr ? 'الطابق الأرضي' : 'Ground Floor',
    beds: Math.max(1, item.beds - 2),
    baths: Math.max(1, item.bath - 1),
    size: Math.round(item.area * 0.55) + ' m²'
  }, {
    name: isAr ? 'الطابق الأول' : 'Upper Floor',
    beds: 2,
    baths: item.bath - Math.max(1, item.bath - 1) || 1,
    size: Math.round(item.area * 0.45) + ' m²'
  }];
  var details = [{
    label: isAr ? 'كود الوحدة' : 'Property ID',
    value: item.cmp.substr(0, 2).toUpperCase() + '-' + (100 + item.id)
  }, {
    label: isAr ? 'المساحة' : 'Property Size',
    value: item.area + ' m²'
  }, {
    label: isAr ? 'تقييم الذكاء' : 'AI Score',
    value: item.ai + ' / 10'
  }, {
    label: isAr ? 'المقدم' : 'Down Payment',
    value: '15%'
  }, {
    label: isAr ? 'التسليم' : 'Delivery',
    value: (2026 + item.id % 3).toString()
  }, {
    label: isAr ? 'الحالة' : 'Status',
    value: item.tag || (isAr ? 'متاح' : 'Available')
  }, {
    label: isAr ? 'التشطيب' : 'Finishing',
    value: isAr ? 'سوبر لوكس' : 'Super Lux'
  }, {
    label: isAr ? 'الكمبوند' : 'Compound',
    value: item.cmp
  }];
  var rooms = [{
    name: isAr ? 'المعيشة' : 'Living Area',
    img: gallery[0]
  }, {
    name: isAr ? 'الماستر' : 'Master Suite',
    img: PROP_INTERIORS[1]
  }, {
    name: isAr ? 'الحديقة' : 'Private Garden',
    img: PROP_INTERIORS[2]
  }, {
    name: isAr ? 'المسبح' : 'Pool Deck',
    img: PROP_INTERIORS[3]
  }, {
    name: isAr ? 'الواجهة' : 'Villa Exterior',
    img: PROP_INTERIORS[4]
  }];
  var curRoom = rooms[room] || rooms[0];
  function tourDown(e) {
    var p = e.touches ? e.touches[0] : e;
    dragRef.current = {
      on: true,
      lx: p.clientX,
      ly: p.clientY
    };
  }
  function tourMove(e) {
    if (!dragRef.current.on) return;
    var p = e.touches ? e.touches[0] : e;
    var dx = p.clientX - dragRef.current.lx,
      dy = p.clientY - dragRef.current.ly;
    dragRef.current.lx = p.clientX;
    dragRef.current.ly = p.clientY;
    var cl = function (v, lo, hi) {
      return Math.max(lo, Math.min(hi, v));
    };
    setPan(function (s) {
      return {
        x: cl(s.x - dx * 0.06, 0, 100),
        y: cl(s.y - dy * 0.06, 15, 85)
      };
    });
  }
  function tourUp() {
    dragRef.current.on = false;
  }
  var eyeStyle = {
    fontFamily: "'JetBrains Mono',monospace",
    fontSize: 8,
    letterSpacing: '.22em',
    color: G,
    textTransform: 'uppercase'
  };
  var h2Style = {
    fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
    fontSize: 26,
    fontWeight: isAr ? 700 : 400,
    color: '#fff',
    lineHeight: 1.1,
    marginBottom: 14
  };
  function eyebrow(label) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
        flexDirection: isAr ? 'row-reverse' : 'row'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 18,
        height: 1.5,
        background: G
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: eyeStyle
    }, label));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 640,
      background: 'rgba(4,8,15,.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    onClick: function (e) {
      if (e.target === e.currentTarget) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    dir: isAr ? 'rtl' : 'ltr',
    style: {
      width: 393,
      maxWidth: '100vw',
      height: 852,
      maxHeight: '100vh',
      background: '#071524',
      overflowY: 'auto',
      overflowX: 'hidden',
      position: 'relative',
      animation: 'slideUp .4s cubic-bezier(.16,1,.3,1) both',
      boxShadow: '0 40px 120px rgba(0,0,0,.7)'
    },
    className: "scr"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 80,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      background: 'rgba(7,21,36,.82)',
      backdropFilter: 'blur(18px)',
      borderBottom: '1px solid rgba(200,150,26,.12)',
      flexDirection: isAr ? 'row-reverse' : 'row'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: 'rgba(255,255,255,.06)',
      border: '1px solid rgba(255,255,255,.12)',
      color: '#fff',
      fontSize: 16,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, isAr ? '→' : '←'), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: HEADING_FONT,
      fontSize: 14,
      fontWeight: 700,
      letterSpacing: '.16em',
      color: G,
      lineHeight: 1
    }
  }, "SIERRA ESTATES"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 6,
      letterSpacing: '.28em',
      color: 'rgba(200,150,26,.5)',
      marginTop: 2
    }
  }, "AI REAL ESTATE")), /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      onSave && onSave(item.id);
    },
    style: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: 'rgba(255,255,255,.06)',
      border: '1px solid rgba(255,255,255,.12)',
      color: saved && saved.has(item.id) ? '#ef4444' : '#fff',
      fontSize: 15,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, saved && saved.has(item.id) ? '♥' : '♡')), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onScroll: function (e) {
      var el = e.target;
      var idx = Math.round(el.scrollLeft / el.clientWidth);
      if (idx !== gi) setGi(idx);
    },
    style: {
      display: 'flex',
      overflowX: 'auto',
      scrollSnapType: 'x mandatory',
      height: 380
    },
    className: "gal-track"
  }, gallery.map(function (im, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: '0 0 100%',
        scrollSnapAlign: 'start',
        position: 'relative',
        overflow: 'hidden',
        height: 380
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url(' + im + ')',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        animation: 'kenBurns 16s ease-in-out infinite alternate'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top,rgba(7,21,36,.92) 0%,rgba(7,21,36,.1) 40%,rgba(7,21,36,.3) 100%)'
      }
    }));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 14,
      left: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      padding: '4px 10px',
      borderRadius: 20,
      background: 'rgba(7,21,36,.85)',
      border: '1px solid rgba(200,150,26,.45)',
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 9,
      fontWeight: 700,
      color: G
    }
  }, "\u2605 AI ", item.ai), item.tag && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 14,
      right: 14,
      background: isGold ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'rgba(7,21,36,.85)',
      color: isGold ? N : 'rgba(200,150,26,.9)',
      border: isGold ? 'none' : '1px solid rgba(200,150,26,.3)',
      fontSize: 9,
      fontWeight: 900,
      letterSpacing: '.08em',
      padding: '4px 10px',
      borderRadius: 20,
      textTransform: 'uppercase'
    }
  }, item.tag), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 22,
      left: 20,
      right: 20,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      marginBottom: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 1.5,
      background: G,
      display: 'block'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8,
      letterSpacing: '.22em',
      color: G,
      textTransform: 'uppercase'
    }
  }, item.type, " \xB7 ", purpose === 'rent' ? isAr ? 'للإيجار' : 'For Rent' : isAr ? 'للبيع' : 'For Sale')), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
      fontSize: 32,
      fontWeight: isAr ? 700 : 400,
      fontStyle: isAr ? 'normal' : 'italic',
      color: '#fff',
      lineHeight: 1,
      textShadow: '0 3px 16px rgba(0,0,0,.5)'
    }
  }, item.beds, "BR ", item.type)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 10,
      color: 'rgba(255,255,255,.6)',
      background: 'rgba(7,21,36,.6)',
      padding: '4px 9px',
      borderRadius: 8,
      backdropFilter: 'blur(6px)'
    }
  }, gi + 1, " / ", gallery.length)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 12,
      left: 20,
      display: 'flex',
      gap: 5
    }
  }, gallery.map(function (_, i) {
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        height: 4,
        borderRadius: 3,
        transition: 'all .3s',
        width: i === gi ? 18 : 4,
        background: i === gi ? G : 'rgba(255,255,255,.35)'
      }
    });
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 20px 20px',
      borderBottom: '1px solid rgba(200,150,26,.1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      flexDirection: isAr ? 'row-reverse' : 'row'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: isAr ? 'right' : 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 25,
      fontWeight: 700,
      lineHeight: 1,
      background: 'linear-gradient(90deg,#E9C176,#C8961A 45%,#E9C176)',
      backgroundSize: '200%',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      animation: 'shimmer 6s linear infinite'
    }
  }, pr), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'rgba(255,255,255,.45)',
      marginTop: 6,
      fontFamily: "'JetBrains Mono',monospace"
    }
  }, perUnit)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: isAr ? 'left' : 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'rgba(255,255,255,.7)',
      fontSize: 12
    }
  }, "\uD83D\uDCCD ", item.cmp), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.35)',
      marginTop: 3
    }
  }, isAr ? 'القاهرة الجديدة' : 'New Cairo, Egypt')))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 20px 6px'
    }
  }, eyebrow(isAr ? 'نظرة عامة' : 'Property Overview'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 9
    }
  }, overview.map(function (o, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        background: 'rgba(255,255,255,.05)',
        border: '1px solid rgba(200,150,26,.14)',
        borderRadius: 12,
        padding: '13px 10px',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: G,
        fontSize: 17,
        lineHeight: 1
      }
    }, o.icon), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: HEADING_FONT,
        fontSize: 20,
        fontWeight: 600,
        color: '#fff',
        lineHeight: 1,
        marginTop: 8
      }
    }, o.value), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,.4)',
        marginTop: 4
      }
    }, o.label));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '26px 20px 6px'
    }
  }, eyebrow(isAr ? 'الوحدة' : 'The Residence'), /*#__PURE__*/React.createElement("h2", {
    style: h2Style
  }, isAr ? 'مساحة مدروسة' : 'A Considered Space'), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      lineHeight: 1.8,
      color: 'rgba(255,255,255,.55)',
      marginBottom: 12
    }
  }, isAr ? 'وحدة ' + item.type + ' فاخرة بمساحة ' + item.area + ' م² في ' + item.cmp + '، بتشطيب سوبر لوكس وإطلالات مفتوحة. صُممت كل مساحة لتعيش مع ضوء النهار.' : 'A ' + item.area + ' m² ' + item.type.toLowerCase() + ' in ' + item.cmp + ' with super-lux finishing, warm materials and light-filled volumes tuned for calm living.'), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      lineHeight: 1.8,
      color: 'rgba(255,255,255,.55)'
    }
  }, isAr ? item.beds + ' غرف نوم و' + item.bath + ' حمامات تطل على مساحات خضراء خاصة — على بعد دقائق من قلب القاهرة الجديدة.' : item.beds + ' bedrooms and ' + item.bath + ' baths open onto private landscaping — minutes from the heart of New Cairo.')), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '26px 20px 6px'
    }
  }, eyebrow((isAr ? 'المرافق · ' : 'Amenities · ') + features.length), /*#__PURE__*/React.createElement("h2", {
    style: h2Style
  }, isAr ? 'المميزات' : 'Features'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '11px 14px'
    }
  }, features.map(function (f, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        fontSize: 12.5,
        color: 'rgba(255,255,255,.7)',
        flexDirection: isAr ? 'row-reverse' : 'row',
        textAlign: isAr ? 'right' : 'left'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: G,
        fontSize: 13,
        flexShrink: 0
      }
    }, "\u2713"), f);
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '26px 20px 6px'
    }
  }, eyebrow(isAr ? 'التصميم' : 'Layout'), /*#__PURE__*/React.createElement("h2", {
    style: h2Style
  }, isAr ? 'المخططات' : 'Floor Plans'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, plans.map(function (pl, i) {
    var op = openPlan === i;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        border: '1px solid rgba(200,150,26,.16)',
        borderRadius: 14,
        overflow: 'hidden',
        background: 'rgba(255,255,255,.04)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: function () {
        setOpenPlan(op ? -1 : i);
      },
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '15px 16px',
        cursor: 'pointer',
        flexDirection: isAr ? 'row-reverse' : 'row'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        flexDirection: isAr ? 'row-reverse' : 'row'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: 'rgba(200,150,26,.14)',
        border: '1px solid rgba(200,150,26,.3)',
        color: G,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14
      }
    }, op ? '−' : '+'), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: HEADING_FONT,
        fontSize: 18,
        fontWeight: 600,
        color: '#fff'
      }
    }, pl.name)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        fontSize: 10,
        color: 'rgba(255,255,255,.5)',
        fontFamily: "'JetBrains Mono',monospace"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: G
      }
    }, "\u2325 ", pl.beds), /*#__PURE__*/React.createElement("span", {
      style: {
        color: G
      }
    }, "\u224B ", pl.baths))), op && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '0 16px 16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 160,
        borderRadius: 10,
        background: 'repeating-linear-gradient(45deg,rgba(200,150,26,.06) 0 12px,rgba(200,150,26,.02) 12px 24px)',
        border: '1px dashed rgba(200,150,26,.22)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 10,
        color: 'rgba(200,150,26,.6)'
      }
    }, "FLOOR PLAN \xB7 ", pl.size)));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '26px 20px 6px'
    }
  }, eyebrow(isAr ? 'المواصفات' : 'Specifications'), /*#__PURE__*/React.createElement("h2", {
    style: h2Style
  }, isAr ? 'التفاصيل' : 'Details'), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid rgba(200,150,26,.14)',
      borderRadius: 14,
      overflow: 'hidden'
    }
  }, details.map(function (d, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 15px',
        borderBottom: i < details.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none',
        background: 'rgba(255,255,255,.02)',
        flexDirection: isAr ? 'row-reverse' : 'row'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: 'rgba(255,255,255,.5)'
      }
    }, d.label), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 12,
        fontWeight: 600,
        color: '#fff'
      }
    }, d.value));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '26px 0 6px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px'
    }
  }, eyebrow(isAr ? 'جولة ثنائية الأبعاد' : 'Immersive 2D Tour'), /*#__PURE__*/React.createElement("h2", {
    style: h2Style
  }, isAr ? 'جولة افتراضية' : 'Virtual Walkthrough')), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      margin: '0 20px',
      borderRadius: 16,
      overflow: 'hidden',
      border: '1px solid rgba(200,150,26,.2)',
      cursor: 'grab',
      userSelect: 'none',
      touchAction: 'none'
    },
    onMouseDown: tourDown,
    onMouseMove: tourMove,
    onMouseUp: tourUp,
    onMouseLeave: tourUp,
    onTouchStart: tourDown,
    onTouchMove: tourMove,
    onTouchEnd: tourUp
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 250,
      backgroundImage: 'url(' + curRoom.img + ')',
      backgroundSize: '280%',
      backgroundPosition: pan.x + '% ' + pan.y + '%',
      backgroundRepeat: 'no-repeat'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(to top,rgba(7,21,36,.85) 0%,transparent 45%,transparent 72%,rgba(7,21,36,.4) 100%)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 10,
      left: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      padding: '5px 11px',
      borderRadius: 9,
      background: 'rgba(7,21,36,.75)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(200,150,26,.2)',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.55)'
    }
  }, "\u2725 ", isAr ? 'اسحب للاستكشاف' : 'Drag to explore')), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 10,
      left: 12,
      fontFamily: HEADING_FONT,
      fontSize: 20,
      fontWeight: 500,
      color: '#fff',
      lineHeight: 1,
      textShadow: '0 2px 10px rgba(0,0,0,.5)',
      pointerEvents: 'none'
    }
  }, curRoom.name), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 12,
      right: 12,
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 10,
      color: 'rgba(255,255,255,.45)',
      pointerEvents: 'none'
    }
  }, room + 1, " / ", rooms.length)), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto',
      padding: '12px 0 4px'
    },
    className: "gal-track"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 7,
      padding: '0 20px',
      width: 'max-content'
    }
  }, rooms.map(function (r, i) {
    var on = i === room;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: function () {
        setRoom(i);
        setPan({
          x: 50,
          y: 50
        });
      },
      style: {
        padding: '7px 13px',
        borderRadius: 22,
        fontSize: 10,
        fontWeight: 600,
        cursor: 'pointer',
        flexShrink: 0,
        border: '1px solid ' + (on ? G : 'rgba(200,150,26,.2)'),
        background: on ? G : 'rgba(200,150,26,.07)',
        color: on ? N : 'rgba(200,150,26,.85)'
      }
    }, r.name);
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '26px 20px 6px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid rgba(200,150,26,.18)',
      borderRadius: 18,
      overflow: 'hidden',
      background: 'linear-gradient(150deg,rgba(26,51,84,.6),rgba(7,21,36,.4))'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      borderBottom: '1px solid rgba(200,150,26,.12)',
      flexDirection: isAr ? 'row-reverse' : 'row'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=160&q=80",
    alt: "",
    style: {
      width: 62,
      height: 62,
      borderRadius: 14,
      objectFit: 'cover',
      border: '1.5px solid rgba(200,150,26,.4)',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      textAlign: isAr ? 'right' : 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 7.5,
      letterSpacing: '.16em',
      color: G,
      textTransform: 'uppercase',
      marginBottom: 3
    }
  }, isAr ? 'المستشار' : 'Listing Agent'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: HEADING_FONT,
      fontSize: 22,
      fontWeight: 600,
      color: '#fff',
      lineHeight: 1
    }
  }, "Layla Hassan"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'rgba(255,255,255,.5)',
      marginTop: 6
    }
  }, "\u2605 4.9 \xB7 Sierra Estates"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    placeholder: isAr ? 'الاسم بالكامل' : 'Full name',
    style: {
      width: '100%',
      padding: '12px 14px',
      background: 'rgba(255,255,255,.05)',
      border: '1px solid rgba(200,150,26,.16)',
      borderRadius: 10,
      color: '#fff',
      fontSize: 13,
      outline: 'none',
      textAlign: isAr ? 'right' : 'left'
    }
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: isAr ? 'واتساب · +20 ...' : 'WhatsApp · +20 ...',
    style: {
      width: '100%',
      padding: '12px 14px',
      background: 'rgba(255,255,255,.05)',
      border: '1px solid rgba(200,150,26,.16)',
      borderRadius: 10,
      color: '#fff',
      fontSize: 13,
      outline: 'none',
      textAlign: isAr ? 'right' : 'left'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      window.open('https://wa.me/201061399688?text=' + waText, '_blank');
    },
    style: {
      flex: 1,
      padding: 12,
      border: '1px solid rgba(37,211,102,.5)',
      borderRadius: 10,
      background: 'rgba(37,211,102,.12)',
      color: '#25d366',
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, "\uD83D\uDCAC WhatsApp"), /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 1.3,
      padding: 12,
      border: 'none',
      borderRadius: 10,
      background: 'linear-gradient(135deg,' + G + ',' + GL + ')',
      color: N,
      fontSize: 12,
      fontWeight: 800,
      cursor: 'pointer'
    }
  }, isAr ? 'اطلب معلومات' : 'Request Info'))))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#04101d',
      padding: '30px 20px 26px',
      textAlign: 'center',
      marginTop: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: HEADING_FONT,
      fontSize: 16,
      fontWeight: 600,
      letterSpacing: '.16em',
      color: G
    }
  }, "SIERRA ESTATES"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8.5,
      color: 'rgba(255,255,255,.28)',
      letterSpacing: '.12em',
      marginTop: 5
    }
  }, "NEW CAIRO \xB7 AI-DRIVEN \xB7 2026")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      bottom: 0,
      zIndex: 85,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 16px',
      background: 'rgba(7,21,36,.96)',
      backdropFilter: 'blur(22px)',
      borderTop: '1px solid rgba(200,150,26,.14)',
      flexDirection: isAr ? 'row-reverse' : 'row'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      textAlign: isAr ? 'right' : 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 15,
      fontWeight: 700,
      color: GL,
      lineHeight: 1
    }
  }, prShort), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginTop: 2
    }
  }, item.beds, "BR \xB7 ", item.area, "m\xB2")), /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 1,
      padding: 13,
      border: 'none',
      borderRadius: 12,
      background: 'rgba(255,255,255,.08)',
      color: '#fff',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, "\uD83D\uDCDE ", t.call || 'Call'), /*#__PURE__*/React.createElement("button", {
    style: {
      position: 'relative',
      overflow: 'hidden',
      flex: 1.4,
      padding: 13,
      border: 'none',
      borderRadius: 12,
      background: 'linear-gradient(135deg,' + G + ',' + GL + ')',
      color: N,
      fontSize: 13,
      fontWeight: 800,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '40%',
      height: '100%',
      background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent)',
      animation: 'sheen 4.5s ease-in-out infinite'
    }
  }), isAr ? 'احجز معاينة' : 'Schedule Tour'))));
}

/* ── ROI SHEET ── */
function ROISheet(props) {
  var open = props.open,
    onClose = props.onClose;
  var c = useApp();
  var lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var price = useState(6);
  var setPrice = price[1];
  price = price[0];
  var rent = useState(6000);
  var setRent = rent[1];
  rent = rent[0];
  var gross = (rent * 12 / (price * 1e6) * 100).toFixed(2);
  var net = (gross * .75).toFixed(2);
  var gain5 = (price * 1.2).toFixed(1);
  var cash = Math.round(rent * 12 * .75).toLocaleString();
  var sorted = CPDS.slice().sort(function (a, b) {
    return parseFloat(b.g) - parseFloat(a.g);
  });
  if (!open) return null;
  return /*#__PURE__*/React.createElement(Sheet, {
    open: open,
    onClose: onClose,
    maxH: "90%"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 20px 8px',
      borderBottom: '1px solid rgba(13,32,53,.07)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8,
      letterSpacing: '.2em',
      color: G,
      textTransform: 'uppercase',
      marginBottom: 2
    }
  }, "AI SUPPORT \xB7 INVESTMENT"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: HEADING_FONT,
      fontSize: 22,
      fontWeight: 500,
      color: N
    }
  }, t.roiTit)), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'rgba(13,32,53,.3)',
      fontSize: 24
    }
  }, "\xD7"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '14px 20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: HEADING_FONT,
      fontSize: 18,
      fontWeight: 500,
      color: N,
      marginBottom: 10
    }
  }, "Yield Leaderboard"), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid rgba(13,32,53,.09)',
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 18
    }
  }, sorted.slice(0, 10).map(function (cpd, i) {
    var pct = parseFloat(cpd.g);
    var barW = Math.round(pct / 35 * 100);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'grid',
        gridTemplateColumns: '20px 1fr 52px',
        gap: 8,
        alignItems: 'center',
        padding: '10px 12px',
        borderTop: i > 0 ? '1px solid rgba(13,32,53,.06)' : 'none',
        background: i === 0 ? 'rgba(200,150,26,.04)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 10,
        fontWeight: 700,
        color: i < 3 ? G : '#8A94A0'
      }
    }, "#", i + 1), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        fontWeight: 600,
        color: N,
        marginBottom: 3
      }
    }, cpd.n), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 5,
        borderRadius: 3,
        background: 'rgba(13,32,53,.07)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        width: barW + '%',
        background: 'linear-gradient(90deg,' + GL + ',' + G + ')',
        borderRadius: 3
      }
    }))), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 13,
        fontWeight: 700,
        color: G,
        textAlign: 'right'
      }
    }, cpd.g));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px',
      borderRadius: 14,
      background: N,
      boxShadow: '0 8px 32px rgba(13,32,53,.3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: HEADING_FONT,
      fontSize: 18,
      fontWeight: 500,
      color: '#fff',
      marginBottom: 12
    }
  }, t.roiCalc), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.5)',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      fontFamily: 'Inter'
    }
  }, t.roiPrice), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 12,
      fontWeight: 700,
      color: G
    }
  }, "EGP ", price.toFixed(1), "M")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 1,
    max: 50,
    step: 0.5,
    value: price,
    onChange: function (e) {
      setPrice(+e.target.value);
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.5)',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      fontFamily: 'Inter'
    }
  }, t.roiRent, "/mo"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 12,
      fontWeight: 700,
      color: G
    }
  }, "$", rent.toLocaleString())), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 500,
    max: 15000,
    step: 100,
    value: rent,
    onChange: function (e) {
      setRent(+e.target.value);
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8
    }
  }, [[gross + '%', t.roiG], [net + '%', t.roiN], ['EGP ' + gain5 + 'M', t.roi5], ['$' + cash, t.roiCash]].map(function (pair, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        background: 'rgba(255,255,255,.07)',
        borderRadius: 10,
        padding: '11px 10px',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 18,
        fontWeight: 700,
        color: G,
        lineHeight: 1
      }
    }, pair[0]), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        letterSpacing: '.07em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,.4)',
        marginTop: 3,
        fontFamily: 'Inter'
      }
    }, pair[1]));
  })))));
}

/* ── PRICE SHEET ── */
function PriceSheet(props) {
  var open = props.open,
    onClose = props.onClose;
  var c = useApp();
  var lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var cpd = useState('Hyde Park');
  var setCpd = cpd[1];
  cpd = cpd[0];
  var area = useState(180);
  var setArea = area[1];
  area = area[0];
  var bds = useState(3);
  var setBds = bds[1];
  bds = bds[0];
  var fin = useState(1);
  var setFin = fin[1];
  fin = fin[0];
  var est = useMemo(function () {
    var base = (CPDS.find(function (x) {
      return x.n === cpd;
    }) || CPDS[0]).priceM;
    var af = area / 200;
    var ff = [0.85, 1, 1.25][fin];
    var bf = bds <= 2 ? .82 : bds <= 3 ? 1 : bds <= 4 ? 1.22 : 1.45;
    var mid = base * af * ff * bf;
    return {
      lo: (mid * .88).toFixed(1),
      hi: (mid * 1.12).toFixed(1),
      mid: mid.toFixed(1)
    };
  }, [cpd, area, bds, fin]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement(Sheet, {
    open: open,
    onClose: onClose,
    maxH: "90%"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 20px 8px',
      borderBottom: '1px solid rgba(13,32,53,.07)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8,
      letterSpacing: '.2em',
      color: G,
      textTransform: 'uppercase',
      marginBottom: 2
    }
  }, "AI SUPPORT \xB7 VALUATION"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: HEADING_FONT,
      fontSize: 22,
      fontWeight: 500,
      color: N
    }
  }, t.priceTit)), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'rgba(13,32,53,.3)',
      fontSize: 24
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: '#8A94A0',
      marginTop: 4,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, t.priceSub)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '14px 20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px',
      borderRadius: 14,
      background: 'linear-gradient(160deg,' + N2 + ',#091828)',
      marginBottom: 18,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8,
      letterSpacing: '.24em',
      textTransform: 'uppercase',
      color: GL,
      marginBottom: 8,
      opacity: .85
    }
  }, t.priceResult), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: HEADING_FONT,
      fontSize: 46,
      fontWeight: 600,
      color: GL,
      lineHeight: 1,
      marginBottom: 4
    }
  }, "EGP ", est.mid, "M"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'rgba(239,248,247,.5)',
      marginBottom: 14
    }
  }, "Range: EGP ", est.lo, "M \u2013 ", est.hi, "M"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'rgba(255,255,255,.08)',
      borderRadius: 8,
      padding: '10px 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.5)',
      fontFamily: 'Inter'
    }
  }, t.priceConf), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 11,
      fontWeight: 700,
      color: G
    }
  }, "88%")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      borderRadius: 3,
      background: 'rgba(255,255,255,.1)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: '88%',
      background: 'linear-gradient(90deg,' + GL + ',' + G + ')',
      borderRadius: 3
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid rgba(13,32,53,.1)',
      borderRadius: 10,
      padding: '10px 14px',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7.5,
      fontWeight: 700,
      letterSpacing: '.14em',
      textTransform: 'uppercase',
      color: '#8A94A0',
      marginBottom: 5,
      fontFamily: 'Inter'
    }
  }, t.priceCpd), /*#__PURE__*/React.createElement("select", {
    value: cpd,
    onChange: function (e) {
      setCpd(e.target.value);
    },
    style: {
      width: '100%',
      background: 'none',
      border: 'none',
      outline: 'none',
      fontSize: 13,
      fontWeight: 600,
      color: N,
      fontFamily: 'Inter',
      cursor: 'pointer'
    }
  }, CPDS.map(function (x) {
    return /*#__PURE__*/React.createElement("option", {
      key: x.n
    }, x.n);
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid rgba(13,32,53,.1)',
      borderRadius: 10,
      padding: '10px 14px',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7.5,
      fontWeight: 700,
      letterSpacing: '.14em',
      textTransform: 'uppercase',
      color: '#8A94A0',
      fontFamily: 'Inter'
    }
  }, t.priceArea), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 13,
      fontWeight: 700,
      color: G
    }
  }, area, " m\xB2")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 50,
    max: 900,
    step: 5,
    value: area,
    onChange: function (e) {
      setArea(+e.target.value);
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid rgba(13,32,53,.1)',
      borderRadius: 10,
      padding: '10px 14px',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7.5,
      fontWeight: 700,
      letterSpacing: '.14em',
      textTransform: 'uppercase',
      color: '#8A94A0',
      marginBottom: 8,
      fontFamily: 'Inter'
    }
  }, t.priceBeds), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 5
    }
  }, [1, 2, 3, 4, 5].map(function (b) {
    return /*#__PURE__*/React.createElement("button", {
      key: b,
      onClick: function () {
        setBds(b);
      },
      style: {
        flex: 1,
        padding: '8px',
        borderRadius: 9,
        border: '1px solid',
        fontFamily: 'Inter',
        fontWeight: 700,
        fontSize: 12,
        cursor: 'pointer',
        transition: 'all .18s',
        borderColor: bds === b ? G : 'rgba(13,32,53,.12)',
        background: bds === b ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'transparent',
        color: bds === b ? N : '#8A94A0'
      }
    }, b);
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid rgba(13,32,53,.1)',
      borderRadius: 10,
      padding: '10px 14px',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7.5,
      fontWeight: 700,
      letterSpacing: '.14em',
      textTransform: 'uppercase',
      color: '#8A94A0',
      marginBottom: 8,
      fontFamily: 'Inter'
    }
  }, t.priceFinish), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 5
    }
  }, t.finOpts.map(function (f, i) {
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: function () {
        setFin(i);
      },
      style: {
        flex: 1,
        padding: '7px 4px',
        borderRadius: 9,
        border: '1px solid',
        fontFamily: 'Inter',
        fontWeight: 600,
        fontSize: 10,
        cursor: 'pointer',
        transition: 'all .18s',
        borderColor: fin === i ? G : 'rgba(13,32,53,.12)',
        background: fin === i ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'transparent',
        color: fin === i ? N : '#8A94A0'
      }
    }, f);
  }))), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '12px',
      borderRadius: 10,
      background: N,
      color: 'rgba(200,150,26,.9)',
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'Inter'
    }
  }, "\uD83D\uDCDE Get Full Valuation Report \u2192")));
}

/* ── SMART MATCH SHEET ── */
function MatchSheet(props) {
  var open = props.open,
    onClose = props.onClose,
    purpose = props.purpose;
  var c = useApp();
  var lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var mode = useState(purpose);
  var setMode = mode[1];
  mode = mode[0];
  var q = useState('');
  var setQ = q[1];
  q = q[0];
  var bds = useState(null);
  var setBds = bds[1];
  bds = bds[0];
  var items = useMemo(function () {
    var all = [];
    Object.keys(UNITS).forEach(function (cmpName) {
      UNITS[cmpName].forEach(function (u) {
        all.push(Object.assign({}, u, {
          cmp: cmpName
        }));
      });
    });
    if (q) {
      var lq = q.toLowerCase();
      all = all.filter(function (u) {
        return u.cmp.toLowerCase().indexOf(lq) >= 0 || u.type.toLowerCase().indexOf(lq) >= 0;
      });
    }
    if (bds) all = all.filter(function (u) {
      return u.beds === bds;
    });
    return all.sort(function (a, b) {
      return b.ai - a.ai;
    });
  }, [q, bds]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement(Sheet, {
    open: open,
    onClose: onClose,
    maxH: "90%"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 20px 10px',
      borderBottom: '1px solid rgba(13,32,53,.07)',
      flexShrink: 0,
      direction: isAr ? 'rtl' : 'ltr'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8,
      letterSpacing: '.2em',
      color: G,
      textTransform: 'uppercase',
      marginBottom: 2
    }
  }, "AI SUPPORT \xB7 MATCHING"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: HEADING_FONT,
      fontSize: 22,
      fontWeight: 500,
      color: N
    }
  }, t.matchTit)), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'rgba(13,32,53,.3)',
      fontSize: 24
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      background: 'rgba(13,32,53,.06)',
      borderRadius: 10,
      padding: 3,
      marginBottom: 9
    }
  }, [['resale', t.resale], ['rent', t.rent]].map(function (pair) {
    return /*#__PURE__*/React.createElement("button", {
      key: pair[0],
      onClick: function () {
        setMode(pair[0]);
      },
      style: {
        flex: 1,
        padding: '7px',
        borderRadius: 8,
        border: 'none',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'Inter',
        transition: 'all .2s',
        background: mode === pair[0] ? 'linear-gradient(135deg,' + G + ',' + GL + ')' : 'transparent',
        color: mode === pair[0] ? N : '#8A94A0'
      }
    }, pair[1]);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "rgba(13,32,53,.4)",
    strokeWidth: "2.5",
    style: {
      position: 'absolute',
      left: 10,
      top: '50%',
      transform: 'translateY(-50%)'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.3-4.3"
  })), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: function (e) {
      setQ(e.target.value);
    },
    placeholder: "Filter by compound or type\u2026",
    style: {
      width: '100%',
      paddingLeft: 28,
      paddingRight: 10,
      paddingTop: 8,
      paddingBottom: 8,
      background: 'rgba(13,32,53,.05)',
      border: '1px solid rgba(13,32,53,.1)',
      borderRadius: 9,
      fontSize: 12,
      color: N,
      outline: 'none',
      fontFamily: 'Inter'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      flexWrap: 'wrap'
    }
  }, [null, 1, 2, 3, 4, 5].map(function (b) {
    return /*#__PURE__*/React.createElement("button", {
      key: b == null ? 'a' : b,
      onClick: function () {
        setBds(bds === b ? null : b);
      },
      style: {
        padding: '3px 9px',
        borderRadius: 20,
        fontSize: 9.5,
        fontWeight: 600,
        cursor: 'pointer',
        border: '1px solid',
        fontFamily: 'Inter',
        transition: 'all .15s',
        borderColor: bds === b ? G : 'rgba(13,32,53,.12)',
        background: bds === b ? 'rgba(200,150,26,.13)' : 'transparent',
        color: bds === b ? G : '#8A94A0'
      }
    }, b == null ? t.any : b + 'B');
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '8px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9.5,
      color: '#8A94A0',
      marginBottom: 8,
      fontFamily: 'Inter'
    }
  }, items.length, " units \xB7 ranked by AI score"), items.slice(0, 30).map(function (u) {
    return /*#__PURE__*/React.createElement("div", {
      key: u.id,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px',
        borderRadius: 10,
        border: '1px solid rgba(13,32,53,.08)',
        marginBottom: 7,
        background: '#fff'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 36,
        borderRadius: 8,
        background: 'linear-gradient(135deg,' + N + ',' + N3 + ')',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 10,
        fontWeight: 800,
        color: G
      }
    }, u.ai)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 7.5,
        color: N,
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        marginBottom: 1
      }
    }, u.cmp), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: HEADING_FONT,
        fontSize: 13,
        fontWeight: 600,
        color: N,
        lineHeight: 1.2
      }
    }, u.beds, "B ", u.type, " \xB7 ", u.area, "m\xB2")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'right',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 12,
        fontWeight: 700,
        color: G
      }
    }, mode === 'rent' ? '$' + u.usd.toLocaleString() : u.egpM + 'M'), /*#__PURE__*/React.createElement("span", {
      className: u.status === 'Available' ? 'pill-av' : u.status === 'Under Offer' ? 'pill-uo' : 'pill-so'
    }, u.status === 'Available' ? t.pAv : u.status === 'Under Offer' ? t.pUO : t.pSold)));
  })));
}

/* ── DREAM SHEET ── */
function DreamSheet(props) {
  var open = props.open,
    onClose = props.onClose;
  var c = useApp();
  var lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var step = useState(0);
  var setStep = step[1];
  step = step[0];
  var answers = useState([]);
  var setAnswers = answers[1];
  answers = answers[0];
  var done = useState(false);
  var setDone = done[1];
  done = done[0];
  function pick(opt) {
    var a = answers.concat([opt]);
    setAnswers(a);
    if (step < 3) setStep(function (s) {
      return s + 1;
    });else setDone(true);
  }
  function reset() {
    setStep(0);
    setAnswers([]);
    setDone(false);
  }
  var priority = answers[0] || Object.keys(t.dreamRes)[0];
  var res = t.dreamRes[priority] || Object.values(t.dreamRes)[0];
  if (!open) return null;
  return /*#__PURE__*/React.createElement(Sheet, {
    open: open,
    onClose: onClose,
    maxH: "88%"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 20px 10px',
      borderBottom: '1px solid rgba(13,32,53,.07)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8,
      letterSpacing: '.2em',
      color: G,
      textTransform: 'uppercase',
      marginBottom: 2
    }
  }, "AI SUPPORT \xB7 DECISION"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: HEADING_FONT,
      fontSize: 20,
      fontWeight: 500,
      color: N
    }
  }, t.dreamTit)), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'rgba(13,32,53,.3)',
      fontSize: 24
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 5
    }
  }, [0, 1, 2, 3].map(function (i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        background: i < (done ? 4 : step) ? 'linear-gradient(90deg,' + GL + ',' + G + ')' : 'rgba(13,32,53,.1)',
        transition: 'background .4s'
      }
    });
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '16px 20px'
    }
  }, done ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      animation: 'popIn .5s cubic-bezier(.16,1,.3,1) both'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 44,
      marginBottom: 8
    }
  }, "\uD83C\uDFC6"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8,
      letterSpacing: '.2em',
      color: G,
      textTransform: 'uppercase',
      marginBottom: 5
    }
  }, "YOUR PERFECT MATCH"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: HEADING_FONT,
      fontSize: 32,
      fontWeight: 600,
      color: N,
      marginBottom: 4,
      lineHeight: 1.1
    }
  }, res[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 10,
      color: G,
      marginBottom: 16
    }
  }, res[1]), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'rgba(13,32,53,.6)',
      lineHeight: 1.6,
      background: IV,
      borderRadius: 12,
      padding: '13px 15px',
      marginBottom: 18,
      textAlign: 'left'
    }
  }, res[2]), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: reset,
    style: {
      flex: 1,
      padding: '11px',
      borderRadius: 10,
      border: '1px solid rgba(13,32,53,.14)',
      background: 'none',
      color: '#8A94A0',
      fontSize: 11,
      cursor: 'pointer',
      fontFamily: 'Inter'
    }
  }, "Start Over"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      flex: 1,
      padding: '11px',
      borderRadius: 10,
      background: N,
      color: 'rgba(200,150,26,.9)',
      fontSize: 11,
      fontWeight: 800,
      textTransform: 'uppercase',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'Inter'
    }
  }, "View Units \u2192"))) : /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: HEADING_FONT,
      fontSize: 26,
      fontWeight: 500,
      color: N,
      marginBottom: 4,
      lineHeight: 1.15
    }
  }, t.dq[step]), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: '#8A94A0',
      marginBottom: 20,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, t.dh[step]), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, t.do[step].map(function (o, i) {
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: function () {
        pick(o.t);
      },
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: '14px 16px',
        border: '1px solid rgba(13,32,53,.1)',
        borderRadius: 13,
        cursor: 'pointer',
        transition: 'all .22s',
        background: 'none',
        fontFamily: 'inherit',
        textAlign: 'left'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 42,
        height: 42,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        background: 'rgba(13,32,53,.06)',
        fontSize: 20,
        flexShrink: 0
      }
    }, o.ic), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: N,
        marginBottom: 2,
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
      }
    }, o.t), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#8A94A0',
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
      }
    }, o.d)));
  })), step > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setStep(function (s) {
        return s - 1;
      });
      setAnswers(function (a) {
        return a.slice(0, -1);
      });
    },
    style: {
      marginTop: 16,
      background: 'none',
      border: 'none',
      color: '#8A94A0',
      fontFamily: 'Inter',
      fontSize: 11,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, t.dreamBack))));
}

/* ── AI ENGINE SHEET ── */
function AIEngineSheet(props) {
  var open = props.open,
    onClose = props.onClose;
  var wide = useWide();
  var c = useApp();
  var isAr = c.lang === 'ar';
  var animDone = useState(false);
  var setAnimDone = animDone[1];
  animDone = animDone[0];
  useEffect(function () {
    if (open) setTimeout(function () {
      setAnimDone(true);
    }, 400);else setAnimDone(false);
  }, [open]);
  var PRICE_PTS = [{
    y: '2020',
    v: 3.2
  }, {
    y: '2021',
    v: 4.1
  }, {
    y: '2022',
    v: 5.8
  }, {
    y: '2023',
    v: 8.4
  }, {
    y: '2024',
    v: 11.9
  }, {
    y: '2026',
    v: 16.2
  }];
  var ROI_BARS = [{
    n: 'Uptown Cairo',
    p: 31
  }, {
    n: 'Mountain View',
    p: 24
  }, {
    n: 'Hyde Park',
    p: 22
  }, {
    n: 'Palm Hills NC',
    p: 21
  }, {
    n: 'Villette',
    p: 20
  }, {
    n: 'SODIC East',
    p: 18
  }, {
    n: 'Mivida',
    p: 18
  }, {
    n: 'Eastown',
    p: 19
  }];
  var W = 320,
    H = 140,
    PL = 32,
    PR = 12,
    PT = 8,
    PB = 28;
  var maxV = 18;
  var pts = PRICE_PTS.map(function (d, i) {
    var x = PL + i / (PRICE_PTS.length - 1) * (W - PL - PR);
    var y = H - PB - d.v / maxV * (H - PT - PB);
    return {
      x: x,
      y: y,
      yLabel: d.y,
      v: d.v
    };
  });
  var pathD = pts.map(function (p, i) {
    return (i === 0 ? 'M ' : 'L ') + p.x + ',' + p.y;
  }).join(' ');
  var fillD = 'M ' + pts[0].x + ',' + (H - PB) + ' ' + pts.map(function (p) {
    return 'L ' + p.x + ',' + p.y;
  }).join(' ') + ' L ' + pts[pts.length - 1].x + ',' + (H - PB) + ' Z';
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 550,
      background: 'rgba(4,8,15,.78)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: wide ? 'center' : 'flex-end',
      justifyContent: 'center',
      padding: wide ? 24 : 0
    },
    onClick: function (e) {
      if (e.target === e.currentTarget) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#09090f',
      borderRadius: wide ? 24 : '22px 22px 0 0',
      width: wide ? 'min(720px, 94vw)' : '100%',
      maxHeight: wide ? 'min(85vh, 860px)' : '92%',
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideUp .4s cubic-bezier(.16,1,.3,1) both',
      boxShadow: '0 -20px 80px rgba(0,0,0,.6),0 0 0 1px rgba(200,150,26,.15)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '10px 0 0',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 3.5,
      borderRadius: 2,
      background: 'rgba(200,150,26,.25)',
      margin: '0 auto'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 20px 10px',
      borderBottom: '1px solid rgba(200,150,26,.15)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 7.5,
      letterSpacing: '.22em',
      color: 'rgba(200,150,26,.6)',
      textTransform: 'uppercase',
      marginBottom: 3
    }
  }, "INTELLIGENCE OS PLATFORM"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: HEADING_FONT,
      fontSize: 22,
      fontWeight: 400,
      color: '#fff',
      lineHeight: 1.1
    }
  }, "AI Engine ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontStyle: 'italic',
      background: 'linear-gradient(90deg,' + GL + ',' + G + ')',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      WebkitTextFillColor: 'transparent'
    }
  }, "3.0"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '3px 8px',
      borderRadius: 4,
      background: 'rgba(52,211,153,.12)',
      border: '1px solid rgba(52,211,153,.25)',
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8,
      fontWeight: 700,
      color: '#34d399',
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 5,
      height: 5,
      borderRadius: '50%',
      background: '#34d399',
      animation: 'blink 2s ease infinite',
      display: 'block'
    }
  }), "LIVE"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'rgba(255,255,255,.3)',
      fontSize: 22,
      lineHeight: 1
    }
  }, "\xD7")))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '16px 20px 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20,
      padding: '16px',
      borderRadius: 14,
      background: 'rgba(255,255,255,.04)',
      border: '1px solid rgba(200,150,26,.12)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: G,
      display: 'block',
      animation: 'blink 2s ease infinite'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8,
      letterSpacing: '.16em',
      color: 'rgba(240,237,229,.4)',
      textTransform: 'uppercase'
    }
  }, "AVM PREDICTIVE PRICING ENGINE"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      padding: '2px 7px',
      borderRadius: 4,
      background: 'rgba(52,211,153,.1)',
      border: '1px solid rgba(52,211,153,.22)',
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 7.5,
      fontWeight: 700,
      color: '#34d399'
    }
  }, "LIVE")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'rgba(240,237,229,.3)',
      marginBottom: 10,
      fontFamily: 'Inter'
    }
  }, "Avg compound price \xB7 EGP millions \xB7 2020\u20132026"), /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    viewBox: '0 0 ' + W + ' ' + H,
    style: {
      overflow: 'visible'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "fg2",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: G,
    stopOpacity: ".3"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: G,
    stopOpacity: "0"
  }))), [.25, .5, .75, 1].map(function (f, i) {
    var y2 = PT + (1 - f) * (H - PT - PB);
    return /*#__PURE__*/React.createElement("line", {
      key: i,
      x1: PL,
      y1: y2,
      x2: W - PR,
      y2: y2,
      stroke: "rgba(255,255,255,.05)",
      strokeWidth: "1"
    });
  }), animDone && /*#__PURE__*/React.createElement("path", {
    d: fillD,
    fill: "url(#fg2)"
  }), animDone && /*#__PURE__*/React.createElement("path", {
    d: pathD,
    fill: "none",
    stroke: G,
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeDasharray: "800",
    strokeDashoffset: "0",
    style: {
      animation: 'lineGrow 1.2s .1s cubic-bezier(.16,1,.3,1) both'
    }
  }), pts.map(function (p, i) {
    return /*#__PURE__*/React.createElement("g", {
      key: i,
      style: {
        animation: 'dotAppear .5s ' + (.2 + i * .1) + 's both'
      }
    }, /*#__PURE__*/React.createElement("circle", {
      cx: p.x,
      cy: p.y,
      r: "4",
      fill: G,
      stroke: "rgba(9,9,15,.8)",
      strokeWidth: "1.5"
    }), /*#__PURE__*/React.createElement("text", {
      x: p.x,
      y: H - 6,
      fill: "rgba(240,237,229,.25)",
      fontSize: "8",
      textAnchor: "middle",
      fontFamily: "JetBrains Mono,monospace"
    }, p.yLabel));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginTop: 10
    }
  }, [['Hyde Park', 'EGP 18.5M'], ['Mountain View', 'EGP 11.2M'], ['Mivida', 'EGP 5.8M']].map(function (pair, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        padding: '8px 9px',
        borderRadius: 8,
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(200,150,26,.1)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'Inter',
        fontSize: 8.5,
        color: 'rgba(240,237,229,.4)',
        marginBottom: 3
      }
    }, pair[0]), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 11,
        fontWeight: 700,
        color: G
      }
    }, pair[1]));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20,
      padding: '16px',
      borderRadius: 14,
      background: 'rgba(255,255,255,.04)',
      border: '1px solid rgba(200,150,26,.12)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: '#34d399',
      display: 'block'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8,
      letterSpacing: '.16em',
      color: 'rgba(240,237,229,.4)',
      textTransform: 'uppercase'
    }
  }, "ROI COMPOUNDING YIELD")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 9
    }
  }, ROI_BARS.map(function (r, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'Inter',
        fontSize: 11,
        color: 'rgba(240,237,229,.75)',
        fontWeight: 500
      }
    }, r.n), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 12,
        fontWeight: 700,
        color: G
      }
    }, "+", r.p, "%")), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 5,
        borderRadius: 2.5,
        background: 'rgba(255,255,255,.07)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        borderRadius: 2.5,
        background: 'linear-gradient(90deg,' + GL + ',' + G + ')',
        width: animDone ? Math.round(r.p / 35 * 100) + '%' : '0%',
        transition: 'width .9s ' + (.05 + i * .07) + 's cubic-bezier(.16,1,.3,1)'
      }
    })));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      padding: '10px 12px',
      borderRadius: 10,
      background: 'rgba(200,150,26,.07)',
      border: '1px solid rgba(200,150,26,.18)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8,
      color: G,
      letterSpacing: '.12em',
      marginBottom: 4,
      textTransform: 'uppercase'
    }
  }, "Q2 2026 SIGNAL"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'Inter',
      fontSize: 10.5,
      color: 'rgba(240,237,229,.55)',
      lineHeight: 1.6
    }
  }, "Strong buy signals across 5th Settlement. Avg 22% YoY growth projected. Hyde Park & Uptown Cairo outperforming baseline."))), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      width: '100%',
      padding: '12px',
      borderRadius: 10,
      background: 'linear-gradient(135deg,' + G + ',' + GL + ')',
      color: N,
      fontSize: 11,
      fontWeight: 900,
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'Inter'
    }
  }, "\u2190 Back to App"))));
}

/* ── AI CHAT ── */
function ChatSheet(props) {
  var open = props.open,
    initQ = props.initQ,
    onClose = props.onClose;
  var wide = useWide();
  var c = useApp();
  var lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var msgs = useState([{
    r: 'ai',
    tx: t.aiResp.def
  }]);
  var setMsgs = msgs[1];
  msgs = msgs[0];
  var inp = useState('');
  var setInp = inp[1];
  inp = inp[0];
  var typing = useState(false);
  var setTyping = typing[1];
  typing = typing[0];
  var bRef = useRef(null);
  useEffect(function () {
    setMsgs([{
      r: 'ai',
      tx: t.aiResp.def
    }]);
  }, [lang]);
  useEffect(function () {
    if (bRef.current) bRef.current.scrollTop = bRef.current.scrollHeight;
  }, [msgs, typing]);
  useEffect(function () {
    if (open && initQ) doSend(initQ);
  }, [open, initQ]);
  function doSend(txt) {
    setMsgs(function (m) {
      return m.concat([{
        r: 'user',
        tx: txt
      }]);
    });
    setTyping(true);
    setTimeout(function () {
      var q = txt.toLowerCase();
      var ar = t.aiResp;
      var rep = q.indexOf('hyde') >= 0 ? ar.hyde : q.indexOf('mivida') >= 0 ? ar.mivida : q.indexOf('roi') >= 0 || q.indexOf('invest') >= 0 || q.indexOf('عائد') >= 0 ? ar.roi : q.indexOf('rent') >= 0 || q.indexOf('إيجار') >= 0 ? ar.rent : q.indexOf('compare') >= 0 || q.indexOf('قارن') >= 0 ? ar.compare : q.indexOf('invest') >= 0 ? ar.invest : ar.def;
      setMsgs(function (m) {
        return m.concat([{
          r: 'ai',
          tx: rep
        }]);
      });
      setTyping(false);
    }, 900 + Math.random() * 600);
  }
  function send() {
    if (!inp.trim()) return;
    var txt = inp.trim();
    setInp('');
    doSend(txt);
  }
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 600,
      background: 'rgba(4,8,15,.72)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: wide ? 'center' : 'flex-end',
      justifyContent: 'center',
      padding: wide ? 24 : 0
    },
    onClick: function (e) {
      if (e.target === e.currentTarget) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: wide ? 24 : '22px 22px 0 0',
      width: wide ? 'min(720px, 94vw)' : '100%',
      height: wide ? 'min(76vh, 760px)' : '72%',
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideUp .38s cubic-bezier(.16,1,.3,1) both',
      boxShadow: '0 -20px 60px rgba(13,32,53,.22)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 16px',
      background: N2,
      borderRadius: '22px 22px 0 0',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexShrink: 0,
      flexDirection: isAr ? 'row-reverse' : 'row'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: 'linear-gradient(135deg,' + G + ',' + GL + ')',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: HEADING_FONT,
      fontSize: 17,
      color: N,
      fontWeight: 700,
      flexShrink: 0
    }
  }, "S"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: isAr ? 'right' : 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: '#fff',
      lineHeight: 1,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, t.aiName), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8.5,
      color: '#4ade80',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
      flexDirection: isAr ? 'row-reverse' : 'row'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 5,
      height: 5,
      borderRadius: '50%',
      background: '#4ade80',
      display: 'block',
      animation: 'blink 2s ease infinite'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'Inter'
    }
  }, t.aiOn))), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      marginLeft: isAr ? 0 : 'auto',
      marginRight: isAr ? 'auto' : 0,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'rgba(255,255,255,.35)',
      fontSize: 22,
      lineHeight: 1
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    ref: bRef,
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, msgs.map(function (m, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        maxWidth: '88%',
        padding: '9px 12px',
        borderRadius: m.r === 'ai' ? '4px 13px 13px 13px' : '13px 4px 13px 13px',
        fontSize: 12,
        lineHeight: 1.55,
        background: m.r === 'ai' ? 'rgba(13,32,53,.06)' : 'linear-gradient(135deg,' + G + ',' + GL + ')',
        color: N,
        border: m.r === 'ai' ? '1px solid rgba(13,32,53,.08)' : 'none',
        alignSelf: m.r === 'ai' ? 'flex-start' : 'flex-end',
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
        textAlign: isAr ? 'right' : 'left'
      }
    }, m.tx);
  }), typing && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 5,
      padding: '9px 13px',
      borderRadius: '4px 13px 13px 13px',
      background: 'rgba(13,32,53,.06)',
      border: '1px solid rgba(13,32,53,.08)',
      alignSelf: 'flex-start',
      width: 58
    }
  }, [0, 1, 2].map(function (i) {
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: G,
        display: 'block',
        animation: 'dotPulse 1.4s ' + .18 * i + 's ease-in-out infinite both'
      }
    });
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '5px 12px 3px',
      display: 'flex',
      gap: 5,
      flexWrap: 'wrap',
      flexShrink: 0
    }
  }, [t.c1, t.c2, t.c3, t.c4, t.c5].map(function (s, i) {
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: function () {
        doSend(s);
      },
      style: {
        padding: '3px 9px',
        borderRadius: 20,
        fontSize: 9.5,
        fontWeight: 600,
        background: 'rgba(13,32,53,.06)',
        border: '1px solid rgba(13,32,53,.1)',
        color: N,
        cursor: 'pointer',
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
      }
    }, s);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '7px 12px 22px',
      display: 'flex',
      gap: 8,
      flexShrink: 0,
      flexDirection: isAr ? 'row-reverse' : 'row'
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: inp,
    onChange: function (e) {
      setInp(e.target.value);
    },
    onKeyDown: function (e) {
      if (e.key === 'Enter') send();
    },
    placeholder: t.aiPh,
    style: {
      flex: 1,
      padding: '10px 13px',
      borderRadius: 10,
      border: '1px solid rgba(13,32,53,.14)',
      background: 'rgba(13,32,53,.03)',
      fontSize: 12,
      color: N,
      outline: 'none',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      textAlign: isAr ? 'right' : 'left'
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: send,
    style: {
      padding: '10px 15px',
      borderRadius: 10,
      background: N,
      color: G,
      border: 'none',
      cursor: 'pointer',
      fontSize: 16,
      fontWeight: 700,
      flexShrink: 0
    }
  }, "\u2192"))));
}

/* ── SAVED SHEET ── */
function SavedSheet(props) {
  var open = props.open,
    onClose = props.onClose,
    savedIds = props.savedIds,
    listings = props.listings,
    purpose = props.purpose;
  var wide = useWide();
  var c = useApp();
  var isAr = c.lang === 'ar';
  var items = listings.filter(function (l) {
    return savedIds.has(l.id);
  });
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 500,
      background: 'rgba(4,8,15,.72)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: wide ? 'center' : 'flex-end',
      justifyContent: 'center',
      padding: wide ? 24 : 0
    },
    onClick: function (e) {
      if (e.target === e.currentTarget) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: wide ? 24 : '22px 22px 0 0',
      width: wide ? 'min(720px, 94vw)' : '100%',
      maxHeight: wide ? 'min(80vh, 820px)' : '80%',
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideUp .38s cubic-bezier(.16,1,.3,1) both',
      boxShadow: '0 -20px 60px rgba(13,32,53,.22)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '10px 0 0',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 3.5,
      borderRadius: 2,
      background: 'rgba(13,32,53,.14)',
      margin: '0 auto'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 20px 8px',
      borderBottom: '1px solid rgba(13,32,53,.07)',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8,
      letterSpacing: '.2em',
      color: G,
      textTransform: 'uppercase',
      marginBottom: 2
    }
  }, "MY COLLECTION"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: HEADING_FONT,
      fontSize: 22,
      fontWeight: 500,
      color: N
    }
  }, "Saved Properties")), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'rgba(13,32,53,.3)',
      fontSize: 24
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '10px 16px'
    }
  }, items.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '40px 0',
      color: '#8A94A0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 32,
      marginBottom: 10
    }
  }, "\u2661"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: HEADING_FONT,
      fontSize: 18,
      color: N,
      marginBottom: 5
    }
  }, "No saved properties yet"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontFamily: 'Inter'
    }
  }, "Tap the heart on any listing to save it here.")) : items.map(function (l) {
    var pr = purpose === 'rent' ? '$' + l.usd.toLocaleString() + '/mo' : 'EGP ' + l.egpM + 'M';
    return /*#__PURE__*/React.createElement("div", {
      key: l.id,
      style: {
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        padding: '10px',
        borderRadius: 12,
        border: '1px solid rgba(13,32,53,.08)',
        marginBottom: 8,
        background: '#fff'
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: l.img,
      alt: "",
      style: {
        width: 60,
        height: 60,
        borderRadius: 9,
        objectFit: 'cover',
        flexShrink: 0
      },
      loading: "lazy"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 7.5,
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        color: N,
        marginBottom: 1
      }
    }, l.cmp), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: HEADING_FONT,
        fontSize: 14,
        fontWeight: 600,
        color: N,
        lineHeight: 1.2,
        marginBottom: 3
      }
    }, l.beds, "B ", l.type, " \xB7 ", l.area, "m\xB2"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 12,
        fontWeight: 700,
        color: G
      }
    }, pr)), /*#__PURE__*/React.createElement("a", {
      href: 'https://wa.me/201061399688?text=' + encodeURIComponent('Hi! Interested in saved unit: ' + l.beds + 'BR ' + l.type + ' at ' + l.cmp),
      target: "_blank",
      rel: "noopener noreferrer",
      style: {
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: '#25D366',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("svg", {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "white"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"
    }))));
  })), items.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 16px 24px',
      borderTop: '1px solid rgba(13,32,53,.07)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '12px',
      borderRadius: 10,
      background: N,
      color: 'rgba(200,150,26,.9)',
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'Inter'
    }
  }, "\uD83D\uDCAC Enquire About All ", items.length, " Saved \u2192"))));
}

/* ── REQUEST MODAL ── */
function ReqModal(props) {
  var open = props.open,
    onClose = props.onClose;
  var wide = useWide();
  var c = useApp();
  var lang = c.lang;
  var t = LANG[lang];
  var isAr = lang === 'ar';
  var form = useState({
    name: '',
    phone: '',
    comment: ''
  });
  var setForm = form[1];
  form = form[0];
  var done = useState(false);
  var setDone = done[1];
  done = done[0];
  function set(k, v) {
    setForm(function (f) {
      var n = Object.assign({}, f);
      n[k] = v;
      return n;
    });
  }
  function submit() {
    if (!form.name.trim() || !form.phone.trim()) return;
    try {
      var leads = JSON.parse(localStorage.getItem('sierra_leads') || '[]');
      leads.push({
        name: form.name.trim(),
        phone: form.phone.trim(),
        comment: form.comment.trim(),
        source: 'Website Lead',
        ts: new Date().toISOString()
      });
      localStorage.setItem('sierra_leads', JSON.stringify(leads));
    } catch (e) {}
    setDone(true);
  }
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 700,
      background: 'rgba(4,8,15,.72)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: wide ? 'center' : 'flex-end',
      justifyContent: 'center',
      padding: wide ? 24 : 0
    },
    onClick: function (e) {
      if (e.target === e.currentTarget) {
        setDone(false);
        onClose();
      }
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: wide ? 24 : '22px 22px 0 0',
      width: wide ? 'min(680px, 94vw)' : '100%',
      maxHeight: wide ? 'min(85vh, 860px)' : '88%',
      overflowY: 'auto',
      animation: 'slideUp .4s cubic-bezier(.16,1,.3,1) both',
      boxShadow: '0 -24px 80px rgba(13,32,53,.25)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '10px 0 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 3.5,
      borderRadius: 2,
      background: 'rgba(13,32,53,.14)',
      margin: '0 auto 12px'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px 10px',
      borderBottom: '1px solid rgba(13,32,53,.07)',
      position: 'sticky',
      top: 0,
      background: '#fff',
      zIndex: 1,
      direction: isAr ? 'rtl' : 'ltr'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 9
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
      fontSize: 22,
      fontWeight: isAr ? 700 : 600,
      color: N
    }
  }, t.reqTit), /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setDone(false);
      onClose();
    },
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'rgba(13,32,53,.35)',
      fontSize: 24
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '7px 11px',
      borderRadius: 9,
      background: 'rgba(200,150,26,.07)',
      border: '1px solid rgba(200,150,26,.2)',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15
    }
  }, "\uD83C\uDFF7\uFE0F"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: N,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: G
    }
  }, "25% OFF"), " \xB7 ", t.reqSub))), done ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '44px 20px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: '50%',
      background: '#16a34a',
      margin: '0 auto 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 26,
      color: 'white',
      animation: 'popIn .4s both'
    }
  }, "\u2713"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
      fontSize: isAr ? 22 : 26,
      fontWeight: isAr ? 700 : 600,
      color: N,
      marginBottom: 8
    }
  }, t.doneTit), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: '#5A6475',
      lineHeight: 1.65,
      marginBottom: 16,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, t.doneSub), /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setDone(false);
      onClose();
    },
    style: {
      padding: '10px 24px',
      borderRadius: 9,
      border: '1px solid rgba(13,32,53,.14)',
      background: 'none',
      color: '#5A6475',
      fontSize: 12,
      cursor: 'pointer',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, t.close)) : /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 20px 32px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      direction: isAr ? 'rtl' : 'ltr'
    }
  }, [[t.nm, 'name', 'text', t.nmPh], [t.ph, 'phone', 'tel', t.phPh]].map(function (row) {
    return /*#__PURE__*/React.createElement("div", {
      key: row[1],
      style: {
        border: '1px solid rgba(13,32,53,.12)',
        borderRadius: 10,
        padding: '10px 14px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7.5,
        fontWeight: 700,
        letterSpacing: '.14em',
        textTransform: 'uppercase',
        color: '#8A94A0',
        marginBottom: 4,
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
      }
    }, row[0]), /*#__PURE__*/React.createElement("input", {
      type: row[2],
      placeholder: row[3],
      value: form[row[1]],
      onChange: function (e) {
        set(row[1], e.target.value);
      },
      style: {
        width: '100%',
        background: 'none',
        border: 'none',
        outline: 'none',
        fontSize: 13,
        fontWeight: 500,
        color: N,
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
        textAlign: isAr ? 'right' : 'left'
      }
    }));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid rgba(13,32,53,.12)',
      borderRadius: 10,
      padding: '10px 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7.5,
      fontWeight: 700,
      letterSpacing: '.14em',
      textTransform: 'uppercase',
      color: '#8A94A0',
      marginBottom: 4,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, t.cmt), /*#__PURE__*/React.createElement("textarea", {
    rows: 3,
    placeholder: t.cmtPh,
    value: form.comment,
    onChange: function (e) {
      set('comment', e.target.value);
    },
    style: {
      width: '100%',
      background: 'none',
      border: 'none',
      outline: 'none',
      resize: 'none',
      fontSize: 13,
      fontWeight: 500,
      color: N,
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      textAlign: isAr ? 'right' : 'left'
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: submit,
    style: {
      padding: '14px',
      borderRadius: 12,
      background: 'linear-gradient(135deg,' + N + ',#1A3354)',
      color: GL,
      fontSize: 11.5,
      fontWeight: 900,
      letterSpacing: '.05em',
      textTransform: 'uppercase',
      border: 'none',
      cursor: 'pointer',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter',
      boxShadow: '0 6px 22px rgba(13,32,53,.38)',
      marginTop: 2,
      width: '100%'
    }
  }, isAr ? 'أرسل طلبي' : 'Submit My Request'), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      fontSize: 9,
      color: 'rgba(13,32,53,.32)',
      fontFamily: 'Inter',
      marginTop: -4
    }
  }, "\u26A1 ", isAr ? 'يذهب مباشرة إلى فريق المبيعات' : 'Goes straight to our sales team'))));
}

/* ── UNIT DETAILS ── */
function UnitSheet(props) {
  var data = props.data,
    purpose = props.purpose,
    onClose = props.onClose;
  var wide = useWide();
  var c = useApp();
  var lang = c.lang;
  var isAr = lang === 'ar';
  if (!data) return null;
  var u = data.u,
    cpd = data.cpd;
  var f = FEATURED.find(function (x) {
    return cpd && (cpd.n.indexOf(x.cmp) >= 0 || x.cmp.indexOf(cpd.n) >= 0);
  });
  var img = f ? f.img : 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=85';
  var isAvail = u.status === 'Available';
  var prEGP = 'EGP ' + u.egpM + 'M';
  var prUSD = '$' + u.usd.toLocaleString() + '/mo';
  var waText = encodeURIComponent('Hi Sierra! Interested in unit ' + u.id + ' — ' + u.beds + 'BR ' + u.type + ' at ' + (cpd ? cpd.n : '') + ' (' + prEGP + ')');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 620,
      background: 'rgba(4,8,15,.78)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: wide ? 'center' : 'flex-end',
      justifyContent: 'center',
      padding: wide ? 24 : 0
    },
    onClick: function (e) {
      if (e.target === e.currentTarget) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: wide ? 24 : '22px 22px 0 0',
      width: wide ? 'min(720px, 94vw)' : '100%',
      maxHeight: wide ? 'min(88vh, 900px)' : '94%',
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideUp .4s cubic-bezier(.16,1,.3,1) both',
      boxShadow: '0 -24px 80px rgba(13,32,53,.3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 220,
      flexShrink: 0,
      borderRadius: '22px 22px 0 0',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: img,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(to top,rgba(7,21,36,.8),transparent 55%)'
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      position: 'absolute',
      top: 14,
      left: 14,
      width: 34,
      height: 34,
      borderRadius: '50%',
      background: 'rgba(0,0,0,.5)',
      border: '1px solid rgba(255,255,255,.2)',
      cursor: 'pointer',
      color: '#fff',
      fontSize: 17,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, "\u2190"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 14,
      right: 14,
      background: 'rgba(7,21,36,.9)',
      border: '1px solid rgba(200,150,26,.5)',
      borderRadius: 20,
      padding: '4px 11px',
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 9.5,
      fontWeight: 700,
      color: G
    }
  }, "\u25B2 AI ", u.ai), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 14,
      left: 16,
      right: 16,
      direction: isAr ? 'rtl' : 'ltr'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8,
      color: 'rgba(233,193,118,.9)',
      letterSpacing: '.14em',
      marginBottom: 3,
      textTransform: 'uppercase'
    }
  }, u.id, cpd ? ' · ' + cpd.n : ''), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT,
      fontSize: 24,
      fontWeight: isAr ? 700 : 600,
      color: '#fff',
      lineHeight: 1.1
    }
  }, u.beds, "B ", u.type))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '16px 20px 28px',
      direction: isAr ? 'rtl' : 'ltr'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 24,
      fontWeight: 700,
      color: G,
      lineHeight: 1
    }
  }, purpose === 'rent' ? prUSD : prEGP), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#8A94A0',
      fontFamily: 'Inter',
      marginTop: 4
    }
  }, purpose === 'rent' ? (isAr ? 'أو للبيع ' : 'or resale ') + prEGP : (isAr ? 'أو للإيجار ' : 'or rent ') + prUSD)), /*#__PURE__*/React.createElement("span", {
    className: isAvail ? 'pill-av' : u.status === 'Under Offer' ? 'pill-uo' : 'pill-so',
    style: {
      fontSize: 9,
      padding: '4px 11px'
    }
  }, u.status)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr 1fr',
      gap: 7,
      marginBottom: 16
    }
  }, [[u.beds, isAr ? 'غرف' : 'Beds'], [u.bath, isAr ? 'حمام' : 'Baths'], [u.area + 'm²', isAr ? 'مساحة' : 'Area'], [u.ai, isAr ? 'ذكاء' : 'AI Score']].map(function (p, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        padding: '11px 6px',
        borderRadius: 11,
        background: 'rgba(13,32,53,.045)',
        border: '1px solid rgba(13,32,53,.07)',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 15,
        fontWeight: 700,
        color: N,
        lineHeight: 1
      }
    }, p[0]), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7.5,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        color: '#8A94A0',
        marginTop: 4,
        fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
      }
    }, p[1]));
  })), cpd && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '13px 15px',
      borderRadius: 13,
      background: 'linear-gradient(160deg,' + N2 + ',#0D2035)',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 11,
      background: 'rgba(200,150,26,.14)',
      border: '1px solid rgba(200,150,26,.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 12,
      fontWeight: 700,
      color: G
    }
  }, cpd.ai)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: '#fff',
      fontFamily: 'Inter',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, cpd.n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 8,
      color: G,
      letterSpacing: '.1em',
      marginTop: 3
    }
  }, cpd.z, " \xB7 ", cpd.g, " ", isAr ? 'نمو' : 'GROWTH'))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      flexDirection: isAr ? 'row-reverse' : 'row'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      window.open('https://wa.me/201061399688?text=' + waText, '_blank');
    },
    style: {
      flex: 1,
      padding: '13px',
      borderRadius: 11,
      background: '#25D366',
      color: '#fff',
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: '.06em',
      textTransform: 'uppercase',
      border: 'none',
      cursor: 'pointer',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, "\uD83D\uDCAC WhatsApp"), /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      window.open('tel:+201061399688');
    },
    style: {
      flex: 1,
      padding: '13px',
      borderRadius: 11,
      background: 'linear-gradient(135deg,' + G + ',' + GL + ')',
      color: N,
      fontSize: 11,
      fontWeight: 900,
      letterSpacing: '.06em',
      textTransform: 'uppercase',
      border: 'none',
      cursor: 'pointer',
      fontFamily: isAr ? "'Cairo',sans-serif" : 'Inter'
    }
  }, "\uD83D\uDCDE ", isAr ? 'اتصل' : 'Call')))));
}
Object.assign(window, {
  SmartFilterSheet,
  CpdSheet,
  ListSheet,
  ROISheet,
  PriceSheet,
  MatchSheet,
  DreamSheet,
  AIEngineSheet,
  ChatSheet,
  SavedSheet,
  ReqModal,
  UnitSheet
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/sheets.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/tweaks-panel.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
// Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
//   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
// TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
// options are many or long. For color tweaks always curate 3-4 options rather than
// a free picker; an option can also be a whole 2–5 color palette (the stored value
// is the array). The Tweak* controls are a floor, not a ceiling — build custom
// controls inside the panel if a tweak calls for UI they don't cover.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/tweaks-panel.jsx", error: String((e && e.message) || e) }); }

__ds_ns.AITile = __ds_scope.AITile;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.RangeSlider = __ds_scope.RangeSlider;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.PropertyCard = __ds_scope.PropertyCard;

__ds_ns.StatBlock = __ds_scope.StatBlock;

})();
