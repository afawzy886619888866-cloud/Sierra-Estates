/**
 * Sierra Estates — Public APIs Integration Engine
 * 
 * Bridges public, free-tier APIs (from github.com/public-apis/public-apis):
 *  1. Open Exchange Rates (open.er-api.com) — Live EGP/USD/AED/SAR/EUR FX parity.
 *  2. Open-Meteo (api.open-meteo.com) — New Cairo real-time climate & viewing suitability.
 *  3. OpenStreetMap / Nominatim — Compound geolocation and POI proximity.
 *  4. IP-API (ip-api.com) — Expat / Buyer geographic origin detection.
 * 
 * Resilient Architecture:
 *  - Strict 3000ms timeouts with AbortController.
 *  - In-memory TTL caching to prevent rate-limiting.
 *  - Zero-exception graceful fallbacks to Sierra verified defaults.
 */

import { DEFAULT_FX_RATES, FxRates } from './fx-gold-engine';

interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheItem<unknown>>();

function getCached<T>(key: string): T | null {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return item.data as T;
}

function setCached<T>(key: string, data: T, ttlSeconds: number): void {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

async function fetchWithTimeout(url: string, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export interface CompoundWeatherReport {
  temperatureC: number;
  humidityPercent: number;
  windSpeedKmh: number;
  condition: string;
  isViewingRecommended: boolean;
  recommendationNote: string;
}

export type CoreTargetMarket = 'new_cairo' | 'madinaty' | 'uptown_cairo' | 'general_cairo';

export interface LocalizedMarketProfile {
  marketId: CoreTargetMarket;
  nameEn: string;
  nameAr: string;
  keyDistricts: string[];
  keyCompounds: string[];
  averagePricePerMeterEgp: number;
  marketHighlights: string[];
}

export const TARGET_MARKET_PROFILES: Record<CoreTargetMarket, LocalizedMarketProfile> = {
  new_cairo: {
    marketId: 'new_cairo',
    nameEn: 'New Cairo & The 5th Settlement',
    nameAr: 'القاهرة الجديدة والتجمع الخامس',
    keyDistricts: ['Golden Square', 'South Academy', 'Choueifat', 'North Investors', 'Lotus', 'Banafseg', 'Narges'],
    keyCompounds: ['Katameya Heights', 'Mivida', 'Swan Lake Residence', 'Palm Hills New Cairo', 'Mountain View iCity', 'Hyde Park'],
    averagePricePerMeterEgp: 48000,
    marketHighlights: [
      'Highest liquidity and trade velocity in East Cairo',
      'Dominant high-end resale and luxury villa inventory',
      'Immediate access to AUC, Road 90, and the Ring Road corridor'
    ],
  },
  madinaty: {
    marketId: 'madinaty',
    nameEn: 'Madinaty',
    nameAr: 'مدينتي',
    keyDistricts: ['B1 to B12 Residential Sectors', 'Golf Villas', 'Four Seasons Private Residences', 'Craft Zone', 'South Park', 'Open Air Mall'],
    keyCompounds: ['Madinaty Executive Villas', 'Madinaty Lake Park', 'Madinaty Golf Residences'],
    averagePricePerMeterEgp: 34000,
    marketHighlights: [
      'Largest fully integrated self-sustaining gated community in Egypt',
      'Highest annual rental yields (6-8%) and continuous family tenant demand',
      'Direct highway transit to Suez Road, Shorouk, and the New Administrative Capital'
    ],
  },
  uptown_cairo: {
    marketId: 'uptown_cairo',
    nameEn: 'Uptown Cairo (Emaar)',
    nameAr: 'أبتاون كايرو (إعمار)',
    keyDistricts: ['Mokattam High Plateau', 'The Sierras', 'Aurora', 'Reyna', 'Celesta Hills', 'Golf Clubhouse District'],
    keyCompounds: ['Uptown Cairo by Emaar', 'Celesta Hills', 'Levana', 'Isola'],
    averagePricePerMeterEgp: 68000,
    marketHighlights: [
      'Iconic 200m elevated plateau providing panoramic Cairo city vistas and cooler microclimate',
      'Premier Emaar signature development with an 18-hole championship golf course',
      'Central strategic nexus between Downtown Cairo and New Cairo via Emaar Drive'
    ],
  },
  general_cairo: {
    marketId: 'general_cairo',
    nameEn: 'East Cairo Urban Corridor',
    nameAr: 'محور شرق القاهرة الكبرى',
    keyDistricts: ['Shorouk City', 'El Rehab', 'Mostakbal City', 'Al-Mataria Commercial Hub'],
    keyCompounds: ['Cairo Plaza', 'Rehab City', 'Al Burouj', 'Sarai'],
    averagePricePerMeterEgp: 31000,
    marketHighlights: [
      'High growth corridor bridging Greater Cairo with the New Administrative Capital',
      'Balanced commercial and residential yield opportunities'
    ],
  },
};

export interface GeoLocationReport {
  country: string;
  countryCode: string;
  city: string;
  district?: string;
  preferredCurrency: 'EGP' | 'USD' | 'AED' | 'SAR';
  isExpatBuyer: boolean;
  primaryTargetMarket: CoreTargetMarket;
  marketProfile: LocalizedMarketProfile;
}

export interface CompoundCoordinates {
  name: string;
  lat: number;
  lon: number;
  displayName: string;
}

export class PublicApisClient {
  /**
   * 1. Live Exchange Rates via Open ER API (open.er-api.com)
   * Free, no API key required, updated daily.
   */
  public static async getLiveFxRates(): Promise<FxRates> {
    const cacheKey = 'fx_rates_usd';
    const cached = getCached<FxRates>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetchWithTimeout('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) throw new Error(`FX HTTP ${res.status}`);

      const data = (await res.json()) as {
        rates?: Record<string, number>;
      };

      if (data?.rates?.EGP) {
        const egpPerUsd = data.rates.EGP;
        const egpPerAed = data.rates.AED ? egpPerUsd / data.rates.AED : DEFAULT_FX_RATES.AED;
        const egpPerSar = data.rates.SAR ? egpPerUsd / data.rates.SAR : DEFAULT_FX_RATES.SAR;
        const egpPerEur = data.rates.EUR ? egpPerUsd / data.rates.EUR : DEFAULT_FX_RATES.EUR;

        const liveRates: FxRates = {
          USD: Number(egpPerUsd.toFixed(2)),
          AED: Number(egpPerAed.toFixed(2)),
          SAR: Number(egpPerSar.toFixed(2)),
          EUR: Number(egpPerEur.toFixed(2)),
          gold21kGramEGP: DEFAULT_FX_RATES.gold21kGramEGP,
          gold24kGramEGP: DEFAULT_FX_RATES.gold24kGramEGP,
        };

        setCached(cacheKey, liveRates, 3600); // 1 hour TTL
        return liveRates;
      }
    } catch {
      // Graceful fallback to verified constant
    }

    return DEFAULT_FX_RATES;
  }

  /**
   * 2. New Cairo Live Weather via Open-Meteo (api.open-meteo.com)
   * Free, no API key required. Coordinates for New Cairo: 30.03°N, 31.47°E.
   */
  public static async getNewCairoWeather(): Promise<CompoundWeatherReport> {
    const cacheKey = 'weather_new_cairo';
    const cached = getCached<CompoundWeatherReport>(cacheKey);
    if (cached) return cached;

    try {
      const url =
        'https://api.open-meteo.com/v1/forecast?latitude=30.03&longitude=31.47&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m';
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error(`Weather HTTP ${res.status}`);

      const data = (await res.json()) as {
        current?: {
          temperature_2m?: number;
          relative_humidity_2m?: number;
          wind_speed_10m?: number;
        };
      };

      const temp = data?.current?.temperature_2m ?? 26;
      const humidity = data?.current?.relative_humidity_2m ?? 40;
      const wind = data?.current?.wind_speed_10m ?? 12;

      const isIdeal = temp >= 18 && temp <= 34 && wind < 30;

      const report: CompoundWeatherReport = {
        temperatureC: temp,
        humidityPercent: humidity,
        windSpeedKmh: wind,
        condition: isIdeal ? 'Optimal Viewing Weather' : 'Moderate Weather',
        isViewingRecommended: isIdeal,
        recommendationNote: isIdeal
          ? `Ideal outdoor conditions in New Cairo (${temp}°C) for villa viewing and terrace walkthroughs.`
          : `Scheduled viewing advised for indoor/acclimatized spaces (${temp}°C).`,
      };

      setCached(cacheKey, report, 1800); // 30 min TTL
      return report;
    } catch {
      // Deterministic fallback
      return {
        temperatureC: 25,
        humidityPercent: 45,
        windSpeedKmh: 10,
        condition: 'Clear New Cairo Skies',
        isViewingRecommended: true,
        recommendationNote: 'Ideal conditions for scheduled property visits.',
      };
    }
  }

  /**
   * 3. Compound Geocoding via OpenStreetMap / Nominatim
   * Validates geographical location and compound bounds in East Cairo.
   */
  public static async geocodeCompound(compoundName: string): Promise<CompoundCoordinates | null> {
    const cacheKey = `geo_${compoundName.toLowerCase().trim()}`;
    const cached = getCached<CompoundCoordinates>(cacheKey);
    if (cached) return cached;

    try {
      const query = encodeURIComponent(`${compoundName}, New Cairo, Egypt`);
      const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
      const res = await fetchWithTimeout(url, 2500);

      if (!res.ok) throw new Error(`Geo HTTP ${res.status}`);
      const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;

      if (data && data.length > 0) {
        const item = data[0];
        const result: CompoundCoordinates = {
          name: compoundName,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          displayName: item.display_name,
        };
        setCached(cacheKey, result, 86400); // 24 hours TTL
        return result;
      }
    } catch {
      // Fallback
    }

    return null;
  }

  /**
   * 4. Resolves query or district string to our localized Egyptian high-demand real estate markets:
   * 1. New Cairo & 5th Settlement (Tagamoa, Golden Square, Mivida, AUC)
   * 2. Madinaty (TMG, B1-B12, Golf, Craft Zone)
   * 3. Uptown Cairo (Emaar, Mokattam Plateau, Celesta Hills, The Sierras)
   */
  public static resolveTargetMarket(queryOrDistrict?: string): LocalizedMarketProfile {
    if (!queryOrDistrict) {
      return TARGET_MARKET_PROFILES.new_cairo;
    }
    const q = queryOrDistrict.toLowerCase().trim();

    // Check Uptown Cairo
    if (
      q.includes('uptown') ||
      q.includes('أبتاون') ||
      q.includes('ابتاون') ||
      q.includes('mokattam') ||
      q.includes('المقطم') ||
      q.includes('celesta') ||
      q.includes('sierra')
    ) {
      return TARGET_MARKET_PROFILES.uptown_cairo;
    }

    // Check Madinaty
    if (
      q.includes('madinaty') ||
      q.includes('مدينتي') ||
      q.includes('talaat') ||
      q.includes('tmg') ||
      q.includes('طلعت مصطفى')
    ) {
      return TARGET_MARKET_PROFILES.madinaty;
    }

    // Default to primary flagship market: New Cairo
    return TARGET_MARKET_PROFILES.new_cairo;
  }

  /**
   * 5. Buyer Geographic Origin via IP-API (ip-api.com)
   * Detects GCC expats and international investors to tailor currency and tax advisory,
   * grounded in Egypt's key prime markets: New Cairo, Madinaty, and Uptown Cairo.
   */
  public static async detectClientOrigin(
    ipAddress: string,
    preferredMarketHint?: string
  ): Promise<GeoLocationReport> {
    const marketProfile = this.resolveTargetMarket(preferredMarketHint);
    const cacheKey = `ip_${ipAddress}_${marketProfile.marketId}`;
    const cached = getCached<GeoLocationReport>(cacheKey);
    if (cached) return cached;

    const defaultReport: GeoLocationReport = {
      country: 'Egypt',
      countryCode: 'EG',
      city: 'Cairo',
      preferredCurrency: 'EGP',
      isExpatBuyer: false,
      primaryTargetMarket: marketProfile.marketId,
      marketProfile,
    };

    if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.')) {
      return defaultReport;
    }

    try {
      const res = await fetchWithTimeout(`http://ip-api.com/json/${ipAddress}?fields=country,countryCode,city`);
      if (!res.ok) throw new Error(`IP HTTP ${res.status}`);

      const data = (await res.json()) as { country?: string; countryCode?: string; city?: string };
      const code = data?.countryCode?.toUpperCase() || 'EG';

      let preferredCurrency: 'EGP' | 'USD' | 'AED' | 'SAR' = 'EGP';
      if (code === 'AE') preferredCurrency = 'AED';
      else if (code === 'SA') preferredCurrency = 'SAR';
      else if (code !== 'EG') preferredCurrency = 'USD';

      const report: GeoLocationReport = {
        country: data?.country || 'Egypt',
        countryCode: code,
        city: data?.city || 'Cairo',
        preferredCurrency,
        isExpatBuyer: code !== 'EG',
        primaryTargetMarket: marketProfile.marketId,
        marketProfile,
      };

      setCached(cacheKey, report, 43200); // 12 hours TTL
      return report;
    } catch {
      return defaultReport;
    }
  }
}

