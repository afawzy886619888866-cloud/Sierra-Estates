








const { useState, useEffect, useRef, useMemo, createContext, useContext } = React;

/* ── CONTEXT ── */
const Ctx = createContext({ dark: true, lang: 'en' });
const useApp = () => useContext(Ctx);

/* ── COLORS · aligned to repo colors_and_type.css (Design Tokens V2.0) ── */
window.N = '#071422';window.N2 = '#050B14';window.N3 = '#0D2444';
window.G = '#C8961A';window.GL = '#E9C176';
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
      var cr = sc.getBoundingClientRect(),er = ref.current.getBoundingClientRect();
      if (er.top < cr.bottom + t) setVis(true);
    };
    var sc = document.getElementById('root-scroll');
    check();
    if (sc) sc.addEventListener('scroll', check, { passive: true });
    return function () {if (sc) sc.removeEventListener('scroll', check);};
  }, [t]);
  return [ref, vis];
}

/* ── SHIELD ── */
function Shield(props) {
  var sz = props.sz || 28;var gid = 'shg' + Math.round(sz);
  return React.createElement('svg', { width: sz, height: sz * 1.08, viewBox: '0 0 40 44', fill: 'none' },
  React.createElement('defs', null,
  React.createElement('linearGradient', { id: gid, x1: '0', y1: '0', x2: '1', y2: '1' },
  React.createElement('stop', { offset: '0', stopColor: GL }),
  React.createElement('stop', { offset: '1', stopColor: G })
  )
  ),
  React.createElement('path', { d: 'M20 2L37 10.5V27Q37 39 20 43Q3 39 3 27V10.5Z', fill: N, stroke: 'url(#' + gid + ')', strokeWidth: '2.4' }),
  React.createElement('rect', { x: '12.5', y: '17', width: '3.6', height: '11', rx: '.7', fill: 'url(#' + gid + ')' }),
  React.createElement('rect', { x: '18.2', y: '13', width: '3.6', height: '15', rx: '.7', fill: 'url(#' + gid + ')' }),
  React.createElement('rect', { x: '23.9', y: '19', width: '3.6', height: '9', rx: '.7', fill: 'url(#' + gid + ')', opacity: '.7' }),
  React.createElement('path', { d: 'M11 32.5 L19.5 27.5 L28.5 30.5', stroke: 'url(#' + gid + ')', strokeWidth: '2', fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }),
  React.createElement('path', { d: 'M28.6 30.6 L25.4 30 M28.6 30.6 L27.4 33.6', stroke: 'url(#' + gid + ')', strokeWidth: '2', fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' })
  );
}

/* ── SECTION HEAD ── */
function SH(props) {
  var eye = props.eye,title = props.title,light = props.light;
  var wide = useWide();
  var c = useApp();var dark = c.dark,lang = c.lang;
  var isAr = lang === 'ar';
  var clr = light ? '#fff' : dark ? '#F0EDE5' : N;
  return (
    <div style={{ padding: '22px 20px 14px', direction: isAr ? 'rtl' : 'ltr' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexDirection: isAr ? 'row-reverse' : 'row' }}>
        <span style={{ width: 18, height: 1.5, background: G, display: 'block', flexShrink: 0 }} />
        <span style={{ fontFamily: isAr ? "'Cairo',sans-serif" : "'JetBrains Mono',monospace", fontSize: isAr ? 9 : 7.5, letterSpacing: isAr ? 0 : '.22em', color: G, textTransform: 'uppercase' }}>{eye}</span>
      </div>
      <h2 style={{ fontFamily: isAr ? "'Cairo',sans-serif" : HEADING_FONT, fontSize: wide ? (isAr ? 30 : 34) : (isAr ? 23 : 26), fontWeight: isAr ? 700 : 400, color: clr, lineHeight: 1.1 }}>{title}</h2>
    </div>);

}

/* ── SHEET SHELL ── */
function Sheet(props) {
  var open = props.open,onClose = props.onClose,children = props.children,maxH = props.maxH || '85%',z = props.z || 500;
  var wide = useWide();
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: z, background: 'rgba(4,8,15,.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: wide ? 'center' : 'flex-end', justifyContent: 'center', padding: wide ? 24 : 0 }} onClick={function (e) {if (e.target === e.currentTarget) onClose();}}>
      <div style={{ background: '#fff', borderRadius: wide ? 24 : '22px 22px 0 0', width: wide ? 'min(720px, 94vw)' : '100%', maxHeight: wide ? 'min(85vh, 860px)' : maxH, display: 'flex', flexDirection: 'column', animation: (wide ? 'popIn .3s' : 'slideUp .38s') + ' cubic-bezier(.16,1,.3,1) both', boxShadow: wide ? '0 40px 120px rgba(0,0,0,.5)' : '0 -20px 60px rgba(13,32,53,.22)' }}>
        <div style={{ textAlign: 'center', padding: '10px 0 0', flexShrink: 0 }}><div style={{ width: 36, height: 3.5, borderRadius: 2, background: 'rgba(13,32,53,.14)', margin: '0 auto' }} /></div>
        {children}
      </div>
    </div>);

}

/* ── STATUS BAR ── */
function StatusBar() {
  var c = useApp();var dark = c.dark,setDark = c.setDark,lang = c.lang,setLang = c.setLang;
  var isAr = lang === 'ar';
  var t = useState('');var setT = t[1];t = t[0];
  useEffect(function () {
    var tick = function () {var d = new Date();setT(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));};
    tick();var id = setInterval(tick, 10000);return function () {clearInterval(id);};
  }, []);
  var bg = dark ? N2 : '#fff';var tx = dark ? '#fff' : N;
  return (
    <div className="status-bar" style={{ height: 54, padding: '14px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: bg, position: 'sticky', top: 0, zIndex: 90, flexShrink: 0, direction: 'ltr', transition: 'background .3s' }}>
      <span style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 600, color: tx, letterSpacing: '-.3px' }}>{t}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <svg width="16" height="12" viewBox="0 0 16 12" fill={tx} opacity=".8"><rect x="0" y="4" width="3" height="8" rx="1" /><rect x="4.5" y="2.5" width="3" height="9.5" rx="1" /><rect x="9" y="1" width="3" height="11" rx="1" /><rect x="13.5" y="0" width="2.5" height="12" rx="1" opacity=".3" /></svg>
        <div style={{ width: 24, height: 12, borderRadius: 3, border: '1.5px solid ' + tx, display: 'flex', alignItems: 'center', padding: '1px', gap: 1, opacity: .8 }}>
          <div style={{ flex: 1, height: '100%', background: G, borderRadius: 1.5 }} /><div style={{ width: 5, height: 5, borderRadius: '50%', background: G }} />
        </div>
      </div>
    </div>);

}


