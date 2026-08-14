/**
 * Sierra Estates — Client Home Page
 *
 * This is a "shell" Next.js page that mounts the vanilla HTML structure from
 * the original index.html verbatim, then lets the existing scripts
 * (data.js → shared.js → home.js) run via next/script after the DOM is ready.
 *
 * All static assets live in /public/client-page/ which is served at /client-page/
 * by Next.js at runtime.
 *
 * We use `suppressHydrationWarning` on every container whose children will be
 * written by vanilla JS (hero-slides, prop-grid, etc.) so React does not
 * complain about mismatches after the scripts run.
 */
import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Sierra Estates · New Cairo Properties — Rent & Resale',
  description:
    'Sierra Estates — AI-curated rent and resale properties across 50+ New Cairo compounds. Verified listings, live AVM pricing, licensed brokers.',
  alternates: { canonical: 'https://sierra-estates.net/' },
  openGraph: {
    type: 'website',
    title: 'Sierra Estates · New Cairo Properties',
    description:
      'AI-curated rent and resale properties across 50+ New Cairo compounds. Verified listings, live AVM pricing, licensed brokers.',
    url: 'https://sierra-estates.net/',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&q=80',
      },
    ],
  },
  twitter: { card: 'summary_large_image' },
  other: {
    'application-ld+json': JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'RealEstateAgent',
      name: 'Sierra Estates',
      url: 'https://sierra-estates.net/',
      telephone: '+2 01092048333',
      email: 'Info@sierra-estates.net',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Banafseg 2, Villa 402',
        addressLocality: 'New Cairo',
        addressCountry: 'EG',
      },
      areaServed: [
        'New Cairo',
        '5th Settlement',
        'Katameya',
        'Madinaty',
        'El Shorouk',
        'Mostakbal City',
      ],
    }),
  },
};

