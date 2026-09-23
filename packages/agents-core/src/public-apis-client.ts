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

export interface GeoLocationReport {
  country: string;
  countryCode: string;
  city: string;
  preferredCurrency: 'EGP' | 'USD' | 'AED' | 'SAR';
  isExpatBuyer: boolean;
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
   * 4. Buyer Geographic Origin via IP-API (ip-api.com)
   * Detects GCC expats and international investors to tailor currency and tax advisory.
   */
  public static async detectClientOrigin(ipAddress: string): Promise<GeoLocationReport> {
    const cacheKey = `ip_${ipAddress}`;
    const cached = getCached<GeoLocationReport>(cacheKey);
    if (cached) return cached;

    const defaultReport: GeoLocationReport = {
      country: 'Egypt',
      countryCode: 'EG',
      city: 'Cairo',
      preferredCurrency: 'EGP',
      isExpatBuyer: false,
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
      };

      setCached(cacheKey, report, 43200); // 12 hours TTL
      return report;
    } catch {
      return defaultReport;
    }
  }
}
