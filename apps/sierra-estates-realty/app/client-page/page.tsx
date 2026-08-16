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
  <div className="dots wrap" id="hero-dots" style={{{"left": "auto"}}}></div>
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
    <a aria-label="Link" href="#contact" className="bell-btn">Request Now <i data-lucide="arrow-right" style={{{"width": "13px", "height": "13px"}}}></i></a>
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
        <div className="search-compound-wrap" style={{{"position": "relative"}}}>
          <input type="text" id="hero-compound-search" className="hero-search-input" placeholder="Search compound... (e.g. Mivida)" autocomplete="off" style={{{"width": "100%", "border": "none", "background": "none", "fontFamily": "var(--font)", "fontSize": "14px", "color": "var(--ink)", "outline": "none", "padding": "8px 0"}}} />
          <div id="hero-compound-results" className="compound-dropdown" style={{{"display": "none", "position": "absolute", "top": "100%", "left": "0", "right": "0", "background": "var(--surface)", "border": "1px solid var(--line)", "borderRadius": "0 0 10px 10px", "boxShadow": "var(--shadow-m)", "zIndex": "100", "maxHeight": "280px", "overflowY": "auto"}}}></div>
        </div>
      </div>
      {/*  Property Type dropdown  */}
      <div className="field">
        <label data-i18n="fType"></label>
        <select aria-label="Select" id="hero-type" className="hero-select" style={{{"width": "100%", "border": "1.5px solid var(--line-2)", "borderRadius": "8px", "padding": "9px 12px", "fontFamily": "var(--font)", "fontSize": "14px", "color": "var(--ink)", "background": "var(--surface-2)", "outline": "none", "cursor": "pointer"}}}>
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
        <select aria-label="Select" id="hero-beds" className="hero-select" style={{{"width": "100%", "border": "1.5px solid var(--line-2)", "borderRadius": "8px", "padding": "9px 12px", "fontFamily": "var(--font)", "fontSize": "14px", "color": "var(--ink)", "background": "var(--surface-2)", "outline": "none", "cursor": "pointer"}}}>
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
        <select aria-label="Select" id="hero-price" className="hero-select" style={{{"width": "100%", "border": "1.5px solid var(--line-2)", "borderRadius": "8px", "padding": "9px 12px", "fontFamily": "var(--font)", "fontSize": "14px", "color": "var(--ink)", "background": "var(--surface-2)", "outline": "none", "cursor": "pointer"}}}>
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
      <a aria-label="Link" href="properties.html" className="sec-link"><span data-i18n="viewAll"></span> <i data-lucide="arrow-right" className="i" style={{{"width": "16px", "height": "16px"}}}></i></a>
    </div>
    <div className="grid-props" id="prop-grid"></div>
  </div>
</section>

