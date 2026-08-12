import { useState, useEffect, useCallback } from 'react';
import { 
  getProperties, 
  getPropertyById, 
  Property, 
  PropertyFilters 
} from '../lib/firebase/inventory';

/**
 * useProperties - Unified hook for fetching and filtering Portfolio Assets
 */
export function useProperties(filters?: PropertyFilters) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProperties(filters);
      setProperties(data);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  return { properties, loading, error, refetch: fetchProperties };
}

/**
 * useProperty - Fetch a single asset by ID
 */
export function useProperty(id: string | null) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setProperty(null);
      setLoading(false);
      return;
    }

    const fetchProperty = async () => {
      try {
        setLoading(true);
        const data = await getPropertyById(id);
        setProperty(data);
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  return { property, loading, error };
}

/**
 * usePropertyStats - High-level metrics for the Executive Dashboard
 */
export function usePropertyStats() {
  const { properties, loading } = useProperties();
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    featured: 0,
    stale: 0,
    byStatus: {} as Record<string, number>,
    byCompound: {} as Record<string, number>
  });

  useEffect(() => {
    if (loading || !properties.length) return;

    const newStats = {
      total: properties.length,
      available: properties.filter(p => p.status === 'available').length,
      featured: properties.filter(p => p.is_featured).length,
      stale: properties.filter(p => p.stale_flag).length,
      byStatus: {} as Record<string, number>,
      byCompound: {} as Record<string, number>
    };

    properties.forEach(p => {
      newStats.byStatus[p.status] = (newStats.byStatus[p.status] || 0) + 1;
      newStats.byCompound[p.compound_name] = (newStats.byCompound[p.compound_name] || 0) + 1;
    });

    setStats(newStats);
  }, [properties, loading]);

  return { stats, loading };
}
