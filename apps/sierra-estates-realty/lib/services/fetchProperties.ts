import { supabase } from '../supabaseClient';

export interface Property {
  id: string;
  sbrCode: string;
  compound: string;
  name: string;
  specs: string;
  price: string;
  imageUrl: string;
  type: 'Rent' | 'Resale';
  tags: string[];
}

/**
 * Fetches properties from Supabase / Database filtered by type (Rent or Resale)
 */
export async function fetchPropertiesFromDB(typeFilter: 'Rent' | 'Resale'): Promise<Property[]> {
  try {
    const dealType = typeFilter.toLowerCase() === 'rent' ? 'rent' : 'sale';
    
    // Check if Supabase URL is configured
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('deal_type', dealType)
        .eq('status', 'active')
        .limit(50);

      if (!error && data && data.length > 0) {
        // §21 no-fabrication: unknown compound stays empty, no stock
        // photo URL is injected, and amenity tags come only from real data.
        return data.map((item: any) => ({
          id: item.id || item.ref_id,
          sbrCode: item.ref_id || `SBR-${item.id?.substring(0, 6)}`,
          compound: item.compound || '',
          name: item.title || [item.property_type, item.compound].filter(Boolean).join(' in ') || 'Listing',
          specs: `BUA: ${item.area_sqm ?? '?'}m² | ${item.bedrooms ?? '?'} Beds | ${item.bathrooms ?? '?'} Baths`,
          price: Number(item.price) > 0 ? `${Number(item.price).toLocaleString()} EGP` : 'Price on request',
          imageUrl: (item.images && item.images[0]) || '',
          type: item.deal_type === 'rent' ? 'Rent' : 'Resale',
          tags: Array.isArray(item.amenities) && item.amenities.length
            ? item.amenities
            : [item.finishing_type, item.property_type].filter(Boolean),
        }));
      }
    }
  } catch (error) {
    console.warn("Supabase fetching fallback:", error);
  }

  // §21 no-fabrication: when the database is empty/unreachable we return
  // an EMPTY list — we never serve invented "Azure Heights"-style mock
  // units with hardcoded Property Finder photos to the client.
  return [];
}