{/*  WHY SIERRA (moved here — right after units/properties)  */}
<section className="block" id="agents" data-screen-label="Why Sierra">
  <div className="wrap">
    <div className="sec-head rv" style={{{"flexDirection": "column", "alignItems": "center", "textAlign": "center"}}}>
      <div>
        <h2>Why Sierra<sup>1</sup> Estates<sup>&trade;</sup></h2>
        <p data-i18n="whySub" style={{{"marginInline": "auto"}}}></p>
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
      <a aria-label="Link" href="compounds.html" className="sec-link"><span data-i18n="allCpds"></span> <i data-lucide="arrow-right" className="i" style={{{"width": "16px", "height": "16px"}}}></i></a>
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
    <div className="sec-head rv" style={{{"display": "flex", "justifyContent": "space-between", "alignItems": "flex-end", "gap": "18px", "flexWrap": "wrap", "marginBottom": "24px"}}}>
      <div>
        <h2 data-i18n="tourTit" style={{{"fontFamily": "var(--display)", "fontSize": "34px", "fontWeight": "700", "letterSpacing": "-.01em"}}}></h2>
        <p data-i18n="tourSub"></p>
      </div>
      <a aria-label="Link" href="virtual-tour.html" style={{{"color": "var(--pri)", "fontWeight": "700", "fontSize": "14px", "textDecoration": "none", "display": "inline-flex", "alignItems": "center", "gap": "8px", "whiteSpace": "nowrap", "padding": "10px 18px", "border": "1.5px solid var(--pri)", "borderRadius": "999px", "transition": ".25s var(--silk)"}}}>
        Open full page <i data-lucide="arrow-right" className="i" style={{{"width": "14px", "height": "14px"}}}></i>
      </a>
    </div>

    {/*  ── Banner frame: gold gradient border + glow ──  */}
    <div id="vtv-banner" style={{{"position": "relative", "width": "100%", "aspectRatio": "21/9", "minHeight": "420px", "borderRadius": "18px", "overflow": "hidden", "background": "#0a1622", "boxShadow": "0 24px 70px rgba(13,33,54,.18),0 0 0 1px rgba(200,150,26,.18) inset", "marginTop": "8px"}}}>
      {/*  Gold gradient border glow  */}
      <div style={{{"position": "absolute", "inset": "0", "borderRadius": "18px", "padding": "1.5px", "background": "linear-gradient(135deg,rgba(200,150,26,.65) 0%,rgba(233,193,118,.25) 25%,transparent 50%,rgba(0,174,255,.18) 75%,rgba(200,150,26,.5) 100%)", "WebkitMask": "linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0)", "WebkitMaskComposite": "xor", "maskComposite": "exclude", "pointerEvents": "none", "zIndex": "4"}}}></div>

      {/*  Click-to-activate poster button  */}
      <button id="vtv-poster" type="button" aria-label="Launch 3D virtual tour" style={{{"position": "absolute", "inset": "0", "width": "100%", "height": "100%", "border": "0", "padding": "0", "cursor": "pointer", "backgroundColor": "#0a1622", "backgroundImage": "url('https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=2000&q=90')", "backgroundSize": "cover", "backgroundPosition": "center", "display": "flex", "alignItems": "center", "justifyContent": "center"}}}>
        {/*  Cinematic gradient scrim (deeper on left for text legibility)  */}
        <span style={{{"position": "absolute", "inset": "0", "background": "linear-gradient(95deg,rgba(0,18,35,.88) 0%,rgba(0,18,35,.62) 38%,rgba(0,18,35,.18) 65%,rgba(0,18,35,.55) 100%)", "zIndex": "1"}}}></span>
        {/*  Subtle bottom scrim for stats card  */}
        <span style={{{"position": "absolute", "inset": "0", "background": "linear-gradient(0deg,rgba(0,15,30,.65) 0%,transparent 35%)", "zIndex": "1"}}}></span>

        {/*  ── LEFT: USP headline + feature pills ──  */}
        <span style={{{"position": "absolute", "top": "0", "left": "0", "bottom": "0", "width": "54%", "zIndex": "2", "display": "flex", "flexDirection": "column", "justifyContent": "center", "padding": "48px 56px", "textAlign": "left", "gap": "14px"}}}>
          <span style={{{"display": "inline-flex", "alignItems": "center", "gap": "10px", "fontFamily": "var(--mono)", "fontSize": "11px", "fontWeight": "700", "letterSpacing": ".22em", "textTransform": "uppercase", "color": "#e9c176"}}}>
            <span style={{{"width": "24px", "height": "1.5px", "background": "#e9c176", "display": "inline-block"}}}></span>
            SIERRA 3D · POWERED BY IMMERSIVE TECH
          </span>
          <span style={{{"fontFamily": "var(--display)", "fontSize": "46px", "fontWeight": "700", "lineHeight": "1.05", "letterSpacing": "-.015em", "color": "#fff", "textShadow": "0 4px 24px rgba(0,0,0,.55)", "maxWidth": "560px"}}}>
            Walk Through Your<br/>Next Home
            <span style={{{"display": "inline-block", "fontStyle": "italic", "color": "#e9c176", "fontWeight": "600"}}}>Before You Visit</span>
          </span>
          <span style={{{"fontSize": "14.5px", "lineHeight": "1.55", "color": "rgba(255,255,255,.86)", "maxWidth": "480px", "fontWeight": "500", "marginTop": "4px", "textShadow": "0 1px 8px rgba(0,0,0,.4)"}}}>
            Every Sierra listing is captured in cinematic 4K HDR. Stroll room-by-room, peek into the garden at dusk, gauge the pool from above, all from your screen, all in seconds.
          </span>
          {/*  Feature pills  */}
          <span style={{{"display": "flex", "gap": "8px", "flexWrap": "wrap", "marginTop": "8px"}}}>
            <span style={{{"display": "inline-flex", "alignItems": "center", "gap": "6px", "fontFamily": "var(--mono)", "fontSize": "10.5px", "fontWeight": "700", "letterSpacing": ".1em", "textTransform": "uppercase", "color": "#fff", "background": "rgba(255,255,255,.08)", "border": "1px solid rgba(255,255,255,.18)", "WebkitBackdropFilter": "blur(8px)", "backdropFilter": "blur(6px)", "padding": "6px 11px", "borderRadius": "999px"}}}>
              <i data-lucide="video" className="i" style={{{"width": "11px", "height": "11px", "color": "#34d399"}}}></i> 4K HDR
            </span>
            <span style={{{"display": "inline-flex", "alignItems": "center", "gap": "6px", "fontFamily": "var(--mono)", "fontSize": "10.5px", "fontWeight": "700", "letterSpacing": ".1em", "textTransform": "uppercase", "color": "#fff", "background": "rgba(255,255,255,.08)", "border": "1px solid rgba(255,255,255,.18)", "WebkitBackdropFilter": "blur(8px)", "backdropFilter": "blur(6px)", "padding": "6px 11px", "borderRadius": "999px"}}}>
              <i data-lucide="door-open" className="i" style={{{"width": "11px", "height": "11px", "color": "#34d399"}}}></i> Room-by-room
            </span>
            <span style={{{"display": "inline-flex", "alignItems": "center", "gap": "6px", "fontFamily": "var(--mono)", "fontSize": "10.5px", "fontWeight": "700", "letterSpacing": ".1em", "textTransform": "uppercase", "color": "#fff", "background": "rgba(255,255,255,.08)", "border": "1px solid rgba(255,255,255,.18)", "WebkitBackdropFilter": "blur(8px)", "backdropFilter": "blur(6px)", "padding": "6px 11px", "borderRadius": "999px"}}}>
              <i data-lucide="glasses" className="i" style={{{"width": "11px", "height": "11px", "color": "#34d399"}}}></i> VR-ready
            </span>
            <span style={{{"display": "inline-flex", "alignItems": "center", "gap": "6px", "fontFamily": "var(--mono)", "fontSize": "10.5px", "fontWeight": "700", "letterSpacing": ".1em", "textTransform": "uppercase", "color": "#fff", "background": "rgba(255,255,255,.08)", "border": "1px solid rgba(255,255,255,.18)", "WebkitBackdropFilter": "blur(8px)", "backdropFilter": "blur(6px)", "padding": "6px 11px", "borderRadius": "999px"}}}>
              <i data-lucide="grid-2x2" className="i" style={{{"width": "11px", "height": "11px", "color": "#34d399"}}}></i> Floor plan
            </span>
          </span>
        </span>

        {/*  ── RIGHT: Big play button + label ──  */}
        <span style={{{"position": "absolute", "insetInlineEnd": "0", "top": "0", "bottom": "0", "width": "46%", "zIndex": "2", "display": "flex", "flexDirection": "column", "alignItems": "center", "justifyContent": "center", "gap": "18px", "pointerEvents": "none"}}}>
          <span style={{{"width": "104px", "height": "104px", "borderRadius": "50%", "background": "rgba(255,255,255,.94)", "display": "grid", "placeItems": "center", "flex": "none", "boxShadow": "0 0 0 8px rgba(255,255,255,.18),0 0 0 18px rgba(255,255,255,.08),0 18px 50px rgba(0,0,0,.45)", "transition": "transform .35s var(--silk)", "animation": "vtvPulse 2.6s ease-in-out infinite"}}}>
            <i data-lucide="play" className="i" style={{{"width": "42px", "height": "42px", "color": "#0a1622", "fill": "#0a1622", "marginInlineStart": "5px"}}}></i>
          </span>
          <span style={{{"display": "block", "fontFamily": "var(--mono)", "fontSize": "12.5px", "fontWeight": "800", "letterSpacing": ".32em", "color": "#fff", "textTransform": "uppercase", "textShadow": "0 2px 12px rgba(0,0,0,.6)"}}}>▶ Launch 3D Tour</span>
        </span>

        {/*  ── BOTTOM-LEFT: property info card ──  */}
        <span style={{{"position": "absolute", "bottom": "26px", "insetInlineStart": "56px", "zIndex": "3", "display": "flex", "flexDirection": "column", "gap": "5px"}}}>
          <span style={{{"display": "inline-flex", "alignItems": "center", "gap": "8px", "fontFamily": "var(--mono)", "fontSize": "10.5px", "fontWeight": "700", "letterSpacing": ".16em", "color": "#e9c176", "textTransform": "uppercase"}}}>
            <i data-lucide="map-pin" className="i" style={{{"width": "11px", "height": "11px"}}}></i> Featured · New Cairo
          </span>
          <span style={{{"fontFamily": "var(--display)", "fontSize": "22px", "fontWeight": "700", "lineHeight": "1.2", "color": "#fff", "maxWidth": "480px", "letterSpacing": "-.005em"}}}>Sierra Signature Villa · Mivida</span>
          <span style={{{"fontFamily": "var(--mono)", "fontSize": "11.5px", "color": "rgba(255,255,255,.78)", "fontWeight": "600"}}}>5 Bed · 6 Bath · 480 m² · Pool · Garden</span>
        </span>

        {/*  ── BOTTOM-RIGHT: floating stats card ──  */}
        <span style={{{"position": "absolute", "bottom": "24px", "insetInlineEnd": "24px", "zIndex": "3", "background": "rgba(0,18,35,.62)", "WebkitBackdropFilter": "blur(8px)", "backdropFilter": "blur(14px)", "WebkitWebkitBackdropFilter": "blur(8px)", "border": "1px solid rgba(200,150,26,.32)", "borderRadius": "14px", "padding": "14px 18px", "display": "flex", "gap": "22px", "alignItems": "center"}}}>
          <span style={{{"display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "1px"}}}>
            <span style={{{"fontFamily": "var(--mono)", "fontSize": "22px", "fontWeight": "800", "color": "#e9c176", "lineHeight": "1"}}}>47</span>
            <span style={{{"fontFamily": "var(--mono)", "fontSize": "8.5px", "fontWeight": "700", "letterSpacing": ".12em", "textTransform": "uppercase", "color": "rgba(255,255,255,.72)"}}}>tours live</span>
          </span>
          <span style={{{"width": "1px", "height": "32px", "background": "rgba(255,255,255,.14)"}}}></span>
          <span style={{{"display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "1px"}}}>
            <span style={{{"fontFamily": "var(--mono)", "fontSize": "22px", "fontWeight": "800", "color": "#34d399", "lineHeight": "1"}}}>12</span>
            <span style={{{"fontFamily": "var(--mono)", "fontSize": "8.5px", "fontWeight": "700", "letterSpacing": ".12em", "textTransform": "uppercase", "color": "rgba(255,255,255,.72)"}}}>ready to move</span>
          </span>
          <span style={{{"width": "1px", "height": "32px", "background": "rgba(255,255,255,.14)"}}}></span>
          <span style={{{"display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "1px"}}}>
            <span style={{{"fontFamily": "var(--mono)", "fontSize": "22px", "fontWeight": "800", "color": "#8fe1ff", "lineHeight": "1"}}}>4K</span>
            <span style={{{"fontFamily": "var(--mono)", "fontSize": "8.5px", "fontWeight": "700", "letterSpacing": ".12em", "textTransform": "uppercase", "color": "rgba(255,255,255,.72)"}}}>HDR quality</span>
          </span>
        </span>

        {/*  ── TOP-RIGHT: LIVE badge ──  */}
        <span style={{{"position": "absolute", "top": "22px", "insetInlineEnd": "24px", "zIndex": "3", "display": "inline-flex", "alignItems": "center", "gap": "7px", "background": "rgba(0,18,35,.6)", "WebkitBackdropFilter": "blur(8px)", "backdropFilter": "blur(8px)", "border": "1px solid rgba(52,211,153,.35)", "borderRadius": "999px", "padding": "6px 12px", "fontFamily": "var(--mono)", "fontSize": "10.5px", "fontWeight": "700", "letterSpacing": ".14em", "textTransform": "uppercase", "color": "#34d399"}}}>
          <span style={{{"width": "7px", "height": "7px", "borderRadius": "50%", "background": "#34d399", "boxShadow": "0 0 8px #34d399", "animation": "vtvBlink 1.6s ease-in-out infinite"}}}></span>
          LIVE · SIERRA 3D
        </span>
      </button>

      <iframe id="vtv-iframe" style={{{"position": "absolute", "inset": "0", "width": "100%", "height": "100%", "border": "0", "opacity": "0", "transition": "opacity .4s ease", "background": "#0a1622"}}} title="3D Virtual Tour" allow="fullscreen; accelerometer; gyroscope; magnetometer; vr; xr-spatial-tracking" allowfullscreen referrerpolicy="no-referrer-when-downgrade" loading="lazy"></iframe>
      <div id="vtv-loading" style={{{"position": "absolute", "inset": "0", "display": "none", "flexDirection": "column", "alignItems": "center", "justifyContent": "center", "gap": "14px", "color": "rgba(255,255,255,.85)", "fontSize": "14px", "fontWeight": "600", "background": "linear-gradient(135deg,#0a1622 0%,#002b4b 100%)", "zIndex": "1"}}}>
        <i data-lucide="loader-2" className="i" style={{{"width": "32px", "height": "32px", "animation": "vtv-spin 1s linear infinite"}}}></i>
        <span>Loading immersive 3D tour…</span>
      </div>
      <button id="vtv-fs" type="button" aria-label="Enter fullscreen" title="Fullscreen" style={{{"position": "absolute", "top": "12px", "insetInlineEnd": "12px", "zIndex": "3", "background": "rgba(0,43,75,.78)", "color": "#fff", "border": "0", "borderRadius": "8px", "width": "36px", "height": "36px", "cursor": "pointer", "display": "none", "placeItems": "center"}}}>
        <i data-lucide="maximize-2" className="i" style={{{"width": "16px", "height": "16px"}}}></i>
      </button>
    </div>
    <div style={{{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "flexWrap": "wrap", "gap": "12px", "marginTop": "14px"}}}>
      <a aria-label="Link" href="https://listing3d.com/embed/r39d0bd4dde0a4fe693c7fe5fd230a896" target="_blank" rel="noopener noreferrer" style={{{"display": "inline-flex", "alignItems": "center", "gap": "6px", "fontSize": "12.5px", "fontWeight": "600", "color": "var(--pri)", "textDecoration": "none"}}}>
        <i data-lucide="external-link" className="i" style={{{"width": "12px", "height": "12px"}}}></i> Open tour in new tab
      </a>
      <span style={{{"fontFamily": "var(--mono)", "fontSize": "11px", "color": "var(--muted)", "letterSpacing": ".06em", "textTransform": "uppercase"}}}>Cinematic capture · Matterport-grade fidelity</span>
    </div>
  </div>
</section>
<style>
  @keyframes vtv-spin { to { transform: rotate(360deg); } }
  @keyframes vtvPulse { 0%,100%{transform:scale(1);box-shadow:0 0 0 8px rgba(255,255,255,.18),0 0 0 18px rgba(255,255,255,.08),0 18px 50px rgba(0,0,0,.45);} 50%{transform:scale(1.07);box-shadow:0 0 0 12px rgba(255,255,255,.22),0 0 0 24px rgba(255,255,255,.06),0 22px 56px rgba(0,0,0,.5);} }
  @keyframes vtvBlink { 0%,100%{opacity:1;} 50%{opacity:.35;} }
  #vtv-poster:hover ~ * .vtvPulse,
  #vtv-poster:hover span:nth-child(3) > span:first-child { transform: scale(1.06); }
  #vtv-frame:fullscreen, #vtv-banner:fullscreen { border-radius:0; }
  @media (prefers-reduced-motion: reduce) {
    #vtv-loading i { animation:none !important; }
    #vtv-poster .vtvPulse { animation:none !important; }
  }
  /* Responsive: stack headline above play button on tablets */
  @media (max-width: 980px) {
    #vtv-banner { aspect-ratio: 4/5; min-height: 540px; }
    #vtv-poster > span:nth-child(3) { width:100%; padding:32px 28px 16px; gap:10px; }
    #vtv-poster > span:nth-child(3) > span:nth-child(2) { font-size:32px; }
    #vtv-poster > span:nth-child(4) { width:100%; padding:0 28px 80px; top:auto; bottom:0; height:auto; position:absolute; }
    #vtv-poster > span:nth-child(5) { inset-inline-start:28px; bottom:140px; }
    #vtv-poster > span:nth-child(6) { bottom:auto; top:90px; inset-inline-end:20px; padding:10px 14px; gap:14px; }
  }
  @media (max-width: 680px) {
    #vtv-banner { aspect-ratio: 3/4; min-height: 480px; }
    #vtv-poster > span:nth-child(3) > span:nth-child(2) { font-size:24px; }
    #vtv-poster > span:nth-child(3) > span:nth-child(3) { font-size:13px; }
    #vtv-poster > span:nth-child(4) span:first-child { width:78px !important; height:78px !important; }
    #vtv-poster > span:nth-child(4) span:first-child i { width:30px !important; height:30px !important; }
    #vtv-poster > span:nth-child(5) { bottom:124px; inset-inline-start:24px; }
    #vtv-poster > span:nth-child(5) > span:nth-child(2) { font-size:16px; }
    #vtv-poster > span:nth-child(6) { padding:8px 12px; gap:12px; }
    #vtv-poster > span:nth-child(6) span:nth-child(odd) > span:first-child { font-size:18px; }
  }
</style>
<script>
(function () {
  'use strict';
  var poster = document.getElementById('vtv-poster');
  var iframe = document.getElementById('vtv-iframe');
  var loading = document.getElementById('vtv-loading');
  var fsBtn = document.getElementById('vtv-fs');
  var frame = document.getElementById('vtv-frame');
  var loaded = false;
  var TOUR_SRC = 'https://listing3d.com/embed/r39d0bd4dde0a4fe693c7fe5fd230a896';
  function activate() {
    if (loaded) return;
    loading.style.display = 'flex';
    poster.style.display = 'none';
    iframe.src = TOUR_SRC;
    iframe.onload = function () { loading.style.display = 'none'; iframe.style.opacity = '1'; fsBtn.style.display = 'grid'; };
    loaded = true;
  }
  poster.addEventListener('click', activate);
  fsBtn.addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (frame.requestFullscreen) frame.requestFullscreen();
  });
})();
</script>

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
      <a aria-label="Link" href="compounds.html" className="sec-link"><span data-i18n="allCpds"></span> <i data-lucide="arrow-right" className="i" style={{{"width": "16px", "height": "16px"}}}></i></a>
    </div>

    {/*  ═══ Quick filter bar (compound + bedrooms only) ═══
         Per user request: the OUTSIDE map (home page) only filters by
         compound + bedroom count. The inside compounds.html page keeps
         the full advanced filter set (type, price, delivery, mode).  */}
    {/*  ═══ SMART MAP FILTER — collapsible dropdown ═══
         Click the filter bar to expand/collapse. Shows active filter count
         as a badge. Compound search + beds selector inside.  */}
    <div className="hmf-wrap" style={{{"marginBottom": "18px"}}}>
      {/*  Filter trigger bar (always visible)  */}
      <button aria-label="Button" className="hmf-trigger" id="hmf-trigger" type="button" aria-expanded="false" style={{{"display": "flex", "alignItems": "center", "justifyContent": "space-between", "gap": "14px", "width": "100%", "padding": "14px 20px", "background": "var(--surface)", "border": "1.5px solid var(--line-2)", "borderRadius": "14px", "boxShadow": "var(--shadow-s)", "cursor": "pointer", "transition": ".2s var(--silk)", "fontFamily": "var(--font)"}}}>
        <span style={{{"display": "flex", "alignItems": "center", "gap": "10px"}}}>
          <i data-lucide="sliders-horizontal" className="i" style={{{"width": "18px", "height": "18px", "color": "var(--pri)", "flex": "none"}}}></i>
          <span style={{{"fontSize": "14.5px", "fontWeight": "700", "color": "var(--ink)"}}} data-i18n="hmfTitle">Smart Filter</span>
          <span id="hmf-active-badge" style={{{"display": "none", "background": "var(--pri)", "color": "#fff", "fontFamily": "var(--mono)", "fontSize": "10px", "fontWeight": "800", "padding": "2px 8px", "borderRadius": "999px", "letterSpacing": ".04em"}}}>0</span>
        </span>
        <span style={{{"display": "flex", "alignItems": "center", "gap": "12px"}}}>
          <span id="home-map-count" style={{{"fontFamily": "var(--mono)", "fontSize": "12px", "fontWeight": "700", "color": "var(--muted)", "letterSpacing": ".04em", "whiteSpace": "nowrap"}}}>… compounds</span>
          <i data-lucide="chevron-down" className="i" id="hmf-chevron" style={{{"width": "18px", "height": "18px", "color": "var(--muted)", "transition": "transform .3s var(--silk)", "flex": "none"}}}></i>
        </span>
      </button>

      {/*  Filter panel (collapsible)  */}
      <div className="hmf-panel" id="hmf-panel" style={{{"display": "none", "marginTop": "8px", "padding": "18px 20px", "background": "var(--surface)", "border": "1.5px solid var(--line-2)", "borderRadius": "14px", "boxShadow": "var(--shadow-s)", "animation": "hmfSlideDown .3s var(--silk) both"}}}>
        {/*  Compound multi-select row  */}
        <div style={{{"marginBottom": "16px"}}}>
          <div style={{{"display": "flex", "alignItems": "center", "gap": "6px", "fontFamily": "var(--mono)", "fontSize": "11px", "fontWeight": "700", "letterSpacing": ".1em", "textTransform": "uppercase", "color": "var(--muted)", "marginBottom": "8px"}}}>
            <i data-lucide="building-2" className="i" style={{{"width": "14px", "height": "14px"}}}></i>
            <span data-i18n="hmfCompounds">Compounds</span>
            <span style={{{"fontSize": "10px", "fontWeight": "600", "letterSpacing": ".04em", "textTransform": "none", "color": "var(--muted)", "opacity": ".7"}}} data-i18n="hmfMultiHint">Click to select multiple</span>
          </div>
          {/*  Selected chips area  */}
          <div id="hmf-compound-chips" style={{{"display": "flex", "gap": "6px", "flexWrap": "wrap", "marginBottom": "8px", "minHeight": "0"}}}></div>
          {/*  Search + dropdown  */}
          <div style={{{"display": "flex", "alignItems": "center", "gap": "9px", "padding": "10px 14px", "background": "var(--surface-2)", "border": "1.5px solid var(--line-2)", "borderRadius": "10px", "transition": ".2s", "position": "relative"}}}>
            <i data-lucide="search" className="i" style={{{"width": "17px", "height": "17px", "color": "var(--muted)", "flex": "none"}}}></i>
            <input id="home-map-compound" type="text" data-i18n-ph="hmfPlaceholder" placeholder="Search compounds (e.g. Mivida, Hyde Park)…" style={{{"flex": "1", "border": "none", "outline": "none", "background": "transparent", "fontFamily": "var(--font)", "fontSize": "14px", "color": "var(--ink)", "minWidth": "0"}}} autocomplete="off" />
            <i data-lucide="chevron-down" className="i" style={{{"width": "16px", "height": "16px", "color": "var(--muted)", "flex": "none", "transition": "transform .2s"}}} id="hmf-compound-chevron"></i>
            {/*  Dropdown list (absolute positioned)  */}
            <div id="hmf-compound-dropdown" style={{{"display": "none", "position": "absolute", "top": "calc(100% + 6px)", "left": "0", "right": "0", "maxHeight": "280px", "overflowY": "auto", "background": "var(--surface)", "border": "1.5px solid var(--line-2)", "borderRadius": "10px", "boxShadow": "var(--shadow-m)", "zIndex": "200", "padding": "6px"}}}></div>
          </div>
        </div>

        {/*  Beds selector row (single select, no '+')  */}
        <div style={{{"display": "flex", "alignItems": "center", "gap": "10px", "flexWrap": "wrap"}}}>
          <span style={{{"display": "flex", "alignItems": "center", "gap": "6px", "fontFamily": "var(--mono)", "fontSize": "11px", "fontWeight": "700", "letterSpacing": ".1em", "textTransform": "uppercase", "color": "var(--muted)"}}}>
            <i data-lucide="bed-double" className="i" style={{{"width": "14px", "height": "14px"}}}></i>
            <span data-i18n="hmfBeds">Bedrooms</span>
          </span>
          <div id="home-map-beds" style={{{"display": "flex", "gap": "4px", "padding": "3px", "background": "var(--bg)", "borderRadius": "999px"}}}>
            <button aria-label="Button" className="on" data-b="0" type="button" style={{{"border": "none", "cursor": "pointer", "padding": "7px 14px", "borderRadius": "999px", "fontFamily": "var(--font)", "fontSize": "12px", "fontWeight": "700", "color": "var(--muted)", "background": "transparent", "transition": ".2s"}}} data-i18n="hmfAny">Any</button>
            <button aria-label="Button" data-b="1" type="button" style={{{"border": "none", "cursor": "pointer", "padding": "7px 14px", "borderRadius": "999px", "fontFamily": "var(--font)", "fontSize": "12px", "fontWeight": "700", "color": "var(--muted)", "background": "transparent", "transition": ".2s"}}}>1</button>
            <button aria-label="Button" data-b="2" type="button" style={{{"border": "none", "cursor": "pointer", "padding": "7px 14px", "borderRadius": "999px", "fontFamily": "var(--font)", "fontSize": "12px", "fontWeight": "700", "color": "var(--muted)", "background": "transparent", "transition": ".2s"}}}>2</button>
            <button aria-label="Button" data-b="3" type="button" style={{{"border": "none", "cursor": "pointer", "padding": "7px 14px", "borderRadius": "999px", "fontFamily": "var(--font)", "fontSize": "12px", "fontWeight": "700", "color": "var(--muted)", "background": "transparent", "transition": ".2s"}}}>3</button>
            <button aria-label="Button" data-b="4" type="button" style={{{"border": "none", "cursor": "pointer", "padding": "7px 14px", "borderRadius": "999px", "fontFamily": "var(--font)", "fontSize": "12px", "fontWeight": "700", "color": "var(--muted)", "background": "transparent", "transition": ".2s"}}}>4</button>
            <button aria-label="Button" data-b="5" type="button" style={{{"border": "none", "cursor": "pointer", "padding": "7px 14px", "borderRadius": "999px", "fontFamily": "var(--font)", "fontSize": "12px", "fontWeight": "700", "color": "var(--muted)", "background": "transparent", "transition": ".2s"}}}>5</button>
          </div>
          <button aria-label="Button" id="hmf-reset" type="button" style={{{"marginInlineStart": "auto", "border": "1.5px solid var(--line-2)", "background": "var(--surface-2)", "color": "var(--text)", "fontFamily": "var(--font)", "fontSize": "12px", "fontWeight": "700", "padding": "7px 14px", "borderRadius": "999px", "cursor": "pointer", "transition": ".2s", "display": "inline-flex", "alignItems": "center", "gap": "5px"}}}>
            <i data-lucide="rotate-ccw" className="i" style={{{"width": "12px", "height": "12px"}}}></i>
            <span data-i18n="hmfReset">Reset</span>
          </button>
        </div>
      </div>
    </div>

    <div className="map-sticky-wrap" id="map-sticky-wrap">
      <div id="home-map" style={{{"height": "480px", "borderRadius": "var(--r-card)", "border": "1px solid var(--line)", "zIndex": "1", "background": "var(--bg)", "marginBottom": "8px"}}}></div>
    </div>
    <div style={{{"textAlign": "center", "marginTop": "12px"}}}>
      <a aria-label="Link" href="compounds.html" className="btn btn-navy" style={{{"display": "inline-flex", "alignItems": "center", "gap": "8px", "textDecoration": "none"}}}>
        <i data-lucide="map" className="i" style={{{"width": "16px", "height": "16px"}}}></i>
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
    <div id="insights-grid" style={{{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(300px,1fr))", "gap": "20px", "marginBottom": "30px"}}}></div>
    <div id="insights-market" style={{{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(220px,1fr))", "gap": "16px", "padding": "24px", "background": "var(--bg)", "borderRadius": "14px", "border": "1px solid var(--line)"}}}>
      <div style={{{"textAlign": "center"}}}>
        <div style={{{"fontFamily": "var(--mono)", "fontSize": "32px", "fontWeight": "800", "color": "var(--pri)"}}}>+24%</div>
        <div style={{{"fontSize": "12px", "color": "var(--muted)", "textTransform": "uppercase", "letterSpacing": ".08em"}}}>Top Growth (Mountain View)</div>
      </div>
      <div style={{{"textAlign": "center"}}}>
        <div style={{{"fontFamily": "var(--mono)", "fontSize": "32px", "fontWeight": "800", "color": "#34d399"}}}>9.8</div>
        <div style={{{"fontSize": "12px", "color": "var(--muted)", "textTransform": "uppercase", "letterSpacing": ".08em"}}}>Highest AI Score (Hyde Park)</div>
      </div>
      <div style={{{"textAlign": "center"}}}>
        <div style={{{"fontFamily": "var(--mono)", "fontSize": "32px", "fontWeight": "800", "color": "var(--pri)"}}}>EGP 35M</div>
        <div style={{{"fontSize": "12px", "color": "var(--muted)", "textTransform": "uppercase", "letterSpacing": ".08em"}}}>Top Price (Taj City)</div>
      </div>
      <div style={{{"textAlign": "center"}}}>
        <div style={{{"fontFamily": "var(--mono)", "fontSize": "32px", "fontWeight": "800", "color": "#34d399"}}}>798</div>
        <div style={{{"fontSize": "12px", "color": "var(--muted)", "textTransform": "uppercase", "letterSpacing": ".08em"}}}>Active Units</div>
      </div>
    </div>
    <div style={{{"textAlign": "center", "marginTop": "20px"}}}>
      <a aria-label="Link" href="properties.html" className="btn btn-navy" style={{{"display": "inline-flex", "alignItems": "center", "gap": "8px", "textDecoration": "none"}}}>
        <i data-lucide="trending-up" className="i" style={{{"width": "16px", "height": "16px"}}}></i>
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
        <div id="inq-success" style={{{"display": "none", "marginTop": "14px", "padding": "14px 18px", "background": "rgba(52,211,153,.08)", "border": "1px solid rgba(52,211,153,.35)", "borderRadius": "10px", "color": "#16a34a", "fontWeight": "600", "fontSize": "13.5px"}}}>
          <i data-lucide="check-circle" style={{{"width": "16px", "height": "16px", "verticalAlign": "middle", "marginInlineEnd": "6px"}}}></i>
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
    <div style={{{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(280px,1fr))", "gap": "16px", "marginTop": "28px"}}}>
      <a aria-label="Link" href="matches.html" style={{{"display": "block", "borderRadius": "14px", "overflow": "hidden", "position": "relative", "textDecoration": "none"}}}>
        <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80" alt="Smart Match" style={{{"width": "100%", "height": "180px", "objectFit": "cover", "transition": "transform .4s var(--silk)"}}} loading="lazy"/>
        <div style={{{"position": "absolute", "inset": "0", "background": "linear-gradient(180deg,transparent 50%,rgba(7,18,30,.9) 100%)"}}}></div>
        <div style={{{"position": "absolute", "bottom": "12px", "left": "16px", "color": "#fff"}}}>
          <div style={{{"fontFamily": "var(--mono)", "fontSize": "9px", "letterSpacing": ".14em", "textTransform": "uppercase", "color": "#34d399"}}}>LIVE</div>
          <div style={{{"fontSize": "14px", "fontWeight": "700"}}}>Smart Match v3</div>
        </div>
      </a>
      <a aria-label="Link" href="pricing.html" style={{{"display": "block", "borderRadius": "14px", "overflow": "hidden", "position": "relative", "textDecoration": "none"}}}>
        <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80" alt="AVM Pricing" style={{{"width": "100%", "height": "180px", "objectFit": "cover", "transition": "transform .4s var(--silk)"}}} loading="lazy"/>
        <div style={{{"position": "absolute", "inset": "0", "background": "linear-gradient(180deg,transparent 50%,rgba(7,18,30,.9) 100%)"}}}></div>
        <div style={{{"position": "absolute", "bottom": "12px", "left": "16px", "color": "#fff"}}}>
          <div style={{{"fontFamily": "var(--mono)", "fontSize": "9px", "letterSpacing": ".14em", "textTransform": "uppercase", "color": "#34d399"}}}>LIVE</div>
          <div style={{{"fontSize": "14px", "fontWeight": "700"}}}>AVM Pricing Engine</div>
        </div>
      </a>
      <a aria-label="Link" href="roi.html" style={{{"display": "block", "borderRadius": "14px", "overflow": "hidden", "position": "relative", "textDecoration": "none"}}}>
        <img src="https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=80" alt="ROI Forecaster" style={{{"width": "100%", "height": "180px", "objectFit": "cover", "transition": "transform .4s var(--silk)"}}} loading="lazy"/>
        <div style={{{"position": "absolute", "inset": "0", "background": "linear-gradient(180deg,transparent 50%,rgba(7,18,30,.9) 100%)"}}}></div>
        <div style={{{"position": "absolute", "bottom": "12px", "left": "16px", "color": "#fff"}}}>
          <div style={{{"fontFamily": "var(--mono)", "fontSize": "9px", "letterSpacing": ".14em", "textTransform": "uppercase", "color": "#34d399"}}}>LIVE</div>
          <div style={{{"fontSize": "14px", "fontWeight": "700"}}}>ROI Forecaster</div>
        </div>
      </a>
    </div>
    <div style={{{"marginTop": "16px"}}} className="rv">
      <button aria-label="Button" className="tour-launch" id="tour-open" type="button">
        <span className="t-ic"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg></span>
        <span className="t-txt"><b data-i18n="tourLaunchTit"></b><span data-i18n="tourLaunchSub"></span></span>
        <span className="t-play"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg></span>
      </button>
    </div>
  </div>
</section>

{/*  CTA  */}
<section className="block" id="contact" style={{{"paddingTop": "0"}}} data-screen-label="CTA band">
  <div className="wrap">
    <div className="cta rv">
      <div className="ct-txt">
        <h2 data-i18n="ctaTit"></h2>
        <p data-i18n="ctaSub"></p>
      </div>
      <div className="ct-act">
        <button aria-label="Button" className="btn btn-white" type="button"><i data-lucide="plus" className="i"></i> <span data-i18n="ctaBtn1"></span></button>
        <a aria-label="Link" href="https://wa.me/201092048333" target="_blank" rel="noopener noreferrer" className="btn btn-out" style={{{"textDecoration": "none"}}}><i data-lucide="phone" className="i"></i> <span>+2 01092048333</span></a>
      </div>
      <div style={{{"marginTop": "14px", "fontFamily": "var(--mono)", "fontSize": "13px", "color": "rgba(255,255,255,.6)"}}}>
        <i data-lucide="mail" className="i" style={{{"width": "14px", "height": "14px", "verticalAlign": "-2px"}}}></i> <a aria-label="Link" href="mailto:info@Sierra-Estates.net" style={{{"color": "rgba(255,255,255,.7)", "textDecoration": "none"}}}>info@Sierra-Estates.net</a>
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

<script>
(function () {
  'use strict';
  var D = window.HZDATA;
  var isAr = (localStorage.getItem('hzp-lang') || 'en') === 'ar';

  /* hero slides */
  document.getElementById('hero-slides').innerHTML = D.slides.map(function (s, i) {
    return '<div className="slide' + (i === 0 ? ' on' : '') + '"><img src="' + s.img + '" alt=""/></div>';
  }).join('');
  document.getElementById('hero-dots').innerHTML = D.slides.map(function (_, i) {
    return '<button type="button"' + (i === 0 ? ' className="on"' : '') + ' aria-label="Slide ' + (i + 1) + '"></button>';
  }).join('');

  var cur = 0, slides, dots, timer;
  function setSlide(n) {
    slides[cur].classList.remove('on'); dots[cur].classList.remove('on');
    cur = n % D.slides.length;
    slides[cur].classList.add('on'); dots[cur].classList.add('on');
    var s = D.slides[cur];
    var pre = document.getElementById('hero-pre');
    var main = document.getElementById('hero-main');
    // Animate caption change — fade out, swap, fade in
    pre.style.opacity = '0'; main.style.opacity = '0';
    pre.style.transform = 'translateY(15px)'; main.style.transform = 'translateY(15px)';
    setTimeout(function () {
      pre.textContent = isAr ? s.preAr : s.pre;
      var txt = isAr ? s.mainAr : s.main;
      var words = txt.split(' ');
      var hl = words.splice(-3).join(' ');
      main.innerHTML = words.join(' ') + ' <span className="hl">' + hl + '</span>';
      pre.style.transition = 'opacity .6s var(--silk), transform .6s var(--silk)';
      main.style.transition = 'opacity .6s var(--silk), transform .6s var(--silk)';
      pre.style.opacity = '1'; main.style.opacity = '1';
      pre.style.transform = 'translateY(0)'; main.style.transform = 'translateY(0)';
    }, 400);
  }
  function arm() { clearInterval(timer); timer = setInterval(function () { setSlide(cur + 1); }, 7000); }

  /* featured (6) + compound tiles + rooms */
  document.getElementById('prop-grid').innerHTML = D.listings.slice(0, 6).map(HZ.pcard).join('');
  var picks = ['Hyde Park New Cairo', 'Mivida', 'Mountain View iCity', 'Eastown (SODIC)'];
  document.getElementById('comp-grid').innerHTML = picks.map(function (n, i) {
    var c = D.compounds.find(function (x) { return x.n === n; });
    return '<a aria-label="Link" className="comp rv d' + (i + 1) + '" href="compounds.html">' +
      '<img src="' + D.compoundImgs[n] + '" alt="' + c.n + '" loading="lazy"/>' +
      '<div className="co-scrim"></div>' +
      '<div className="co-count">AI ' + c.ai.toFixed(1) + ' · ' + c.g + '</div>' +
      '<div className="co-body"><h4>' + c.n + '</h4><span>' + c.z + ' · EGP ' + c.priceM + 'M avg</span></div></a>';
  }).join('');
  /* testimonials */
  var star = '<i data-lucide="star" className="i"></i>';
  document.getElementById('testi-grid').innerHTML = [1, 2, 3].map(function (n, i) {
    var nm = HZ.t('t' + n + 'n');
    var initials = nm.split(' ').slice(0, 2).map(function (w) { return w[0]; }).join('');
    return '<div className="tcard rv d' + (i + 1) + '">' +
      '<div className="stars">' + star + star + star + star + star + '</div>' +
      '<p>“' + HZ.t('t' + n + 'q') + '”</p>' +
      '<div className="who"><span className="av">' + initials + '</span><span><b>' + nm + '</b><small>' + HZ.t('t' + n + 'r') + '</small></span></div></div>';
  }).join('');

  /* inquiry selects + segmented */
  document.getElementById('inq-zone').innerHTML = ['z1', 'z2', 'z3', 'z4'].map(function (k) { return '<option>' + HZ.t(k) + '</option>'; }).join('');
  document.getElementById('inq-type').innerHTML = ['lVilla', 'lApt', 'lTwin', 'lPent'].map(function (k) { return '<option>' + HZ.t(k) + '</option>'; }).join('');
  var inqMode = 'buy';
  document.querySelectorAll('#inq-seg button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('#inq-seg button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      inqMode = b.dataset.i18n === 'inqBuy' ? 'buy' : b.dataset.i18n === 'inqRent' ? 'rent' : 'sell';
    });
  });

  /* ═══ INQUIRY FORM SUBMIT — Firestore (primary) + CSV (fallback) ═══
     Tries to write to Firestore via window.SIERRA_DB.addInquiry().
     If Firestore is not connected (SIERRA_FIREBASE_ENABLED=false), falls
     back to CSV download + localStorage — same as career.html. */
  var inqForm = document.getElementById('inq-form');
  if (inqForm) {
    inqForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {
        timestamp: new Date().toISOString(),
        mode: inqMode,
        name: document.getElementById('inq-name').value.trim(),
        phone: document.getElementById('inq-phone').value.trim(),
        email: document.getElementById('inq-email').value.trim(),
        zone: document.getElementById('inq-zone').value,
        type: document.getElementById('inq-type').value,
        budget: document.getElementById('inq-budget').value.trim()
      };

      // Show loading state on button
      var submitBtn = inqForm.querySelector('button[type="submit"]');
      var originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i data-lucide="loader-2" className="i" style={{{"animation": "vtv-spin 1s linear infinite"}}}></i> <span>Sending…</span>'; if (window.lucide) lucide.createIcons(); }

      function showSuccess() {
        var successEl = document.getElementById('inq-success');
        if (successEl) {
          successEl.style.display = 'block';
          successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(function () { successEl.style.display = 'none'; }, 6000);
        }
        inqForm.reset();
        document.querySelectorAll('#inq-seg button').forEach(function (x, i) { x.classList.toggle('on', i === 0); });
        inqMode = 'buy';
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalBtnHtml; if (window.lucide) lucide.createIcons(); }
      }

      function csvFallback() {
        try {
          var csvRow = [data.timestamp, data.mode, data.name, data.phone, data.email, data.zone, data.type, data.budget]
            .map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(',');
          var csvHeader = 'Timestamp,Mode,Name,Phone,Email,Zone,Type,Budget\n';
          var log = JSON.parse(localStorage.getItem('sierra_inquiries') || '[]');
          log.push(data);
          localStorage.setItem('sierra_inquiries', JSON.stringify(log));
          var blob = new Blob([csvHeader + csvRow], { type: 'text/csv;charset=utf-8;' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'sierra-inquiry-' + Date.now() + '.csv';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (err) { /* localStorage full or disabled */ }
      }

      // Try Firestore first, fall back to CSV
      if (window.SIERRA_DB && window.SIERRA_DB.isReady()) {
        window.SIERRA_DB.addInquiry(data).then(function (result) {
          if (result.fallback) csvFallback();
          showSuccess();
        }).catch(function () {
          csvFallback();
          showSuccess();
        });
      } else {
        csvFallback();
        showSuccess();
      }
    });
  }

  HZ.mount('home');

  /* ═══ HERO SEARCH — compound autocomplete + filter redirect ═══
     User types compound name (e.g. "Mivida") → dropdown shows matching
     compounds. Selecting one + clicking Search → redirects to
     compounds.html?cpd=<name> with type/beds/price filters. */
  var heroSearchInput = document.getElementById('hero-compound-search');
  var heroResults = document.getElementById('hero-compound-results');
  var heroSearchBtn = document.getElementById('hero-search-btn');

  if (heroSearchInput && heroResults) {
    heroSearchInput.addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      if (!q) { heroResults.style.display = 'none'; return; }
      var matches = D.compounds.filter(function (c) {
        return c.n.toLowerCase().indexOf(q) >= 0 || (c.z && c.z.toLowerCase().indexOf(q) >= 0);
      }).slice(0, 8);
      if (matches.length === 0) {
        heroResults.innerHTML = '<div style={{{"padding": "12px 16px", "color": "var(--muted)", "fontSize": "13px"}}}>No compounds found</div>';
        heroResults.style.display = 'block';
        return;
      }
      heroResults.innerHTML = matches.map(function (c) {
        return '<div className="compound-option" data-cpd="' + c.n + '" style={{{"padding": "10px 16px", "cursor": "pointer", "borderBottom": "1px solid var(--line)", "fontSize": "13px", "color": "var(--ink)", "transition": ".15s"}}}>' +
          '<b>' + c.n + '</b> <span style={{{"color": "var(--muted)", "fontSize": "11px"}}}>&middot; ' + c.z + ' &middot; ' + D.unitsFor(c.n).length + ' units</span>' +
          '</div>';
      }).join('');
      heroResults.style.display = 'block';
      heroResults.querySelectorAll('.compound-option').forEach(function (opt) {
        opt.addEventListener('mouseenter', function () { this.style.background = 'var(--bg)'; });
        opt.addEventListener('mouseleave', function () { this.style.background = 'none'; });
        opt.addEventListener('click', function () {
          heroSearchInput.value = this.getAttribute('data-cpd');
          heroResults.style.display = 'none';
        });
      });
    });
    // Hide dropdown when clicking outside
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.search-compound-wrap')) {
        heroResults.style.display = 'none';
      }
    });
  }

  // Search button → redirect to compounds.html with filters
  if (heroSearchBtn) {
    heroSearchBtn.addEventListener('click', function () {
      var cpd = heroSearchInput ? heroSearchInput.value.trim() : '';
      var type = document.getElementById('hero-type') ? document.getElementById('hero-type').value : '';
      var beds = document.getElementById('hero-beds') ? document.getElementById('hero-beds').value : '0';
      var price = document.getElementById('hero-price') ? document.getElementById('hero-price').value : '0';
      var params = new URLSearchParams();
      if (cpd) params.set('cpd', cpd);
      if (type) params.set('type', type);
      if (beds && beds !== '0') params.set('beds', beds);
      if (price && price !== '0') params.set('maxPrice', price);
      var qs = params.toString();
      // If compound selected → go to compounds.html?cpd=<name>
      // Otherwise → go to properties.html with filters
      if (cpd) {
        location.href = 'compounds.html' + (qs ? '?' + qs : '');
      } else {
        location.href = 'properties.html' + (qs ? '?' + qs : '');
      }
    });
  }

  // Tab switching
  document.querySelectorAll('.search-tabs button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.search-tabs button').forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
    });
  });

  /* ═══ INSIGHTS — top 3 AI-ranked listings ═══
     Renders the 3 highest AI-scored properties in the insights section.
     When wired to Firestore, this data comes from the admin page.
     The admin can update which properties appear here by changing
     AI scores or tags in the Firestore 'houyez_listings' collection. */
  var topListings = D.listings.slice().sort(function (a, b) { return b.ai - a.ai; }).slice(0, 3);
  document.getElementById('insights-grid').innerHTML = topListings.map(function (p, i) {
    var rank = i + 1;
    return '<a aria-label="Link" href="property.html?id=' + p.id + '" style={{{"display": "block", "textDecoration": "none", "background": "var(--surface)", "border": "1px solid var(--line)", "borderRadius": "14px", "overflow": "hidden", "transition": ".3s var(--silk)", "position": "relative"}}}>' +
      '<div style={{{"position": "relative", "height": "200px", "overflow": "hidden"}}}>' +
        '<img src="' + p.img + '" alt="' + p.code + '" style={{{"width": "100%", "height": "100%", "objectFit": "cover"}}} loading="lazy"/>' +
        '<div style={{{"position": "absolute", "top": "12px", "left": "12px", "background": "linear-gradient(135deg,#34d399,#22c55e)", "color": "#fff", "fontFamily": "var(--mono)", "fontWeight": "800", "fontSize": "12px", "padding": "5px 12px", "borderRadius": "8px", "boxShadow": "0 4px 12px rgba(52,211,153,.4)"}}}>#' + rank + ' AI ' + p.ai.toFixed(1) + '</div>' +
        (p.tag ? '<div style={{{"position": "absolute", "top": "12px", "right": "12px", "background": "rgba(0,43,75,.88)", "color": "#fff", "fontFamily": "var(--mono)", "fontWeight": "700", "fontSize": "10px", "padding": "4px 9px", "borderRadius": "5px", "textTransform": "uppercase"}}}>' + p.tag + '</div>' : '') +
        '<div style={{{"position": "absolute", "bottom": "12px", "right": "12px", "background": "rgba(0,43,75,.88)", "color": "#fff", "fontFamily": "var(--mono)", "fontWeight": "700", "fontSize": "13px", "padding": "6px 12px", "borderRadius": "6px"}}}>' + (p.mode === 'sale' ? p.egpM + 'M EGP' : '$' + p.usd + '/mo') + '</div>' +
      '</div>' +
      '<div style={{{"padding": "18px"}}}>' +
        '<div style={{{"fontFamily": "var(--mono)", "fontSize": "10px", "textTransform": "uppercase", "letterSpacing": ".12em", "color": "var(--pri)", "marginBottom": "6px"}}}>' + p.code + ' · ' + p.type + '</div>' +
        '<div style={{{"fontSize": "17px", "fontWeight": "700", "color": "var(--ink)", "marginBottom": "4px"}}}>' + p.cmp + '</div>' +
        '<div style={{{"fontSize": "13px", "color": "var(--muted)", "marginBottom": "12px"}}}>' + p.zone + '</div>' +
        '<div style={{{"display": "flex", "gap": "14px", "fontSize": "13px", "color": "var(--text)", "fontWeight": "600"}}}>' +
          '<span>🛏 ' + p.beds + '</span>' +
          '<span>🚿 ' + p.bath + '</span>' +
          '<span>📐 ' + p.area + ' m²</span>' +
        '</div>' +
      '</div>' +
    '</a>';
  }).join('');

  /* ticker */
  var tickItems = HZ.lang() === 'ar'
    ? ['ماونتن فيو +24%', 'أب تاون كايرو +31%', 'ميفيدا إيجار من $1,700/شهر', 'هايد بارك AI 9.8', 'الرحاب عائد 8.1%', 'مدينتي طلب متزايد']
    : ['Mountain View iCity +24%', 'Uptown Cairo +31%', 'Mivida rentals from $1,700/mo', 'Hyde Park AI score 9.8', 'Villette yield 8.1%', 'Taj City demand rising'];
  var row = tickItems.concat(tickItems);
  document.getElementById('ticker-row').innerHTML = row.map(function (s) { return '<span>' + s + '</span>'; }).join('');

  /* AI hub cards */
  var AI_IC = {
    engine: '<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" stroke="#C8961A" strokeWidth="1" stroke-dasharray="4 3" opacity=".4"><a aria-label="Link"nimateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="8s" repeatCount="indefinite"/></circle><circle cx="24" cy="24" r="13" stroke="#E9C176" strokeWidth="1" stroke-dasharray="3 4" opacity=".3"><a aria-label="Link"nimateTransform attributeName="transform" type="rotate" from="360 24 24" to="0 24 24" dur="5s" repeatCount="indefinite"/></circle><circle cx="24" cy="11" r="2.5" fill="#C8961A"><a aria-label="Link"nimate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite"/></circle><circle cx="24" cy="24" r="4" fill="#E9C176"><a aria-label="Link"nimate attributeName="r" values="3.5;5;3.5" dur="2s" repeatCount="indefinite"/></circle></svg>',
    match: '<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="18" stroke="#4ade80" strokeWidth="1.5"><a aria-label="Link"nimate attributeName="r" values="10;20;10" dur="2.5s" repeatCount="indefinite"/><a aria-label="Link"nimate attributeName="opacity" values=".5;0;.5" dur="2.5s" repeatCount="indefinite"/></circle><circle cx="24" cy="24" r="5" fill="#4ade80"/><path d="M21.5 24 L23.5 26.5 L27.5 21" stroke="#071524" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>',
    roi: '<svg viewBox="0 0 48 48" fill="none"><rect x="7" y="30" width="7" height="10" rx="2" fill="#f59e0b" opacity=".5"><a aria-label="Link"nimate attributeName="height" values="3;10;3" dur="2.2s" repeatCount="indefinite"/><a aria-label="Link"nimate attributeName="y" values="37;30;37" dur="2.2s" repeatCount="indefinite"/></rect><rect x="17" y="22" width="7" height="18" rx="2" fill="#f59e0b" opacity=".75"><a aria-label="Link"nimate attributeName="height" values="7;18;7" dur="2.2s" begin=".35s" repeatCount="indefinite"/><a aria-label="Link"nimate attributeName="y" values="33;22;33" dur="2.2s" begin=".35s" repeatCount="indefinite"/></rect><rect x="27" y="13" width="7" height="27" rx="2" fill="#f59e0b"><a aria-label="Link"nimate attributeName="height" values="12;27;12" dur="2.2s" begin=".7s" repeatCount="indefinite"/><a aria-label="Link"nimate attributeName="y" values="28;13;28" dur="2.2s" begin=".7s" repeatCount="indefinite"/></rect></svg>',
    price: '<svg viewBox="0 0 48 48" fill="none"><path d="M8 8 L32 8 L40 24 L32 40 L8 40 Z" stroke="#a78bfa" strokeWidth="1.5" fill="rgba(167,139,250,.08)"/><circle cx="15" cy="18" r="3" stroke="#a78bfa" strokeWidth="1.5"/><text x="26" y="30" text-anchor="middle" font-weight="700" font-size="15" fill="#a78bfa" font-family="monospace">$<a aria-label="Link"nimate attributeName="opacity" values="1;.25;1" dur="1.8s" repeatCount="indefinite"/></text></svg>',
    dream: '<svg viewBox="0 0 48 48" fill="none"><path d="M24 10 L36 22 L33 22 L33 36 L15 36 L15 22 L12 22 Z" fill="#f472b6" opacity=".9"/><rect x="20" y="27" width="8" height="9" fill="#07121E" rx="1"/><g><a aria-label="Link"nimateTransform attributeName="transform" type="rotate" from="0 24 23" to="360 24 23" dur="3s" repeatCount="indefinite"/><circle cx="40" cy="23" r="2.2" fill="#f472b6"><a aria-label="Link"nimate attributeName="opacity" values="1;.3;1" dur="1.5s" repeatCount="indefinite"/></circle></g></svg>',
    imap: '<svg viewBox="0 0 48 48" fill="none"><rect x="6" y="8" width="36" height="32" rx="3" stroke="#C8961A" strokeWidth="1.3" fill="rgba(200,150,26,.07)"/><circle cx="24" cy="23" r="5" fill="rgba(200,150,26,.2)" stroke="#C8961A" strokeWidth="1.5"><a aria-label="Link"nimate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite"/><a aria-label="Link"nimate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite"/></circle><circle cx="24" cy="23" r="2.5" fill="#C8961A"/></svg>',
    tour: '<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="18" stroke="#38bdf8" strokeWidth="1.3" fill="rgba(56,189,248,.07)"/><ellipse cx="24" cy="24" rx="18" ry="7" stroke="#38bdf8" strokeWidth="1" fill="none" opacity=".4"/><circle cx="24" cy="24" r="4" fill="#38bdf8"><a aria-label="Link"nimate attributeName="r" values="3;5;3" dur="1.8s" repeatCount="indefinite"/></circle><path d="M20 21 L28 24 L20 27 Z" fill="#fff" opacity=".9"/></svg>'
  };
  var aiTools = [
    { k: 'engine', t: 'ai1t', s: 'ai1s', live: true, href: 'ai-engine.html' },
    { k: 'match', t: 'ai2t', s: 'ai2s', href: 'matches.html' },
    { k: 'roi', t: 'ai3t', s: 'ai3s', href: 'roi.html' },
    { k: 'price', t: 'ai4t', s: 'ai4s', href: 'pricing.html' },
    { k: 'dream', t: 'ai5t', s: 'ai5s', href: 'advice.html' },
    { k: 'imap', t: 'ai6t', s: 'ai6s', href: 'compounds.html' },
    { k: 'tour', t: 'ai7t', s: 'ai7s', tour: true }
  ];
  document.getElementById('ai-grid').innerHTML = aiTools.map(function (tool, i) {
    return '<' + (tool.tour ? 'button' : 'a') + ' className="ai-card rv d' + ((i % 4) + 1) + '"' +
      (tool.tour ? ' type="button" id="ai-tour-card"' : ' href="' + tool.href + '"') + '>' +
      '<span className="ai-ic">' + AI_IC[tool.k] + '</span>' +
      '<h4>' + HZ.t(tool.t) + '</h4>' +
      '<p>' + HZ.t(tool.s) + '</p>' +
      (tool.live ? '<span className="live-tag">' + HZ.t('aiLive') + '</span>' : '') +
      '</' + (tool.tour ? 'button' : 'a') + '>';
  }).join('');

  /* virtual tour modal */
  function openTour() {
    var f = document.getElementById('tour-frame');
    if (!f.src) f.src = 'virtual-tour.html';
    document.getElementById('tour-modal').classList.add('on');
    document.body.style.overflow = 'hidden';
  }
  function closeTour() {
    document.getElementById('tour-modal').classList.remove('on');
    document.body.style.overflow = '';
  }
  var tourOpenBtn = document.getElementById('tour-open');
  if (tourOpenBtn) tourOpenBtn.addEventListener('click', openTour);
  var tourHero = document.getElementById('tour-hero');
  if (tourHero) tourHero.addEventListener('click', openTour);
  var tourCard = document.getElementById('ai-tour-card');
  if (tourCard) tourCard.addEventListener('click', openTour);
  var tourCloseBtn = document.getElementById('tour-close');
  if (tourCloseBtn) tourCloseBtn.addEventListener('click', closeTour);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeTour(); });

  HZ.reveal();

  slides = document.querySelectorAll('.hero .slide');
  dots = document.querySelectorAll('.hero .dots button');
  dots.forEach(function (d, i) { d.addEventListener('click', function () { setSlide(i); arm(); }); });
  setSlide(0);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) arm();

  // ═══ Move AI Hub / Intelligence Engine to right after Why Sierra ═══
  var aiHub = document.getElementById('ai');
  var whySierra = document.getElementById('agents');
  if (aiHub && whySierra && whySierra.nextElementSibling !== aiHub) {
    whySierra.parentNode.insertBefore(aiHub, whySierra.nextElementSibling);
  }

  // ═══ Move 3D Tour to right after Featured Properties (before Why Sierra) ═══
  var tour = document.getElementById('tour');
  var props = document.getElementById('properties');
  if (tour && props && props.nextElementSibling !== tour) {
    props.parentNode.insertBefore(tour, props.nextElementSibling);
  }
})();
</script>

