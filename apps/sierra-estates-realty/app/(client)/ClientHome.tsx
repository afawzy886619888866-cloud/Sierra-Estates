'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowRight, Search, MapPin, ChevronRight, Loader2, X, Menu, ChevronDown } from 'lucide-react';

// Dynamically import Leaflet components (only client-side)
const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => <div className="h-[480px] bg-slate-100 rounded-xl animate-pulse" />
});

interface Listing {
  id: string;
  code: string;
  img: string;
  ai: number;
  type: string;
  cmp: string;
  zone: string;
  beds: number;
  bath: number;
  area: number;
  mode: 'sale' | 'rent';
  egpM?: number;
  usd?: number;
  tag?: string | null;
  c?: [number, number];
}

interface Compound {
  n: string;
  ai: number;
  g: string;
  z: string;
  priceM: number;
  img: string;
  c: [number, number];
}

/** /api/compounds returns { name, zone, lat, lng, aiScore, growth, priceM, image, ... } */
function normalizeCompound(c: any): Compound {
  return {
    n: c.name,
    ai: c.aiScore ?? 0,
    g: c.growth ?? '',
    z: c.zone,
    priceM: c.priceM ?? 0,
    img: c.image || '',
    c: [c.lat, c.lng],
  };
}

/** /api/listings returns { compound, aiScore, ... } — no per-listing coordinates,
 * so we resolve a listing's map position from its compound's lat/lng. */
function normalizeListing(l: any, compoundCoords: Map<string, [number, number]>): Listing {
  return {
    id: l.id,
    code: l.code,
    img: l.img,
    ai: l.aiScore ?? 0,
    type: l.type,
    cmp: l.compound,
    zone: l.zone,
    beds: l.beds,
    bath: l.bath,
    area: l.area,
    mode: l.mode,
    egpM: l.egpM,
    usd: l.usd,
    tag: l.tag,
    c: compoundCoords.get(l.compound),
  };
}

interface Slide {
  img: string;
  pre: string;
  preAr: string;
  main: string;
  mainAr: string;
}

