"use client";
import React, { useEffect } from "react";
import Script from "next/script";
import "./client-page.css";

export default function ClientPage() {
  useEffect(() => {
    // We can load external scripts or run initializing logic here if needed
  }, []);

  return (
    <>
      <Script src="https://unpkg.com/lucide@0.294.0/dist/umd/lucide.min.js" strategy="beforeInteractive" />
      <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="beforeInteractive" />
      <Script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js" strategy="beforeInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js" strategy="beforeInteractive" />
      <Script src="/client-page/supabase-config.js" strategy="lazyOnload" />
      <Script src="/client-page/data.js" strategy="lazyOnload" />
      <Script src="/client-page/shared.js" strategy="lazyOnload" />
      <Script src="/client-page/supabase.js" strategy="lazyOnload" />

      <Script src="/client-page/inline-scripts.js" strategy="lazyOnload" />
      <div className="client-page-wrapper">
        
<template id="__bundler_thumbnail">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#0D2035"/><text x="200" y="220" font-family="Georgia,serif" font-size="150" font-weight="700" fill="#C8961A" text-anchor="middle">S</text></svg>
</template>

<div id="site-chrome"></div>

{/*  HERO SLIDER  */}
<header className="hero" data-screen-label="Home hero">
  <div id="hero-slides"></div>
  <div className="scrim"></div>
  <div className="wrap">
    <div className="h-eyebrow" id="hero-pre"></div>
    <h1 id="hero-main"></h1>
    <p className="sub" data-i18n="heroSub"></p>
    <div className="quick">
      <span><i data-lucide="badge-check" className="i"></i> <span data-i18n="q1"></span></span>
      <span><i data-lucide="map" className="i"></i> <span data-i18n="q2"></span></span>
      <span><i data-lucide="shield-check" className="i"></i> <span data-i18n="q3"></span></span>
    </div>
  </div>
  <a aria-label="Link" className="map-cta" href="compounds.html">
    <span className="mc-ic"><i data-lucide="map" className="i"></i></span>
    <span data-i18n="exploreMapBtn"></span>
  </a>
  <div className="dots wrap" id="hero-dots" style={{"left": "auto"}}></div>
  {/*  ═══ LASER BEAM — inside hero only, never covers map or 3D ═══  */}
  <div className="page-laser" aria-hidden="true">
    <div className="page-laser-beam"></div>
  </div>
</header>

{/*  ═══ CALM BELL BAR — Request Now with 25% OFF ════════════════════════════
     "استكشف أفضل الفرص المتاحة في التجمع الخامس — AI Driven — قدم طلبك الآن
      خصم 25% على رسوم الخدمة" — calm, slow flashing  */}
<div className="bell-bar" id="bell-bar">
  <div className="bell-content">
    <span className="bell-text">Egypt's first AI-driven real estate ecosystem · Explore the best opportunities in New Cairo — <b>AI Driven</b> · Apply now</span>
    <span className="bell-badge">25% OFF</span>
    <a aria-label="Link" href="#contact" className="bell-btn">Request Now <i data-lucide="arrow-right" style={{"width": "13px", "height": "13px"}}></i></a>
  </div>
</div>

{/*  SEARCH CARD  */}
<div className="wrap searchbar">
  <div className="search-card rv">
    <div className="search-tabs">
      <button aria-label="Button" className="active" data-i18n="tabBuy" type="button" data-tab="buy"></button>
      <button aria-label="Button" data-i18n="tabRent" type="button" data-tab="rent"></button>
      <button aria-label="Button" data-i18n="tabNew" type="button" data-tab="new"></button>
    </div>
    <div className="search-fields">
      {/*  Compound search with autocomplete  */}
      <div className="field">
        <label data-i18n="fLoc"></label>
        <div className="search-compound-wrap" style={{"position": "relative"}}>
          <input type="text" id="hero-compound-search" className="hero-search-input" placeholder="Search compound... (e.g. Mivida)" autoComplete="off" style={{"width": "100%", "border": "none", "background": "none", "fontFamily": "var(--font)", "fontSize": "14px", "color": "var(--ink)", "outline": "none", "padding": "8px 0"}} />
          <div id="hero-compound-results" className="compound-dropdown" style={{"display": "none", "position": "absolute", "top": "100%", "left": "0", "right": "0", "background": "var(--surface)", "border": "1px solid var(--line)", "borderRadius": "0 0 10px 10px", "boxShadow": "var(--shadow-m)", "zIndex": "100", "maxHeight": "280px", "overflowY": "auto"}}></div>
        </div>
      </div>
      {/*  Property Type dropdown  */}
      <div className="field">
        <label data-i18n="fType"></label>
        <select aria-label="Select" id="hero-type" className="hero-select" style={{"width": "100%", "border": "1.5px solid var(--line-2)", "borderRadius": "8px", "padding": "9px 12px", "fontFamily": "var(--font)", "fontSize": "14px", "color": "var(--ink)", "background": "var(--surface-2)", "outline": "none", "cursor": "pointer"}}>
          <option value="">Any Type</option>
          <option value="Apartment">Apartment</option>
          <option value="Villa">Villa</option>
          <option value="Townhouse">Townhouse</option>
          <option value="Twin House">Twin House</option>
          <option value="Penthouse">Penthouse</option>
          <option value="Duplex">Duplex</option>
        </select>
      </div>
      {/*  Bedrooms dropdown  */}
      <div className="field">
        <label data-i18n="fBeds"></label>
        <select aria-label="Select" id="hero-beds" className="hero-select" style={{"width": "100%", "border": "1.5px solid var(--line-2)", "borderRadius": "8px", "padding": "9px 12px", "fontFamily": "var(--font)", "fontSize": "14px", "color": "var(--ink)", "background": "var(--surface-2)", "outline": "none", "cursor": "pointer"}}>
          <option value="0">Any</option>
          <option value="1">1+</option>
          <option value="2">2+</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
          <option value="5">5+</option>
        </select>
      </div>
      {/*  Price dropdown  */}
      <div className="field">
        <label data-i18n="fPrice"></label>
        <select aria-label="Select" id="hero-price" className="hero-select" style={{"width": "100%", "border": "1.5px solid var(--line-2)", "borderRadius": "8px", "padding": "9px 12px", "fontFamily": "var(--font)", "fontSize": "14px", "color": "var(--ink)", "background": "var(--surface-2)", "outline": "none", "cursor": "pointer"}}>
          <option value="0">Any Price</option>
          <option value="5">Up to 5M EGP</option>
          <option value="10">Up to 10M EGP</option>
          <option value="20">Up to 20M EGP</option>
          <option value="30">Up to 30M EGP</option>
          <option value="50">Up to 50M EGP</option>
        </select>
      </div>
      {/*  Search button  */}
      <div className="field searchbtn">
        <button aria-label="Button" type="button" className="btn btn-pri" id="hero-search-btn"><i data-lucide="search" className="i"></i> <span data-i18n="search"></span></button>
      </div>
    </div>
  </div>
</div>

{/*  MARKET TICKER  */}
<div className="ticker" data-screen-label="Market ticker"><div className="row" id="ticker-row"></div></div>

{/*  FEATURED PROPERTIES  */}
<section className="block" id="properties" data-screen-label="Featured properties">
  <div className="wrap">
    <div className="sec-head rv">
      <div>
        <div className="eyebrow" data-i18n="eyeList"></div>
        <h2 data-i18n="featTit"></h2>
        <p data-i18n="featSub"></p>
      </div>
      <a aria-label="Link" href="properties.html" className="sec-link"><span data-i18n="viewAll"></span> <i data-lucide="arrow-right" className="i" style={{"width": "16px", "height": "16px"}}></i></a>
    </div>
    <div className="grid-props" id="prop-grid"></div>
  </div>
</section>

{/*  WHY SIERRA (moved here — right after units/properties)  */}
<section className="block" id="agents" data-screen-label="Why Sierra">
  <div className="wrap">
    <div className="sec-head rv" style={{"flexDirection": "column", "alignItems": "center", "textAlign": "center"}}>
      <div>
        <h2>Why Sierra<sup>1</sup> Estates<sup>&trade;</sup></h2>
        <p data-i18n="whySub" style={{"marginInline": "auto"}}></p>
      </div>
    </div>
    <div className="net-banner rv">
      <div className="nb-left">
        <h3 data-i18n="netTit"></h3>
        <p data-i18n="netBody"></p>
      </div>
      <div className="nb-stats">
        <div className="nb-stat"><b data-count="1500" data-suffix="+">0</b><span data-i18n="netS1L"></span></div>
        <div className="nb-stat"><b data-count="240" data-suffix="+">0</b><span data-i18n="netS2L"></span></div>
        <div className="nb-stat"><b data-count="100" data-suffix="%">0</b><span data-i18n="netS3L"></span></div>
      </div>
    </div>
    <div className="grid-feat">
      <div className="feat rv"><div className="ic"><i data-lucide="radar" className="i"></i></div><h4 data-i18n="w1t"></h4><p data-i18n="w1s"></p></div>
      <div className="feat rv d1"><div className="ic"><i data-lucide="trending-up" className="i"></i></div><h4 data-i18n="w2t"></h4><p data-i18n="w2s"></p></div>
      <div className="feat rv d2"><div className="ic"><i data-lucide="heart-handshake" className="i"></i></div><h4 data-i18n="w3t"></h4><p data-i18n="w3s"></p></div>
      <div className="feat rv d3"><div className="ic"><i data-lucide="badge-check" className="i"></i></div><h4 data-i18n="w4t"></h4><p data-i18n="w4s"></p></div>
    </div>
  </div>
</section>

{/*  COMPOUNDS  */}
<section className="block well" id="compounds" data-screen-label="Compounds preview">
  <div className="wrap">
    <div className="sec-head rv">
      <div>
        <div className="eyebrow" data-i18n="eyeCpd"></div>
        <h2 data-i18n="cpdTit"></h2>
        <p data-i18n="cpdSub"></p>
      </div>
      <a aria-label="Link" href="compounds.html" className="sec-link"><span data-i18n="allCpds"></span> <i data-lucide="arrow-right" className="i" style={{"width": "16px", "height": "16px"}}></i></a>
    </div>
    <div className="grid-comp" id="comp-grid"></div>
  </div>
</section>

{/*  ═══ 3D VIRTUAL TOUR — ADVERTISING BANNER ════════════════════════════════
     Cinematic banner-style hero for our flagship 3D walkthrough feature.
     Premium luxury villa (with pool, dusk lighting) as cover. Click-to-
     activate 3D engine keeps the page fast. Strong USP headline +
     feature pills + floating stats card communicate the unique value.  */}
<section className="block well" id="tour" data-screen-label="Virtual tour">
  <div className="wrap">
    <div className="sec-head rv" style={{"display": "flex", "justifyContent": "space-between", "alignItems": "flex-end", "gap": "18px", "flexWrap": "wrap", "marginBottom": "24px"}}>
      <div>
        <h2 data-i18n="tourTit" style={{"fontFamily": "var(--display)", "fontSize": "34px", "fontWeight": "700", "letterSpacing": "-.01em"}}></h2>
        <p data-i18n="tourSub"></p>
      </div>
      <a aria-label="Link" href="virtual-tour.html" style={{"color": "var(--pri)", "fontWeight": "700", "fontSize": "14px", "textDecoration": "none", "display": "inline-flex", "alignItems": "center", "gap": "8px", "whiteSpace": "nowrap", "padding": "10px 18px", "border": "1.5px solid var(--pri)", "borderRadius": "999px", "transition": ".25s var(--silk)"}}>
        Open full page <i data-lucide="arrow-right" className="i" style={{"width": "14px", "height": "14px"}}></i>
      </a>
    </div>

    {/*  ── Banner frame: gold gradient border + glow ──  */}
    <div id="vtv-banner" style={{"position": "relative", "width": "100%", "aspectRatio": "21/9", "minHeight": "420px", "borderRadius": "18px", "overflow": "hidden", "background": "#0a1622", "boxShadow": "0 24px 70px rgba(13,33,54,.18),0 0 0 1px rgba(200,150,26,.18) inset", "marginTop": "8px"}}>
      {/*  Gold gradient border glow  */}
      <div style={{"position": "absolute", "inset": "0", "borderRadius": "18px", "padding": "1.5px", "background": "linear-gradient(135deg,rgba(200,150,26,.65) 0%,rgba(233,193,118,.25) 25%,transparent 50%,rgba(0,174,255,.18) 75%,rgba(200,150,26,.5) 100%)", "WebkitMask": "linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0)", "WebkitMaskComposite": "xor", "maskComposite": "exclude", "pointerEvents": "none", "zIndex": "4"}}></div>

      {/*  Click-to-activate poster button  */}
      <button id="vtv-poster" type="button" aria-label="Launch 3D virtual tour" style={{"position": "absolute", "inset": "0", "width": "100%", "height": "100%", "border": "0", "padding": "0", "cursor": "pointer", "backgroundColor": "#0a1622", "backgroundImage": "url('https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=2000&q=90')", "backgroundSize": "cover", "backgroundPosition": "center", "display": "flex", "alignItems": "center", "justifyContent": "center"}}>
        {/*  Cinematic gradient scrim (deeper on left for text legibility)  */}
        <span style={{"position": "absolute", "inset": "0", "background": "linear-gradient(95deg,rgba(0,18,35,.88) 0%,rgba(0,18,35,.62) 38%,rgba(0,18,35,.18) 65%,rgba(0,18,35,.55) 100%)", "zIndex": "1"}}></span>
        {/*  Subtle bottom scrim for stats card  */}
        <span style={{"position": "absolute", "inset": "0", "background": "linear-gradient(0deg,rgba(0,15,30,.65) 0%,transparent 35%)", "zIndex": "1"}}></span>

        {/*  ── LEFT: USP headline + feature pills ──  */}
        <span style={{"position": "absolute", "top": "0", "left": "0", "bottom": "0", "width": "54%", "zIndex": "2", "display": "flex", "flexDirection": "column", "justifyContent": "center", "padding": "48px 56px", "textAlign": "left", "gap": "14px"}}>
          <span style={{"display": "inline-flex", "alignItems": "center", "gap": "10px", "fontFamily": "var(--mono)", "fontSize": "11px", "fontWeight": "700", "letterSpacing": ".22em", "textTransform": "uppercase", "color": "#e9c176"}}>
            <span style={{"width": "24px", "height": "1.5px", "background": "#e9c176", "display": "inline-block"}}></span>
            SIERRA 3D · POWERED BY IMMERSIVE TECH
          </span>
          <span style={{"fontFamily": "var(--display)", "fontSize": "46px", "fontWeight": "700", "lineHeight": "1.05", "letterSpacing": "-.015em", "color": "#fff", "textShadow": "0 4px 24px rgba(0,0,0,.55)", "maxWidth": "560px"}}>
            Walk Through Your<br/>Next Home
            <span style={{"display": "inline-block", "fontStyle": "italic", "color": "#e9c176", "fontWeight": "600"}}>Before You Visit</span>
          </span>
          <span style={{"fontSize": "14.5px", "lineHeight": "1.55", "color": "rgba(255,255,255,.86)", "maxWidth": "480px", "fontWeight": "500", "marginTop": "4px", "textShadow": "0 1px 8px rgba(0,0,0,.4)"}}>
            Every Sierra listing is captured in cinematic 4K HDR. Stroll room-by-room, peek into the garden at dusk, gauge the pool from above, all from your screen, all in seconds.
          </span>
          {/*  Feature pills  */}
          <span style={{"display": "flex", "gap": "8px", "flexWrap": "wrap", "marginTop": "8px"}}>
            <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px", "fontFamily": "var(--mono)", "fontSize": "10.5px", "fontWeight": "700", "letterSpacing": ".1em", "textTransform": "uppercase", "color": "#fff", "background": "rgba(255,255,255,.08)", "border": "1px solid rgba(255,255,255,.18)", "WebkitBackdropFilter": "blur(8px)", "backdropFilter": "blur(6px)", "padding": "6px 11px", "borderRadius": "999px"}}>
              <i data-lucide="video" className="i" style={{"width": "11px", "height": "11px", "color": "#34d399"}}></i> 4K HDR
            </span>
            <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px", "fontFamily": "var(--mono)", "fontSize": "10.5px", "fontWeight": "700", "letterSpacing": ".1em", "textTransform": "uppercase", "color": "#fff", "background": "rgba(255,255,255,.08)", "border": "1px solid rgba(255,255,255,.18)", "WebkitBackdropFilter": "blur(8px)", "backdropFilter": "blur(6px)", "padding": "6px 11px", "borderRadius": "999px"}}>
              <i data-lucide="door-open" className="i" style={{"width": "11px", "height": "11px", "color": "#34d399"}}></i> Room-by-room
            </span>
            <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px", "fontFamily": "var(--mono)", "fontSize": "10.5px", "fontWeight": "700", "letterSpacing": ".1em", "textTransform": "uppercase", "color": "#fff", "background": "rgba(255,255,255,.08)", "border": "1px solid rgba(255,255,255,.18)", "WebkitBackdropFilter": "blur(8px)", "backdropFilter": "blur(6px)", "padding": "6px 11px", "borderRadius": "999px"}}>
              <i data-lucide="glasses" className="i" style={{"width": "11px", "height": "11px", "color": "#34d399"}}></i> VR-ready
            </span>
            <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px", "fontFamily": "var(--mono)", "fontSize": "10.5px", "fontWeight": "700", "letterSpacing": ".1em", "textTransform": "uppercase", "color": "#fff", "background": "rgba(255,255,255,.08)", "border": "1px solid rgba(255,255,255,.18)", "WebkitBackdropFilter": "blur(8px)", "backdropFilter": "blur(6px)", "padding": "6px 11px", "borderRadius": "999px"}}>
              <i data-lucide="grid-2x2" className="i" style={{"width": "11px", "height": "11px", "color": "#34d399"}}></i> Floor plan
            </span>
          </span>
        </span>

        {/*  ── RIGHT: Big play button + label ──  */}
        <span style={{"position": "absolute", "insetInlineEnd": "0", "top": "0", "bottom": "0", "width": "46%", "zIndex": "2", "display": "flex", "flexDirection": "column", "alignItems": "center", "justifyContent": "center", "gap": "18px", "pointerEvents": "none"}}>
          <span style={{"width": "104px", "height": "104px", "borderRadius": "50%", "background": "rgba(255,255,255,.94)", "display": "grid", "placeItems": "center", "flex": "none", "boxShadow": "0 0 0 8px rgba(255,255,255,.18),0 0 0 18px rgba(255,255,255,.08),0 18px 50px rgba(0,0,0,.45)", "transition": "transform .35s var(--silk)", "animation": "vtvPulse 2.6s ease-in-out infinite"}}>
            <i data-lucide="play" className="i" style={{"width": "42px", "height": "42px", "color": "#0a1622", "fill": "#0a1622", "marginInlineStart": "5px"}}></i>
          </span>
          <span style={{"display": "block", "fontFamily": "var(--mono)", "fontSize": "12.5px", "fontWeight": "800", "letterSpacing": ".32em", "color": "#fff", "textTransform": "uppercase", "textShadow": "0 2px 12px rgba(0,0,0,.6)"}}>▶ Launch 3D Tour</span>
        </span>

        {/*  ── BOTTOM-LEFT: property info card ──  */}
        <span style={{"position": "absolute", "bottom": "26px", "insetInlineStart": "56px", "zIndex": "3", "display": "flex", "flexDirection": "column", "gap": "5px"}}>
          <span style={{"display": "inline-flex", "alignItems": "center", "gap": "8px", "fontFamily": "var(--mono)", "fontSize": "10.5px", "fontWeight": "700", "letterSpacing": ".16em", "color": "#e9c176", "textTransform": "uppercase"}}>
            <i data-lucide="map-pin" className="i" style={{"width": "11px", "height": "11px"}}></i> Featured · New Cairo
          </span>
          <span style={{"fontFamily": "var(--display)", "fontSize": "22px", "fontWeight": "700", "lineHeight": "1.2", "color": "#fff", "maxWidth": "480px", "letterSpacing": "-.005em"}}>Sierra Signature Villa · Mivida</span>
          <span style={{"fontFamily": "var(--mono)", "fontSize": "11.5px", "color": "rgba(255,255,255,.78)", "fontWeight": "600"}}>5 Bed · 6 Bath · 480 m² · Pool · Garden</span>
        </span>

        {/*  ── BOTTOM-RIGHT: floating stats card ──  */}
        <span style={{"position": "absolute", "bottom": "24px", "insetInlineEnd": "24px", "zIndex": "3", "background": "rgba(0,18,35,.62)", "backdropFilter": "blur(14px)", "WebkitBackdropFilter": "blur(8px)", "border": "1px solid rgba(200,150,26,.32)", "borderRadius": "14px", "padding": "14px 18px", "display": "flex", "gap": "22px", "alignItems": "center"}}>
          <span style={{"display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "1px"}}>
            <span style={{"fontFamily": "var(--mono)", "fontSize": "22px", "fontWeight": "800", "color": "#e9c176", "lineHeight": "1"}}>47</span>
            <span style={{"fontFamily": "var(--mono)", "fontSize": "8.5px", "fontWeight": "700", "letterSpacing": ".12em", "textTransform": "uppercase", "color": "rgba(255,255,255,.72)"}}>tours live</span>
          </span>
          <span style={{"width": "1px", "height": "32px", "background": "rgba(255,255,255,.14)"}}></span>
          <span style={{"display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "1px"}}>
            <span style={{"fontFamily": "var(--mono)", "fontSize": "22px", "fontWeight": "800", "color": "#34d399", "lineHeight": "1"}}>12</span>
            <span style={{"fontFamily": "var(--mono)", "fontSize": "8.5px", "fontWeight": "700", "letterSpacing": ".12em", "textTransform": "uppercase", "color": "rgba(255,255,255,.72)"}}>ready to move</span>
          </span>
          <span style={{"width": "1px", "height": "32px", "background": "rgba(255,255,255,.14)"}}></span>
          <span style={{"display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "1px"}}>
            <span style={{"fontFamily": "var(--mono)", "fontSize": "22px", "fontWeight": "800", "color": "#8fe1ff", "lineHeight": "1"}}>4K</span>
            <span style={{"fontFamily": "var(--mono)", "fontSize": "8.5px", "fontWeight": "700", "letterSpacing": ".12em", "textTransform": "uppercase", "color": "rgba(255,255,255,.72)"}}>HDR quality</span>
          </span>
        </span>

        {/*  ── TOP-RIGHT: LIVE badge ──  */}
        <span style={{"position": "absolute", "top": "22px", "insetInlineEnd": "24px", "zIndex": "3", "display": "inline-flex", "alignItems": "center", "gap": "7px", "background": "rgba(0,18,35,.6)", "WebkitBackdropFilter": "blur(8px)", "backdropFilter": "blur(8px)", "border": "1px solid rgba(52,211,153,.35)", "borderRadius": "999px", "padding": "6px 12px", "fontFamily": "var(--mono)", "fontSize": "10.5px", "fontWeight": "700", "letterSpacing": ".14em", "textTransform": "uppercase", "color": "#34d399"}}>
          <span style={{"width": "7px", "height": "7px", "borderRadius": "50%", "background": "#34d399", "boxShadow": "0 0 8px #34d399", "animation": "vtvBlink 1.6s ease-in-out infinite"}}></span>
          LIVE · SIERRA 3D
        </span>
      </button>

      <iframe id="vtv-iframe" style={{"position": "absolute", "inset": "0", "width": "100%", "height": "100%", "border": "0", "opacity": "0", "transition": "opacity .4s ease", "background": "#0a1622"}} title="3D Virtual Tour" allow="fullscreen; accelerometer; gyroscope; magnetometer; vr; xr-spatial-tracking" allowFullScreen referrerPolicy="no-referrer-when-downgrade" loading="lazy"></iframe>
      <div id="vtv-loading" style={{"position": "absolute", "inset": "0", "display": "none", "flexDirection": "column", "alignItems": "center", "justifyContent": "center", "gap": "14px", "color": "rgba(255,255,255,.85)", "fontSize": "14px", "fontWeight": "600", "background": "linear-gradient(135deg,#0a1622 0%,#002b4b 100%)", "zIndex": "1"}}>
        <i data-lucide="loader-2" className="i" style={{"width": "32px", "height": "32px", "animation": "vtv-spin 1s linear infinite"}}></i>
        <span>Loading immersive 3D tour…</span>
      </div>
      <button id="vtv-fs" type="button" aria-label="Enter fullscreen" title="Fullscreen" style={{"position": "absolute", "top": "12px", "insetInlineEnd": "12px", "zIndex": "3", "background": "rgba(0,43,75,.78)", "color": "#fff", "border": "0", "borderRadius": "8px", "width": "36px", "height": "36px", "cursor": "pointer", "display": "none", "placeItems": "center"}}>
        <i data-lucide="maximize-2" className="i" style={{"width": "16px", "height": "16px"}}></i>
      </button>
    </div>
    <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "flexWrap": "wrap", "gap": "12px", "marginTop": "14px"}}>
      <a aria-label="Link" href="https://listing3d.com/embed/r39d0bd4dde0a4fe693c7fe5fd230a896" target="_blank" rel="noopener noreferrer" style={{"display": "inline-flex", "alignItems": "center", "gap": "6px", "fontSize": "12.5px", "fontWeight": "600", "color": "var(--pri)", "textDecoration": "none"}}>
        <i data-lucide="external-link" className="i" style={{"width": "12px", "height": "12px"}}></i> Open tour in new tab
      </a>
      <span style={{"fontFamily": "var(--mono)", "fontSize": "11px", "color": "var(--muted)", "letterSpacing": ".06em", "textTransform": "uppercase"}}>Cinematic capture · Matterport-grade fidelity</span>
    </div>
  </div>
</section>



{/*  ═══ LIVE MAP (SECOND — now below the 3D tour) ═══════════════════════════
     Interactive Leaflet map with marker clustering. When zoomed out,
     nearby compounds group into styled clusters. When zoomed in, individual
     compound markers space out and are clearly visible.  */}
<section className="block" id="map-section" data-screen-label="Smart Map">
  <div className="wrap">
    <div className="sec-head rv">
      <div>
        <h2>Discover the Best Opportunities</h2>
        <p>Explore all New Cairo compounds on the interactive map. Click any marker for details.</p>
      </div>
      <a aria-label="Link" href="compounds.html" className="sec-link"><span data-i18n="allCpds"></span> <i data-lucide="arrow-right" className="i" style={{"width": "16px", "height": "16px"}}></i></a>
    </div>

    {/*  ═══ Quick filter bar (compound + bedrooms only) ═══
         Per user request: the OUTSIDE map (home page) only filters by
         compound + bedroom count. The inside compounds.html page keeps
         the full advanced filter set (type, price, delivery, mode).  */}
    {/*  ═══ SMART MAP FILTER — collapsible dropdown ═══
         Click the filter bar to expand/collapse. Shows active filter count
         as a badge. Compound search + beds selector inside.  */}
    <div className="hmf-wrap" style={{"marginBottom": "18px"}}>
      {/*  Filter trigger bar (always visible)  */}
      <button aria-label="Button" className="hmf-trigger" id="hmf-trigger" type="button" aria-expanded="false" style={{"display": "flex", "alignItems": "center", "justifyContent": "space-between", "gap": "14px", "width": "100%", "padding": "14px 20px", "background": "var(--surface)", "border": "1.5px solid var(--line-2)", "borderRadius": "14px", "boxShadow": "var(--shadow-s)", "cursor": "pointer", "transition": ".2s var(--silk)", "fontFamily": "var(--font)"}}>
        <span style={{"display": "flex", "alignItems": "center", "gap": "10px"}}>
          <i data-lucide="sliders-horizontal" className="i" style={{"width": "18px", "height": "18px", "color": "var(--pri)", "flex": "none"}}></i>
          <span style={{"fontSize": "14.5px", "fontWeight": "700", "color": "var(--ink)"}} data-i18n="hmfTitle">Smart Filter</span>
          <span id="hmf-active-badge" style={{"display": "none", "background": "var(--pri)", "color": "#fff", "fontFamily": "var(--mono)", "fontSize": "10px", "fontWeight": "800", "padding": "2px 8px", "borderRadius": "999px", "letterSpacing": ".04em"}}>0</span>
        </span>
        <span style={{"display": "flex", "alignItems": "center", "gap": "12px"}}>
          <span id="home-map-count" style={{"fontFamily": "var(--mono)", "fontSize": "12px", "fontWeight": "700", "color": "var(--muted)", "letterSpacing": ".04em", "whiteSpace": "nowrap"}}>… compounds</span>
          <i data-lucide="chevron-down" className="i" id="hmf-chevron" style={{"width": "18px", "height": "18px", "color": "var(--muted)", "transition": "transform .3s var(--silk)", "flex": "none"}}></i>
        </span>
      </button>

      {/*  Filter panel (collapsible)  */}
      <div className="hmf-panel" id="hmf-panel" style={{"display": "none", "marginTop": "8px", "padding": "18px 20px", "background": "var(--surface)", "border": "1.5px solid var(--line-2)", "borderRadius": "14px", "boxShadow": "var(--shadow-s)", "animation": "hmfSlideDown .3s var(--silk) both"}}>
        {/*  Compound multi-select row  */}
        <div style={{"marginBottom": "16px"}}>
          <div style={{"display": "flex", "alignItems": "center", "gap": "6px", "fontFamily": "var(--mono)", "fontSize": "11px", "fontWeight": "700", "letterSpacing": ".1em", "textTransform": "uppercase", "color": "var(--muted)", "marginBottom": "8px"}}>
            <i data-lucide="building-2" className="i" style={{"width": "14px", "height": "14px"}}></i>
            <span data-i18n="hmfCompounds">Compounds</span>
            <span style={{"fontSize": "10px", "fontWeight": "600", "letterSpacing": ".04em", "textTransform": "none", "color": "var(--muted)", "opacity": ".7"}} data-i18n="hmfMultiHint">Click to select multiple</span>
          </div>
          {/*  Selected chips area  */}
          <div id="hmf-compound-chips" style={{"display": "flex", "gap": "6px", "flexWrap": "wrap", "marginBottom": "8px", "minHeight": "0"}}></div>
          {/*  Search + dropdown  */}
          <div style={{"display": "flex", "alignItems": "center", "gap": "9px", "padding": "10px 14px", "background": "var(--surface-2)", "border": "1.5px solid var(--line-2)", "borderRadius": "10px", "transition": ".2s", "position": "relative"}}>
            <i data-lucide="search" className="i" style={{"width": "17px", "height": "17px", "color": "var(--muted)", "flex": "none"}}></i>
            <input id="home-map-compound" type="text" data-i18n-ph="hmfPlaceholder" placeholder="Search compounds (e.g. Mivida, Hyde Park)…" style={{"flex": "1", "border": "none", "outline": "none", "background": "transparent", "fontFamily": "var(--font)", "fontSize": "14px", "color": "var(--ink)", "minWidth": "0"}} autoComplete="off" />
            <i data-lucide="chevron-down" className="i" style={{"width": "16px", "height": "16px", "color": "var(--muted)", "flex": "none", "transition": "transform .2s"}} id="hmf-compound-chevron"></i>
            {/*  Dropdown list (absolute positioned)  */}
            <div id="hmf-compound-dropdown" style={{"display": "none", "position": "absolute", "top": "calc(100% + 6px)", "left": "0", "right": "0", "maxHeight": "280px", "overflowY": "auto", "background": "var(--surface)", "border": "1.5px solid var(--line-2)", "borderRadius": "10px", "boxShadow": "var(--shadow-m)", "zIndex": "200", "padding": "6px"}}></div>
          </div>
        </div>

        {/*  Beds selector row (single select, no '+')  */}
        <div style={{"display": "flex", "alignItems": "center", "gap": "10px", "flexWrap": "wrap"}}>
          <span style={{"display": "flex", "alignItems": "center", "gap": "6px", "fontFamily": "var(--mono)", "fontSize": "11px", "fontWeight": "700", "letterSpacing": ".1em", "textTransform": "uppercase", "color": "var(--muted)"}}>
            <i data-lucide="bed-double" className="i" style={{"width": "14px", "height": "14px"}}></i>
            <span data-i18n="hmfBeds">Bedrooms</span>
          </span>
          <div id="home-map-beds" style={{"display": "flex", "gap": "4px", "padding": "3px", "background": "var(--bg)", "borderRadius": "999px"}}>
            <button aria-label="Button" className="on" data-b="0" type="button" style={{"border": "none", "cursor": "pointer", "padding": "7px 14px", "borderRadius": "999px", "fontFamily": "var(--font)", "fontSize": "12px", "fontWeight": "700", "color": "var(--muted)", "background": "transparent", "transition": ".2s"}} data-i18n="hmfAny">Any</button>
            <button aria-label="Button" data-b="1" type="button" style={{"border": "none", "cursor": "pointer", "padding": "7px 14px", "borderRadius": "999px", "fontFamily": "var(--font)", "fontSize": "12px", "fontWeight": "700", "color": "var(--muted)", "background": "transparent", "transition": ".2s"}}>1</button>
            <button aria-label="Button" data-b="2" type="button" style={{"border": "none", "cursor": "pointer", "padding": "7px 14px", "borderRadius": "999px", "fontFamily": "var(--font)", "fontSize": "12px", "fontWeight": "700", "color": "var(--muted)", "background": "transparent", "transition": ".2s"}}>2</button>
            <button aria-label="Button" data-b="3" type="button" style={{"border": "none", "cursor": "pointer", "padding": "7px 14px", "borderRadius": "999px", "fontFamily": "var(--font)", "fontSize": "12px", "fontWeight": "700", "color": "var(--muted)", "background": "transparent", "transition": ".2s"}}>3</button>
            <button aria-label="Button" data-b="4" type="button" style={{"border": "none", "cursor": "pointer", "padding": "7px 14px", "borderRadius": "999px", "fontFamily": "var(--font)", "fontSize": "12px", "fontWeight": "700", "color": "var(--muted)", "background": "transparent", "transition": ".2s"}}>4</button>
            <button aria-label="Button" data-b="5" type="button" style={{"border": "none", "cursor": "pointer", "padding": "7px 14px", "borderRadius": "999px", "fontFamily": "var(--font)", "fontSize": "12px", "fontWeight": "700", "color": "var(--muted)", "background": "transparent", "transition": ".2s"}}>5</button>
          </div>
          <button aria-label="Button" id="hmf-reset" type="button" style={{"marginInlineStart": "auto", "border": "1.5px solid var(--line-2)", "background": "var(--surface-2)", "color": "var(--text)", "fontFamily": "var(--font)", "fontSize": "12px", "fontWeight": "700", "padding": "7px 14px", "borderRadius": "999px", "cursor": "pointer", "transition": ".2s", "display": "inline-flex", "alignItems": "center", "gap": "5px"}}>
            <i data-lucide="rotate-ccw" className="i" style={{"width": "12px", "height": "12px"}}></i>
            <span data-i18n="hmfReset">Reset</span>
          </button>
        </div>
      </div>
    </div>

    <div className="map-sticky-wrap" id="map-sticky-wrap">
      <div id="home-map" style={{"height": "480px", "borderRadius": "var(--r-card)", "border": "1px solid var(--line)", "zIndex": "1", "background": "var(--bg)", "marginBottom": "8px"}}></div>
    </div>
    <div style={{"textAlign": "center", "marginTop": "12px"}}>
      <a aria-label="Link" href="compounds.html" className="btn btn-navy" style={{"display": "inline-flex", "alignItems": "center", "gap": "8px", "textDecoration": "none"}}>
        <i data-lucide="map" className="i" style={{"width": "16px", "height": "16px"}}></i>
        <span>Open Full Map</span>
      </a>
    </div>
  </div>
</section>

{/*  ═══ INSIGHTS — AI-ranked best listings + market analytics ═════════════════
     This section shows the top 3 AI-ranked properties + market insights.
     When wired to the backend (Firestore), the admin page can update these
     insights in real-time. The data structure is ready for Firestore.  */}
<section className="block" id="insights" data-screen-label="AI Insights">
  <div className="wrap">
    <div className="sec-head rv">
      <div>
        <h2>Best Listings Right Now</h2>
        <p>AI-ranked by match score, ROI potential, and market demand. Updates in real-time.</p>
      </div>
    </div>
    <div id="insights-grid" style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(300px,1fr))", "gap": "20px", "marginBottom": "30px"}}></div>
    <div id="insights-market" style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(220px,1fr))", "gap": "16px", "padding": "24px", "background": "var(--bg)", "borderRadius": "14px", "border": "1px solid var(--line)"}}>
      <div style={{"textAlign": "center"}}>
        <div style={{"fontFamily": "var(--mono)", "fontSize": "32px", "fontWeight": "800", "color": "var(--pri)"}}>+24%</div>
        <div style={{"fontSize": "12px", "color": "var(--muted)", "textTransform": "uppercase", "letterSpacing": ".08em"}}>Top Growth (Mountain View)</div>
      </div>
      <div style={{"textAlign": "center"}}>
        <div style={{"fontFamily": "var(--mono)", "fontSize": "32px", "fontWeight": "800", "color": "#34d399"}}>9.8</div>
        <div style={{"fontSize": "12px", "color": "var(--muted)", "textTransform": "uppercase", "letterSpacing": ".08em"}}>Highest AI Score (Hyde Park)</div>
      </div>
      <div style={{"textAlign": "center"}}>
        <div style={{"fontFamily": "var(--mono)", "fontSize": "32px", "fontWeight": "800", "color": "var(--pri)"}}>EGP 35M</div>
        <div style={{"fontSize": "12px", "color": "var(--muted)", "textTransform": "uppercase", "letterSpacing": ".08em"}}>Top Price (Taj City)</div>
      </div>
      <div style={{"textAlign": "center"}}>
        <div style={{"fontFamily": "var(--mono)", "fontSize": "32px", "fontWeight": "800", "color": "#34d399"}}>798</div>
        <div style={{"fontSize": "12px", "color": "var(--muted)", "textTransform": "uppercase", "letterSpacing": ".08em"}}>Active Units</div>
      </div>
    </div>
    <div style={{"textAlign": "center", "marginTop": "20px"}}>
      <a aria-label="Link" href="properties.html" className="btn btn-navy" style={{"display": "inline-flex", "alignItems": "center", "gap": "8px", "textDecoration": "none"}}>
        <i data-lucide="trending-up" className="i" style={{"width": "16px", "height": "16px"}}></i>
        <span>View All Best Listings</span>
      </a>
    </div>
  </div>
</section>

{/*  STATS  */}
<section className="stats" data-screen-label="Stats strip">
  <div className="wrap">
    <div className="stat rv"><b data-count="1900" data-suffix="+">0</b><span data-i18n="stat1"></span></div>
    <div className="stat rv d1"><b data-count="53">0</b><span data-i18n="stat2"></span></div>
    <div className="stat rv d2"><b data-count="68">0</b><span data-i18n="stat3"></span></div>
    <div className="stat rv d3"><b data-count="4.2" data-prefix="EGP " data-suffix="B">0</b><span data-i18n="stat4"></span></div>
  </div>
</section>

{/*  TESTIMONIALS  */}
<section className="block testi-band" id="testimonials" data-screen-label="Testimonials">
  <div className="wrap">
    <div className="sec-head rv">
      <div>
        <div className="eyebrow" data-i18n="eyeTesti"></div>
        <h2 data-i18n="testiTit"></h2>
        <p data-i18n="testiSub"></p>
      </div>
    </div>
    <div className="grid-testi" id="testi-grid"></div>
  </div>
</section>

{/*  PERFECT CHOICE + INQUIRY  */}
<section className="block" id="inquiry" data-screen-label="Why Sierra + inquiry form">
  <div className="wrap">
    <div className="perfect rv">
      <div className="pf-left">
        <h2 data-i18n="perfTit"></h2>
        <p data-i18n="perfSub"></p>
        <div className="pf-item"><span className="num">01</span><div><h4 data-i18n="pc1t"></h4><p data-i18n="pc1s"></p></div></div>
        <div className="pf-item"><span className="num">02</span><div><h4 data-i18n="pc2t"></h4><p data-i18n="pc2s"></p></div></div>
        <div className="pf-item"><span className="num">03</span><div><h4 data-i18n="pc3t"></h4><p data-i18n="pc3s"></p></div></div>
      </div>
      <form className="inq" id="inq-form">
        <h3 data-i18n="inqTit"></h3>
        <p data-i18n="inqSub"></p>
        <div className="seg" id="inq-seg">
          <button aria-label="Button" type="button" className="on" data-i18n="inqBuy"></button>
          <button aria-label="Button" type="button" data-i18n="inqRent"></button>
          <button aria-label="Button" type="button" data-i18n="inqSell"></button>
        </div>
        <div className="frow">
          <div><label data-i18n="inqName"></label><input type="text" id="inq-name" required/></div>
          <div><label data-i18n="inqPhone"></label><input type="tel" id="inq-phone" dir="ltr" required placeholder="+2 01XXXXXXXXX"/></div>
        </div>
        <div className="frow">
          <div><label data-i18n="inqEmail"></label><input type="email" id="inq-email" dir="ltr" placeholder="you@example.com"/></div>
          <div><label data-i18n="inqZone"></label><select aria-label="Select" id="inq-zone"></select></div>
        </div>
        <div className="frow">
          <div><label data-i18n="inqType2"></label><select aria-label="Select" id="inq-type"></select></div>
          <div><label data-i18n="inqBudget"></label><input type="text" id="inq-budget" placeholder="10,000,000" dir="ltr"/></div>
        </div>
        <button aria-label="Button" className="btn btn-pri" type="submit"><i data-lucide="send" className="i"></i> <span data-i18n="inqSend"></span></button>
        <div id="inq-success" style={{"display": "none", "marginTop": "14px", "padding": "14px 18px", "background": "rgba(52,211,153,.08)", "border": "1px solid rgba(52,211,153,.35)", "borderRadius": "10px", "color": "#16a34a", "fontWeight": "600", "fontSize": "13.5px"}}>
          <i data-lucide="check-circle" style={{"width": "16px", "height": "16px", "verticalAlign": "middle", "marginInlineEnd": "6px"}}></i>
          <span>Thank you! Your inquiry has been received. Our team will contact you within 24 hours.</span>
        </div>
      </form>
    </div>
  </div>
</section>

{/*  AI HUB / Intelligence Engine (moved below Why Sierra)  */}
<section className="ai-hub" id="ai" data-screen-label="AI hub">
  <div className="ai-gridlines" aria-hidden="true"></div>
  <div className="ai-watermark" id="ai-watermark" aria-hidden="true"></div>
  <div className="wrap">
    <div className="ai-eye rv"><span className="live"></span> <span data-i18n="aiEye"></span></div>
    <h2 className="rv">Intelligence<sup>1</sup> Engine<sup>&trade;</sup></h2>
    <p className="ai-lead rv" data-i18n="aiSub"></p>
    <div className="ai-scan"></div>
    <div className="ai-grid" id="ai-grid"></div>
    {/*  AI tool preview images  */}
    <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(280px,1fr))", "gap": "16px", "marginTop": "28px"}}>
      <a aria-label="Link" href="matches.html" style={{"display": "block", "borderRadius": "14px", "overflow": "hidden", "position": "relative", "textDecoration": "none"}}>
        <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80" alt="Smart Match" style={{"width": "100%", "height": "180px", "objectFit": "cover", "transition": "transform .4s var(--silk)"}} loading="lazy"/>
        <div style={{"position": "absolute", "inset": "0", "background": "linear-gradient(180deg,transparent 50%,rgba(7,18,30,.9) 100%)"}}></div>
        <div style={{"position": "absolute", "bottom": "12px", "left": "16px", "color": "#fff"}}>
          <div style={{"fontFamily": "var(--mono)", "fontSize": "9px", "letterSpacing": ".14em", "textTransform": "uppercase", "color": "#34d399"}}>LIVE</div>
          <div style={{"fontSize": "14px", "fontWeight": "700"}}>Smart Match v3</div>
        </div>
      </a>
      <a aria-label="Link" href="pricing.html" style={{"display": "block", "borderRadius": "14px", "overflow": "hidden", "position": "relative", "textDecoration": "none"}}>
        <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80" alt="AVM Pricing" style={{"width": "100%", "height": "180px", "objectFit": "cover", "transition": "transform .4s var(--silk)"}} loading="lazy"/>
        <div style={{"position": "absolute", "inset": "0", "background": "linear-gradient(180deg,transparent 50%,rgba(7,18,30,.9) 100%)"}}></div>
        <div style={{"position": "absolute", "bottom": "12px", "left": "16px", "color": "#fff"}}>
          <div style={{"fontFamily": "var(--mono)", "fontSize": "9px", "letterSpacing": ".14em", "textTransform": "uppercase", "color": "#34d399"}}>LIVE</div>
          <div style={{"fontSize": "14px", "fontWeight": "700"}}>AVM Pricing Engine</div>
        </div>
      </a>
      <a aria-label="Link" href="roi.html" style={{"display": "block", "borderRadius": "14px", "overflow": "hidden", "position": "relative", "textDecoration": "none"}}>
        <img src="https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=80" alt="ROI Forecaster" style={{"width": "100%", "height": "180px", "objectFit": "cover", "transition": "transform .4s var(--silk)"}} loading="lazy"/>
        <div style={{"position": "absolute", "inset": "0", "background": "linear-gradient(180deg,transparent 50%,rgba(7,18,30,.9) 100%)"}}></div>
        <div style={{"position": "absolute", "bottom": "12px", "left": "16px", "color": "#fff"}}>
          <div style={{"fontFamily": "var(--mono)", "fontSize": "9px", "letterSpacing": ".14em", "textTransform": "uppercase", "color": "#34d399"}}>LIVE</div>
          <div style={{"fontSize": "14px", "fontWeight": "700"}}>ROI Forecaster</div>
        </div>
      </a>
    </div>
    <div style={{"marginTop": "16px"}} className="rv">
      <button aria-label="Button" className="tour-launch" id="tour-open" type="button">
        <span className="t-ic"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg></span>
        <span className="t-txt"><b data-i18n="tourLaunchTit"></b><span data-i18n="tourLaunchSub"></span></span>
        <span className="t-play"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg></span>
      </button>
    </div>
  </div>
</section>

{/*  CTA  */}
<section className="block" id="contact" style={{"paddingTop": "0"}} data-screen-label="CTA band">
  <div className="wrap">
    <div className="cta rv">
      <div className="ct-txt">
        <h2 data-i18n="ctaTit"></h2>
        <p data-i18n="ctaSub"></p>
      </div>
      <div className="ct-act">
        <button aria-label="Button" className="btn btn-white" type="button"><i data-lucide="plus" className="i"></i> <span data-i18n="ctaBtn1"></span></button>
        <a aria-label="Link" href="https://wa.me/201092048333" target="_blank" rel="noopener noreferrer" className="btn btn-out" style={{"textDecoration": "none"}}><i data-lucide="phone" className="i"></i> <span>+2 01092048333</span></a>
      </div>
      <div style={{"marginTop": "14px", "fontFamily": "var(--mono)", "fontSize": "13px", "color": "rgba(255,255,255,.6)"}}>
        <i data-lucide="mail" className="i" style={{"width": "14px", "height": "14px", "verticalAlign": "-2px"}}></i> <a aria-label="Link" href="mailto:info@Sierra-Estates.net" style={{"color": "rgba(255,255,255,.7)", "textDecoration": "none"}}>info@Sierra-Estates.net</a>
      </div>
    </div>
  </div>
</section>

{/*  PARTNERS  */}
<div className="partners" data-screen-label="Developer partners">
  <div className="wrap">
    <div className="p-eye rv" data-i18n="partEye"></div>
    <div className="row rv d1">
      <span>EMAAR MISR</span><span>SODIC</span><span>MOUNTAIN VIEW</span><span>PALM HILLS</span><span>ORA</span><span>LA VISTA</span><span>HYDE PARK</span><span>MARAKEZ</span>
    </div>
  </div>
</div>

<footer id="site-footer" data-screen-label="Footer"></footer>

{/*  VIRTUAL TOUR MODAL  */}
<div className="tour-modal" id="tour-modal">
  <button className="t-close" id="tour-close" type="button" aria-label="Close">×</button>
  <iframe id="tour-frame" title="Sierra Estates Virtual Tour" allow="fullscreen"></iframe>
</div>



{/*  ═══ HOME PAGE MAP — Leaflet init with marker clustering ══════════════════
     Shows all compounds on an interactive map. Featured compounds pulse.
     Uses Leaflet.markercluster so nearby compounds group into styled
     clusters when zoomed out, and spread out when zoomed in.
     Clicking any marker → compounds.html?cpd=<name>  */}


{/*  ═══ PERCIPIO-STYLE SCROLL MOTION — JS ════════════════════════════════════
     Clean scroll-triggered fade-ups. No preloader, no cursor, no magnetic.
     Just elegant content reveals as you scroll. Works on all devices.  */}

{/*  ═══ TWEAKS PANEL — accent color + corner style + font color customization ═══  */}
<button className="tweaks-trigger" id="tweaks-trigger" type="button" title="Customize" aria-label="Open customization panel">
  <i data-lucide="palette" className="i"></i>
</button>
<div className="tweaks-overlay" id="tweaks-overlay">
  <div className="tweaks-panel">
    <div className="tweaks-head">
      <h3>Tweaks</h3>
      <button className="tweaks-close" id="tweaks-close" type="button" aria-label="Close customization panel">×</button>
    </div>
    <div className="tweaks-section">
      <div className="tweaks-label">Accent Color</div>
      <div className="tweaks-swatches" id="tweaks-swatches">
        <div className="tweaks-swatch on" data-color="#00aeff" style={{"background": "#00aeff"}} title="Cyan"></div>
        <div className="tweaks-swatch" data-color="#c8961a" style={{"background": "#c8961a"}} title="Gold"></div>
        <div className="tweaks-swatch" data-color="#34d399" style={{"background": "#34d399"}} title="Green"></div>
        <div className="tweaks-swatch" data-color="#e63946" style={{"background": "#e63946"}} title="Red"></div>
        <div className="tweaks-swatch" data-color="#a78bfa" style={{"background": "#a78bfa"}} title="Purple"></div>
      </div>
    </div>
    <div className="tweaks-section">
      <div className="tweaks-label">Font Color</div>
      <div className="tweaks-font-row" id="tweaks-fonts">
        <button aria-label="Button" className="tweaks-font-btn on" data-font="#0d2136" type="button">Dark</button>
        <button aria-label="Button" className="tweaks-font-btn" data-font="#002b4b" type="button">Navy</button>
        <button aria-label="Button" className="tweaks-font-btn" data-font="#4a5568" type="button">Slate</button>
        <button aria-label="Button" className="tweaks-font-btn" data-font="#1a1a2e" type="button">Midnight</button>
      </div>
    </div>
    <div className="tweaks-section">
      <div className="tweaks-label">Corners</div>
      <div className="tweaks-corners" id="tweaks-corners">
        <button aria-label="Button" className="tweaks-corner-btn" data-radius="0" type="button">Sharp</button>
        <button aria-label="Button" className="tweaks-corner-btn on" data-radius="10" type="button">Balanced</button>
        <button aria-label="Button" className="tweaks-corner-btn" data-radius="20" type="button">Soft</button>
      </div>
    </div>
    <div className="tweaks-section">
      <div className="tweaks-label">Logo</div>
      <div className="tweaks-logo-row">
        <span className="tweaks-logo-preview"><img id="tweaks-logo-preview-img" src="logo-gold.png" alt="Logo preview"/></span>
        <div className="tweaks-logo-btns">
          <label className="tweaks-logo-upload" htmlFor="tweaks-logo-file">Upload logo</label>
          <input type="file" id="tweaks-logo-file" accept="image/*" hidden/>
          <button aria-label="Button" className="tweaks-logo-reset" id="tweaks-logo-reset" type="button">Reset</button>
        </div>
      </div>
    </div>
  </div>
</div>

{/*  AI hub interactivity: watermark parallax + card spotlight/tilt  */}


      </div>
    </>
  );
}