{/*  ═══ HOME PAGE MAP — Leaflet init with marker clustering ══════════════════
     Shows all compounds on an interactive map. Featured compounds pulse.
     Uses Leaflet.markercluster so nearby compounds group into styled
     clusters when zoomed out, and spread out when zoomed in.
     Clicking any marker → compounds.html?cpd=<name>  */}
<script>
(function () {
  'use strict';
  'use strict';
  var D = window.HZDATA;
  if (!D || !window.L) return;

  var featured = D.featured || [];
  var theme = (window.HZ && HZ.theme) ? HZ.theme() : 'light';
  var map = L.map('home-map', { scrollWheelZoom: false, zoomControl: true }).setView([30.03, 31.57], 11);
  var tiles = {
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  };
  var layer = L.tileLayer(tiles[theme], { attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 18 }).addTo(map);

  document.addEventListener('hzp:theme', function (e) {
    layer.setUrl(tiles[e.detail]);
  });

  // Marker icon: featured compounds get the 'pulse' class for the glow animation
  // Shows compound name + total unit count badge (green pill next to name)
  function markerIcon(c, isFeatured) {
    var hot = c.ai >= 9.2;
    var cls = 'cpd-marker' + (hot ? ' hot' : '') + (isFeatured ? ' pulse' : '');
    // Use Arabic name if site language is Arabic and translation exists
    var curLang = (window.HZ && HZ.lang) ? HZ.lang() : 'en';
    var displayName = (D.compoundName) ? D.compoundName(c.n, curLang) : c.n;
    // Get total unit count for this compound (from D.unitsFor generator)
    var unitCount = 0;
    if (typeof D.unitsFor === 'function') {
      try { unitCount = D.unitsFor(c.n).length; } catch (e) { unitCount = 0; }
    }
    var unitBadge = unitCount > 0 ? '<span className="unit-count">' + unitCount + '</span>' : '';
    return L.divIcon({
      className: '',
      html: '<span className="' + cls + '" title="' + displayName + ' (' + unitCount + ' units)">' + displayName + unitBadge + '</span>',
      iconSize: null
    });
  }

  // ═══ Marker Cluster Group ═══
  // When zoomed out, nearby markers group into styled clusters.
  // When zoomed in, markers spread out and are individually visible.
  var clusterGroup = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 44,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: 11,
    iconCreateFunction: function (cluster) {
      var count = cluster.getChildCount();
      var size = count >= 10 ? 'large' : count >= 5 ? 'medium' : 'small';
      return L.divIcon({
        className: 'cpd-cluster cpd-cluster-' + size,
        html: '<span>' + count + '</span>',
        iconSize: [40, 40]
      });
    }
  });

  D.compounds.forEach(function (c) {
    var isFeatured = featured.indexOf(c.n) >= 0;
    var marker = L.marker(c.c, { icon: markerIcon(c, isFeatured), title: c.n });
    marker.on('click', function () {
      location.href = 'compounds.html?cpd=' + encodeURIComponent(c.n);
    });
    marker._compound = c; // keep a back-reference so we can filter later
    clusterGroup.addLayer(marker);
  });

  map.addLayer(clusterGroup);

  // Fit bounds to show all compounds
  try { map.fitBounds(clusterGroup.getBounds(), { padding: [40, 40], maxZoom: 13 }); } catch (e) {}

  // ═══ HOME MAP FILTER (compound multi-select + single beds) ═══
  // Per user request:
  //  - Compounds: multi-select (click multiple compounds to filter)
  //  - Bedrooms: single select, exact number (1, 2, 3, 4, 5 — no '+')
  var allMarkers = clusterGroup.getLayers();
  var compoundInput = document.getElementById('home-map-compound');
  var compoundDropdown = document.getElementById('hmf-compound-dropdown');
  var compoundChevron = document.getElementById('hmf-compound-chevron');
  var compoundChips = document.getElementById('hmf-compound-chips');
  var bedsWrap = document.getElementById('home-map-beds');
  var countEl = document.getElementById('home-map-count');

  // filterState.compounds = array of selected compound names (empty = all)
  // filterState.beds = exact bedroom count (0 = any)
  var filterState = { compounds: [], beds: 0 };

  // ── Build compound dropdown list ──
  function renderCompoundDropdown(query) {
    var q = (query || '').trim().toLowerCase();
    var items = D.compounds.filter(function (c) {
      if (!q) return true;
      return c.n.toLowerCase().indexOf(q) >= 0;
    });
    if (!items.length) {
      compoundDropdown.innerHTML = '<div style={{{"padding": "12px", "color": "var(--muted)", "fontSize": "13px", "textAlign": "center"}}}>No compounds found</div>';
      return;
    }
    compoundDropdown.innerHTML = items.map(function (c) {
      var isSelected = filterState.compounds.indexOf(c.n) >= 0;
      var unitCount = (typeof D.unitsFor === 'function') ? D.unitsFor(c.n).length : 0;
      return '<div className="hmf-cpd-item' + (isSelected ? ' selected' : '') + '" data-cpd="' + c.n + '" style={{{"display": "flex", "alignItems": "center", "gap": "10px", "padding": "9px 12px", "borderRadius": "8px", "cursor": "pointer", "transition": ".15s", "' + (isSelected ? 'background": "rgba(0,174,255,.08)", "'": "'') + '"}}}>' +
        '<span style={{{"width": "18px", "height": "18px", "borderRadius": "5px", "border": "2px solid ' + (isSelected ? 'var(--pri)' : 'var(--line-2)') + '", "background": "' + (isSelected ? 'var(--pri)' : 'transparent') + '", "display": "grid", "placeItems": "center", "flex": "none"}}}>' + (isSelected ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '</span>' +
        '<span style={{{"flex": "1", "fontSize": "13.5px", "fontWeight": "600", "color": "var(--ink)"}}}>' + c.n + '</span>' +
        '<span style={{{"fontFamily": "var(--mono)", "fontSize": "11px", "fontWeight": "700", "color": "var(--muted)", "background": "var(--bg)", "padding": "2px 8px", "borderRadius": "999px"}}}>' + unitCount + '</span>' +
      '</div>';
    }).join('');

    // Bind click on each item
    compoundDropdown.querySelectorAll('.hmf-cpd-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        var name = this.getAttribute('data-cpd');
        var idx = filterState.compounds.indexOf(name);
        if (idx >= 0) {
          filterState.compounds.splice(idx, 1); // deselect
        } else {
          filterState.compounds.push(name); // select
        }
        renderCompoundDropdown(compoundInput.value);
        renderChips();
        applyFilter();
        updateActiveBadge();
      });
      item.addEventListener('mouseenter', function () {
        if (!this.classList.contains('selected')) this.style.background = 'var(--bg)';
      });
      item.addEventListener('mouseleave', function () {
        if (!this.classList.contains('selected')) this.style.background = 'transparent';
      });
    });
  }

  // ── Render selected compound chips ──
  function renderChips() {
    if (!filterState.compounds.length) {
      compoundChips.innerHTML = '';
      compoundChips.style.minHeight = '0';
      return;
    }
    compoundChips.style.minHeight = '32px';
    compoundChips.innerHTML = filterState.compounds.map(function (name) {
      return '<span className="hmf-chip" data-cpd="' + name + '" style={{{"display": "inline-flex", "alignItems": "center", "gap": "6px", "background": "var(--pri)", "color": "#fff", "fontFamily": "var(--font)", "fontSize": "12px", "fontWeight": "700", "padding": "5px 10px 5px 12px", "borderRadius": "999px"}}}>' +
        '<span>' + name + '</span>' +
        '<button type="button" data-remove="' + name + '" style={{{"border": "none", "background": "rgba(255,255,255,.25)", "color": "#fff", "width": "16px", "height": "16px", "borderRadius": "50%", "cursor": "pointer", "fontSize": "14px", "lineHeight": "1", "display": "grid", "placeItems": "center", "padding": "0"}}} aria-label="Remove ' + name + '">×</button>' +
      '</span>';
    }).join('');
    // Bind remove buttons
    compoundChips.querySelectorAll('[data-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var name = this.getAttribute('data-remove');
        var idx = filterState.compounds.indexOf(name);
        if (idx >= 0) filterState.compounds.splice(idx, 1);
        renderCompoundDropdown(compoundInput.value);
        renderChips();
        applyFilter();
        updateActiveBadge();
      });
    });
  }

  function applyFilter() {
    var selectedCompounds = filterState.compounds;
    var exactBeds = filterState.beds;
    var visible = [];

    allMarkers.forEach(function (m) {
      var c = m._compound;
      if (!c) return;
      // Compound filter: if compounds selected, marker must be in the list
      var matchCompound = !selectedCompounds.length || selectedCompounds.indexOf(c.n) >= 0;
      // Beds filter: if beds > 0, compound must have at least one unit with EXACTLY that bedroom count
      var matchBeds = true;
      if (exactBeds > 0 && typeof D.unitsFor === 'function') {
        var units = D.unitsFor(c.n);
        matchBeds = units.some(function (u) { return u.beds === exactBeds; });
      }
      var visible_now = matchCompound && matchBeds;
      if (clusterGroup.hasLayer(m) && !visible_now) {
        clusterGroup.removeLayer(m);
      } else if (!clusterGroup.hasLayer(m) && visible_now) {
        clusterGroup.addLayer(m);
      }
      if (visible_now) visible.push(m);
    });

    countEl.textContent = visible.length + ' ' + ((window.HZ && HZ.lang && HZ.lang() === 'ar') ? 'كمبوند' : (visible.length === 1 ? 'compound' : 'compounds'));

    // Refit bounds to visible markers
    if (visible.length > 0) {
      try {
        var group = L.featureGroup(visible);
        map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 13 });
      } catch (e) {}
    }
    setTimeout(function () { map.invalidateSize(); }, 100);
  }

  // ── Compound input: search + open dropdown ──
  if (compoundInput) {
    compoundInput.addEventListener('focus', function () {
      compoundDropdown.style.display = 'block';
      compoundChevron.style.transform = 'rotate(180deg)';
      renderCompoundDropdown(compoundInput.value);
    });
    compoundInput.addEventListener('input', function (e) {
      compoundDropdown.style.display = 'block';
      compoundChevron.style.transform = 'rotate(180deg)';
      renderCompoundDropdown(e.target.value);
    });
    // Prevent document click handler from closing dropdown when clicking input
    compoundInput.addEventListener('click', function (e) { e.stopPropagation(); });
  }
  // Close dropdown when clicking outside
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#hmf-compound-dropdown') && !e.target.closest('#home-map-compound') && !e.target.closest('#hmf-compound-chevron')) {
      compoundDropdown.style.display = 'none';
      compoundChevron.style.transform = 'rotate(0)';
    }
  });
  // Chevron click toggles dropdown
  if (compoundChevron) {
    compoundChevron.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = compoundDropdown.style.display === 'block';
      if (isOpen) {
        compoundDropdown.style.display = 'none';
        compoundChevron.style.transform = 'rotate(0)';
      } else {
        compoundDropdown.style.display = 'block';
        compoundChevron.style.transform = 'rotate(180deg)';
        renderCompoundDropdown(compoundInput.value);
        compoundInput.focus();
      }
    });
  }

  // ── Beds selector (single select, exact match) ──
  if (bedsWrap) {
    bedsWrap.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        bedsWrap.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        filterState.beds = +b.dataset.b;
        applyFilter();
        updateActiveBadge();
      });
    });
  }

  // ── Smart dropdown toggle ──
  var hmfTrigger = document.getElementById('hmf-trigger');
  var hmfPanel = document.getElementById('hmf-panel');
  var hmfReset = document.getElementById('hmf-reset');
  var activeBadge = document.getElementById('hmf-active-badge');

  function updateActiveBadge() {
    var count = 0;
    if (filterState.compounds.length) count++;
    if (filterState.beds > 0) count++;
    if (count > 0) {
      activeBadge.style.display = 'inline-flex';
      activeBadge.textContent = count;
    } else {
      activeBadge.style.display = 'none';
    }
  }

  if (hmfTrigger && hmfPanel) {
    hmfTrigger.addEventListener('click', function () {
      var isOpen = hmfPanel.style.display !== 'none';
      if (isOpen) {
        hmfPanel.style.display = 'none';
        hmfTrigger.setAttribute('aria-expanded', 'false');
      } else {
        hmfPanel.style.display = 'block';
        hmfTrigger.setAttribute('aria-expanded', 'true');
      }
      if (window.lucide) lucide.createIcons();
    });
  }
  if (hmfReset) {
    hmfReset.addEventListener('click', function () {
      compoundInput.value = '';
      filterState.compounds = [];
      filterState.beds = 0;
      compoundDropdown.style.display = 'none';
      compoundChevron.style.transform = 'rotate(0)';
      renderChips();
      bedsWrap.querySelectorAll('button').forEach(function (x, i) { x.classList.toggle('on', i === 0); });
      applyFilter();
      updateActiveBadge();
    });
  }

  // Initial count
  countEl.textContent = allMarkers.length + ' ' + ((window.HZ && HZ.lang && HZ.lang() === 'ar') ? 'كمبوند' : 'compounds');

  // Fix tile rendering after layout settles
  setTimeout(function () { map.invalidateSize(); }, 200);
  setTimeout(function () { map.invalidateSize(); }, 800);
  window.addEventListener('resize', function () { map.invalidateSize(); });

  // ─── Re-render markers when language changes ───
  // When user switches EN↔AR, compound names on markers need to update.
  // We listen for the custom 'hzp:lang' event dispatched by shared.js.
  document.addEventListener('hzp:lang', function (e) {
    var newLang = e.detail;
    // Refresh each marker's icon with the new language name
    allMarkers.forEach(function (m) {
      var c = m._compound;
      if (!c) return;
      var isFeat = featured.indexOf(c.n) >= 0;
      m.setIcon(markerIcon(c, isFeat));
    });
    // Update count text
    var visibleCount = clusterGroup.getLayers().length;
    countEl.textContent = visibleCount + ' ' + (newLang === 'ar' ? 'كمبوند' : (visibleCount === 1 ? 'compound' : 'compounds'));
    // Update datalist options with Arabic names
    if (compoundList) {
      compoundList.innerHTML = D.compounds.map(function (c) {
        var name = D.compoundName ? D.compoundName(c.n, newLang) : c.n;
        return '<option value="' + name + '">';
      }).join('');
    }
    // Update filter input placeholder (data-i18n-ph handles this, but reload-safe)
  });

  // ─── Sticky map: freeze when scrolled past, unfreeze when leaving section ───
  var mapWrap = document.getElementById('map-sticky-wrap');
  var mapSection = document.getElementById('map-section');
  if (mapWrap && mapSection) {
    var stickyActive = false;
    window.addEventListener('scroll', function () {
      var secRect = mapSection.getBoundingClientRect();
      var wrapRect = mapWrap.getBoundingClientRect();
      // Activate sticky when the map wrapper top goes above the header
      if (wrapRect.top < 64 && secRect.bottom > 300 && !stickyActive) {
        mapWrap.classList.add('sticky');
        stickyActive = true;
        setTimeout(function () { map.invalidateSize(); }, 300);
      } else if ((wrapRect.top >= 64 || secRect.bottom <= 300) && stickyActive) {
        mapWrap.classList.remove('sticky');
        stickyActive = false;
        setTimeout(function () { map.invalidateSize(); }, 300);
      }
    }, { passive: true });
  }
})();
</script>

