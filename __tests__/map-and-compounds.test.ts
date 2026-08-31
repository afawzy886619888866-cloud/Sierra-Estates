import { describe, it, expect } from 'vitest';

describe('Map Geolocation & Compound Proximity Test Suite', () => {
  interface CompoundLocation {
    id: string;
    name: string;
    nameAr: string;
    zone: string;
    latitude: number;
    longitude: number;
    developer: string;
  }

  const CAIRO_COMPOUNDS: CompoundLocation[] = [
    {
      id: 'mivida',
      name: 'Mivida',
      nameAr: 'ميفيدا',
      zone: '5th Settlement',
      latitude: 30.0152,
      longitude: 31.5034,
      developer: 'Emaar Misr',
    },
    {
      id: 'hyde-park',
      name: 'Hyde Park',
      nameAr: 'هايد بارك',
      zone: '5th Settlement',
      latitude: 30.0076,
      longitude: 31.4883,
      developer: 'Hyde Park Developments',
    },
    {
      id: 'palm-hills-katameya',
      name: 'Palm Hills Katameya',
      nameAr: 'بالم هيلز قطامية',
      zone: 'New Cairo',
      latitude: 30.0089,
      longitude: 31.4589,
      developer: 'Palm Hills Developments',
    },
    {
      id: 'mountain-view-icity',
      name: 'Mountain View iCity',
      nameAr: 'ماونتن فيو اي سيتي',
      zone: 'New Cairo',
      latitude: 30.0489,
      longitude: 31.5421,
      developer: 'Mountain View DMG',
    },
    {
      id: 'villette-sodic',
      name: 'Villette',
      nameAr: 'فيليت',
      zone: '5th Settlement',
      latitude: 30.0241,
      longitude: 31.5122,
      developer: 'SODIC',
    },
  ];

  /**
   * Haversine formula to compute great-circle distance between two GPS points in Kilometers.
   */
  function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  describe('Compound Geolocation Integrity', () => {
    it('should have valid coordinates inside Greater Cairo bounds (Lat ~30.0, Lon ~31.4-31.6)', () => {
      for (const compound of CAIRO_COMPOUNDS) {
        expect(compound.latitude).toBeGreaterThan(29.8);
        expect(compound.latitude).toBeLessThan(30.2);
        expect(compound.longitude).toBeGreaterThan(31.3);
        expect(compound.longitude).toBeLessThan(31.7);
      }
    });
  });

  describe('Distance & Radius Proximity Search', () => {
    // Reference Landmark: American University in Cairo (AUC New Cairo Campus)
    const AUC_CAMPUS = { lat: 30.0194, lon: 31.4994 };

    it('should calculate distance from AUC Campus to Mivida and Hyde Park accurately (< 5km)', () => {
      const mivida = CAIRO_COMPOUNDS.find((c) => c.id === 'mivida')!;
      const hydePark = CAIRO_COMPOUNDS.find((c) => c.id === 'hyde-park')!;

      const distToMivida = calculateHaversineDistanceKm(AUC_CAMPUS.lat, AUC_CAMPUS.lon, mivida.latitude, mivida.longitude);
      const distToHydePark = calculateHaversineDistanceKm(AUC_CAMPUS.lat, AUC_CAMPUS.lon, hydePark.latitude, hydePark.longitude);

      expect(distToMivida).toBeLessThan(2.0); // Mivida is adjacent to AUC (~0.6km)
      expect(distToHydePark).toBeLessThan(3.0); // Hyde Park is ~2.0km away
    });

    it('should filter compounds within a specified radius (e.g. 3km of AUC)', () => {
      const MAX_RADIUS_KM = 3.0;
      const nearby = CAIRO_COMPOUNDS.filter((c) => {
        const dist = calculateHaversineDistanceKm(AUC_CAMPUS.lat, AUC_CAMPUS.lon, c.latitude, c.longitude);
        return dist <= MAX_RADIUS_KM;
      });

      const nearbyIds = nearby.map((c) => c.id);
      expect(nearbyIds).toContain('mivida');
      expect(nearbyIds).toContain('hyde-park');
      expect(nearbyIds).toContain('villette-sodic');
    });
  });
});
