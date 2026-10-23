import { PublicApisClient } from '../../../packages/agents-core/src/public-apis-client';

describe('PublicApisClient Integration', () => {
  it('returns valid currency parity and fallback rates', async () => {
    const rates = await PublicApisClient.getLiveFxRates();
    expect(rates.USD).toBeGreaterThan(40);
    expect(rates.AED).toBeGreaterThan(10);
    expect(rates.SAR).toBeGreaterThan(10);
    expect(rates.gold21kGramEGP).toBeGreaterThan(3000);
  });

  it('generates a real-time weather and viewing recommendation for New Cairo', async () => {
    const weather = await PublicApisClient.getNewCairoWeather();
    expect(weather.temperatureC).toBeDefined();
    expect(weather.humidityPercent).toBeDefined();
    expect(weather.recommendationNote).toBeDefined();
    expect(typeof weather.isViewingRecommended).toBe('boolean');
  });

  it('detects client origin and maps preferred currency and localized Egyptian market', async () => {
    const localUser = await PublicApisClient.detectClientOrigin('127.0.0.1');
    expect(localUser.country).toBe('Egypt');
    expect(localUser.preferredCurrency).toBe('EGP');
    expect(localUser.isExpatBuyer).toBe(false);
    expect(localUser.primaryTargetMarket).toBe('new_cairo');
    expect(localUser.marketProfile.nameEn).toContain('New Cairo');
  });

  it('correctly resolves targeted Egypt core real estate markets', () => {
    // Madinaty
    const madinaty = PublicApisClient.resolveTargetMarket('madinaty villa zone');
    expect(madinaty.marketId).toBe('madinaty');
    expect(madinaty.nameAr).toBe('مدينتي');
    expect(madinaty.keyDistricts).toContain('Golf Villas');

    // Uptown Cairo
    const uptown = PublicApisClient.resolveTargetMarket('أبتاون كايرو إعمار');
    expect(uptown.marketId).toBe('uptown_cairo');
    expect(uptown.nameEn).toContain('Uptown Cairo');
    expect(uptown.keyDistricts).toContain('Celesta Hills');

    // New Cairo (Default & Golden Square)
    const newCairo = PublicApisClient.resolveTargetMarket('Fifth Settlement Golden Square');
    expect(newCairo.marketId).toBe('new_cairo');
    expect(newCairo.nameAr).toContain('التجمع الخامس');
    expect(newCairo.keyCompounds).toContain('Mivida');
  });
});