{/*  ═══ PERCIPIO-STYLE SCROLL MOTION — JS ════════════════════════════════════
     Clean scroll-triggered fade-ups. No preloader, no cursor, no magnetic.
     Just elegant content reveals as you scroll. Works on all devices.  */}
<script>
(function () {
  'use strict';
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── Apply .se-fade + framer-motion classes to key content blocks ───────
  function setupFades() {
    // Basic fade-up for general elements
    var fadeSelectors = [
      '.sec-head .eyebrow', '.hz-sec-head h2',
      '.hz-block h2', '.hz-cta h3',
      '.search-card', '.hz-search-card',
      '.hz-comp', '.hz-room', '.hz-stats .stat', '.hz-cta',
      '.block .wrap > p', '.cpd-card',
      '.testi-card', '.ai-tile',
      '#tour .wrap > div'
    ];
    document.querySelectorAll(fadeSelectors.join(',')).forEach(function (el) {
      if (el.dataset.seFade) return;
      el.classList.add('se-fade');
      el.dataset.seFade = '1';
    });

    // Framer-motion: headings slide down from top
    document.querySelectorAll('.sec-head h2, .ai-hub h2').forEach(function (el) {
      if (el.dataset.fmDone) return;
      el.classList.add('fm-down');
      el.dataset.fmDone = '1';
    });

    // Framer-motion: listing cards spin-in with stagger
    document.querySelectorAll('.grid-props .pcard, #prop-grid .pcard').forEach(function (el, i) {
      if (el.dataset.fmDone) return;
      el.classList.add('fm-spin', 'fm-d' + ((i % 6) + 1));
      el.dataset.fmDone = '1';
    });

    // Framer-motion: Why Sierra features slide from left/right alternating
    document.querySelectorAll('.grid-feat .feat').forEach(function (el, i) {
      if (el.dataset.fmDone) return;
      el.classList.add(i % 2 === 0 ? 'fm-left' : 'fm-right', 'fm-d' + ((i % 4) + 1));
      el.dataset.fmDone = '1';
    });

    // Framer-motion: net-banner slides from left
    var nb = document.querySelector('.net-banner');
    if (nb && !nb.dataset.fmDone) { nb.classList.add('fm-left'); nb.dataset.fmDone = '1'; }

    // Framer-motion: AI cards spin-in
    document.querySelectorAll('.ai-card').forEach(function (el, i) {
      if (el.dataset.fmDone) return;
      el.classList.add('fm-spin', 'fm-d' + ((i % 4) + 1));
      el.dataset.fmDone = '1';
    });

    // Framer-motion: compound cards slide from left/right
    document.querySelectorAll('.grid-comp .comp, #comp-grid .comp').forEach(function (el, i) {
      if (el.dataset.fmDone) return;
      el.classList.add(i % 2 === 0 ? 'fm-left' : 'fm-right', 'fm-d' + ((i % 4) + 1));
      el.dataset.fmDone = '1';
    });

    // Framer-motion: stats write-on effect
    document.querySelectorAll('.stats .stat').forEach(function (el, i) {
      if (el.dataset.fmDone) return;
      el.classList.add('fm-write', 'fm-d' + ((i % 4) + 1));
      el.dataset.fmDone = '1';
    });

    // Framer-motion: 3D tour section blur-in
    var tourSec = document.getElementById('tour');
    if (tourSec && !tourSec.dataset.fmDone) { tourSec.classList.add('fm-blur'); tourSec.dataset.fmDone = '1'; }

    // Framer-motion: map section clip-reveal
    var mapSec = document.getElementById('map-section');
    if (mapSec && !mapSec.dataset.fmDone) { mapSec.classList.add('fm-clip'); mapSec.dataset.fmDone = '1'; }

    // Framer-motion: insights cards flip-3D
    document.querySelectorAll('#insights-grid > a').forEach(function (el, i) {
      if (el.dataset.fmDone) return;
      el.classList.add('fm-flip', 'fm-d' + ((i % 3) + 1));
      el.dataset.fmDone = '1';
    });

    // Framer-motion: CTA scale-up
    var cta = document.querySelector('.cta');
    if (cta && !cta.dataset.fmDone) { cta.classList.add('fm-scale'); cta.dataset.fmDone = '1'; }

    // Framer-motion: AI preview images blur-in
    document.querySelectorAll('.ai-hub a img').forEach(function (el, i) {
      if (el.parentElement.dataset.fmDone) return;
      el.parentElement.classList.add('fm-blur', 'fm-d' + ((i % 3) + 1));
      el.parentElement.dataset.fmDone = '1';
    });
  }

  // ─── Check which elements are in viewport + reveal them ─────────────────
  function checkFades() {
    // Trigger se-fade (Percipio-style fade-up)
    document.querySelectorAll('.se-fade:not(.se-fade-in)').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.88 && r.bottom > 0) {
        el.classList.add('se-fade-in');
      }
    });
    // Trigger framer-motion animations (must include EVERY fm-* class that
    // starts at opacity:0 — fm-blur, fm-clip, fm-flip, fm-scale were previously
    // missing, which kept the 3D tour, map, insights cards, CTA and AI preview
    // images permanently invisible. See lines ~1295-1320 for class assignment.)
    document.querySelectorAll('.fm-spin:not(.fm-in), .fm-down:not(.fm-in), .fm-left:not(.fm-in), .fm-right:not(.fm-in), .fm-write:not(.fm-in), .fm-scale:not(.fm-in), .fm-flip:not(.fm-in), .fm-blur:not(.fm-in), .fm-clip:not(.fm-in)').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.88 && r.bottom > 0) {
        el.classList.add('fm-in');
      }
    });
  }

  // ─── Stagger: add delay to grid children for cascade effect ────────────
  function setupStagger() {
    var grids = document.querySelectorAll('.grid-comp, .hz-grid-comp, .hz-rooms, .grid-props, .hz-grid-props, .stats .grid, .hz-stats .grid');
    grids.forEach(function (grid) {
      var children = grid.children;
      for (var i = 0; i < children.length && i < 8; i++) {
        children[i].style.transitionDelay = (i * 0.08) + 's';
      }
    });
  }

  // ─── Smooth scroll: REMOVED ─────────────────────────────────────────────
  // The custom smooth scroll (both the wheel-hijack version and the lerp
  // version) was causing issues:
  //   - wheel preventDefault blocked native scroll on some setups
  //   - window.scrollTo override broke nav link clicks + scrollIntoView
  // Native browser scrolling is now used — it works perfectly on Windows
  // (mouse wheel, trackpad) and Mac (trackpad momentum scroll) without
  // any JavaScript intervention. The scroll-triggered fade-up reveals
  // still work because they listen to the native 'scroll' event.

  // ─── Init ────────────────────────────────────────────────────────────────
  if (reduced) {
    // Show everything immediately
    document.addEventListener('DOMContentLoaded', function () {
      document.querySelectorAll('.se-fade').forEach(function (el) {
        el.classList.add('se-fade-in');
      });
    });
  } else {
    // Setup after portal JS renders content
    setTimeout(function () {
      setupFades();
      setupStagger();
      checkFades();
      window.addEventListener('scroll', checkFades, { passive: true });
      window.addEventListener('resize', checkFades, { passive: true });
    }, 500);

    // Re-check after dynamic content loads (portal JS renders async)
    var obs = new MutationObserver(function () {
      setupFades();
      checkFades();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 5000);

    // ── FAILSAFE: any fm-* element still at opacity:0 after 4s gets fm-in.
    // This prevents the entire 3D tour / map / CTA / insights sections from
    // staying invisible forever if the scroll check somehow misses them
    // (e.g. user lands on a deep link, viewport miscalculation, layout shift).
    setTimeout(function () {
      document.querySelectorAll(
        '.fm-spin:not(.fm-in), .fm-down:not(.fm-in), .fm-left:not(.fm-in), ' +
        '.fm-right:not(.fm-in), .fm-write:not(.fm-in), .fm-scale:not(.fm-in), ' +
        '.fm-flip:not(.fm-in), .fm-blur:not(.fm-in), .fm-clip:not(.fm-in)'
      ).forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          el.classList.add('fm-in');
        }
      });
    }, 4000);
    // Ultimate backstop: after 8s, force-reveal EVERYTHING still hidden so
    // no section is permanently invisible regardless of viewport state.
    setTimeout(function () {
      document.querySelectorAll(
        '[class*="fm-"]:not(.fm-in), .se-fade:not(.se-fade-in)'
      ).forEach(function (el) { el.classList.add('fm-in', 'se-fade-in'); });
    }, 8000);
  }
})();
</script>
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
        <div className="tweaks-swatch on" data-color="#00aeff" style={{{"background": "#00aeff"}}} title="Cyan"></div>
        <div className="tweaks-swatch" data-color="#c8961a" style={{{"background": "#c8961a"}}} title="Gold"></div>
        <div className="tweaks-swatch" data-color="#34d399" style={{{"background": "#34d399"}}} title="Green"></div>
        <div className="tweaks-swatch" data-color="#e63946" style={{{"background": "#e63946"}}} title="Red"></div>
        <div className="tweaks-swatch" data-color="#a78bfa" style={{{"background": "#a78bfa"}}} title="Purple"></div>
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
<script>
(function () {
  'use strict';
  var trigger = document.getElementById('tweaks-trigger');
  var overlay = document.getElementById('tweaks-overlay');
  var closeBtn = document.getElementById('tweaks-close');
  if (!trigger || !overlay) return;

  // Load saved settings
  var savedAccent = localStorage.getItem('se-accent') || '#00aeff';
  var savedFont = localStorage.getItem('se-font-color') || '#0d2136';
  var savedRadius = localStorage.getItem('se-radius') || '10';
  applyAccent(savedAccent);
  applyFont(savedFont);
  applyRadius(savedRadius);
  var savedLogo = localStorage.getItem('se-logo') || '';
  if (savedLogo) applyLogo(savedLogo);
  window.addEventListener('load', function () { if (savedLogo) applyLogo(savedLogo); });
  // Mark active swatches
  document.querySelectorAll('.tweaks-swatch').forEach(function (s) {
    s.classList.toggle('on', s.getAttribute('data-color') === savedAccent);
  });
  document.querySelectorAll('.tweaks-font-btn').forEach(function (b) {
    b.classList.toggle('on', b.getAttribute('data-font') === savedFont);
  });
  document.querySelectorAll('.tweaks-corner-btn').forEach(function (b) {
    b.classList.toggle('on', b.getAttribute('data-radius') === savedRadius);
  });

  trigger.addEventListener('click', function () { overlay.classList.add('on'); });
  closeBtn.addEventListener('click', function () { overlay.classList.remove('on'); });
  overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.classList.remove('on'); });

  // Accent color
  document.querySelectorAll('.tweaks-swatch').forEach(function (sw) {
    sw.addEventListener('click', function () {
      var color = this.getAttribute('data-color');
      document.querySelectorAll('.tweaks-swatch').forEach(function (s) { s.classList.remove('on'); });
      this.classList.add('on');
      applyAccent(color);
      localStorage.setItem('se-accent', color);
    });
  });

  // Font color
  document.querySelectorAll('.tweaks-font-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var color = this.getAttribute('data-font');
      document.querySelectorAll('.tweaks-font-btn').forEach(function (b) { b.classList.remove('on'); });
      this.classList.add('on');
      applyFont(color);
      localStorage.setItem('se-font-color', color);
    });
  });

  // Corner radius
  document.querySelectorAll('.tweaks-corner-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var r = this.getAttribute('data-radius');
      document.querySelectorAll('.tweaks-corner-btn').forEach(function (b) { b.classList.remove('on'); });
      this.classList.add('on');
      applyRadius(r);
      localStorage.setItem('se-radius', r);
    });
  });

  var logoFile = document.getElementById('tweaks-logo-file');
  var logoReset = document.getElementById('tweaks-logo-reset');
  if (logoFile) logoFile.addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function (e) {
      var src = e.target.result;
      applyLogo(src); savedLogo = src;
      try { localStorage.setItem('se-logo', src); } catch (err) {}
    };
    rd.readAsDataURL(f);
  });
  if (logoReset) logoReset.addEventListener('click', function () {
    applyLogo('logo-gold.png'); savedLogo = '';
    localStorage.removeItem('se-logo');
    if (logoFile) logoFile.value = '';
  });
  function applyLogo(src) {
    document.querySelectorAll('.brand .mark.logo img, img[alt="Sierra Estates"]').forEach(function (img) { img.src = src; });
    var prev = document.getElementById('tweaks-logo-preview-img');
    if (prev) prev.src = src;
  }

  function applyAccent(color) {
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--pri', color);
  }
  function applyFont(color) {
    document.documentElement.style.setProperty('--ink', color);
    document.documentElement.style.setProperty('--text', color);
  }
  function applyRadius(r) {
    document.documentElement.style.setProperty('--r-card', r + 'px');
    document.documentElement.style.setProperty('--r-btn', Math.max(0, r - 2) + 'px');
  }
})();
</script>
{/*  AI hub interactivity: watermark parallax + card spotlight/tilt  */}
<script>
(function(){
  var hub=document.getElementById('ai');
  if(!hub) return;
  var mark=document.getElementById('ai-watermark');
  var cards=[];
  function collect(){cards=[].slice.call(hub.querySelectorAll('.ai-card'));}
  collect();
  new MutationObserver(collect).observe(document.getElementById('ai-grid')||hub,{childList:true});
  var raf=null,mx=0,my=0;
  hub.addEventListener('mousemove',function(e){
    var r=hub.getBoundingClientRect();
    var px=(e.clientX-r.left)/r.width-0.5, py=(e.clientY-r.top)/r.height-0.5;
    mx=px;my=py;
    if(raf) return;
    raf=requestAnimationFrame(function(){
      raf=null;
      if(mark) mark.style.transform='translate3d('+(mx*-34)+'px,'+(my*-34)+'px,0) rotate('+(mx*3)+'deg)';
      var cr;
      cards.forEach(function(c){
        cr=c.getBoundingClientRect();
        var cx=(e.clientX-cr.left)/cr.width, cy=(e.clientY-cr.top)/cr.height;
        if(cx<-0.15||cx>1.15||cy<-0.15||cy>1.15){c.style.transform='';return;}
        c.style.setProperty('--mx',(cx*100)+'%');
        c.style.setProperty('--my',(cy*100)+'%');
        c.style.transform='perspective(720px) rotateX('+((0.5-cy)*5)+'deg) rotateY('+((cx-0.5)*5)+'deg) translateY(-4px)';
      });
    });
  });
  hub.addEventListener('mouseleave',function(){
    if(mark) mark.style.transform='';
    cards.forEach(function(c){c.style.transform='';});
  });
})();
</script>

      </div>
    </>
  );
}