export default function ClientHomePage() {
  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          STYLESHEETS — served from /public/client-page/
          We load these as <link> tags in the head via Next's <head> injection
          pattern (just normal JSX — Next hoists <link> to <head> automatically).
         ═══════════════════════════════════════════════════════════════════ */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link rel="preconnect" href="https://images.unsplash.com" />
      <link rel="preconnect" href="https://unpkg.com" />
      {/* Hero image preload */}

      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Cairo:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700;800;900&family=Cormorant+Garamond:wght@500;600;700&display=swap"
        rel="stylesheet"
      />
      {/* Client-page vanilla CSS */}
      <link rel="stylesheet" href="/client-page/shared.css" />
      <link rel="stylesheet" href="/client-page/home.css" />

      {/* ═══════════════════════════════════════════════════════════════════
          BODY — exact HTML structure from index.html, converted to JSX.
          suppressHydrationWarning is applied to every element whose
          innerHTML is written by vanilla JS after mount.
         ═══════════════════════════════════════════════════════════════════ */}

      {/* Skip link */}
      <a className="skip-link" href="#main" data-i18n="skipToContent">
        Skip to content
      </a>

      {/* Site chrome (nav injected by shared.js) */}
      <div id="site-chrome" suppressHydrationWarning />

      <main id="main">

        {/* ── HERO SLIDER ───────────────────────────────────────────────── */}
        <header className="hero">
          <div id="hero-slides" aria-hidden="true" suppressHydrationWarning />
          <div className="scrim" aria-hidden="true" />
          <div className="wrap">
            <p className="h-eyebrow" id="hero-pre" suppressHydrationWarning />
            <h1 id="hero-main" suppressHydrationWarning />
            <p className="sub" data-i18n="heroSub" />
            <div className="quick">
              <span>
                <i data-lucide="badge-check" className="i" />{' '}
                <span data-i18n="q1" />
              </span>
              <span>
                <i data-lucide="map" className="i" />{' '}
                <span data-i18n="q2" />
              </span>
              <span>
                <i data-lucide="shield-check" className="i" />{' '}
                <span data-i18n="q3" />
              </span>
            </div>
          </div>
          <a className="map-cta" href="/client-page/compounds.html" title="Explore Map">
            <span className="mc-ic">
              <i data-lucide="map" className="i" />
            </span>
            <span data-i18n="exploreMapBtn" />
          </a>
          <div className="dots" id="hero-dots" suppressHydrationWarning />
          {/* Laser beam decoration */}
          <div className="page-laser" aria-hidden="true">
            <div className="page-laser-beam" />
          </div>
          <div className="scroll-cue" aria-hidden="true">
            <span className="scroll-cue-line" />
            <span className="scroll-cue-label">SCROLL</span>
          </div>
        </header>

        {/* ── BELL BAR ──────────────────────────────────────────────────── */}
        <div className="bell-bar" id="bell-bar">
          <div className="bell-content">
            <span className="bell-text">
              The first real estate ecosystem in Egypt · استكشف أفضل الفرص
              المتاحة في التجمع الخامس <b>AI Driven</b> · قدم طلبك الآن
            </span>
            <span className="bell-badge">خصم 25%</span>
            <a href="/clients" className="bell-btn">
              اطلب الآن <i data-lucide="arrow-right" className="i i-sm" />
            </a>
          </div>
        </div>

        {/* ── SEARCH CARD ───────────────────────────────────────────────── */}
        <div className="wrap searchbar">
          <div className="search-card rv">
            <div className="search-tabs">
              <button
                className="active"
                data-i18n="tabBuy"
                type="button"
                data-tab="buy"
                aria-label="Buy properties"
                title="Buy"
              />
              <button
                data-i18n="tabRent"
                type="button"
                data-tab="rent"
                aria-label="Rent properties"
                title="Rent"
              />
              <button
                data-i18n="tabNew"
                type="button"
                data-tab="new"
                aria-label="New properties"
                title="New"
              />
            </div>
            <div className="search-fields">
              {/* Compound search */}
              <div className="field">
                <label htmlFor="hero-compound-search" data-i18n="fLoc" />
                <div className="search-compound-wrap">
                  <input
                    type="text"
                    id="hero-compound-search"
                    className="hero-search-input"
                    data-i18n-ph="searchCpdPh"
                    placeholder="Search compound… (e.g. Mivida)"
                    autoComplete="off"
                    aria-label="Search Compound"
                  />
                  <div
                    id="hero-compound-results"
                    className="compound-dropdown compound-dropdown-hidden"
                    suppressHydrationWarning
                  />
                </div>
              </div>
              {/* Property Type */}
              <div className="field">
                <label htmlFor="hero-type" data-i18n="fType" />
                <select id="hero-type" className="hero-select" aria-label="Property Type">
                  <option value="">Any Type</option>
                  <option value="Apartment">Apartment</option>
                  <option value="Villa">Villa</option>
                  <option value="Townhouse">Townhouse</option>
                  <option value="Twin House">Twin House</option>
                  <option value="Penthouse">Penthouse</option>
                  <option value="Duplex">Duplex</option>
                </select>
              </div>
              {/* Bedrooms */}
              <div className="field">
                <label htmlFor="hero-beds" data-i18n="fBeds" />
                <select id="hero-beds" className="hero-select" aria-label="Bedrooms">
                  <option value="0">Any</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="5">5+</option>
                </select>
              </div>
              {/* Price */}
              <div className="field">
                <label htmlFor="hero-price" data-i18n="fPrice" />
                <select id="hero-price" className="hero-select" aria-label="Price">
                  <option value="0">Any Price</option>
                  <option value="5">Up to 5M EGP</option>
                  <option value="10">Up to 10M EGP</option>
                  <option value="20">Up to 20M EGP</option>
                  <option value="30">Up to 30M EGP</option>
                  <option value="50">Up to 50M EGP</option>
                </select>
              </div>
              {/* Search button */}
              <div className="field searchbtn">
                <button
                  type="button"
                  className="btn btn-pri"
                  id="hero-search-btn"
                  aria-label="Search properties"
                  title="Search"
                >
                  <i data-lucide="search" className="i" />{' '}
                  <span data-i18n="search" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── MARKET TICKER (decorative) ────────────────────────────────── */}
        <div className="ticker" aria-hidden="true">
          <div className="row" id="ticker-row" suppressHydrationWarning />
        </div>

        {/* ── FEATURED PROPERTIES ───────────────────────────────────────── */}
        <section className="block" id="properties">
          <div className="wrap">
            <div className="sec-head rv">
              <div>
                <p className="eyebrow" data-i18n="eyeList" />
                <h2 data-i18n="featTit" />
                <p data-i18n="featSub" />
              </div>
              <a
                href="/client-page/properties.html"
                className="sec-link"
                title="View All Properties"
              >
                <span data-i18n="viewAll" />{' '}
                <i data-lucide="arrow-right" className="i" />
              </a>
            </div>
            <div className="grid-props" id="prop-grid" suppressHydrationWarning />
          </div>
        </section>

        {/* ── 3D VIRTUAL TOUR ───────────────────────────────────────────── */}
        <section className="block well" id="tour" data-screen-label="Virtual tour">
          <div className="wrap">
            <div className="sec-head rv vtv-head">
              <div>
                <h2 data-i18n="tourTit" className="vtv-usp-tit" />
                <p data-i18n="tourSub" />
              </div>
              <a
                href="/client-page/virtual-tour.html"
                className="vtv-link"
                title="Open Full Tour"
              >
                <span data-i18n="tourOpenFull" />{' '}
                <i data-lucide="arrow-right" className="i" />
              </a>
            </div>

            <div id="vtv-banner" className="vtv-banner-card">
              <div className="vtv-banner-border" />
              <button
                id="vtv-poster"
                type="button"
                aria-label="Launch 3D virtual tour"
                className="vtv-poster-btn"
                title="Launch 3D Tour"
              >
                <span className="vtv-scrim-left" />
                <span className="vtv-scrim-bot" />
                {/* LEFT: USP headline + feature pills */}
                <span className="vtv-left-content">
                  <span className="vtv-usp-eyebrow">
                    <span className="vtv-usp-line" />
                    SIERRA 3D · POWERED BY IMMERSIVE TECH
                  </span>
                  <span className="vtv-usp-tit">
                    Walk Through Your
                    <br />
                    Next Home
                    <span className="vtv-usp-tit-hl">Before You Visit</span>
                  </span>
                  <span className="vtv-usp-sub">
                    Every Sierra listing is captured in cinematic 4K HDR.
                    Stroll room-by-room, peek into the garden at dusk, gauge
                    the pool from above, all from your screen, all in seconds.
                  </span>
                  <span className="vtv-pills">
                    <span className="vtv-pill">
                      <i data-lucide="video" className="i" /> 4K HDR
                    </span>
                    <span className="vtv-pill">
                      <i data-lucide="door-open" className="i" /> Room-by-room
                    </span>
                    <span className="vtv-pill">
                      <i data-lucide="glasses" className="i" /> VR-ready
                    </span>
                    <span className="vtv-pill">
                      <i data-lucide="grid-2x2" className="i" /> Floor plan
                    </span>
                  </span>
                </span>
                {/* RIGHT: Big play button */}
                <span className="vtv-right-content">
                  <span className="vtv-big-play">
                    <i data-lucide="play" className="i" />
                  </span>
                  <span className="vtv-play-lbl">▶ Launch 3D Tour</span>
                </span>
                {/* BOTTOM-LEFT: property info */}
                <span className="vtv-bl-info">
                  <span className="vtv-bl-eyebrow">
                    <i data-lucide="map-pin" className="i" /> Featured · New
                    Cairo
                  </span>
                  <span className="vtv-bl-tit">
                    Sierra Signature Villa · Mivida
                  </span>
                  <span className="vtv-bl-spec">
                    5 Bed · 6 Bath · 480 m² · Pool · Garden
                  </span>
                </span>
                {/* BOTTOM-RIGHT: stats */}
                <span className="vtv-br-stats">
                  <span className="vtv-stat-col">
                    <span className="vtv-stat-num c1">47</span>
                    <span className="vtv-stat-lbl">tours live</span>
                  </span>
                  <span className="vtv-stat-sep" />
                  <span className="vtv-stat-col">
                    <span className="vtv-stat-num c2">12</span>
                    <span className="vtv-stat-lbl">ready to move</span>
                  </span>
                  <span className="vtv-stat-sep" />
                  <span className="vtv-stat-col">
                    <span className="vtv-stat-num c3">4K</span>
                    <span className="vtv-stat-lbl">HDR quality</span>
                  </span>
                </span>
                {/* TOP-RIGHT: LIVE badge */}
                <span className="vtv-live-badge">
                  <span className="vtv-live-dot" />
                  LIVE · SIERRA 3D
                </span>
              </button>


              <iframe
                id="vtv-iframe"
                className="vtv-iframe"
                title="3D Virtual Tour"
                allow="fullscreen; accelerometer; gyroscope; magnetometer; vr; xr-spatial-tracking"
                allowFullScreen
                loading="lazy"
              />
              <div id="vtv-loading" className="vtv-loading">
                <i data-lucide="loader-2" className="i i-2xl i-spin" />
                <span>Loading immersive 3D tour…</span>
              </div>
              <button
                id="vtv-fs"
                type="button"
                aria-label="Enter fullscreen"
                title="Fullscreen"
                className="vtv-fs"
              >
                <i data-lucide="maximize-2" className="i" />
              </button>
            </div>
            <div className="vtv-foot">
              <a
                href="https://listing3d.com/embed/r39d0bd4dde0a4fe693c7fe5fd230a896"
                target="_blank"
                rel="noopener noreferrer"
                className="vtv-foot-link"
                title="Open in new tab"
              >
                <i data-lucide="external-link" className="i" /> Open tour in
                new tab
              </a>
              <span className="vtv-foot-lbl">
                Cinematic capture · Matterport-grade fidelity
              </span>
            </div>
          </div>
        </section>

        {/* ── WHY SIERRA ────────────────────────────────────────────────── */}
        <section className="block" id="agents">
          <div className="wrap">
            <div className="sec-head rv centered">
              <div>
                <p className="eyebrow" data-i18n="eyeWhy" />
                <h2 data-i18n="whyTit" />
                <p data-i18n="whySub" />
              </div>
            </div>
            <div className="net-banner rv">
              <div className="nb-left">
                <p className="eyebrow" data-i18n="netEye" />
                <h3 data-i18n="netTit" />
                <p data-i18n="netBody" />
              </div>
              <div className="nb-stats">
                <div className="nb-stat">
                  <b data-count="1500" data-suffix="+" suppressHydrationWarning>0</b>
                  <span data-i18n="netS1L" />
                </div>
                <div className="nb-stat">
                  <b data-count="240" data-suffix="+" suppressHydrationWarning>0</b>
                  <span data-i18n="netS2L" />
                </div>
                <div className="nb-stat">
                  <b data-count="100" data-suffix="%" suppressHydrationWarning>0</b>
                  <span data-i18n="netS3L" />
                </div>
              </div>
            </div>
            <div className="grid-feat">
              <div className="feat rv">
                <div className="ic"><i data-lucide="radar" className="i" /></div>
                <h4 data-i18n="w1t" /><p data-i18n="w1s" />
              </div>
              <div className="feat rv d1">
                <div className="ic"><i data-lucide="trending-up" className="i" /></div>
                <h4 data-i18n="w2t" /><p data-i18n="w2s" />
              </div>
              <div className="feat rv d2">
                <div className="ic"><i data-lucide="heart-handshake" className="i" /></div>
                <h4 data-i18n="w3t" /><p data-i18n="w3s" />
              </div>
              <div className="feat rv d3">
                <div className="ic"><i data-lucide="badge-check" className="i" /></div>
                <h4 data-i18n="w4t" /><p data-i18n="w4s" />
              </div>
            </div>
          </div>
        </section>

        {/* ── AI HUB / INTELLIGENCE ENGINE ──────────────────────────────── */}
        <section className="ai-hub" id="ai">
          <div className="wrap">
            <p className="ai-eye rv">
              <span className="live" aria-hidden="true" />{' '}
              <span data-i18n="aiEye" />
            </p>
            <h2 className="rv" data-i18n="aiHubTit" />
            <p className="ai-lead rv" data-i18n="aiSub" />
            <div className="ai-scan" aria-hidden="true" />
            <div className="ai-grid" id="ai-grid" suppressHydrationWarning />
            <div className="ai-previews" id="ai-previews" suppressHydrationWarning />
            <div className="mt-lg rv">
              <button
                className="tour-launch"
                id="tour-open"
                type="button"
                aria-label="Launch Immersive Global Tour"
                title="Launch Tour"
              >
                <span className="t-ic" aria-hidden="true">
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    <path d="M2 12h20" />
                  </svg>
                </span>
                <span className="t-txt">
                  <b data-i18n="tourLaunchTit" />
                  <span data-i18n="tourLaunchSub" />
                </span>
                <span className="t-play" aria-hidden="true">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <polygon points="6 4 20 12 6 20 6 4" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ── COMPOUNDS ─────────────────────────────────────────────────── */}
        <section className="block well" id="compounds">
          <div className="wrap">
            <div className="sec-head rv">
              <div>
                <p className="eyebrow" data-i18n="eyeCpd" />
                <h2 data-i18n="cpdTit" />
                <p data-i18n="cpdSub" />
              </div>
              <a
                href="/client-page/compounds.html"
                className="sec-link"
                title="View All Compounds"
              >
                <span data-i18n="allCpds" />{' '}
                <i data-lucide="arrow-right" className="i" />
              </a>
            </div>
            <div className="grid-comp" id="comp-grid" suppressHydrationWarning />
          </div>
        </section>

        {/* ── LIVE MAP ──────────────────────────────────────────────────── */}
        <section className="block" id="map-section" data-screen-label="Smart Map">
          <div className="wrap">
            <div className="sec-head rv">
              <div>
                <h2 data-i18n="mapTit" />
                <p data-i18n="mapSub" />
              </div>
              <a
                href="/client-page/compounds.html"
                className="sec-link"
                title="View All Compounds"
              >
                <span data-i18n="allCpds" />{' '}
                <i data-lucide="arrow-right" className="i" />
              </a>
            </div>

            {/* Smart Map Filter — collapsible dropdown */}
            <div className="hmf-wrap mb-lg">
              <button
                className="hmf-trigger"
                id="hmf-trigger"
                type="button"
                aria-expanded="false"
                aria-label="Toggle map filters"
                title="Filters"
              >
                <span className="hmf-trigger-left">
                  <i data-lucide="sliders-horizontal" className="i" />
                  <span className="hmf-trigger-title" data-i18n="hmfTitle">
                    Smart Filter
                  </span>
                  <span id="hmf-active-badge" className="hmf-active-badge">
                    0
                  </span>
                </span>
                <span className="hmf-trigger-right">
                  <span id="home-map-count" className="hmf-map-count">
                    … compounds
                  </span>
                  <i data-lucide="chevron-down" className="i" id="hmf-chevron" />
                </span>
              </button>

              <div className="hmf-panel" id="hmf-panel">
                <div className="hmf-section">
                  <div className="hmf-section-label">
                    <i data-lucide="building-2" className="i" />
                    <span data-i18n="hmfCompounds">Compounds</span>
                    <span className="hmf-multi-hint" data-i18n="hmfMultiHint">
                      Click to select multiple
                    </span>
                  </div>
                  <div
                    id="hmf-compound-chips"
                    className="hmf-chips"
                    suppressHydrationWarning
                  />
                  <div className="hmf-search-row">
                    <i data-lucide="search" className="i search-icon" />
                    <input
                      id="home-map-compound"
                      type="text"
                      className="hmf-search-input"
                      data-i18n-ph="hmfPlaceholder"
                      placeholder="Search compounds (e.g. Mivida, Hyde Park)…"
                      autoComplete="off"
                    />
                    <i
                      data-lucide="chevron-down"
                      className="i"
                      id="hmf-compound-chevron"
                    />
                    <div
                      id="hmf-compound-dropdown"
                      className="hmf-dropdown"
                      suppressHydrationWarning
                    />
                  </div>
                </div>

                <div className="hmf-beds-row">
                  <span className="hmf-section-label">
                    <i data-lucide="bed-double" className="i" />
                    <span data-i18n="hmfBeds">Bedrooms</span>
                  </span>
                  <div id="home-map-beds" className="hmf-bed-group">
                    <button
                      className="hmf-bed-btn on"
                      data-b="0"
                      type="button"
                      aria-label="Any bedrooms"
                      title="Any"
                      data-i18n="hmfAny"
                    >
                      Any
                    </button>
                    <button className="hmf-bed-btn" data-b="1" type="button" aria-label="1 bedroom" title="1">1</button>
                    <button className="hmf-bed-btn" data-b="2" type="button" aria-label="2 bedrooms" title="2">2</button>
                    <button className="hmf-bed-btn" data-b="3" type="button" aria-label="3 bedrooms" title="3">3</button>
                    <button className="hmf-bed-btn" data-b="4" type="button" aria-label="4 bedrooms" title="4">4</button>
                    <button className="hmf-bed-btn" data-b="5" type="button" aria-label="5+ bedrooms" title="5+">5</button>
                  </div>
                  <button
                    id="hmf-reset"
                    type="button"
                    className="hmf-reset"
                    aria-label="Reset filters"
                    title="Reset Filters"
                  >
                    <i data-lucide="rotate-ccw" className="i" />
                    <span data-i18n="hmfReset">Reset</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="map-sticky-wrap" id="map-sticky-wrap">
              <div id="home-map" />
            </div>
            <div className="text-center mt-sm">
              <a
                href="/client-page/compounds.html"
                className="btn btn-navy"
                title="View Compounds"
              >
                <i data-lucide="map" className="i" />
                <span data-i18n="openFullMap" />
              </a>
            </div>
          </div>
        </section>

        {/* ── AI INSIGHTS ───────────────────────────────────────────────── */}
        <section className="block" id="insights" data-screen-label="AI Insights">
          <div className="wrap">
            <div className="sec-head rv">
              <div>
                <h2 data-i18n="insTit" />
                <p data-i18n="insSub" />
              </div>
            </div>
            <div id="insights-grid" className="insights-grid" suppressHydrationWarning />
            <div id="insights-market" className="insights-market">
              <div className="ins-stat">
                <div className="ins-stat-val">+24%</div>
                <div className="ins-stat-lbl">Top Growth (Mountain View)</div>
              </div>
              <div className="ins-stat">
                <div className="ins-stat-val green">9.8</div>
                <div className="ins-stat-lbl">Highest AI Score (Hyde Park)</div>
              </div>
              <div className="ins-stat">
                <div className="ins-stat-val">EGP 35M</div>
                <div className="ins-stat-lbl">Top Price (Taj City)</div>
              </div>
              <div className="ins-stat">
                <div className="ins-stat-val green">798</div>
                <div className="ins-stat-lbl">Active Units</div>
              </div>
            </div>
            <div className="text-center mt-xl">
              <a
                href="/client-page/properties.html"
                className="btn btn-navy"
                title="View Properties"
              >
                <i data-lucide="trending-up" className="i" />
                <span data-i18n="insBtn" />
              </a>
            </div>
          </div>
        </section>

        {/* ── STATS ─────────────────────────────────────────────────────── */}
        <section className="stats">
          <div className="wrap">
            <div className="stat rv">
              <b data-count="1900" data-suffix="+" suppressHydrationWarning>0</b>
              <span data-i18n="stat1" />
            </div>
            <div className="stat rv d1">
              <b data-count="53" suppressHydrationWarning>0</b>
              <span data-i18n="stat2" />
            </div>
            <div className="stat rv d2">
              <b data-count="68" suppressHydrationWarning>0</b>
              <span data-i18n="stat3" />
            </div>
            <div className="stat rv d3">
              <b data-count="4.2" data-prefix="EGP " data-suffix="B" suppressHydrationWarning>0</b>
              <span data-i18n="stat4" />
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ──────────────────────────────────────────────── */}
        <section className="block testi-band" id="testimonials">
          <div className="wrap">
            <div className="sec-head rv">
              <div>
                <p className="eyebrow" data-i18n="eyeTesti" />
                <h2 data-i18n="testiTit" />
                <p data-i18n="testiSub" />
              </div>
            </div>
            <div className="grid-testi" id="testi-grid" suppressHydrationWarning />
          </div>
        </section>

        {/* ── PERFECT CHOICE + INQUIRY ──────────────────────────────────── */}
        <section className="block" id="inquiry">
          <div className="wrap">
            <div className="perfect rv">
              <div className="pf-left">
                <p className="eyebrow" data-i18n="eyePerfect" />
                <h2 data-i18n="perfTit" />
                <p data-i18n="perfSub" />
                <div className="pf-item">
                  <span className="num" aria-hidden="true">01</span>
                  <div><h4 data-i18n="pc1t" /><p data-i18n="pc1s" /></div>
                </div>
                <div className="pf-item">
                  <span className="num" aria-hidden="true">02</span>
                  <div><h4 data-i18n="pc2t" /><p data-i18n="pc2s" /></div>
                </div>
                <div className="pf-item">
                  <span className="num" aria-hidden="true">03</span>
                  <div><h4 data-i18n="pc3t" /><p data-i18n="pc3s" /></div>
                </div>
              </div>
              <form className="inq" id="inq-form" noValidate>
                <h3 data-i18n="inqTit" />
                <p data-i18n="inqSub" />
                <div className="seg" id="inq-seg">
                  <button type="button" className="on" aria-pressed="true" data-i18n="inqBuy" aria-label="Buy inquiry" title="Buy" />
                  <button type="button" aria-pressed="false" data-i18n="inqRent" aria-label="Rent inquiry" title="Rent" />
                  <button type="button" aria-pressed="false" data-i18n="inqSell" aria-label="Sell inquiry" title="Sell" />
                </div>
                <div className="frow">
                  <div>
                    <label htmlFor="inq-name" data-i18n="inqName" />
                    <input id="inq-name" name="name" type="text" autoComplete="name" placeholder="Name" title="Name" required />
                  </div>
                  <div>
                    <label htmlFor="inq-phone" data-i18n="inqPhone" />
                    <input id="inq-phone" name="phone" type="tel" autoComplete="tel" dir="ltr" placeholder="Phone" title="Phone" required />
                  </div>
                </div>
                <div className="frow">
                  <div>
                    <label htmlFor="inq-email" data-i18n="inqEmail" />
                    <input id="inq-email" name="email" type="email" autoComplete="email" dir="ltr" placeholder="Email" title="Email" />
                  </div>
                  <div>
                    <label htmlFor="inq-zone" data-i18n="inqZone" />
                    <select id="inq-zone" name="zone" title="Zone" aria-label="Zone" suppressHydrationWarning />
                  </div>
                </div>
                <div className="frow">
                  <div>
                    <label htmlFor="inq-type" data-i18n="inqType2" />
                    <select id="inq-type" name="type" title="Type" aria-label="Type" suppressHydrationWarning />
                  </div>
                  <div>
                    <label htmlFor="inq-budget" data-i18n="inqBudget" />
                    <input id="inq-budget" name="budget" type="text" inputMode="numeric" placeholder="10,000,000" dir="ltr" />
                  </div>
                </div>
                <button className="btn btn-pri" type="submit" aria-label="Send Inquiry" title="Send">
                  <i data-lucide="send" className="i" /> <span data-i18n="inqSend" />
                </button>
                <p className="inq-done" id="inq-done" role="status" data-i18n="inqDone" />
              </form>
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <section className="block" id="contact">
          <div className="wrap">
            <div className="cta rv">
              <div className="ct-txt">
                <h2 data-i18n="ctaTit" />
                <p data-i18n="ctaSub" />
              </div>
              <div className="ct-act">
                <button
                  className="btn btn-white"
                  id="cta-list"
                  type="button"
                  aria-label="List your property"
                  title="List Property"
                >
                  <i data-lucide="plus" className="i" />{' '}
                  <span data-i18n="ctaBtn1" />
                </button>
                <a
                  className="btn btn-out"
                  href="https://wa.me/201092048333"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Contact WhatsApp"
                >
                  <i data-lucide="phone" className="i" />{' '}
                  <span data-i18n="ctaBtn2" />
                </a>
              </div>
              <div className="ct-email">
                <i data-lucide="mail" className="i" />{' '}
                <a href="mailto:info@sierra-estates.net">
                  info@sierra-estates.net
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── PARTNERS ──────────────────────────────────────────────────── */}
        <div className="partners">
          <div className="wrap">
            <p className="p-eye rv" data-i18n="partEye" />
            <div className="row rv d1">
              <span>EMAAR MISR</span>
              <span>SODIC</span>
              <span>MOUNTAIN VIEW</span>
              <span>PALM HILLS</span>
              <span>ORA</span>
              <span>LA VISTA</span>
              <span>HYDE PARK</span>
              <span>MARAKEZ</span>
            </div>
          </div>
        </div>
      </main>

      {/* Site footer (injected by shared.js) */}
      <footer id="site-footer" suppressHydrationWarning />

      {/* Virtual Tour Modal */}
      <div
        className="tour-modal"
        id="tour-modal"
        role="dialog"
        aria-modal
        aria-label="Virtual tour"
      >
        <button className="t-close" id="tour-close" type="button" aria-label="Close">
          ×
        </button>
        <iframe id="tour-frame" title="Sierra Estates Virtual Tour" allow="fullscreen" />
      </div>

      <noscript>
        <p style={{ textAlign: 'center', padding: '24px' }}>
          This site requires JavaScript to display listings and the interactive
          map.
        </p>
      </noscript>

      {/* ═══════════════════════════════════════════════════════════════════
          SCRIPTS — loaded in dependency order.

          Strategy:
            1. Firebase CDN bundles (beforeInteractive — available immediately)
            2. Lucide icons (afterInteractive)
            3. data.js (afterInteractive)
            4. firebase-config.js  ─┐ (afterInteractive, ordered via onLoad chain)
            5. firebase-data.js    ─┘
            6. shared.js  (afterInteractive — depends on window.HZDATA)
            7. home.js    (afterInteractive — depends on window.HZ from shared.js)

          All paths resolve to /public/client-page/ which Next.js serves at /client-page/.
         ═══════════════════════════════════════════════════════════════════ */}

      {/* Theme + language initialiser — inline, runs before paint */}
      <Script id="hzp-theme-init" strategy="beforeInteractive">{`
        (function () {
          var d = document.documentElement;
          try {
            var l = localStorage.getItem('hzp-lang') || 'en';
            d.setAttribute('data-theme', localStorage.getItem('hzp-theme') || 'light');
            d.lang = l;
            d.dir = l === 'ar' ? 'rtl' : 'ltr';
          } catch (e) { d.setAttribute('data-theme', 'light'); }
        })();
      `}</Script>

      {/* Firebase compat SDK */}
      <Script
        src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"
        strategy="afterInteractive"
      />
      <Script
        src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"
        strategy="afterInteractive"
      />
      <Script
        src="https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics-compat.js"
        strategy="afterInteractive"
      />

      {/* Lucide icons */}
      <Script
        src="https://unpkg.com/lucide@0.294.0/dist/umd/lucide.min.js"
        strategy="afterInteractive"
      />

      {/* App scripts — served from public/client-page/ */}
      <Script src="/client-page/data.js" strategy="afterInteractive" />
      <Script src="/client-page/firebase-config.js" strategy="afterInteractive" />
      <Script src="/client-page/firebase-data.js" strategy="afterInteractive" />
      <Script src="/client-page/shared.js" strategy="afterInteractive" />
      <Script src="/client-page/home.js" strategy="afterInteractive" />
    </>
  );
}