export default function ClientHome() {
  // Hero slider state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<Slide[]>([]);
  const sliderInterval = useRef<NodeJS.Timeout | null>(null);

  // Search state
  const [selectedCompound, setSelectedCompound] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [compoundResults, setCompoundResults] = useState<Compound[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Map filter state
  const [filterCompounds, setFilterCompounds] = useState<string[]>([]);
  const [filterBeds, setFilterBeds] = useState(0);

  // Data state
  const [listings, setListings] = useState<Listing[]>([]);
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [loading, setLoading] = useState(true);

  // Tweaks panel
  const [showTweaks, setShowTweaks] = useState(false);
  const [accentColor, setAccentColor] = useState('#00aeff');
  const [fontColor, setFontColor] = useState('#0d2136');
  const [cornerRadius, setCornerRadius] = useState('10');

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch listings and compounds from API
        const [listingsRes, compoundsRes] = await Promise.all([
          fetch('/api/listings'),
          fetch('/api/compounds')
        ]);

        if (listingsRes.ok && compoundsRes.ok) {
          const rawListings = await listingsRes.json();
          const rawCompounds = await compoundsRes.json();

          const normalizedCompounds = (rawCompounds as any[]).map(normalizeCompound);
          const compoundCoords = new Map(
            normalizedCompounds.map((c) => [c.n, c.c] as [string, [number, number]])
          );
          const normalizedListings = (rawListings as any[]).map((l) =>
            normalizeListing(l, compoundCoords)
          );

          setListings(normalizedListings);
          setCompounds(normalizedCompounds);

          // Generate slides from listings
          const slideData: Slide[] = normalizedListings.slice(0, 3).map((listing: Listing) => ({
            img: listing.img,
            pre: `Featured in ${listing.zone}`,
            preAr: `مميز في ${listing.zone}`,
            main: `Discover ${listing.cmp} Properties`,
            mainAr: `اكتشف عقارات ${listing.cmp}`,
          }));

          setSlides(slideData);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Hero slider auto-advance
  useEffect(() => {
    if (slides.length <= 1) return;

    const startSlider = () => {
      sliderInterval.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % slides.length);
      }, 7000);
    };

    startSlider();

    return () => {
      if (sliderInterval.current) clearInterval(sliderInterval.current);
    };
  }, [slides.length]);

  // Compound search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setCompoundResults([]);
      setShowResults(false);
      return;
    }

    const q = searchQuery.toLowerCase();
    const filtered = compounds.filter(c =>
      c.n.toLowerCase().includes(q) || c.z.toLowerCase().includes(q)
    ).slice(0, 8);

    setCompoundResults(filtered);
    setShowResults(true);
  }, [searchQuery, compounds]);

  // Apply theme customization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty('--accent', accentColor);
      document.documentElement.style.setProperty('--pri', accentColor);
      document.documentElement.style.setProperty('--ink', fontColor);
      document.documentElement.style.setProperty('--text', fontColor);
      document.documentElement.style.setProperty('--r-card', `${cornerRadius}px`);

      localStorage.setItem('se-accent', accentColor);
      localStorage.setItem('se-font-color', fontColor);
      localStorage.setItem('se-radius', cornerRadius);
    }
  }, [accentColor, fontColor, cornerRadius]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedCompound) {
      params.set('cpd', selectedCompound);
      window.location.href = `/compounds?${params.toString()}`;
    } else {
      window.location.href = '/properties';
    }
  };

  const topListings = [...listings].sort((a, b) => b.ai - a.ai).slice(0, 3);

  // Only listings whose compound resolved to coordinates can be plotted.
  const mappableListings = listings.filter(
    (l): l is Listing & { c: [number, number] } => l.c !== undefined
  );

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" size={48} /></div>;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative min-h-[640px] bg-slate-900 overflow-hidden">
        {/* Background slides */}
        <div className="absolute inset-0">
          {slides.map((slide, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1500 ${
                idx === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                src={slide.img}
                alt="Slide"
                fill
                className="object-cover"
                priority={idx === 0}
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/45" />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-center px-6 py-20 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-0.5 bg-cyan-400" />
            <span className="text-cyan-400 font-mono text-xs uppercase tracking-widest">Featured Property</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold text-white max-w-2xl mb-4 leading-tight">
            Discover <span className="text-cyan-400 italic">Premium Homes</span> in New Cairo
          </h1>
          <p className="text-white/90 text-lg max-w-xl mb-6">
            AI-powered real estate matching. Find your perfect home in Egypt's most exclusive communities.
          </p>

          {/* Quick stats */}
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2"><span className="text-green-400">✓</span> Verified Listings</div>
            <div className="flex items-center gap-2"><span className="text-green-400">✓</span> AI Matched Properties</div>
            <div className="flex items-center gap-2"><span className="text-green-400">✓</span> 24/7 Support</div>
          </div>
        </div>

        {/* Hero dots */}
        <div className="absolute bottom-24 left-6 z-20 flex gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentSlide(idx);
                if (sliderInterval.current) clearInterval(sliderInterval.current);
              }}
              className={`h-1 rounded transition-all ${
                idx === currentSlide
                  ? 'w-12 bg-cyan-400'
                  : 'w-6 bg-white/35 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Bell Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 py-3 px-6 text-center">
        <p className="text-white/85 text-sm font-medium">
          Egypt's first AI-driven real estate ecosystem · Explore the best opportunities in New Cairo —{' '}
          <span className="font-bold">AI Driven</span> · <Link href="#contact" className="text-emerald-400 hover:text-emerald-300 font-bold">Apply now</Link>
        </p>
      </div>

      {/* Search Card */}
      <div className="relative -mt-12 z-20 max-w-6xl mx-auto px-6 mb-12">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-2">
            {/* Compound search */}
            <div className="md:col-span-2 relative">
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Location</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search compound (e.g., Mivida)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border-1.5 border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium bg-gray-50 focus:bg-white focus:border-cyan-400 outline-none transition"
                />
                {showResults && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
                    {compoundResults.length ? (
                      compoundResults.map(c => (
                        <button
                          key={c.n}
                          onClick={() => {
                            setSelectedCompound(c.n);
                            setSearchQuery(c.n);
                            setShowResults(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-sm"
                        >
                          <strong>{c.n}</strong>
                          <span className="text-gray-500 text-xs ml-2">· {c.z}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500 text-sm">No compounds found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Property type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Type</label>
              <select className="w-full border-1.5 border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:border-cyan-400 outline-none">
                <option>Any Type</option>
                <option>Apartment</option>
                <option>Villa</option>
                <option>Penthouse</option>
              </select>
            </div>

            {/* Bedrooms */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Beds</label>
              <select className="w-full border-1.5 border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:border-cyan-400 outline-none">
                <option>Any</option>
                <option>1+</option>
                <option>2+</option>
                <option>3+</option>
                <option>4+</option>
              </select>
            </div>

            {/* Search button */}
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
              >
                <Search size={18} /> Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Properties */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="mb-12">
          <p className="text-cyan-500 text-sm font-bold uppercase mb-2">Our Selection</p>
          <h2 className="text-4xl font-bold mb-2">Featured Properties</h2>
          <p className="text-gray-600">Handpicked homes matched to your preferences</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.slice(0, 6).map((listing, idx) => (
            <Link
              key={listing.id}
              href={`/property/${listing.id}`}
              className="group block bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition"
            >
              <div className="relative h-48 overflow-hidden bg-gray-200">
                <Image
                  src={listing.img}
                  alt={listing.code}
                  fill
                  className="object-cover group-hover:scale-105 transition duration-300"
                />
              </div>
              <div className="p-6">
                <div className="text-xs text-cyan-500 font-bold uppercase mb-3">{listing.code}</div>
                <h3 className="text-lg font-bold mb-2">{listing.cmp}</h3>
                <p className="text-gray-600 text-sm mb-4">{listing.zone}</p>
                <div className="flex gap-4 text-sm text-gray-700 font-semibold">
                  <span>🛏 {listing.beds} beds</span>
                  <span>🚿 {listing.bath} baths</span>
                  <span>📐 {listing.area} m²</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Why Sierra Section */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Why Sierra Estates</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">Your trusted partner in finding homes in New Cairo's most exclusive communities</p>
        </div>

        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
          {[
            { icon: '📍', title: 'Prime Locations', desc: 'Access to the best compounds' },
            { icon: '🤖', title: 'AI Powered', desc: 'Smart matching technology' },
            { icon: '🤝', title: 'Expert Team', desc: '24/7 dedicated support' },
            { icon: '✓', title: 'Verified', desc: 'All listings verified' },
          ].map((item, idx) => (
            <div key={idx} className="bg-white p-8 rounded-xl border border-gray-200 text-center hover:shadow-md transition">
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-2">Explore on Map</h2>
        <p className="text-gray-600 mb-8">View all New Cairo compounds interactively</p>

        <LeafletMap compounds={compounds} listings={mappableListings} />
      </section>

      {/* Top Listings Section */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-2">Best Listings Right Now</h2>
        <p className="text-gray-600 mb-8">AI-ranked by match score and market demand</p>

        <div className="grid md:grid-cols-3 gap-6">
          {topListings.map((listing, idx) => (
            <Link
              key={listing.id}
              href={`/property/${listing.id}`}
              className="block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition"
            >
              <div className="relative h-48 bg-gray-200">
                <Image
                  src={listing.img}
                  alt={listing.code}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-3 left-3 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white px-3 py-1 rounded text-xs font-bold">
                  #{idx + 1} AI {listing.ai.toFixed(1)}
                </div>
              </div>
              <div className="p-4">
                <div className="text-xs text-cyan-500 font-bold mb-2">{listing.code}</div>
                <h3 className="font-bold text-lg mb-2">{listing.cmp}</h3>
                <p className="text-gray-600 text-sm">{listing.zone}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Find Your Home?</h2>
          <p className="text-lg mb-8 opacity-90">Get expert guidance on finding your perfect property in New Cairo</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button className="bg-white text-cyan-600 font-bold px-8 py-3 rounded-lg hover:bg-gray-100 transition">
              Start Searching
            </button>
            <a
              href="https://wa.me/201092048333"
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-white text-white font-bold px-8 py-3 rounded-lg hover:bg-white hover:text-cyan-600 transition"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* Tweaks Panel Button */}
      <button
        onClick={() => setShowTweaks(!showTweaks)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition"
        title="Customize theme"
      >
        <span className="text-xl">🎨</span>
      </button>

      {/* Tweaks Panel */}
      {showTweaks && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="font-bold text-lg">Customize</h3>
              <button onClick={() => setShowTweaks(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Accent Color */}
              <div>
                <label className="block text-xs font-bold uppercase mb-3 text-gray-600">Accent Color</label>
                <div className="flex gap-3">
                  {['#00aeff', '#c8961a', '#34d399', '#e63946', '#a78bfa'].map(color => (
                    <button
                      key={color}
                      onClick={() => setAccentColor(color)}
                      className={`w-10 h-10 rounded-lg border-3 transition ${
                        accentColor === color ? 'border-gray-800 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Font Color */}
              <div>
                <label className="block text-xs font-bold uppercase mb-3 text-gray-600">Font Color</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { color: '#0d2136', label: 'Dark' },
                    { color: '#002b4b', label: 'Navy' },
                    { color: '#4a5568', label: 'Slate' },
                    { color: '#1a1a2e', label: 'Midnight' },
                  ].map(opt => (
                    <button
                      key={opt.color}
                      onClick={() => setFontColor(opt.color)}
                      className={`px-4 py-2 rounded-lg border-2 transition ${
                        fontColor === opt.color
                          ? 'border-gray-800 bg-gray-100'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Corner Radius */}
              <div>
                <label className="block text-xs font-bold uppercase mb-3 text-gray-600">Corners</label>
                <div className="flex gap-2">
                  {['0', '10', '20'].map(r => (
                    <button
                      key={r}
                      onClick={() => setCornerRadius(r)}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 transition ${
                        cornerRadius === r
                          ? 'border-gray-800 bg-gray-100'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {r === '0' ? 'Sharp' : r === '10' ? 'Balanced' : 'Soft'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