/* ── RESPONSIVE (desktop reflow) ── */
function useWide() {
  var mq = '(min-width: 860px)';
  var st = useState(function () {return window.matchMedia(mq).matches;});
  var wide = st[0],setWide = st[1];
  useEffect(function () {
    var m = window.matchMedia(mq);
    var h = function (e) {setWide(e.matches);};
    if (m.addEventListener) m.addEventListener('change', h);else m.addListener(h);
    return function () {if (m.removeEventListener) m.removeEventListener('change', h);else m.removeListener(h);};
  }, []);
  return wide;
}

/* ── MORPH BLOB (Framer Motion) — soft gold glow, morphs continuously ── */
/* Same 8-segment cubic-Bezier structure across all three so framer-motion morphs cleanly (no key warnings) */
var BLOB_PATHS = [
'M0.0,-63.0 C12.9,-63.1 27.5,-49.5 39.0,-39.0 C50.5,-28.5 69.3,-12.7 69.0,0.0 C68.7,12.7 48.8,26.5 37.3,37.3 C25.8,48.1 12.9,64.3 0.0,64.8 C-12.9,65.3 -29.1,51.1 -40.3,40.3 C-51.5,29.5 -67.6,13.1 -67.2,0.0 C-66.8,-13.1 -49.4,-27.7 -38.2,-38.2 C-27.0,-48.7 -12.9,-62.9 0.0,-63.0 Z',
'M0.0,-54.0 C16.1,-53.8 38.0,-56.5 47.5,-47.5 C57.0,-38.5 56.6,-16.3 57.0,0.0 C57.4,16.3 59.6,41.3 50.1,50.1 C40.6,58.9 15.8,53.7 0.0,52.8 C-15.8,51.9 -35.2,53.3 -44.5,44.5 C-53.8,35.7 -55.1,15.6 -55.8,0.0 C-56.5,-15.6 -58.1,-39.8 -48.8,-48.8 C-39.5,-57.8 -16.1,-54.2 0.0,-54.0 Z',
'M0.0,-69.0 C14.5,-67.9 29.8,-51.8 40.3,-40.3 C50.8,-28.8 63.4,-13.1 63.0,0.0 C62.6,13.1 48.7,26.4 38.2,38.2 C27.7,50.0 12.6,70.9 0.0,70.8 C-12.6,70.7 -27.5,49.1 -37.3,37.3 C-47.1,25.5 -57.2,14.0 -58.8,0.0 C-60.4,-14.0 -56.5,-35.2 -46.7,-46.7 C-36.9,-58.2 -14.5,-70.1 0.0,-69.0 Z'];
function MorphBlob(props) {
  var size = props.size || 420,opacity = props.opacity != null ? props.opacity : 0.16,color1 = props.color1 || GL,color2 = props.color2 || G,style = props.style || {};
  var gid = 'blobgrad' + Math.round(size);
  var vals = BLOB_PATHS.concat([BLOB_PATHS[0]]).join(';');
  return (
    <div style={Object.assign({ position: 'absolute', width: size, height: size, pointerEvents: 'none', filter: 'blur(38px)', opacity: opacity }, style)}>
      <svg viewBox="-80 -80 160 160" width="100%" height="100%">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={color1} />
            <stop offset="1" stopColor={color2} />
          </linearGradient>
        </defs>
        <path fill={'url(#' + gid + ')'} d={BLOB_PATHS[0]}>
          <animate attributeName="d" values={vals} dur="18s" repeatCount="indefinite" />
        </path>
      </svg>
    </div>);

}

Object.assign(window, { Ctx, useApp, th, useScrollAnim, Shield, SH, Sheet, StatusBar, useWide, MorphBlob });
